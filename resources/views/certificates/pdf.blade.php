<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 24px; }
        body { margin: 0; color: #0f172a; font-family: DejaVu Sans, sans-serif; }
        .certificate { height: 640px; padding: 54px; border: 12px solid {{ $certificate['layout']['primary_color'] }}; text-align: center; }
        .brand-logo { width: 230px; height: auto; margin: 0 auto; }
        h1 { margin: 30px 0 8px; font-size: 40px; }
        h2 { margin: 10px 0; font-size: 29px; }
        .course { color: {{ $certificate['layout']['primary_color'] }}; }
        .meta { width: 100%; margin-top: 50px; }
        .meta td { width: 33.33%; vertical-align: middle; text-align: center; font-size: 13px; }
        .qr { width: 105px; height: 105px; }
        .verify { margin-top: 28px; color: #475569; font-size: 11px; }
    </style>
</head>
<body>
    @php
        $brandLogo = base64_encode(file_get_contents(public_path('logo.png')));
    @endphp
    <main class="certificate">
        @if ($certificate['status'] === 'revoked')
            <p style="color:#b91c1c;font-weight:bold">SERTIFIKAT DICABUT: {{ $certificate['revocation_reason'] }}</p>
        @endif
        <img class="brand-logo" src="data:image/png;base64,{{ $brandLogo }}" alt="Logo">
        <h1>{{ $certificate['layout']['title'] }}</h1>
        <p>Diberikan kepada</p>
        <h2>{{ $certificate['student'] }}</h2>
        <p>atas keberhasilan menyelesaikan kursus</p>
        <h2 class="course">{{ $certificate['course'] }}</h2>
        <table class="meta">
            <tr>
                <td><strong>Tanggal Terbit</strong><br>{{ $certificate['issued_at'] }}</td>
                <td><img class="qr" src="{{ $certificate['qr_data_uri'] }}" alt="QR verifikasi"></td>
                <td><strong>Nomor Sertifikat</strong><br>{{ $certificate['no'] }}</td>
            </tr>
        </table>
        <p class="verify">{{ $certificate['verify_url'] }}</p>
    </main>
</body>
</html>
