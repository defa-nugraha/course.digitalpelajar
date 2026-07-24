<!DOCTYPE html>
<html lang="id">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="robots" content="noindex,nofollow">
        <title>@yield('title', 'Terjadi Kendala') - {{ config('app.name', 'Digital Pelajar') }}</title>
        <link rel="icon" type="image/png" href="{{ asset('Logo%20Digital%20Pelajar%20%28tanpa%20teks%29.png') }}">
        <style>
            :root {
                color-scheme: light;
                --blue: #0ea5e9;
                --dark: #0f172a;
                --muted: #64748b;
                --surface: #ffffff;
                --line: #e2e8f0;
            }

            * { box-sizing: border-box; }
            body {
                margin: 0;
                min-height: 100vh;
                font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                color: var(--dark);
                background:
                    radial-gradient(circle at top left, rgba(14, 165, 233, .16), transparent 32rem),
                    linear-gradient(135deg, #f8fafc 0%, #eef8ff 100%);
            }
            main {
                display: grid;
                min-height: 100vh;
                place-items: center;
                padding: 2rem;
            }
            .card {
                width: min(100%, 760px);
                overflow: hidden;
                border: 1px solid rgba(148, 163, 184, .25);
                border-radius: 2rem;
                background: rgba(255, 255, 255, .88);
                box-shadow: 0 24px 80px rgba(15, 23, 42, .12);
                backdrop-filter: blur(18px);
            }
            .hero {
                padding: clamp(1.5rem, 4vw, 3rem);
            }
            .badge {
                display: inline-flex;
                align-items: center;
                gap: .5rem;
                border-radius: 999px;
                border: 1px solid #bae6fd;
                background: #f0f9ff;
                padding: .5rem .875rem;
                color: #0369a1;
                font-weight: 800;
                font-size: .875rem;
            }
            h1 {
                margin: 1.25rem 0 .75rem;
                font-size: clamp(2.25rem, 8vw, 5rem);
                line-height: .95;
                letter-spacing: -.06em;
            }
            h2 {
                margin: 0;
                max-width: 620px;
                font-size: clamp(1.5rem, 4vw, 2.5rem);
                line-height: 1.15;
                letter-spacing: -.04em;
            }
            p {
                margin: 1rem 0 0;
                max-width: 620px;
                color: var(--muted);
                font-size: 1rem;
                line-height: 1.75;
            }
            .actions {
                display: flex;
                flex-wrap: wrap;
                gap: .75rem;
                margin-top: 2rem;
            }
            a {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-height: 2.75rem;
                border-radius: .9rem;
                padding: .7rem 1rem;
                text-decoration: none;
                font-weight: 800;
            }
            .primary {
                background: var(--blue);
                color: white;
                box-shadow: 0 12px 28px rgba(14, 165, 233, .28);
            }
            .secondary {
                border: 1px solid var(--line);
                background: white;
                color: var(--dark);
            }
            .footer {
                border-top: 1px solid var(--line);
                background: #f8fafc;
                padding: 1rem clamp(1.5rem, 4vw, 3rem);
                color: var(--muted);
                font-size: .875rem;
            }
        </style>
    </head>
    <body>
        <main>
            <section class="card">
                <div class="hero">
                    <span class="badge">@yield('badge', 'Kendala akses')</span>
                    <h1>@yield('code', 'Error')</h1>
                    <h2>@yield('heading', 'Halaman sedang tidak dapat ditampilkan.')</h2>
                    <p>@yield('message', 'Silakan kembali ke halaman utama atau coba beberapa saat lagi.')</p>
                    <div class="actions">
                        <a class="primary" href="{{ url('/') }}">Kembali ke Home</a>
                        <a class="secondary" href="javascript:history.back()">Kembali sebelumnya</a>
                    </div>
                </div>
                <div class="footer">
                    Jika kendala berulang, hubungi admin platform dan sertakan kode error di halaman ini.
                </div>
            </section>
        </main>
    </body>
</html>
