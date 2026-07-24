<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <style>
        body { color: #0f172a; font-family: DejaVu Sans, sans-serif; font-size: 13px; }
        .header { margin-bottom: 32px; border-bottom: 3px solid #1c7de8; padding-bottom: 18px; }
        .logo { width: 230px; height: auto; margin-bottom: 16px; }
        h1 { margin: 0; color: #1c7de8; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
        td:last-child { text-align: right; font-weight: bold; }
        .total { margin-top: 22px; padding: 16px; background: #eff6ff; font-size: 18px; }
        .footer { margin-top: 42px; color: #64748b; font-size: 11px; }
    </style>
</head>
<body>
    @php
        $brandLogo = base64_encode(file_get_contents(public_path('logo.png')));
    @endphp
    <div class="header">
        <img class="logo" src="data:image/png;base64,{{ $brandLogo }}" alt="Logo">
        <h1>Invoice</h1>
        <p>{{ $payment->order_id }}</p>
    </div>
    <table>
        <tr><td>Nama siswa</td><td>{{ $payment->user->name }}</td></tr>
        <tr><td>Email</td><td>{{ $payment->user->email }}</td></tr>
        <tr><td>Kursus</td><td>{{ $payment->course->title }}</td></tr>
        <tr><td>Status</td><td>{{ ucfirst($payment->status) }}</td></tr>
        <tr><td>Metode</td><td>{{ $payment->payment_method ? str_replace('_', ' ', $payment->payment_method) : '-' }}</td></tr>
        <tr><td>Tanggal pembayaran</td><td>{{ $payment->paid_at?->format('d M Y H:i') ?? '-' }}</td></tr>
    </table>
    <div class="total">Total: Rp {{ number_format($payment->amount, 0, ',', '.') }}</div>
    <p class="footer">Invoice ini dihasilkan dari riwayat pembayaran yang tersimpan di sistem.</p>
</body>
</html>
