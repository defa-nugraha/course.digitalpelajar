<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $certificate['no'] }}</title>
    <style>
        body { margin: 0; background: #f8fafc; color: #0f172a; font-family: Arial, sans-serif; }
        .toolbar { display: flex; justify-content: center; padding: 16px; }
        button { border: 0; border-radius: 6px; background: #1c7de8; color: white; cursor: pointer; font-weight: 700; padding: 10px 18px; }
        .certificate { box-sizing: border-box; width: min(1120px, calc(100% - 32px)); min-height: 720px; margin: 0 auto 32px; padding: 72px; border: 12px solid {{ $certificate['layout']['primary_color'] }}; background: white; text-align: center; }
        .brand-logo { width: min(320px, 80%); height: auto; margin: 0 auto; }
        h1 { margin: 36px 0 8px; font-size: 48px; }
        h2 { margin: 12px 0; font-size: 34px; }
        .course { color: {{ $certificate['layout']['primary_color'] }}; }
        .meta { display: flex; justify-content: space-between; gap: 24px; margin-top: 72px; text-align: left; }
        .verify { margin-top: 44px; color: #475569; font-size: 13px; overflow-wrap: anywhere; }
        .qr { width: 116px; height: 116px; }
        @media print {
            body { background: white; }
            .toolbar { display: none; }
            .certificate { width: 100%; min-height: 100vh; margin: 0; }
        }
    </style>
</head>
<body>
    <div class="toolbar"><button onclick="window.print()">Cetak / Simpan PDF</button></div>
    <main class="certificate">
        @if ($certificate['status'] === 'revoked')
            <p style="color:#b91c1c;font-weight:700">SERTIFIKAT DICABUT: {{ $certificate['revocation_reason'] }}</p>
        @endif
        <img class="brand-logo" src="/logo.png" alt="Logo">
        <h1>{{ $certificate['layout']['title'] }}</h1>
        <p>Diberikan kepada</p>
        <h2>{{ $certificate['student'] }}</h2>
        <p>atas keberhasilan menyelesaikan kursus</p>
        <h2 class="course">{{ $certificate['course'] }}</h2>
        <div class="meta">
            <div><strong>Tanggal Terbit</strong><br>{{ $certificate['issued_at'] }}</div>
            <div><img class="qr" src="{{ $certificate['qr_data_uri'] }}" alt="QR verifikasi"></div>
            <div><strong>Penerbit</strong><br>{{ $certificate['school'] }}</div>
        </div>
        <p class="verify">Verifikasi: {{ $certificate['verify_url'] }}</p>
    </main>
</body>
</html>
