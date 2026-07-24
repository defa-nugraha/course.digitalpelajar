import { FooterMark, PublicContent, PublicNav } from '@/components/platform';
import { SeoData, SeoHead } from '@/components/seo-head';
import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    Bell,
    BookOpen,
    ClipboardCheck,
    Clock,
    Code2,
    LibraryBig,
    MessageSquare,
    Route,
    ShieldCheck,
    Star,
    Upload,
    UserRound,
    type LucideIcon,
} from 'lucide-react';

interface Course {
    id: number;
    title: string;
    description: string;
    level: string;
    priceType: string;
    priceLabel: string;
    lessons: number;
    duration?: string;
    detailUrl?: string;
    imageUrl?: string;
}

interface PartnerSchool {
    id: number;
    name: string;
    logoUrl?: string | null;
}

interface SectionItem {
    title: string;
    description: string;
    icon?: string;
    tone?: string;
    featured?: boolean;
}

interface SectionBadge {
    label: string;
    icon?: string;
}

interface HomeSection {
    id?: number;
    key: string;
    name: string;
    sectionType: string;
    eyebrow?: string | null;
    title?: string | null;
    subtitle?: string | null;
    body?: string | null;
    primaryLabel?: string | null;
    primaryUrl?: string | null;
    secondaryLabel?: string | null;
    secondaryUrl?: string | null;
    imageUrl?: string | null;
    items?: SectionItem[];
    metadata?: {
        highlight_word?: string;
        floating_label?: string;
        trust_prefix?: string;
        trust_suffix?: string;
        limit?: number | string | null;
        badges?: SectionBadge[];
    };
    isVisible?: boolean;
    sortOrder: number;
}

interface WelcomeProps {
    seo?: SeoData;
    courses: Course[];
    partnerSchools: PartnerSchool[];
    homeSections?: HomeSection[];
    stats: {
        students: number;
        courses: number;
        certificates: number;
    };
}

const fallbackHeroImage = '/logo.png';

const courseImages = ['/logo.png'];

const iconMap: Record<string, LucideIcon> = {
    badge: BadgeCheck,
    bell: Bell,
    library: LibraryBig,
    message: MessageSquare,
    quiz: ClipboardCheck,
    route: Route,
    shield: ShieldCheck,
    upload: Upload,
};

const fallbackSections: HomeSection[] = [
    {
        key: 'hero',
        name: 'Hero Utama',
        sectionType: 'hero',
        sortOrder: 10,
        eyebrow: 'Platform Belajar Robotik Terstruktur',
        title: 'Belajar Robotik Lebih Terstruktur, Praktis, dan Bersertifikat',
        subtitle:
            'Kuasai teori, perakitan hardware, dan coding secara interaktif. Bangun portofolio project nyata dan dapatkan sertifikat digital yang dapat diverifikasi.',
        primaryLabel: 'Mulai Belajar',
        primaryUrl: '/courses',
        secondaryLabel: 'Lihat Kelas',
        secondaryUrl: '/courses',
        imageUrl: fallbackHeroImage,
        metadata: {
            highlight_word: 'Terstruktur',
            floating_label: 'Modul Coding',
            trust_prefix: 'Bergabung dengan',
            trust_suffix: 'pelajar',
        },
    },
    {
        key: 'features',
        name: 'Fitur Belajar',
        sectionType: 'features',
        sortOrder: 20,
        title: 'Fitur Belajar Komprehensif',
        subtitle: 'Ekosistem pembelajaran dirancang untuk memastikan pemahaman mendalam dari teori hingga praktik.',
        items: [
            {
                title: 'Learning Path Terarah',
                description:
                    'Kurikulum disusun sistematis dari tingkat dasar hingga mahir, sehingga Anda dapat belajar robotik dengan urutan yang jelas.',
                icon: 'route',
                featured: true,
            },
            {
                title: 'Modular Content',
                description: 'Materi dibagi dalam modul kecil yang mudah dicerna dan langsung bisa dipraktikkan.',
                icon: 'library',
            },
            {
                title: 'Interactive Quizzes',
                description: 'Uji pemahaman setelah menyelesaikan materi dan pantau kesiapan sebelum melanjutkan.',
                icon: 'quiz',
                tone: 'amber',
            },
            {
                title: 'Project Submission',
                description: 'Kumpulkan hasil rakitan fisik, kode program, laporan, dan video demonstrasi langsung di platform.',
                icon: 'upload',
            },
            {
                title: 'Expert Review',
                description: 'Dapatkan masukan dari pengajar untuk memperbaiki proyek dan meningkatkan kualitas portofolio.',
                icon: 'message',
                tone: 'purple',
            },
        ],
    },
    {
        key: 'popular-courses',
        name: 'Kelas Populer',
        sectionType: 'courses',
        sortOrder: 30,
        title: 'Kelas Populer',
        subtitle: 'Mulai perjalanan robotik Anda dengan kelas pilihan terbanyak.',
        primaryLabel: 'Lihat Semua Kelas',
        primaryUrl: '/courses',
        metadata: { limit: 3 },
    },
    {
        key: 'partner-schools',
        name: 'Partner Belajar',
        sectionType: 'partners',
        sortOrder: 40,
        eyebrow: 'Partner Belajar',
        title: 'Dipercaya oleh sekolah dan komunitas belajar',
        subtitle: 'Bersama institusi pendidikan yang aktif mengembangkan pembelajaran teknologi dan robotik.',
    },
    {
        key: 'benefits',
        name: 'Kenapa Belajar',
        sectionType: 'benefits',
        sortOrder: 50,
        eyebrow: 'Kenapa belajar di RoboAcademy?',
        title: 'Belajar robotik lebih mudah, terarah, dan praktis',
        primaryLabel: 'Mulai Belajar',
        primaryUrl: '/courses',
        metadata: {
            badges: [
                { label: 'Alur belajar aman', icon: 'shield' },
                { label: 'Sertifikat terverifikasi', icon: 'badge' },
            ],
        },
        items: [
            {
                icon: 'route',
                title: 'Learning path jelas',
                description: 'Ikuti urutan kelas dari dasar sampai proyek lanjutan tanpa bingung harus mulai dari mana.',
            },
            {
                icon: 'quiz',
                title: 'Ujian lebih mudah dipantau',
                description: 'Progress, kuis, submission, dan review pengajar tersimpan dalam satu tempat.',
            },
            {
                icon: 'bell',
                title: 'Update pembelajaran instan',
                description: 'Siswa dan pengajar mendapat informasi penting terkait kelas, tugas, dan sertifikat.',
            },
        ],
    },
];

export default function Welcome({ seo, courses, partnerSchools, homeSections = [], stats }: WelcomeProps) {
    const totalLessons = courses.reduce((total, course) => total + course.lessons, 0);
    const sections = (homeSections.length > 0 ? homeSections : fallbackSections)
        .filter((section) => section.isVisible !== false)
        .sort((a, b) => a.sortOrder - b.sortOrder);

    return (
        <>
            <SeoHead seo={seo} fallbackTitle="Aplikasi Pembelajaran Robotik" />
            <div className="min-h-screen bg-[#FAF8FF] text-slate-950">
                <PublicNav />
                <PublicContent>
                    <main className="pt-16">
                        {sections.map((section) => (
                            <HomeSectionRenderer
                                key={section.key}
                                section={section}
                                courses={courses}
                                partnerSchools={partnerSchools}
                                stats={stats}
                                totalLessons={totalLessons}
                            />
                        ))}
                    </main>
                </PublicContent>
                <FooterMark />
            </div>
        </>
    );
}

function HomeSectionRenderer({
    section,
    courses,
    partnerSchools,
    stats,
    totalLessons,
}: {
    section: HomeSection;
    courses: Course[];
    partnerSchools: PartnerSchool[];
    stats: WelcomeProps['stats'];
    totalLessons: number;
}) {
    if (section.sectionType === 'hero') return <HeroSection section={section} stats={stats} totalLessons={totalLessons} />;
    if (section.sectionType === 'features') return <FeatureSection section={section} />;
    if (section.sectionType === 'courses') return <CoursesSection section={section} courses={courses} />;
    if (section.sectionType === 'partners') return <PartnerSection section={section} partnerSchools={partnerSchools} />;
    if (section.sectionType === 'benefits') return <BenefitsSection section={section} />;

    return <CustomSection section={section} />;
}

function HeroSection({ section, stats, totalLessons }: { section: HomeSection; stats: WelcomeProps['stats']; totalLessons: number }) {
    const highlightWord = section.metadata?.highlight_word || 'Terstruktur';
    const floatingLabel = section.metadata?.floating_label || 'Modul Coding';
    const trustPrefix = section.metadata?.trust_prefix || 'Bergabung dengan';
    const trustSuffix = section.metadata?.trust_suffix || 'pelajar';
    const shouldShowEyebrow = section.eyebrow && section.eyebrow !== 'Platform Belajar Robotik Terstruktur';

    return (
        <section className="relative mx-auto grid max-w-7xl items-center gap-10 overflow-hidden px-4 pt-14 pb-16 md:px-10 md:pt-24 md:pb-28 lg:grid-cols-2">
            <div className="absolute top-20 right-0 -z-10 h-[500px] w-[500px] rounded-full bg-[#D6E3FF] opacity-50 blur-[100px]" />
            <div className="absolute bottom-0 left-0 -z-10 h-[400px] w-[400px] rounded-full bg-[#EADDFF] opacity-40 blur-[80px]" />
            <div className="flex flex-col gap-6">
                {shouldShowEyebrow && (
                    <div className="inline-flex w-max items-center gap-2 rounded-full border border-slate-200 bg-[#E2E7FF] px-3 py-1">
                        <span className="size-2 rounded-full bg-[#1C7DE8]" />
                        <span className="text-sm font-bold text-[#005BB1]">{section.eyebrow}</span>
                    </div>
                )}
                <h1 className="max-w-3xl text-3xl leading-tight font-extrabold tracking-[-0.02em] text-[#131B2E] sm:text-4xl md:text-6xl">
                    <HighlightedTitle title={section.title || 'Belajar Robotik Lebih Terstruktur'} highlightWord={highlightWord} />
                </h1>
                {section.subtitle && <p className="max-w-2xl text-base leading-8 text-[#414753] md:text-lg">{section.subtitle}</p>}
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    {section.primaryLabel && (
                        <Button
                            asChild
                            size="lg"
                            className="w-full rounded-xl bg-[#1C7DE8] px-8 py-6 shadow-[0_10px_30px_rgba(28,125,232,0.2)] hover:bg-[#1469c7] sm:w-auto"
                        >
                            <Link href={section.primaryUrl || '/courses'}>{section.primaryLabel}</Link>
                        </Button>
                    )}
                    {section.secondaryLabel && (
                        <Button
                            asChild
                            size="lg"
                            variant="outline"
                            className="w-full rounded-xl border-[#1C7DE8] bg-white px-8 py-6 text-[#1C7DE8] hover:bg-[#F2F3FF] sm:w-auto"
                        >
                            <Link href={section.secondaryUrl || '/courses'}>{section.secondaryLabel}</Link>
                        </Button>
                    )}
                </div>
                <div className="mt-8 flex items-center gap-4 border-t border-slate-200 pt-8">
                    <div className="flex -space-x-3">
                        {['bg-blue-100 text-blue-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-slate-900'].map((tone, index) => (
                            <span key={tone} className={`flex size-10 items-center justify-center rounded-full border-2 border-white ${tone}`}>
                                <UserRound className="size-5" />
                                <span className="sr-only">Pelajar {index + 1}</span>
                            </span>
                        ))}
                    </div>
                    <div>
                        <div className="flex items-center gap-1 text-[#FED635]">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <Star key={index} className="size-4 fill-current" />
                            ))}
                        </div>
                        <p className="text-sm font-medium text-[#414753]">
                            {trustPrefix} {stats.students.toLocaleString('id-ID')} {trustSuffix}
                        </p>
                    </div>
                </div>
            </div>
            <div className="relative flex aspect-[4/3] w-full items-center justify-center lg:aspect-square">
                <div className="absolute inset-0 rotate-3 rounded-[2rem] bg-gradient-to-tr from-[#0073DD]/20 to-[#8757E6]/20" />
                <img
                    src={section.imageUrl || fallbackHeroImage}
                    alt={section.title || 'Pelajar merakit robot di laboratorium edukasi'}
                    className="relative z-10 h-full w-full rounded-[2rem] object-cover shadow-[0_10px_40px_rgba(15,23,42,0.1)]"
                />
                <div className="absolute right-3 bottom-3 z-20 flex items-center gap-3 rounded-xl border border-white/50 bg-white/85 p-3 shadow-lg backdrop-blur-md md:top-1/4 md:right-auto md:bottom-auto md:-left-8 md:gap-4 md:p-4">
                    <div className="flex size-12 items-center justify-center rounded-lg bg-[#005BB1] text-white">
                        <Code2 className="size-6" />
                    </div>
                    <div>
                        <p className="text-xl font-extrabold text-[#131B2E] md:text-2xl">{Math.max(totalLessons, stats.courses)}+</p>
                        <p className="text-sm font-medium text-[#414753]">{floatingLabel}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function FeatureSection({ section }: { section: HomeSection }) {
    return (
        <section className="bg-[#FAF8FF] px-4 py-24 md:px-10">
            <div className="mx-auto max-w-7xl">
                <SectionHeader title={section.title} subtitle={section.subtitle} />
                <div className="grid grid-cols-1 gap-6 md:auto-rows-[250px] md:grid-cols-3">
                    {(section.items ?? []).map((feature) => (
                        <FeatureCard key={`${feature.title}-${feature.icon}`} feature={feature} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function CoursesSection({ section, courses }: { section: HomeSection; courses: Course[] }) {
    const limit = Number(section.metadata?.limit || 3);
    const popularCourses = courses.slice(0, limit);

    return (
        <section className="bg-[#F2F3FF] px-4 py-24 md:px-10">
            <div className="mx-auto max-w-7xl">
                <div className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div>
                        <h2 className="text-3xl font-extrabold tracking-tight text-[#131B2E] md:text-4xl">{section.title}</h2>
                        {section.subtitle && <p className="mt-2 leading-7 text-[#414753]">{section.subtitle}</p>}
                    </div>
                    {section.primaryLabel && (
                        <Button asChild variant="ghost" className="w-fit text-[#005BB1] hover:text-[#005BB1]">
                            <Link href={section.primaryUrl || '/courses'}>
                                {section.primaryLabel}
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                    )}
                </div>
                {popularCourses.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {popularCourses.map((course, index) => (
                            <CourseCard key={course.id} course={course} image={course.imageUrl || courseImages[index % courseImages.length]} />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
                        Kelas akan tampil setelah dipublikasikan oleh tim pengelola.
                    </div>
                )}
            </div>
        </section>
    );
}

function PartnerSection({ section, partnerSchools }: { section: HomeSection; partnerSchools: PartnerSchool[] }) {
    const basePartnerSchools =
        partnerSchools.length > 0 ? Array.from({ length: Math.max(1, Math.ceil(12 / partnerSchools.length)) }).flatMap(() => partnerSchools) : [];
    const marqueePartnerSchools = [...basePartnerSchools, ...basePartnerSchools];

    return (
        <section className="bg-white py-16">
            <div>
                <div className="mx-auto mb-8 max-w-7xl px-4 text-center md:px-10">
                    {section.eyebrow && <p className="text-sm font-bold tracking-wider text-[#005BB1] uppercase">{section.eyebrow}</p>}
                    <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#131B2E]">{section.title}</h2>
                    {section.subtitle && <p className="mx-auto mt-3 max-w-2xl leading-7 text-[#414753]">{section.subtitle}</p>}
                </div>
                {partnerSchools.length > 0 ? (
                    <div className="relative w-full overflow-hidden py-5">
                        <div className="partner-logo-marquee flex w-max gap-10">
                            {marqueePartnerSchools.map((school, index) => (
                                <SchoolLogoCard key={`${school.id}-${index}`} school={school} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="mx-4 rounded-2xl border border-dashed border-slate-300 bg-[#FAF8FF] p-8 text-center text-sm text-slate-500 md:mx-10">
                        Logo sekolah mitra akan tampil setelah data sekolah aktif ditambahkan.
                    </div>
                )}
            </div>
        </section>
    );
}

function BenefitsSection({ section }: { section: HomeSection }) {
    return (
        <section className="relative overflow-hidden bg-white px-4 py-16 md:px-10">
            {section.imageUrl && (
                <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: `url("${section.imageUrl}")` }}
                />
            )}
            <div className="absolute top-6 left-10 h-12 w-12 rounded-full border-4 border-[#B7E2FF]/70 opacity-60" />
            <div className="absolute top-0 right-8 h-40 w-64 rounded-full border border-dashed border-[#B7E2FF] opacity-60" />
            <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.35fr] lg:items-center">
                <div>
                    {section.eyebrow && <p className="text-lg font-extrabold text-[#131B2E]">{section.eyebrow}</p>}
                    <h2 className="mt-6 max-w-xl text-4xl leading-tight font-extrabold tracking-[-0.02em] text-[#07152F] md:text-5xl">
                        {section.title}
                    </h2>
                    <div className="mt-5 flex flex-wrap gap-3">
                        {(section.metadata?.badges ?? []).map((badge) => {
                            const Icon = iconFor(badge.icon);

                            return (
                                <span
                                    key={badge.label}
                                    className="inline-flex items-center gap-2 rounded-full border border-[#B7E2FF] bg-white/80 px-4 py-2 text-sm font-bold text-[#005BB1]"
                                >
                                    <Icon className="size-4" />
                                    {badge.label}
                                </span>
                            );
                        })}
                    </div>
                    {section.primaryLabel && (
                        <Button asChild className="mt-7 rounded-2xl bg-[#0796D7] px-8 py-6 text-base font-bold hover:bg-[#087FBA]">
                            <Link href={section.primaryUrl || '/courses'}>
                                {section.primaryLabel}
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                    )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {(section.items ?? []).map((item) => (
                        <BenefitCard key={`${item.title}-${item.icon}`} icon={iconFor(item.icon)} title={item.title} description={item.description} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function CustomSection({ section }: { section: HomeSection }) {
    return (
        <section className="bg-white px-4 py-20 md:px-10">
            <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-[#FAF8FF] p-8 shadow-sm md:p-12">
                <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                    <div>
                        {section.eyebrow && <p className="text-sm font-bold tracking-wider text-[#005BB1] uppercase">{section.eyebrow}</p>}
                        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#131B2E] md:text-4xl">{section.title || section.name}</h2>
                        {section.subtitle && <p className="mt-4 leading-7 text-[#414753]">{section.subtitle}</p>}
                        {section.body && <p className="mt-4 leading-7 text-[#414753]">{section.body}</p>}
                        <div className="mt-6 flex flex-wrap gap-3">
                            {section.primaryLabel && (
                                <Button asChild className="bg-[#1C7DE8] hover:bg-[#1469c7]">
                                    <Link href={section.primaryUrl || '/courses'}>{section.primaryLabel}</Link>
                                </Button>
                            )}
                            {section.secondaryLabel && (
                                <Button asChild variant="outline">
                                    <Link href={section.secondaryUrl || '/courses'}>{section.secondaryLabel}</Link>
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        {(section.items ?? []).map((item) => {
                            const Icon = iconFor(item.icon);

                            return (
                                <article key={`${item.title}-${item.icon}`} className="rounded-2xl border border-slate-200 bg-white p-6">
                                    <Icon className="size-8 text-[#1C7DE8]" />
                                    <h3 className="mt-4 font-bold text-[#131B2E]">{item.title}</h3>
                                    <p className="mt-2 text-sm leading-6 text-[#414753]">{item.description}</p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}

function SectionHeader({ title, subtitle }: { title?: string | null; subtitle?: string | null }) {
    return (
        <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-[#131B2E] md:text-4xl">{title}</h2>
            {subtitle && <p className="mt-4 leading-7 text-[#414753]">{subtitle}</p>}
        </div>
    );
}

function HighlightedTitle({ title, highlightWord }: { title: string; highlightWord: string }) {
    const index = title.toLowerCase().indexOf(highlightWord.toLowerCase());

    if (!highlightWord || index < 0) {
        return <>{title}</>;
    }

    const before = title.slice(0, index);
    const highlighted = title.slice(index, index + highlightWord.length);
    const after = title.slice(index + highlightWord.length);

    return (
        <>
            {before}
            <span className="bg-gradient-to-r from-[#1C7DE8] to-[#6D3BCB] bg-clip-text text-transparent">{highlighted}</span>
            {after}
        </>
    );
}

function SchoolLogoCard({ school }: { school: PartnerSchool }) {
    return (
        <article className="flex h-28 w-56 shrink-0 items-center justify-center md:w-64">
            {school.logoUrl ? (
                <img src={school.logoUrl} alt={`Logo ${school.name}`} className="max-h-20 max-w-full object-contain" />
            ) : (
                <div className="flex flex-col items-center gap-2 text-center">
                    <span className="flex size-16 items-center justify-center rounded-2xl bg-[#D6E3FF] text-xl font-extrabold text-[#005BB1]">
                        {initials(school.name)}
                    </span>
                    <span className="line-clamp-2 text-sm font-semibold text-[#414753]">{school.name}</span>
                </div>
            )}
        </article>
    );
}

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

function BenefitCard({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
            <Icon className="size-9 text-[#0796D7]" />
            <h3 className="mt-4 text-lg leading-7 font-extrabold text-[#07152F]">{title}</h3>
            <p className="mt-2 text-sm leading-7 text-[#414753]">{description}</p>
        </article>
    );
}

function FeatureCard({ feature }: { feature: SectionItem }) {
    const Icon = iconFor(feature.icon);
    const iconClass =
        feature.tone === 'amber'
            ? 'bg-[#FED635]/20 text-slate-950'
            : feature.tone === 'purple'
              ? 'bg-violet-100 text-violet-700'
              : 'bg-blue-100 text-[#005BB1]';

    if (feature.featured) {
        return (
            <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-[#F2F3FF] p-8 shadow-[0_4px_20px_rgba(15,23,42,0.05)] transition hover:shadow-[0_10px_30px_rgba(15,23,42,0.1)] md:col-span-2">
                <div className="relative z-10 flex h-full w-2/3 flex-col justify-between">
                    <div className={`mb-4 flex size-14 items-center justify-center rounded-xl ${iconClass}`}>
                        <Icon className="size-7" />
                    </div>
                    <div>
                        <h3 className="mb-2 text-2xl font-extrabold text-[#131B2E]">{feature.title}</h3>
                        <p className="leading-7 text-[#414753]">{feature.description}</p>
                    </div>
                </div>
                <div className="absolute top-0 right-0 bottom-0 w-1/2 bg-gradient-to-l from-[#005BB1]/5 to-transparent" />
                <Icon className="absolute -right-10 -bottom-10 size-52 text-[#005BB1]/5 transition group-hover:scale-110" />
            </article>
        );
    }

    return (
        <article className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-[#EAEDFF] p-8 shadow-[0_4px_20px_rgba(15,23,42,0.05)] transition hover:shadow-[0_10px_30px_rgba(15,23,42,0.1)]">
            <div className={`flex size-14 items-center justify-center rounded-xl ${iconClass}`}>
                <Icon className="size-7" />
            </div>
            <div>
                <h3 className="mb-2 text-lg font-bold text-[#131B2E]">{feature.title}</h3>
                <p className="text-sm leading-6 text-[#414753]">{feature.description}</p>
            </div>
        </article>
    );
}

function CourseCard({ course, image }: { course: Course; image: string }) {
    return (
        <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(15,23,42,0.1)]">
            <div className="relative h-48 overflow-hidden bg-slate-200">
                <img
                    src={image}
                    alt={`Foto produk ${course.title}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute top-4 left-4 rounded-full border border-[#1C7DE8]/20 bg-[#1C7DE8]/10 px-3 py-1 text-xs font-bold text-[#1C7DE8] backdrop-blur-sm">
                    {course.level}
                </div>
            </div>
            <div className="flex h-[calc(100%-12rem)] flex-col justify-between p-6">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#414753]">
                        <BookOpen className="size-4" /> {course.lessons} Modul
                        <span className="mx-1 size-1 rounded-full bg-slate-400" />
                        <Clock className="size-4" /> {course.duration ?? `${course.lessons * 20} menit`}
                    </div>
                    <h3 className="mb-2 line-clamp-2 text-2xl font-extrabold text-[#131B2E]">{course.title}</h3>
                    <p className="mb-4 line-clamp-2 text-sm leading-6 text-[#414753]">{course.description}</p>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                    <span className="text-sm font-bold text-[#131B2E]">{course.priceLabel}</span>
                    <Link
                        href={course.detailUrl ?? '/courses'}
                        className="flex items-center gap-1 text-sm font-semibold text-[#005BB1] transition hover:text-[#0073DD]"
                    >
                        Detail <ArrowRight className="size-4" />
                    </Link>
                </div>
            </div>
        </article>
    );
}

function iconFor(value?: string | null): LucideIcon {
    return iconMap[value ?? 'route'] ?? Route;
}
