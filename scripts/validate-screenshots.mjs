import { Buffer } from 'node:buffer';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const baseUrl = 'http://127.0.0.1:8000';
const outDir = '/tmp/ngawi-screenshots';
const chromeJson = 'http://127.0.0.1:9222/json';

const roles = [
    {
        name: 'student',
        email: 'siswa@ngawitekno.test',
        allowed: [
            ['/student/dashboard', 'student-dashboard'],
            ['/learning', 'student-learning'],
            ['/certificates', 'student-certificates'],
            ['/checkout', 'student-checkout'],
            ['/payments/pending', 'student-payment-pending'],
            ['/payments/success', 'student-payment-success'],
        ],
        denied: ['/admin/reports', '/teacher/dashboard'],
    },
    {
        name: 'teacher',
        email: 'guru@ngawitekno.test',
        allowed: [['/teacher/dashboard', 'teacher-dashboard']],
        denied: ['/learning', '/admin/reports'],
    },
    {
        name: 'instructor',
        email: 'pengajar@ngawitekno.test',
        allowed: [['/admin/course-builder', 'instructor-course-builder']],
        denied: ['/learning', '/admin/reports'],
    },
    {
        name: 'admin',
        email: 'admin@ngawitekno.test',
        allowed: [
            ['/admin/reports', 'admin-reports'],
            ['/admin/schools', 'admin-schools'],
            ['/admin/schools/detail', 'admin-school-detail'],
            ['/admin/users', 'admin-users'],
            ['/admin/course-builder', 'admin-course-builder'],
            ['/admin/certificates', 'admin-certificates'],
        ],
        denied: ['/learning', '/teacher/dashboard'],
    },
];

const publicPages = [
    ['/', 'public-home'],
    ['/login', 'public-login'],
    ['/register', 'public-register'],
    ['/courses', 'public-courses'],
    ['/certificates/verify', 'public-certificate-verify-empty'],
    ['/certificates/verify?credential=NGT-2026-8F92A', 'public-certificate-verify-valid'],
];

async function request(method, url) {
    const response = await fetch(url, { method });
    if (!response.ok) {
        throw new Error(`${method} ${url} failed: ${response.status}`);
    }

    return response.json();
}

async function createPage() {
    const target = await request('PUT', `${chromeJson}/new`);
    return connect(target.webSocketDebuggerUrl);
}

function connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const callbacks = new Map();
    const listeners = new Map();

    ws.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        if (message.id && callbacks.has(message.id)) {
            const { resolve, reject } = callbacks.get(message.id);
            callbacks.delete(message.id);
            if (message.error) reject(new Error(message.error.message));
            else resolve(message.result ?? {});
            return;
        }

        const handlers = listeners.get(message.method) ?? [];
        for (const handler of handlers) handler(message.params ?? {});
    });

    return new Promise((resolve, reject) => {
        ws.addEventListener('open', () => {
            resolve({
                send(method, params = {}) {
                    const messageId = ++id;
                    ws.send(JSON.stringify({ id: messageId, method, params }));
                    return new Promise((resolve, reject) => callbacks.set(messageId, { resolve, reject }));
                },
                on(method, handler) {
                    listeners.set(method, [...(listeners.get(method) ?? []), handler]);
                },
                close() {
                    ws.close();
                },
            });
        });
        ws.addEventListener('error', reject);
    });
}

async function wait(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

async function setup(page) {
    await page.send('Page.enable');
    await page.send('Runtime.enable');
    await page.send('Network.enable');
    await page.send('Emulation.setDeviceMetricsOverride', {
        width: 1440,
        height: 1100,
        deviceScaleFactor: 1,
        mobile: false,
    });
}

async function navigate(page, url) {
    let status = 0;
    const absolute = url.startsWith('http') ? url : `${baseUrl}${url}`;
    page.on('Network.responseReceived', (params) => {
        if (params.type === 'Document' && params.response.url.split('#')[0] === absolute) {
            status = params.response.status;
        }
    });
    await page.send('Page.navigate', { url: absolute });
    await wait(1400);
    await page.send('Emulation.setDeviceMetricsOverride', {
        width: 1440,
        height: 1100,
        deviceScaleFactor: 1,
        mobile: false,
    });
    return status;
}

async function screenshot(page, filename) {
    const result = await page.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        clip: { x: 0, y: 0, width: 1440, height: 1100, scale: 1 },
    });
    await fs.writeFile(path.join(outDir, `${filename}.png`), Buffer.from(result.data, 'base64'));
}

async function evaluate(page, expression) {
    return page.send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
    });
}

async function login(page, email) {
    await page.send('Network.clearBrowserCookies');
    await page.send('Network.clearBrowserCache');
    await navigate(page, '/login');
    await evaluate(page, `
        (() => {
            const setValue = (selector, value) => {
                const input = document.querySelector(selector);
                const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
                setter.call(input, value);
                input.dispatchEvent(new Event('input', { bubbles: true }));
            };
            setValue('#email', '${email}');
            setValue('#password', 'password');
            document.querySelector('button[type="submit"]').click();
        })()
    `);
    await wait(1600);
}

async function currentPath(page) {
    const result = await evaluate(page, 'window.location.pathname + window.location.search');
    return result.result.value;
}

async function run() {
    await fs.mkdir(outDir, { recursive: true });
    const page = await createPage();
    await setup(page);
    const report = [];

    for (const [url, name] of publicPages) {
        const status = await navigate(page, url);
        await screenshot(page, name);
        report.push({ role: 'public', page: url, status, screenshot: `${name}.png` });
    }

    for (const role of roles) {
        await login(page, role.email);
        const dashboardStatus = await navigate(page, '/dashboard');
        report.push({ role: role.name, page: '/dashboard', status: dashboardStatus, redirectedTo: await currentPath(page) });

        for (const [url, name] of role.allowed) {
            const status = await navigate(page, url);
            await screenshot(page, `${role.name}-${name}`);
            report.push({ role: role.name, page: url, status, screenshot: `${role.name}-${name}.png` });
        }

        for (const url of role.denied) {
            const status = await navigate(page, url);
            report.push({ role: role.name, page: url, status, expected: 403 });
        }
    }

    await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
    page.close();

    console.table(report.map((item) => ({
        role: item.role,
        page: item.page,
        status: item.status,
        redirectedTo: item.redirectedTo ?? '',
        screenshot: item.screenshot ?? '',
        expected: item.expected ?? '',
    })));
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
