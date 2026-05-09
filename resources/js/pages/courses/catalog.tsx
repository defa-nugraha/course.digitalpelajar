import { Crumb, FooterMark, ProgressBar, PublicNav } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, BookOpen, Search, SlidersHorizontal } from 'lucide-react';

interface Course {
    id: number;
    title: string;
    description: string;
    level: string;
    priceType: string;
    priceLabel: string;
    status: string;
    lessons: number;
    duration: string;
    progress: number;
}

export default function Catalog({ courses }: { courses: Course[] }) {
    return (
        <>
            <Head title="Katalog Kelas" />
            <div className="min-h-screen bg-[#FAF8FF]">
                <PublicNav />
                <main className="mx-auto max-w-7xl px-4 py-10 md:px-10">
                    <Crumb items={['Home', 'Courses']} />
                    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
                        <div>
                            <h1 className="text-4xl font-extrabold tracking-tight">Explore Courses</h1>
                            <p className="mt-3 max-w-2xl text-slate-600">Discover top-tier robotics and engineering modules designed to elevate your technical skills.</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline"><Search className="size-4" />Search</Button>
                            <Button variant="outline"><SlidersHorizontal className="size-4" />Filter</Button>
                        </div>
                    </div>

                    <div className="mt-8 grid gap-5 md:grid-cols-3">
                        {courses.map((course) => (
                            <article key={course.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">{course.level}</span>
                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{course.status}</span>
                                </div>
                                <h2 className="mt-5 text-xl font-bold">{course.title}</h2>
                                <p className="mt-2 min-h-20 text-sm leading-6 text-slate-600">{course.description}</p>
                                <div className="mt-5 flex items-center justify-between text-sm font-semibold text-slate-600">
                                    <span className="flex items-center gap-2"><BookOpen className="size-4" />{course.lessons} lesson</span>
                                    <span>{course.duration}</span>
                                </div>
                                <div className="mt-5">
                                    <ProgressBar value={course.progress} />
                                </div>
                                <div className="mt-5 flex items-center justify-between">
                                    <p className="font-extrabold text-blue-700">{course.priceLabel}</p>
                                    <Button asChild size="sm">
                                        <Link href={course.priceType === 'free' ? `/learning?course=${course.id}` : `/checkout?course=${course.id}`}>
                                            Buka
                                            <ArrowRight className="size-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </article>
                        ))}
                    </div>
                </main>
                <FooterMark />
            </div>
        </>
    );
}
