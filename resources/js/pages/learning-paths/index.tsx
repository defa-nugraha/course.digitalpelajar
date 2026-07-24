import { FooterMark, PublicContent, PublicNav } from '@/components/platform';
import { SeoData, SeoHead } from '@/components/seo-head';
import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { ArrowRight, Route } from 'lucide-react';

interface PathCourse {
    id: number;
    title: string;
    level: string;
    price_type: string;
    price: number;
    learning_path_order: number;
    detailUrl: string;
}

interface PathItem {
    id: number;
    title: string;
    slug: string;
    url: string;
    description?: string | null;
    level: string;
    courses: PathCourse[];
}

export default function LearningPaths({ seo, paths }: { seo?: SeoData; paths: PathItem[] }) {
    return (
        <>
            <SeoHead seo={seo} fallbackTitle="Learning Path" />
            <div className="min-h-screen bg-[#FAF8FF]">
                <PublicNav />
                <PublicContent skeleton="catalog">
                    <main className="mx-auto max-w-6xl px-4 pt-24 pb-12 md:px-10 md:pt-28">
                        <div className="max-w-3xl">
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Jalur Belajar</span>
                            <h1 className="mt-5 text-3xl leading-tight font-extrabold md:text-4xl">Belajar robotik secara berurutan</h1>
                            <p className="mt-3 leading-7 text-slate-600">
                                Setiap learning path berisi urutan kelas dari kompetensi dasar sampai proyek lanjutan.
                            </p>
                        </div>
                        <div className="mt-8 space-y-6">
                            {paths.map((path) => (
                                <section key={path.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                                            <Route className="size-5" />
                                        </span>
                                        <div>
                                            <p className="text-xs font-bold tracking-wider text-violet-700 uppercase">{path.level}</p>
                                            <h2 className="mt-1 text-2xl font-extrabold">
                                                <Link href={path.url} className="transition hover:text-[#005BB1]">
                                                    {path.title}
                                                </Link>
                                            </h2>
                                            <p className="mt-2 text-slate-600">{path.description}</p>
                                        </div>
                                    </div>
                                    <ol className="mt-6 grid gap-3">
                                        {path.courses.map((course, index) => (
                                            <li
                                                key={course.id}
                                                className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center"
                                            >
                                                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                                                    {index + 1}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold">{course.title}</p>
                                                    <p className="text-sm text-slate-500">
                                                        {course.level} ·{' '}
                                                        {course.price_type === 'free' ? 'Gratis' : `Rp ${course.price.toLocaleString('id-ID')}`}
                                                    </p>
                                                </div>
                                                <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                                                    <Link href={course.detailUrl}>
                                                        Lihat Kelas
                                                        <ArrowRight className="size-4" />
                                                    </Link>
                                                </Button>
                                            </li>
                                        ))}
                                        {path.courses.length === 0 && (
                                            <li className="text-sm text-slate-500">Belum ada kelas published pada jalur ini.</li>
                                        )}
                                    </ol>
                                </section>
                            ))}
                            {paths.length === 0 && (
                                <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                                    Belum ada learning path yang dipublikasikan.
                                </section>
                            )}
                        </div>
                    </main>
                </PublicContent>
                <FooterMark />
            </div>
        </>
    );
}
