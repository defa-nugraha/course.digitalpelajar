import { Crumb, FooterMark, PublicContent, PublicNav } from '@/components/platform';
import { SeoData, SeoHead } from '@/components/seo-head';
import { Button } from '@/components/ui/button';
import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, BookOpen, CheckCircle2, Clock, Layers3, Tag } from 'lucide-react';

interface Course {
    id: number;
    title: string;
    slug: string;
    description?: string | null;
    level: string;
    priceType: string;
    price: number;
    priceLabel: string;
    detailUrl: string;
    imageUrl: string;
    lessons: number;
    duration: string;
    enrolled: boolean;
    schoolAccess: boolean;
    progress: number;
    accessMode: string;
    learningPath?: {
        title: string;
        url: string;
    } | null;
    chapters: {
        id: number;
        title: string;
        orderNo: number;
        lessons: {
            id: number;
            title: string;
            orderNo: number;
        }[];
    }[];
}

export default function CourseShow({ seo, course, relatedCourses }: { seo?: SeoData; course: Course; relatedCourses: Course[] }) {
    const { auth } = usePage().props as { auth?: { user?: { role?: string } } };
    const role = auth?.user?.role;
    const canUseLearningFlow = !auth?.user || role === 'student' || role === 'school_teacher';
    const teacherCanAccess = role !== 'school_teacher' || course.enrolled || course.schoolAccess;
    const ctaHref = !canUseLearningFlow || !teacherCanAccess
        ? '/dashboard'
        : course.enrolled
          ? `/learning?course=${course.id}`
          : !auth?.user
            ? '/login'
            : course.priceType === 'free' || course.schoolAccess
              ? `/courses/${course.id}/enroll`
              : `/checkout?course=${course.id}`;
    const shouldPost =
        canUseLearningFlow &&
        teacherCanAccess &&
        (course.priceType === 'free' || course.schoolAccess) &&
        Boolean(auth?.user) &&
        !course.enrolled;
    const ctaLabel = !teacherCanAccess
        ? 'Tidak tersedia untuk sekolah'
        : course.enrolled
        ? 'Lanjut Belajar'
        : course.schoolAccess
          ? 'Daftar via Akses Sekolah'
          : course.priceType === 'free'
            ? 'Daftar Kelas'
            : 'Beli Kelas';

    return (
        <>
            <SeoHead seo={seo} fallbackTitle={course.title} />
            <div className="min-h-screen bg-[#FAF8FF]">
                <PublicNav />
                <PublicContent skeleton="detail">
                    <main className="mx-auto max-w-7xl px-4 pt-28 pb-16 md:px-10">
                        <Crumb items={['Home', 'Katalog Kelas', course.title]} />
                        <section className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
                            <div>
                                <div className="mb-4 flex flex-wrap gap-2">
                                    <span className="rounded-full bg-[#EAEDFF] px-3 py-1 text-xs font-bold text-[#005BB1] uppercase">
                                        {course.level}
                                    </span>
                                    <span className="rounded-full bg-[#FFE178]/70 px-3 py-1 text-xs font-bold text-slate-900">
                                        {course.schoolAccess ? 'Akses Sekolah' : course.priceType === 'free' ? 'Gratis' : 'Berbayar'}
                                    </span>
                                    {course.learningPath && (
                                        <Link
                                            href={course.learningPath.url}
                                            className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 uppercase"
                                        >
                                            {course.learningPath.title}
                                        </Link>
                                    )}
                                </div>
                                <h1 className="text-4xl leading-tight font-extrabold tracking-[-0.02em] text-[#131B2E] md:text-6xl">
                                    {course.title}
                                </h1>
                                <p className="mt-5 max-w-3xl text-lg leading-8 text-[#414753]">
                                    {course.description || 'Kelas robotik terstruktur dengan materi praktik, evaluasi, dan sertifikat digital.'}
                                </p>
                                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                                    <Metric icon={BookOpen} label="Materi" value={`${course.lessons} modul`} />
                                    <Metric icon={Clock} label="Estimasi" value={course.duration} />
                                    <Metric icon={Tag} label="Biaya" value={course.priceLabel} />
                                </div>
                            </div>

                            <aside className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
                                <img src={course.imageUrl} alt={`Foto produk ${course.title}`} className="h-72 w-full object-cover" />
                                <div className="space-y-4 p-6">
                                    <div className="text-3xl font-extrabold text-[#005BB1]">{course.priceLabel}</div>
                                    <Button asChild className="h-12 w-full rounded-xl bg-[#1C7DE8] hover:bg-[#1469c7]">
                                        <Link href={ctaHref} method={shouldPost ? 'post' : 'get'} as={shouldPost ? 'button' : 'a'}>
                                            {ctaLabel}
                                            <ArrowRight className="size-4" />
                                        </Link>
                                    </Button>
                                    <p className="text-sm leading-6 text-slate-500">
                                        Halaman ini publik dan dapat dibaca mesin pencari. Login hanya diperlukan saat mendaftar atau membeli kelas.
                                    </p>
                                </div>
                            </aside>
                        </section>

                        <section className="mt-14 grid gap-8 lg:grid-cols-[0.85fr_0.45fr] lg:items-start">
                            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h2 className="text-2xl font-extrabold text-[#131B2E]">Apa yang akan dipelajari</h2>
                                <p className="mt-3 leading-7 text-[#414753]">
                                    Materi disusun dalam bab dan lesson agar progres belajar mudah diikuti.
                                </p>
                                <div className="mt-6 space-y-4">
                                    {course.chapters.map((chapter) => (
                                        <article key={chapter.id} className="rounded-2xl border border-slate-200 p-5">
                                            <h3 className="flex items-center gap-2 font-extrabold text-[#131B2E]">
                                                <Layers3 className="size-5 text-[#005BB1]" />
                                                {chapter.orderNo}. {chapter.title}
                                            </h3>
                                            <ol className="mt-4 space-y-2">
                                                {chapter.lessons.map((lesson) => (
                                                    <li key={lesson.id} className="flex items-start gap-2 text-sm leading-6 text-[#414753]">
                                                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                                                        {lesson.title}
                                                    </li>
                                                ))}
                                            </ol>
                                        </article>
                                    ))}
                                    {course.chapters.length === 0 && (
                                        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                                            Outline kelas akan tampil setelah materi dipublikasikan.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <aside className="self-start rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h2 className="text-xl font-extrabold text-[#131B2E]">Informasi kelas</h2>
                                <dl className="mt-5 space-y-4 text-sm">
                                    <Info label="Level" value={course.level} />
                                    <Info label="Akses" value={course.accessMode} />
                                    <Info label="Learning path" value={course.learningPath?.title ?? 'Mandiri'} />
                                    <Info label="Biaya" value={course.priceLabel} />
                                    <Info label="Estimasi" value={course.duration} />
                                    <Info label="Jumlah modul" value={`${course.lessons} modul`} />
                                    <Info label="URL produk" value={`/produk/${course.slug}`} />
                                </dl>
                            </aside>
                        </section>

                        {relatedCourses.length > 0 && (
                            <section className="mt-14">
                                <h2 className="text-2xl font-extrabold text-[#131B2E]">Kelas terkait</h2>
                                <div className="mt-5 grid gap-5 md:grid-cols-3">
                                    {relatedCourses.map((item) => (
                                        <Link
                                            key={item.id}
                                            href={item.detailUrl}
                                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                                        >
                                            <p className="text-xs font-bold text-[#005BB1] uppercase">{item.level}</p>
                                            <h3 className="mt-2 line-clamp-2 font-extrabold text-[#131B2E]">{item.title}</h3>
                                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#414753]">{item.description}</p>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}
                    </main>
                </PublicContent>
                <FooterMark />
            </div>
        </>
    );
}

function Metric({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Icon className="size-5 text-[#005BB1]" />
            <p className="mt-3 text-xs font-bold tracking-wider text-slate-500 uppercase">{label}</p>
            <p className="mt-1 font-extrabold text-[#131B2E]">{value}</p>
        </div>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0">
            <dt className="font-semibold text-slate-500">{label}</dt>
            <dd className="break-words text-right font-bold text-[#131B2E]">{value}</dd>
        </div>
    );
}
