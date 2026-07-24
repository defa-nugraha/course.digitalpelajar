import { Panel, Shell } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head } from '@inertiajs/react';
import { Camera, QrCode, TriangleAlert } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, type CameraDevice } from 'html5-qrcode';
import { useEffect, useId, useRef, useState } from 'react';

export default function AttendanceScanner() {
    const generatedId = useId().replace(/:/g, '');
    const scannerElementId = `attendance-qr-reader-${generatedId}`;
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const detectedRef = useRef(false);
    const [cameras, setCameras] = useState<CameraDevice[]>([]);
    const [selectedCameraId, setSelectedCameraId] = useState('');
    const [status, setStatus] = useState<'idle' | 'scanning' | 'unsupported' | 'error'>('idle');
    const [message, setMessage] = useState('Klik tombol mulai scan, lalu arahkan kamera ke QR code dari pengajar.');

    useEffect(() => {
        Html5Qrcode.getCameras()
            .then((devices) => {
                setCameras(devices);
                const backCamera = devices.find((device) => /back|rear|environment|belakang/i.test(device.label));
                setSelectedCameraId((backCamera ?? devices[0])?.id ?? '');
            })
            .catch(() => {
                setStatus('unsupported');
                setMessage('Browser belum memberi daftar kamera. Pastikan halaman dibuka dari HTTPS atau localhost dan izin kamera diberikan.');
            });

        return () => {
            void stopScanner();
        };
    }, []);

    const stopScanner = async () => {
        const scanner = scannerRef.current;

        if (!scanner) return;

        try {
            if (scanner.isScanning) {
                await scanner.stop();
            }
            scanner.clear();
        } catch {
            // Scanner may already be stopped by the browser; keep UI usable.
        } finally {
            scannerRef.current = null;
            detectedRef.current = false;
            setStatus('idle');
        }
    };

    const startScan = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            setStatus('unsupported');
            setMessage('Browser ini belum mendukung akses kamera. Gunakan Chrome/Edge terbaru dan buka melalui HTTPS atau localhost.');
            return;
        }

        try {
            await stopScanner();

            const scanner = new Html5Qrcode(scannerElementId, {
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                useBarCodeDetectorIfSupported: true,
                verbose: false,
            });
            scannerRef.current = scanner;

            const cameraConfig = selectedCameraId ? selectedCameraId : { facingMode: 'environment' };

            await scanner.start(
                cameraConfig,
                {
                    fps: 10,
                    qrbox: (width, height) => {
                        const size = Math.floor(Math.min(width, height) * 0.72);

                        return { width: size, height: size };
                    },
                    aspectRatio: 1.777778,
                },
                (decodedText) => {
                    if (detectedRef.current) return;

                    if (isAllowedAttendanceUrl(decodedText)) {
                        detectedRef.current = true;
                        setMessage('QR presensi berhasil dibaca. Mengarahkan ke proses presensi...');
                        void stopScanner().finally(() => {
                            window.location.href = decodedText;
                        });
                        return;
                    }

                    setStatus('error');
                    setMessage('QR code terbaca, tetapi bukan QR presensi platform ini. Pastikan scan QR dari halaman presensi pengajar.');
                },
                () => {
                    // Decode errors happen continuously while no QR is visible; no UI update needed.
                },
            );

            setStatus('scanning');
            setMessage('Scanner aktif. Arahkan kamera ke QR code presensi yang ditampilkan pengajar.');
        } catch (error) {
            scannerRef.current = null;
            setStatus('error');
            setMessage(cameraErrorMessage(error));
        }
    };

    return (
        <Shell title="Scan QR Presensi" eyebrow="Siswa" nav="student">
            <Head title="Scan QR Presensi" />
            <div className="mx-auto grid w-full max-w-5xl gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                <Panel title="Scanner QR">
                    <div className="mx-auto w-full max-w-[520px]">
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 p-2 shadow-inner sm:p-3">
                            <div
                                id={scannerElementId}
                                className="attendance-qr-reader aspect-[3/4] min-h-[240px] overflow-hidden rounded-xl bg-black text-white sm:aspect-video sm:min-h-[300px]"
                            />
                        </div>
                    </div>
                    {cameras.length > 1 && (
                        <label className="mt-4 block text-sm font-semibold text-slate-700">
                            Pilih kamera
                            <select
                                className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                                value={selectedCameraId}
                                disabled={status === 'scanning'}
                                onChange={(event) => setSelectedCameraId(event.target.value)}
                            >
                                {cameras.map((camera) => (
                                    <option key={camera.id} value={camera.id}>
                                        {camera.label || `Kamera ${camera.id}`}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <Button type="button" className="w-full" onClick={startScan} disabled={status === 'scanning'}>
                            <Camera className="size-4" />
                            {status === 'scanning' ? 'Scanner Aktif' : 'Mulai Scan'}
                        </Button>
                        <Button type="button" className="w-full" variant="outline" onClick={() => void stopScanner()}>
                            Hentikan Kamera
                        </Button>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">{message}</p>
                </Panel>

                <Panel title="Aturan Presensi">
                    <div className="space-y-4 text-sm leading-6 text-slate-600">
                        <div className="flex gap-3">
                            <QrCode className="mt-1 size-5 shrink-0 text-blue-700" />
                            <p>Presensi hanya dapat dilakukan dengan QR code yang ditampilkan oleh pengajar.</p>
                        </div>
                        <div className="flex gap-3">
                            <TriangleAlert className="mt-1 size-5 shrink-0 text-amber-600" />
                            <p>Jika QR tidak terbaca, pastikan kamera diizinkan, pencahayaan cukup, dan QR masih aktif di layar pengajar.</p>
                        </div>
                        {status === 'unsupported' && (
                            <p className="rounded-xl bg-amber-50 px-4 py-3 font-semibold text-amber-700">
                                Akses kamera membutuhkan HTTPS atau localhost. Jika memakai IP jaringan, browser biasanya akan memblokir kamera.
                            </p>
                        )}
                    </div>
                </Panel>
            </div>
        </Shell>
    );
}

function isAllowedAttendanceUrl(value: string) {
    try {
        const url = new URL(value);

        return (
            url.origin === window.location.origin
            && url.pathname.startsWith('/student/teaching-schedules/')
            && url.pathname.endsWith('/attendance/scan')
        );
    } catch {
        return false;
    }
}

function cameraErrorMessage(error: unknown) {
    const name = error instanceof DOMException ? error.name : '';

    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        return 'Izin kamera ditolak. Buka pengaturan izin browser, izinkan kamera untuk situs ini, lalu coba lagi.';
    }

    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        return 'Kamera tidak ditemukan pada perangkat ini.';
    }

    if (name === 'NotReadableError' || name === 'TrackStartError') {
        return 'Kamera sedang digunakan aplikasi lain atau tidak bisa dibuka. Tutup aplikasi kamera lain lalu coba lagi.';
    }

    if (window.location.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        return 'Browser memblokir kamera karena halaman tidak dibuka melalui HTTPS atau localhost.';
    }

    return 'Kamera tidak dapat diakses. Pastikan izin kamera sudah diberikan dan gunakan Chrome/Edge terbaru.';
}
