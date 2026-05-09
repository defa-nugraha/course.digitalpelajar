import { Button } from '@/components/ui/button';
import { FooterMark, PublicNav } from '@/components/platform';
import { designFindings, features, skplFindings } from '@/lib/platform-data';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Bot, CheckCircle2, Code2, Star } from 'lucide-react';

interface Course {
    id: number;
    title: string;
    description: string;
    level: string;
    priceLabel: string;
    lessons: number;
}

interface WelcomeProps {
    courses: Course[];
    stats: {
        students: number;
        courses: number;
        certificates: number;
    };
}

export default function Welcome({ courses, stats }: WelcomeProps) {
    const featuredCourse = courses[0];

    return (
        <>
            <Head title="Aplikasi Pembelajaran Robotik" />
            <div className="min-h-screen bg-[#FAF8FF] text-slate-950">
                <PublicNav />
                <main>
                    <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:px-10 lg:grid-cols-[1fr_0.9fr] lg:py-20">
                        <div className="flex flex-col justify-center">
                            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-sm font-bold text-blue-700">
                                <Bot className="size-4" />
                                Platform Belajar Robotik Berbasis SKPL
                            </div>
                            <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
                                Ngawitekno Robotics Academy
                            </h1>
                            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                                Aplikasi pembelajaran robotik dengan learning path, materi modular, quiz, submission proyek hardware, review pengajar, pembayaran Midtrans, dan sertifikat digital terverifikasi.
                            </p>
                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Button asChild size="lg" className="bg-[#1C7DE8] hover:bg-[#1469c7]">
                                    <Link href="/courses">
                                        Lihat Kelas
                                        <ArrowRight className="size-4" />
                                    </Link>
                                </Button>
                                <Button asChild size="lg" variant="outline">
                                    <Link href="/certificates/verify">Verifikasi Sertifikat</Link>
                                </Button>
                            </div>
                            <div className="mt-8 flex flex-wrap gap-5 text-sm font-semibold text-slate-600">
                                <span className="flex items-center gap-2"><Star className="size-4 fill-[#FED635] text-blue-700" />{stats.students}+ pelajar seed</span>
                                <span className="flex items-center gap-2"><Code2 className="size-4 text-blue-700" />{stats.courses} kelas aktif</span>
                                <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-600" />{stats.certificates} sertifikat terbit</span>
                            </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="rounded-lg border border-blue-100 bg-blue-50 p-5 text-slate-950">
                                <p className="text-sm font-semibold text-blue-700">Current Progress</p>
                                <p className="mt-2 text-3xl font-extrabold">{featuredCourse?.title ?? 'Learning Path Robotik'}</p>
                                <div className="mt-8 h-3 rounded-full bg-white">
                                    <div className="h-3 w-[68%] rounded-full bg-blue-600" />
                                </div>
                                <p className="mt-3 text-sm text-slate-600">Data kelas dan progress terhubung ke database aplikasi.</p>
                            </div>
                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                {features.slice(0, 4).map((feature) => {
                                    const Icon = feature.icon;
                                    return (
                                        <div key={feature.title} className="rounded-lg border border-slate-200 p-4">
                                            <Icon className="size-5 text-blue-700" />
                                            <p className="mt-3 font-bold">{feature.title}</p>
                                            <p className="mt-1 text-sm text-slate-500">{feature.description}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    <section className="bg-white py-14">
                        <div className="mx-auto max-w-7xl px-4 md:px-10">
                            <h2 className="text-3xl font-extrabold">Konsep Implementasi dari SKPL</h2>
                            <div className="mt-6 grid gap-4 lg:grid-cols-2">
                                <AnalysisList title="Analisis SKPL" items={skplFindings} />
                                <AnalysisList title="Analisis Folder Desain" items={designFindings} />
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto max-w-7xl px-4 py-14 md:px-10">
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <h2 className="text-3xl font-extrabold">Kelas Populer</h2>
                                <p className="mt-2 text-slate-600">Gratis dan berbayar, sesuai aturan enrollment SKPL.</p>
                            </div>
                            <Button asChild variant="outline">
                                <Link href="/courses">Semua kelas</Link>
                            </Button>
                        </div>
                        <div className="mt-6 grid gap-5 md:grid-cols-3">
                            {courses.slice(0, 3).map((course) => (
                                <article key={course.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">{course.level}</span>
                                    <h3 className="mt-4 text-xl font-bold">{course.title}</h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">{course.description}</p>
                                    <div className="mt-5 flex items-center justify-between text-sm font-semibold">
                                        <span>{course.lessons} lesson</span>
                                        <span className="text-blue-700">{course.priceLabel}</span>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                </main>
                <FooterMark />
            </div>
        </>
    );
}

function AnalysisList({ title, items }: { title: string; items: string[] }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-5">
            <h3 className="font-bold">{title}</h3>
            <ul className="mt-4 space-y-3">
                {items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600">
                        <CheckCircle2 className="mt-0.5 size-4 flex-none text-emerald-600" />
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}
