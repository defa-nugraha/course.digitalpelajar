import { Buffer } from 'node:buffer';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const baseUrl = 'http://127.0.0.1:8000';
const outDir = '/tmp/ngawi-learning-flow';
const chromeJson = 'http://127.0.0.1:9222/json';
const moduleCourseId = 3;
const credential = 'NGT-2026-FLOW1';
const courseTitle = 'Modul Validasi: Line Follower Robot';
const lessonTitle = 'Merakit Sensor Line Follower';

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

            if (message.error) {
                reject(new Error(message.error.message));
                return;
            }

            resolve(message.result ?? {});
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
    const absolute = url.startsWith('http') ? url : `${baseUrl}${url}`;
    let status = 0;

    const listener = (params) => {
        if (params.type === 'Document' && params.response.url.split('#')[0] === absolute) {
            status = params.response.status;
        }
    };

    page.on('Network.responseReceived', listener);
    await page.send('Page.navigate', { url: absolute });
    await wait(1700);
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
    const result = await page.send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
    });

    if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    }

    return result.result.value;
}

async function login(page, email) {
    await page.send('Network.clearBrowserCookies');
    await page.send('Network.clearBrowserCache');
    await navigate(page, '/login');
    await evaluate(page, `
        new Promise((resolve, reject) => {
            let attempts = 0;
            const timer = setInterval(() => {
                attempts += 1;
                if (document.querySelector('#email') && document.querySelector('#password')) {
                    clearInterval(timer);
                    resolve(true);
                }
                if (attempts > 40) {
                    clearInterval(timer);
                    reject(new Error('Form login tidak ditemukan'));
                }
            }, 100);
        })
    `);
    await evaluate(page, `
        (() => {
            const setValue = (selector, value) => {
                const input = document.querySelector(selector);
                if (!input) throw new Error('Input tidak ditemukan: ' + selector);
                const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
                setter.call(input, value);
                input.dispatchEvent(new Event('input', { bubbles: true }));
            };
            setValue('#email', '${email}');
            setValue('#password', 'password');
            document.querySelector('form button[type="submit"]').click();
        })()
    `);
    await wait(1700);
}

async function assertVisibleText(page, expected, context) {
    const found = await evaluate(page, `document.body.innerText.includes(${JSON.stringify(expected)})`);

    if (!found) {
        throw new Error(`Expected text not found on ${context}: ${expected}`);
    }
}

async function captureStep(page, report, step) {
    const status = await navigate(page, step.url);
    await assertVisibleText(page, step.expectedText, step.name);
    await screenshot(page, step.file);
    report.push({
        step: step.name,
        url: step.url,
        status,
        expectedText: step.expectedText,
        screenshot: `${step.file}.png`,
    });
}

async function run() {
    await fs.rm(outDir, { recursive: true, force: true });
    await fs.mkdir(outDir, { recursive: true });

    const page = await createPage();
    await setup(page);

    const report = [];

    await login(page, 'admin@ngawitekno.test');
    await captureStep(page, report, {
        name: 'Admin melihat modul pembelajaran hasil seed',
        url: `/admin/course-builder?course=${moduleCourseId}`,
        file: '01-admin-course-builder-module',
        expectedText: courseTitle,
    });

    await login(page, 'siswa@ngawitekno.test');
    await captureStep(page, report, {
        name: 'Siswa melihat dashboard dengan progress modul',
        url: '/student/dashboard',
        file: '02-student-dashboard',
        expectedText: courseTitle,
    });
    await captureStep(page, report, {
        name: 'Siswa mengakses modul pembelajaran',
        url: `/learning?course=${moduleCourseId}`,
        file: '03-student-learning-module',
        expectedText: lessonTitle,
    });
    await captureStep(page, report, {
        name: 'Siswa memiliki sertifikat modul',
        url: '/certificates',
        file: '04-student-certificates',
        expectedText: credential,
    });

    await page.send('Network.clearBrowserCookies');
    await page.send('Network.clearBrowserCache');
    await captureStep(page, report, {
        name: 'Publik memverifikasi sertifikat siswa',
        url: `/certificates/verify?credential=${credential}`,
        file: '05-public-certificate-verification',
        expectedText: credential,
    });
    await assertVisibleText(page, courseTitle, 'verifikasi sertifikat publik');

    await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
    page.close();

    console.table(report);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
