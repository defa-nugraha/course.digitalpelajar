<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <style>
        * { box-sizing: border-box; }
        @page { margin: 38px; }
        body { color: #172033; font-family: DejaVu Sans, sans-serif; font-size: 10px; line-height: 1.6; }
        .header { border-bottom: 2px solid #dce8f5; padding-bottom: 18px; }
        .header-table, .info, .items, .total { border-collapse: collapse; width: 100%; }
        .brand { color: #0874d1; font-size: 17px; font-weight: bold; margin: 0; }
        .muted { color: #64748b; }
        .right { text-align: right; }
        .invoice { font-size: 25px; font-weight: bold; margin: 0; }
        .number { color: #64748b; font-family: DejaVu Sans Mono, monospace; }
        .section { margin-top: 24px; }
        .label { color: #64748b; font-size: 8px; font-weight: bold; letter-spacing: 1px; margin-bottom: 8px; text-transform: uppercase; }
        .info { border: 1px solid #dce8f5; }
        .info td { padding: 12px; vertical-align: top; width: 50%; }
        .info td + td { border-left: 1px solid #dce8f5; }
        .name { font-size: 12px; font-weight: bold; }
        .items { border: 1px solid #dce8f5; }
        .items th { background: #f1f7fd; color: #526176; font-size: 8px; padding: 11px; text-align: left; text-transform: uppercase; }
        .items td { border-top: 1px solid #dce8f5; padding: 14px 11px; vertical-align: top; }
        .items .amount { text-align: right; white-space: nowrap; }
        .total { margin: 18px 0 0 auto; width: 270px; }
        .total td { padding: 8px 10px; }
        .grand td { background: #0874d1; color: white; font-size: 13px; font-weight: bold; padding: 12px 10px; }
        .grand td:last-child { text-align: right; }
        .status { display: inline-block; border-radius: 10px; padding: 4px 9px; font-size: 8px; font-weight: bold; }
        .paid { background: #e3f7ed; color: #147a43; }
        .pending { background: #fff5d8; color: #9a6500; }
        .footer { border-top: 1px solid #dce8f5; color: #748196; font-size: 8px; margin-top: 38px; padding-top: 12px; text-align: center; }
        .note { background: #f7fafc; border-left: 3px solid #91bfe9; color: #536276; margin-top: 24px; padding: 12px; }
    </style>
</head>
<body>
    @php
        $paid = $bill->status === 'paid';
        $statusLabel = $paid ? 'Lunas' : ($bill->isOverdue() ? 'Terlambat' : 'Belum dibayar');
        $formatDate = static fn ($date) => $date ? $date->format('d/m/Y') : '-';
    @endphp

    <div class="header">
        <table class="header-table">
            <tr>
                <td>
                    <p class="brand">Digital Pelajar Learning Center</p>
                    <p class="muted" style="margin: 4px 0 0;">Invoice tagihan kursus</p>
                </td>
                <td class="right">
                    <p class="invoice">INVOICE</p>
                    <div class="number">BILL-{{ str_pad((string) $bill->id, 6, '0', STR_PAD_LEFT) }}</div>
                    <p style="margin: 8px 0 0;"><span class="status {{ $paid ? 'paid' : 'pending' }}">{{ $statusLabel }}</span></p>
                </td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="label">Informasi tagihan</div>
        <table class="info">
            <tr>
                <td>
                    <span class="muted">Ditagihkan kepada</span><br>
                    <span class="name">{{ $bill->student?->name ?? 'Siswa' }}</span><br>
                    <span class="muted">{{ $bill->student?->email ?? '-' }}</span>
                    @if($bill->student?->school?->name)
                        <br><span class="muted">{{ $bill->student->school->name }}</span>
                    @endif
                </td>
                <td>
                    <span class="muted">Tanggal dibuat</span><br>
                    <strong>{{ $formatDate($bill->created_at) }}</strong><br><br>
                    <span class="muted">Jatuh tempo</span><br>
                    <strong>{{ $formatDate($bill->due_at) }}</strong>
                </td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="label">Rincian tagihan</div>
        <table class="items">
            <thead>
                <tr>
                    <th>Nama tagihan</th>
                    <th>Kursus</th>
                    <th class="amount">Nominal</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>{{ $bill->title }}</strong></td>
                    <td>{{ $bill->course?->title ?? 'Kursus pembelajaran' }}</td>
                    <td class="amount">Rp {{ number_format($bill->amount, 0, ',', '.') }}</td>
                </tr>
            </tbody>
        </table>
        <table class="total">
            <tr><td class="muted">Subtotal</td><td class="right">Rp {{ number_format($bill->amount, 0, ',', '.') }}</td></tr>
            <tr><td class="muted">Pajak dan biaya lain</td><td class="right">Rp 0</td></tr>
            <tr class="grand"><td>Total tagihan</td><td>Rp {{ number_format($bill->amount, 0, ',', '.') }}</td></tr>
        </table>
    </div>

    <div class="note">
        Status tagihan: <strong>{{ $statusLabel }}</strong>.
        @if($paid)
            Invoice ini merupakan bukti bahwa tagihan kursus telah dilunasi.
        @else
            Mohon selesaikan pembayaran sebelum atau pada tanggal jatuh tempo yang tertera di atas.
        @endif
    </div>

    <div class="footer">
        Dokumen ini dibuat secara otomatis oleh Digital Pelajar Learning Center pada {{ now()->format('d/m/Y H:i') }} WIB.<br>
        Simpan invoice ini sebagai referensi administrasi pembayaran.
    </div>
</body>
</html>
