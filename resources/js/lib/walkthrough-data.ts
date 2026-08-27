import { NavItem } from '@/lib/platform-data';

export const ONBOARDING_VERSION = 1;
export const ONBOARDING_AUTO_INTERVAL_MS = 24 * 60 * 60 * 1000;

export type AppRole = 'admin' | 'student' | 'teacher' | 'instructor';

export interface WalkthroughSlide {
    id: string;
    icon: 'dashboard' | 'learning' | 'builder' | 'calendar' | 'review' | 'store' | 'certificate' | 'profile' | 'school';
    title: string;
    description: string;
}

export interface CoachStep {
    id: string;
    target: string;
    title: string;
    description: string;
    placement?: 'top' | 'right' | 'bottom' | 'left';
}

interface WalkthroughConfig {
    slides: WalkthroughSlide[];
    coachSteps: CoachStep[];
}

const configs: Record<AppRole, WalkthroughConfig> = {
    admin: {
        slides: [
            {
                id: 'admin-overview',
                icon: 'dashboard',
                title: 'Pantau operasional dari Dashboard Admin',
                description: 'Lihat ringkasan user, sekolah, course publish, pembayaran, review pending, dan sertifikat dari satu halaman.',
            },
            {
                id: 'admin-school-user',
                icon: 'school',
                title: 'Kelola sekolah, user, dan akses belajar',
                description: 'Admin dapat mengatur data sekolah, user, siswa, serta akses learning path untuk sekolah yang bekerja sama.',
            },
            {
                id: 'admin-course-builder',
                icon: 'builder',
                title: 'Bangun course robotik secara terstruktur',
                description: 'Course Builder mengelola learning path, lesson, blok materi, quiz, submission, dan interactive lesson.',
            },
            {
                id: 'admin-review-report',
                icon: 'review',
                title: 'Review, sertifikat, dan laporan tetap terpantau',
                description:
                    'Submission siswa, sertifikat, laporan pertemuan, payroll pengajar, dan transaksi dapat dimonitor sesuai kebutuhan operasional.',
            },
        ],
        coachSteps: [
            {
                id: 'admin-title',
                target: 'tour-page-title',
                title: 'Area kerja utama',
                description: 'Judul halaman membantu memastikan Anda berada pada modul admin yang benar sebelum mengubah data.',
                placement: 'bottom',
            },
            {
                id: 'admin-dashboard',
                target: 'tour-nav-dashboard',
                title: 'Dashboard',
                description: 'Mulai dari sini untuk melihat kondisi operasional terbaru sebelum masuk ke modul detail.',
                placement: 'right',
            },
            {
                id: 'admin-course',
                target: 'tour-nav-course-builder',
                title: 'Course Builder',
                description: 'Gunakan menu ini untuk membuat dan memperbarui materi pembelajaran robotik.',
                placement: 'right',
            },
            {
                id: 'admin-review',
                target: 'tour-nav-review',
                title: 'Review submission',
                description: 'Pantau tugas siswa yang perlu dinilai agar progres belajar dan sertifikat tetap berjalan.',
                placement: 'right',
            },
            {
                id: 'admin-account',
                target: 'tour-account-menu',
                title: 'Panduan dapat dibuka ulang',
                description: 'Buka menu akun untuk mengakses Pengaturan, Panduan Menggunakan, dan Logout kapan saja.',
                placement: 'bottom',
            },
        ],
    },
    instructor: {
        slides: [
            {
                id: 'instructor-overview',
                icon: 'dashboard',
                title: 'Dashboard Pengajar merangkum kelas yang diampu',
                description: 'Lihat kelas, siswa, review pending, progress, diskusi, dan sertifikat yang berkaitan dengan Anda.',
            },
            {
                id: 'instructor-builder',
                icon: 'builder',
                title: 'Kelola materi sesuai akses pengajar',
                description: 'Learning Path dan Course Builder menampilkan course milik Anda atau course yang diberikan akses oleh admin.',
            },
            {
                id: 'instructor-session',
                icon: 'calendar',
                title: 'Jadwal dan laporan mengajar terhubung',
                description: 'Pengajar mengisi laporan, bukti foto, presensi siswa, dan melihat feedback per pertemuan.',
            },
            {
                id: 'instructor-review',
                icon: 'review',
                title: 'Review tugas siswa lebih cepat',
                description: 'Submission siswa yang Anda ampu dapat dinilai dari menu Review dengan filter yang sederhana.',
            },
        ],
        coachSteps: [
            {
                id: 'instructor-dashboard',
                target: 'tour-nav-dashboard',
                title: 'Dashboard Pengajar',
                description: 'Gunakan dashboard sebagai titik awal untuk melihat aktivitas kelas dan tugas yang perlu ditindaklanjuti.',
            },
            {
                id: 'instructor-builder',
                target: 'tour-nav-course-builder',
                title: 'Course Builder',
                description: 'Buat atau edit materi yang menjadi tanggung jawab Anda dari menu ini.',
            },
            {
                id: 'instructor-schedule',
                target: 'tour-nav-jadwal-saya',
                title: 'Jadwal Saya',
                description: 'Lihat jadwal mengajar offline/online yang sudah ditugaskan.',
            },
            {
                id: 'instructor-report',
                target: 'tour-nav-laporan-saya',
                title: 'Laporan Saya',
                description: 'Isi laporan pertemuan, bukti foto, presensi siswa, dan lengkapi laporan setelah kelas selesai.',
            },
            {
                id: 'instructor-account',
                target: 'tour-account-menu',
                title: 'Buka panduan kapan saja',
                description: 'Menu akun berisi pengaturan, panduan penggunaan, dan logout.',
            },
        ],
    },
    teacher: {
        slides: [
            {
                id: 'teacher-monitoring',
                icon: 'school',
                title: 'Guru dapat memonitor siswa sekolah',
                description: 'Pantau progress belajar, kehadiran, dan informasi penting siswa dari sekolah Anda.',
            },
            {
                id: 'teacher-learning',
                icon: 'learning',
                title: 'Guru juga dapat belajar dari course sekolah',
                description: 'Materi yang dibuka untuk sekolah dapat dipelajari guru agar monitoring dan pendampingan siswa lebih mudah.',
            },
            {
                id: 'teacher-store',
                icon: 'store',
                title: 'Akses pendukung pembelajaran',
                description: 'Katalog, toko robotik, dan redeem kode membantu guru memahami materi dan paket belajar yang tersedia.',
            },
        ],
        coachSteps: [
            {
                id: 'teacher-learning',
                target: 'tour-nav-belajar',
                title: 'Belajar sebagai guru',
                description: 'Buka materi yang diberikan untuk sekolah agar Anda dapat mengikuti alur yang sama dengan siswa.',
            },
            {
                id: 'teacher-students',
                target: 'tour-nav-siswa',
                title: 'Monitoring siswa',
                description: 'Menu ini dipakai untuk melihat progress dan informasi siswa sekolah.',
            },
            {
                id: 'teacher-account',
                target: 'tour-account-menu',
                title: 'Panduan dan pengaturan',
                description: 'Gunakan menu akun untuk membuka panduan kembali atau mengubah profil.',
            },
        ],
    },
    student: {
        slides: [
            {
                id: 'student-learning',
                icon: 'learning',
                title: 'Mulai belajar dari menu Belajar',
                description: 'Pilih course yang sedang diikuti, lanjutkan lesson terakhir, selesaikan step, quiz, dan submission.',
            },
            {
                id: 'student-attendance',
                icon: 'calendar',
                title: 'Scan QR untuk presensi kelas offline',
                description: 'Jika sekolah memiliki jadwal offline, siswa melakukan presensi dengan scan QR dari pengajar.',
            },
            {
                id: 'student-store',
                icon: 'store',
                title: 'Katalog, toko, dan kode aktivasi',
                description: 'Jelajahi kelas, lihat order toko robotik, dan redeem kode aktivasi dari paket belajar.',
            },
            {
                id: 'student-certificate',
                icon: 'certificate',
                title: 'Sertifikat dan pembayaran tercatat',
                description: 'Sertifikat, invoice, dan riwayat pembayaran tersimpan di akun siswa.',
            },
        ],
        coachSteps: [
            {
                id: 'student-dashboard',
                target: 'tour-nav-dashboard',
                title: 'Dashboard siswa',
                description: 'Dashboard menampilkan ringkasan progress, aktivitas belajar, dan tugas yang perlu diselesaikan.',
            },
            {
                id: 'student-learning',
                target: 'tour-nav-belajar',
                title: 'Belajar',
                description: 'Masuk ke course yang sedang diikuti dan lanjutkan dari posisi terakhir.',
            },
            {
                id: 'student-scan',
                target: 'tour-nav-scan-presensi',
                title: 'Scan Presensi',
                description: 'Gunakan menu ini saat pengajar menampilkan QR presensi di kelas offline.',
            },
            {
                id: 'student-account',
                target: 'tour-account-menu',
                title: 'Bantuan dan profil',
                description: 'Buka menu akun untuk mengubah profil atau menjalankan ulang panduan penggunaan.',
            },
        ],
    },
};

export function resolveAppRole(role?: string | null): AppRole {
    if (role === 'admin') return 'admin';
    if (role === 'internal_instructor' || role === 'instructor') return 'instructor';
    if (role === 'school_teacher' || role === 'teacher') return 'teacher';

    return 'student';
}

export function walkthroughConfigForRole(role?: string | null): WalkthroughConfig {
    return configs[resolveAppRole(role)];
}

export function tourTargetForNavItem(item: NavItem) {
    return `tour-nav-${slugifyTourTarget(item.title)}`;
}

function slugifyTourTarget(value: string) {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}
