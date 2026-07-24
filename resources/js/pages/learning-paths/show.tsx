import { Crumb, FooterMark, PublicContent, PublicNav } from '@/components/platform';
import { SeoData, SeoHead } from '@/components/seo-head';
import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { ArrowRight, BookOpen, Clock, Route } from 'lucide-react';

interface Path {
    id: number;
    title: string;
    slug: string;
    description?: string | null;
    level: string;
    url: string;
}

interface Course {
    id: number;
    title: string;
    description?: string | null;
    level: string;
    priceLabel: string;
    detailUrl: string;
    lessons: number;
    duration: string;
}

export default function LearningPathShow({ seo, path, courses }: { seo?: SeoData; path: Path; courses: Course[] }) {
    return (
        <>
            <SeoHead seo={seo} fallbackTitle={path.title} />
            <div className="min-h-screen bg-[#FAF8FF]">
                <PublicNav />
                <PublicContent skeleton="detail">
                    <main className="mx-auto max-w-6xl px-4 pt-28 pb-16 md:px-10">
                        <Crumb items={['Home', 'Learning Path', path.title]} />
                        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                            <div className="flex flex-col gap-5 md:flex-row md:items-start">
                                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#EAEDFF] text-[#005BB1]">
                                    <Route className="size-7" />
                                </span>
                                <div>
                                    <p className="text-sm font-bold tracking-wider text-violet-700 uppercase">{path.level}</p>
                                    <h1 className="mt-2 text-4xl leading-tight font-extrabold tracking-[-0.02em] text-[#131B2E] md:text-5xl">
                                        {path.title}
                                    </h1>
                                    <p className="mt-4 max-w-3xl text-lg leading-8 text-[#414753]">
                                        {path.description || 'Jalur belajar robotik dengan urutan kelas publish yang dapat diikuti bertahap.'}
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="mt-10">
                            <div className="mb-5 flex items-end justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-extrabold text-[#131B2E]">Urutan kelas</h2>
                                    <p className="mt-1 text-[#414753]">{courses.length} kelas publish pada jalur ini.</p>
                                </div>
                                <Button asChild variant="outline">
                                    <Link href="/courses">Lihat Semua Kelas</Link>
                                </Button>
                            </div>
                            <div className="space-y-4">
                                {courses.map((course, index) => (
                                    <article
                                        key={course.id}
                                        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center"
                                    >
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#131B2E] text-sm font-extrabold text-white">
                                            {index + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-[#005BB1] uppercase">{course.level}</p>
                                            <h3 className="mt-1 text-xl font-extrabold text-[#131B2E]">{course.title}</h3>
                                            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#414753]">{course.description}</p>
                                            <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <BookOpen className="size-4" /> {course.lessons} modul
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="size-4" /> {course.duration}
                                                </span>
                                                <span>{course.priceLabel}</span>
                                            </div>
                                        </div>
                                        <Button asChild className="bg-[#1C7DE8] hover:bg-[#1469c7]">
                                            <Link href={course.detailUrl}>
                                                Detail
                                                <ArrowRight className="size-4" />
                                            </Link>
                                        </Button>
                                    </article>
                                ))}
                                {courses.length === 0 && (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                                        Belum ada kelas publish pada jalur ini.
                                    </div>
                                )}
                            </div>
                        </section>
                    </main>
                </PublicContent>
                <FooterMark />
            </div>
        </>
    );
}
