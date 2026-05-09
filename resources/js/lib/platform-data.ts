import {
    Award,
    BarChart3,
    BookOpen,
    Building2,
    CheckCircle2,
    ClipboardCheck,
    Code2,
    CreditCard,
    FileText,
    GraduationCap,
    LayoutDashboard,
    LibraryBig,
    Lock,
    MessageSquare,
    PanelLeft,
    Route,
    School,
    ShieldCheck,
    Upload,
    Users,
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
    'Dashboard guru sekolah fokus ke siswa sekolah, progress, kelas aktif, submission, dan sertifikat sekolah.',
    'Area admin terdiri dari manajemen sekolah, detail sekolah, manajemen user, course builder, sertifikat, dan laporan analitik.',
    'Alur payment memiliki checkout, menunggu pembayaran, sukses pembayaran, serta trust signal Midtrans.',
    'Sistem visual bernama Industrial-Educational Hybrid: Plus Jakarta Sans, biru primer, ungu sekunder, aksen kuning, surface terang, radius 8-16px.',
];

export const features = [
    { title: 'Learning Path Terarah', description: 'Urutan kelas dari dasar robotik, sensor, aktuator, hingga integrasi industri.', icon: Route },
    { title: 'Modular Content', description: 'Materi dipecah menjadi chapter, lesson, dan block yang bisa dibuka bebas, bertahap, atau terjadwal.', icon: LibraryBig },
    { title: 'Quiz dan Ujian Akhir', description: 'Quiz dapat muncul di tengah lesson, ujian akhir menjadi syarat kelulusan.', icon: ClipboardCheck },
    { title: 'Project Submission', description: 'Siswa mengirim kode, laporan, foto, dan link video demonstrasi proyek hardware.', icon: Upload },
    { title: 'Review Pengajar', description: 'Pengajar dan guru berwenang memberi nilai, feedback, status diterima, atau revisi.', icon: MessageSquare },
    { title: 'Sertifikat Terverifikasi', description: 'Sertifikat memiliki nomor unik, token QR, download PDF, dan verifikasi publik.', icon: ShieldCheck },
];

export const courses = [
    {
        title: 'Dasar Robotik dan Arduino',
        level: 'Beginner',
        price: 'Gratis',
        duration: '8 jam',
        lessons: 24,
        progress: 68,
        status: 'Available',
        description: 'Elektronika dasar, pemrograman C++, sensor sederhana, dan aktuator pertama.',
    },
    {
        title: 'Industrial Automation & Kinematics',
        level: 'Intermediate',
        price: 'Rp 1.500.000',
        duration: '14 jam',
        lessons: 42,
        progress: 32,
        status: 'Paid',
        description: 'Forward/inverse kinematics, Denavit-Hartenberg, dan simulasi lengan robot industri.',
    },
    {
        title: 'Autonomous Navigation Algorithms',
        level: 'Advanced',
        price: 'Rp 2.250.000',
        duration: '18 jam',
        lessons: 50,
        progress: 0,
        status: 'Locked',
        description: 'SLAM, path planning, sensor fusion, dan computer vision untuk robot mobile.',
    },
];

export const studentTasks = [
    { title: 'Sensor Calibration Quiz', meta: 'Due in 2 days', status: 'Quiz', tone: 'blue' },
    { title: 'Project: Assembly Line', meta: 'High priority submission', status: 'Submission', tone: 'amber' },
    { title: 'Peer Review Setup', meta: 'Optional activity', status: 'Forum', tone: 'purple' },
];

export const chapters = [
    {
        title: 'Chapter 1: Pengenalan',
        lessons: [
            { title: 'Apa itu Robotika?', state: 'done' },
            { title: 'Komponen Dasar', state: 'done' },
        ],
    },
    {
        title: 'Chapter 2: Sensor & Aktuator',
        lessons: [
            { title: 'Sensor Ultrasonik', state: 'current' },
            { title: 'Motor Servo Dasar', state: 'locked' },
        ],
    },
    {
        title: 'Chapter 3: Pemrograman',
        lessons: [{ title: 'Logika Kontrol', state: 'locked' }],
    },
];

export const schools = [
    { name: 'Jakarta International Robotics Academy', pic: 'Ahmad Yani', students: 342, teachers: 18, status: 'Active' },
    { name: 'SMAN 1 Jakarta', pic: 'Sarah Wijaya', students: 284, teachers: 11, status: 'Active' },
    { name: 'SMP Techno Future Ngawi', pic: 'Budi Santoso', students: 156, teachers: 8, status: 'Pending' },
];

export const users = [
    { name: 'Andi Saputra', email: 'andi@student.sch.id', role: 'Siswa', school: 'SMAN 1 Jakarta', status: 'Active' },
    { name: 'Rina Melati', email: 'rina@student.sch.id', role: 'Siswa', school: 'SMAN 1 Jakarta', status: 'Active' },
    { name: 'Budi Hartono', email: 'budi@guru.sch.id', role: 'Guru Sekolah', school: 'SMAN 1 Jakarta', status: 'Active' },
    { name: 'Nadia Prameswari', email: 'nadia@ngawitekno.id', role: 'Pengajar Internal', school: 'Ngawitekno', status: 'Active' },
];

export const certificateItems = [
    { title: 'Advanced Kinematics & Path Planning', no: 'NGT-2026-8F92A', issueDate: '20 Apr 2026' },
    { title: 'Sensor Fusion Fundamentals', no: 'NGT-2026-5521B', issueDate: '18 Mar 2026' },
    { title: 'ROS2 Basics & Architecture', no: 'NGT-2026-91AF0', issueDate: '10 Feb 2026' },
];

export const adminNav = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Sekolah', href: '/admin/schools', icon: Building2 },
    { title: 'User', href: '/admin/users', icon: Users },
    { title: 'Course Builder', href: '/admin/course-builder', icon: PanelLeft },
    { title: 'Sertifikat', href: '/admin/certificates', icon: Award },
    { title: 'Laporan', href: '/admin/reports', icon: BarChart3 },
];

export const studentNav = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Katalog', href: '/courses', icon: BookOpen },
    { title: 'Belajar', href: '/learning', icon: GraduationCap },
    { title: 'Checkout', href: '/checkout', icon: CreditCard },
    { title: 'Sertifikat', href: '/certificates', icon: Award },
];

export const builderBlocks = [
    { title: 'Text Block', icon: FileText, status: 'Ready' },
    { title: 'Image / Video Block', icon: Upload, status: 'Ready' },
    { title: 'Code Block', icon: Code2, status: 'Ready' },
    { title: 'Quiz Block', icon: ClipboardCheck, status: 'Placed in lesson' },
    { title: 'Submission Block', icon: Upload, status: 'Review required' },
    { title: 'PDF Conversion', icon: FileText, status: 'Draft only' },
];

export const completionRules = [
    { label: 'Progress lesson 100%', icon: CheckCircle2 },
    { label: 'Semua quiz selesai', icon: ClipboardCheck },
    { label: 'Rata-rata quiz minimal 70', icon: BarChart3 },
    { label: 'Ujian akhir minimal 75', icon: School },
    { label: 'Final project diterima', icon: Lock },
];

export type NavItem = (typeof adminNav)[number];
