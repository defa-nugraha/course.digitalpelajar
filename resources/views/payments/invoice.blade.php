<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <style>
        * { box-sizing: border-box; }
        @page { margin: 34px 38px; }
        body { color: #172033; font-family: DejaVu Sans, sans-serif; font-size: 10px; line-height: 1.55; }
        .brand { color: #0874d1; font-size: 17px; font-weight: bold; letter-spacing: .2px; margin: 0; }
        .muted { color: #687385; }
        .header { border-bottom: 2px solid #e5edf7; padding-bottom: 22px; }
        .header-table, .info-table, .summary-table, .items { border-collapse: collapse; width: 100%; }
        .header-right { text-align: right; vertical-align: top; }
        .invoice-title { color: #172033; font-size: 24px; font-weight: bold; letter-spacing: .5px; margin: 0 0 3px; }
        .invoice-number { color: #506074; font-family: DejaVu Sans Mono, monospace; font-size: 10px; }
        .section { margin-top: 24px; }
        .section-label { color: #6b7a90; font-size: 8px; font-weight: bold; letter-spacing: 1px; margin-bottom: 7px; text-transform: uppercase; }
        .info-table { border: 1px solid #e5edf7; }
        .info-table td { padding: 11px 13px; vertical-align: top; width: 50%; }
        .info-table td + td { border-left: 1px solid #e5edf7; }
        .name { color: #172033; font-size: 12px; font-weight: bold; }
        .items { border: 1px solid #dfe8f3; }
        .items th { background: #f3f8fd; color: #526176; font-size: 8px; letter-spacing: .8px; padding: 10px 12px; text-align: left; text-transform: uppercase; }
        .items td { border-top: 1px solid #e5edf7; padding: 13px 12px; vertical-align: top; }
        .items .amount { text-align: right; white-space: nowrap; }
        .item-title { color: #172033; font-size: 11px; font-weight: bold; }
        .summary { margin-left: auto; margin-top: 18px; width: 260px; }
        .summary-table td { padding: 7px 10px; }
        .summary-table .total td { background: #0874d1; color: #fff; font-size: 13px; font-weight: bold; padding: 12px 10px; }
        .summary-table .total td:last-child { text-align: right; }
        .status { border-radius: 12px; display: inline-block; font-size: 8px; font-weight: bold; padding: 4px 9px; text-transform: uppercase; }
        .status-paid { background: #e3f7ed; color: #147a43; }
        .status-pending { background: #fff5d8; color: #9a6500; }
        .status-failed { background: #fce8e8; color: #bb2626; }
        .note { background: #f7fafc; border-left: 3px solid #91bfe9; color: #536276; margin-top: 27px; padding: 11px 13px; }
        .footer { border-top: 1px solid #e5edf7; color: #748196; font-size: 8px; margin-top: 35px; padding-top: 13px; text-align: center; }
    </style>
</head>
<body>
    @php
        $status = strtolower((string) $payment->status);
        $statusLabel = match ($status) {
            'paid', 'settlement', 'capture', 'success' => 'Lunas',
            'pending' => 'Menunggu pembayaran',
            'failed', 'deny', 'cancel', 'expire', 'failure' => 'Tidak berhasil',
            default => ucfirst($status),
        };
        $statusClass = in_array($status, ['paid', 'settlement', 'capture', 'success'], true)
            ? 'status-paid'
            : ($status === 'pending' ? 'status-pending' : 'status-failed');
        $formatDate = static fn ($date) => $date ? $date->timezone(config('app.timezone'))->format('d/m/Y H:i').' WIB' : '-';
    @endphp

    <div class="header">
        <table class="header-table">
            <tr>
                <td>
                    <p class="brand">Digital Pelajar Learning Center</p>
                    <p class="muted" style="margin: 4px 0 0;">Bukti transaksi pembelajaran digital</p>
                </td>
                <td class="header-right">
                    <p class="invoice-title">INVOICE</p>
                    <div class="invoice-number">{{ $payment->order_id }}</div>
                    <p style="margin: 8px 0 0;"><span class="status {{ $statusClass }}">{{ $statusLabel }}</span></p>
                </td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-label">Informasi transaksi</div>
        <table class="info-table">
            <tr>
                <td>
                    <span class="muted">Ditagihkan kepada</span><br>
                    <span class="name">{{ $payment->user?->name ?? 'Pelanggan' }}</span><br>
                    <span class="muted">{{ $payment->user?->email ?? '-' }}</span>
                    @if($payment->user?->school?->name)
                        <br><span class="muted">{{ $payment->user->school->name }}</span>
                    @endif
                </td>
                <td>
                    <span class="muted">Tanggal dibuat</span><br>
                    <strong>{{ $formatDate($payment->created_at) }}</strong><br><br>
                    <span class="muted">Tanggal pembayaran</span><br>
                    <strong>{{ $formatDate($payment->paid_at) }}</strong>
                </td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-label">Rincian pembelian</div>
        <table class="items">
            <thead>
                <tr>
                    <th>Produk pembelajaran</th>
                    <th style="width: 70px; text-align: center;">Jumlah</th>
                    <th class="amount" style="width: 130px;">Total</th>
                </tr>
            </thead>
            <tbody>
                @if($payment->courseBills->isNotEmpty())
                    @foreach($payment->courseBills as $bill)
                        <tr>
                            <td>
                                <div class="item-title">{{ $bill->title }}</div>
                                <div class="muted">{{ $bill->course?->title ?? 'Kursus pembelajaran' }}</div>
                            </td>
                            <td style="text-align: center;">1</td>
                            <td class="amount">Rp {{ number_format($bill->amount, 0, ',', '.') }}</td>
                        </tr>
                    @endforeach
                @elseif($payment->courseBill)
                    <tr>
                        <td>
                            <div class="item-title">{{ $payment->courseBill->title }}</div>
                            <div class="muted">{{ $payment->courseBill->course?->title ?? 'Kursus pembelajaran' }}</div>
                        </td>
                        <td style="text-align: center;">1</td>
                        <td class="amount">Rp {{ number_format($payment->courseBill->amount, 0, ',', '.') }}</td>
                    </tr>
                @else
                    <tr>
                        <td>
                            <div class="item-title">{{ $payment->course?->title ?? 'Kelas pembelajaran' }}</div>
                            <div class="muted">Akses kelas digital</div>
                        </td>
                        <td style="text-align: center;">1</td>
                        <td class="amount">Rp {{ number_format($payment->amount, 0, ',', '.') }}</td>
                    </tr>
                @endif
            </tbody>
        </table>

        <div class="summary">
            <table class="summary-table">
                <tr><td class="muted">Subtotal</td><td style="text-align: right;">Rp {{ number_format($payment->amount, 0, ',', '.') }}</td></tr>
                <tr><td class="muted">Pajak dan biaya lain</td><td style="text-align: right;">Rp 0</td></tr>
                <tr class="total"><td>Total tagihan</td><td>Rp {{ number_format($payment->amount, 0, ',', '.') }}</td></tr>
            </table>
        </div>
    </div>

    <div class="note">
        Metode pembayaran: <strong>{{ $payment->payment_method ? ucwords(str_replace('_', ' ', $payment->payment_method)) : 'Belum dipilih' }}</strong>.
        @if($status === 'pending')
            Tagihan ini belum lunas. Selesaikan pembayaran melalui tautan pembayaran yang tersedia di akun Anda.
        @else
            Simpan invoice ini sebagai bukti transaksi Anda.
        @endif
    </div>

    <div class="footer">
        Dokumen ini dibuat secara otomatis oleh Digital Pelajar Learning Center pada {{ now()->timezone(config('app.timezone'))->format('d/m/Y H:i') }} WIB.<br>
        Untuk bantuan pembayaran, hubungi administrator Digital Pelajar Learning Center.
    </div>
</body>
</html>
