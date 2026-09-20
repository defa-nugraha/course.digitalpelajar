import {
    Award,
    BarChart3,
    BookOpen,
    Building2,
    CalendarDays,
    ClipboardCheck,
    ClipboardList,
    GraduationCap,
    Home,
    LayoutDashboard,
    LibraryBig,
    MessageSquare,
    Package,
    PanelLeft,
    QrCode,
    Route,
    Search,
    Settings,
    ShieldCheck,
    TrendingUp,
    Upload,
    Users,
    Wallet,
    type LucideIcon,
} from 'lucide-react';

export const skplFindings = [
    'Role wajib: Admin Pusat, Pengajar Internal, Guru Sekolah, Siswa, dan integrasi Midtrans.',
    'Konten belajar memakai learning path, course, chapter, lesson, dan content block.',
    'Course builder harus mendukung text, image, video, code, file, quiz, submission, checklist, note, warning, upload PDF sebagai draft, preview, dan publish review.',
    'Akses kelas dibedakan gratis dan berbayar; kelas berbayar aktif setelah callback Midtrans valid.',
    'Progress, quiz, ujian akhir, final project, review, forum, sertifikat PDF, QR/token verifikasi, dan laporan harus tercatat konsisten.',
];

export const designFindings = [
    'Landing page menekankan learning path robotik, modul coding, quiz interaktif, submission proyek, review ahli, kelas populer, dan CTA login/register.',
    'Dashboard siswa menonjolkan progress saat ini, tugas mendatang, kelas diikuti, quiz, dan sertifikat.',
    'Halaman belajar menggunakan sidebar chapter/lesson bertahap, lesson player, wiring, contoh kode, quiz, dan submission.',
    'Dashboard guru sekolah fokus ke monitoring progress siswa sekolah.',
    'Area admin terdiri dari manajemen sekolah, detail sekolah, manajemen user, course builder, sertifikat, dan laporan analitik.',
    'Alur payment memiliki checkout, menunggu pembayaran, sukses pembayaran, serta trust signal Midtrans.',
    'Sistem visual bernama Industrial-Educational Hybrid: Plus Jakarta Sans, biru primer, ungu sekunder, aksen kuning, surface terang, radius 8-16px.',
];

export const features = [
    { title: 'Learning Path Terarah', description: 'Urutan kelas dari dasar robotik, sensor, aktuator, hingga integrasi industri.', icon: Route },
    {
        title: 'Modular Content',
        description: 'Materi dipecah menjadi chapter, lesson, dan block yang bisa dibuka bebas, bertahap, atau terjadwal.',
        icon: LibraryBig,
    },
    { title: 'Quiz dan Ujian Akhir', description: 'Quiz dapat muncul di tengah lesson, ujian akhir menjadi syarat kelulusan.', icon: ClipboardCheck },
    { title: 'Project Submission', description: 'Siswa mengirim kode, laporan, foto, dan link video demonstrasi proyek hardware.', icon: Upload },
    {
        title: 'Review Pengajar',
        description: 'Pengajar berwenang memberi nilai, feedback, status diterima, atau revisi.',
        icon: MessageSquare,
    },
    {
        title: 'Sertifikat Terverifikasi',
        description: 'Sertifikat memiliki nomor unik, token QR, download PDF, dan verifikasi publik.',
        icon: ShieldCheck,
    },
];

export const adminNav = [
    { title: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    {
        title: 'Sekolah',
        icon: Building2,
        children: [
            { title: 'Data Sekolah', href: '/admin/schools', icon: Building2 },
            { title: 'Akses Learning Path', href: '/admin/school-learning-path-accesses', icon: Route },
        ],
    },
    { title: 'User', href: '/admin/users', icon: Users },
    { title: 'Siswa', href: '/admin/students', icon: GraduationCap },
    { title: 'Learning Path', href: '/admin/learning-paths', icon: Route },
    { title: 'Course Builder', href: '/admin/course-builder', icon: PanelLeft },
    { title: 'Jadwal Mengajar', href: '/admin/teaching-schedules', icon: CalendarDays },
    { title: 'Laporan Pertemuan', href: '/admin/teaching-sessions', icon: ClipboardList },
    { title: 'Feedback Pertemuan', href: '/admin/teaching-feedbacks', icon: MessageSquare },
    { title: 'Review', href: '/reviews', icon: ClipboardCheck },
    {
        title: 'Sertifikat',
        icon: Award,
        children: [
            { title: 'Data Sertifikat', href: '/admin/certificates#data-sertifikat', icon: Award },
            { title: 'Pengaturan Sertifikat', href: '/admin/certificates#pengaturan-sertifikat', icon: Settings },
        ],
    },
    { title: 'Pembayaran', href: '/admin/payments', icon: Wallet },
    { title: 'Toko Robotik', href: '/admin/store', icon: Package },
    { title: 'Gaji Pengajar', href: '/admin/instructor-payrolls', icon: Wallet },
    { title: 'Laporan', href: '/admin/reports', icon: BarChart3 },
    {
        title: 'Pengaturan',
        icon: Settings,
        children: [
            { title: 'Home Page', href: '/admin/home-page', icon: Home },
            { title: 'Footer', href: '/admin/footer', icon: Settings },
            { title: 'SEO', href: '/admin/seo-settings', icon: Search },
        ],
    },
];

export const studentNav = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Belajar', href: '/student/learning', icon: GraduationCap },
    { title: 'Scan Presensi', href: '/student/attendance/scan', icon: QrCode },
    { title: 'Katalog', href: '/student/catalog', icon: BookOpen },
    { title: 'Toko Robotik', href: '/store/orders', icon: Package },
    { title: 'Redeem Kode', href: '/activation-codes/redeem', icon: QrCode },
    { title: 'Sertifikat', href: '/certificates', icon: Award },
    { title: 'Pembayaran', href: '/payments', icon: Wallet },
];

export const teacherNav = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Pertemuan Sekolah', href: '/teacher/teaching-sessions', icon: ClipboardList },
    { title: 'Belajar', href: '/teacher/learning', icon: GraduationCap },
    { title: 'Katalog', href: '/teacher/catalog', icon: BookOpen },
    { title: 'Toko Robotik', href: '/store/orders', icon: Package },
    { title: 'Redeem Kode', href: '/activation-codes/redeem', icon: QrCode },
    {
        title: 'Siswa',
        icon: Users,
        children: [
            { title: 'Progres per Pertemuan', href: '/teacher/students', icon: TrendingUp, exact: true },
            { title: 'Rekap Kehadiran Siswa', href: '/teacher/students/attendance', icon: ClipboardCheck },
        ],
    },
];

export const instructorNav = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Siswa', href: '/instructor/students', icon: GraduationCap },
    { title: 'Learning Path', href: '/instructor/learning-paths', icon: Route },
    { title: 'Course Builder', href: '/instructor/course-builder', icon: PanelLeft },
    { title: 'Jadwal Saya', href: '/instructor/schedules', icon: CalendarDays },
    { title: 'Laporan Saya', href: '/instructor/teaching-sessions', icon: ClipboardList },
    { title: 'Feedback Siswa', href: '/instructor/teaching-feedbacks', icon: MessageSquare },
    { title: 'Gaji Saya', href: '/instructor/payrolls', icon: Wallet },
    { title: 'Review', href: '/reviews', icon: ClipboardCheck },
    { title: 'Pengaturan', href: '/settings/profile', icon: Settings },
];

export interface NavItem {
    title: string;
    href?: string;
    icon: LucideIcon;
    children?: NavItem[];
    exact?: boolean;
}
