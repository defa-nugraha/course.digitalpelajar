<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Slip Gaji {{ $payroll->instructor?->name }}</title>
    <style>
        @page { margin: 28px 34px; }
        body { color: #0f172a; font-family: DejaVu Sans, sans-serif; font-size: 11px; }
        .header { border-bottom: 3px solid #1c7de8; padding-bottom: 16px; }
        .logo { width: 210px; height: auto; margin-bottom: 12px; }
        h1 { margin: 0; color: #1c7de8; font-size: 24px; }
        .muted { color: #64748b; }
        .summary { margin: 20px 0; width: 100%; border-collapse: collapse; }
        .summary td { width: 50%; padding: 6px 0; vertical-align: top; }
        .summary strong { display: block; margin-top: 3px; font-size: 12px; }
        .items { width: 100%; border-collapse: collapse; }
        .items th { padding: 9px 8px; background: #eff6ff; color: #1e3a8a; text-align: left; }
        .items td { padding: 9px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        .items .amount { text-align: right; white-space: nowrap; }
        .total { margin-top: 16px; padding: 14px 16px; background: #1c7de8; color: white; font-size: 17px; font-weight: bold; text-align: right; }
        .status { display: inline-block; border-radius: 12px; padding: 4px 9px; background: #e2e8f0; font-weight: bold; text-transform: uppercase; }
        .footer { margin-top: 28px; color: #64748b; font-size: 9px; line-height: 1.5; }
    </style>
</head>
<body>
    @php
        $logoPath = public_path('logo.png');
        $logo = is_file($logoPath) ? base64_encode(file_get_contents($logoPath)) : null;
        $statusLabels = ['draft' => 'Draft', 'reviewed' => 'Ditinjau', 'paid' => 'Dibayar'];
    @endphp
    <div class="header">
        @if ($logo)
            <img class="logo" src="data:image/png;base64,{{ $logo }}" alt="Logo">
        @endif
        <h1>Slip Gaji Pengajar</h1>
        <p class="muted">Periode {{ $payroll->period_month?->translatedFormat('F Y') ?? '-' }}</p>
    </div>

    <table class="summary">
        <tr>
            <td>Nama pengajar<strong>{{ $payroll->instructor?->name ?? 'Pengajar tidak tersedia' }}</strong></td>
            <td>Email<strong>{{ $payroll->instructor?->email ?? '-' }}</strong></td>
        </tr>
        <tr>
            <td>Status<strong><span class="status">{{ $statusLabels[$payroll->status] ?? ucfirst($payroll->status) }}</span></strong></td>
            <td>Tanggal dibayar<strong>{{ $payroll->paid_at?->format('d M Y H:i') ?? '-' }}</strong></td>
        </tr>
        <tr>
            <td>Rekening<strong>{{ $payroll->instructor?->bank_name ?? '-' }} · {{ $payroll->instructor?->bank_account_number ?? '-' }}</strong></td>
            <td>Nama pemilik rekening<strong>{{ $payroll->instructor?->bank_account_name ?? '-' }}</strong></td>
        </tr>
    </table>

    <table class="items">
        <thead>
            <tr>
                <th>Pertemuan</th>
                <th>Sekolah / Course</th>
                <th>Tanggal</th>
                <th class="amount">Nominal</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($payroll->items as $item)
                <tr>
                    <td>{{ $item->teachingSession?->schedule?->title ?? 'Jadwal tidak tersedia' }}</td>
                    <td>
                        {{ $item->teachingSession?->school?->name ?? 'Sekolah tidak tersedia' }}<br>
                        <span class="muted">{{ $item->teachingSession?->course?->title ?? 'Course tidak tersedia' }}</span>
                    </td>
                    <td>{{ $item->teachingSession?->actual_date?->format('d M Y') ?? '-' }}</td>
                    <td class="amount">Rp {{ number_format($item->amount, 0, ',', '.') }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="total">
        {{ $payroll->total_sessions }} pertemuan · Total Rp {{ number_format($payroll->total_amount, 0, ',', '.') }}
    </div>

    @if ($payroll->notes)
        <p><strong>Catatan:</strong> {{ $payroll->notes }}</p>
    @endif

    <p class="footer">
        Slip ini dibuat otomatis dari laporan pertemuan yang telah masuk ke payroll Digital Pelajar Learning Center.
        Dicetak pada {{ now()->format('d M Y H:i') }} WIB.
    </p>
</body>
</html>
