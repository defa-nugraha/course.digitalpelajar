import { Panel, Shell } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, BookOpen, CheckCircle2, Search, Tag } from 'lucide-react';
import { useMemo, useState } from 'react';

interface InternalCourse {
    id: number;
    title: string;
    slug: string;
    description?: string | null;
    level: string;
    learningPath: string;
    priceType: string;
    priceLabel: string;
    imageUrl: string;
    lessons: number;
    progress: number;
    enrolled: boolean;
    schoolAccess: boolean;
    detailUrl: string;
    learningUrl: string;
    enrollUrl: string;
}

export default function InternalCatalog({ role, courses }: { role: string; courses: InternalCourse[] }) {
    const [term, setTerm] = useState('');
    const [status, setStatus] = useState<'all' | 'enrolled' | 'available'>('all');
    const isTeacher = role === 'school_teacher';

    const visibleCourses = useMemo(() => {
        return courses.filter((course) => {
            const matchesTerm = `${course.title} ${course.description ?? ''} ${course.learningPath}`.toLowerCase().includes(term.toLowerCase());
            const matchesStatus = status === 'all' || (status === 'enrolled' && course.enrolled) || (status === 'available' && !course.enrolled);

            return matchesTerm && matchesStatus;
        });
    }, [courses, status, term]);

    return (
        <Shell title="Katalog Internal" eyebrow={isTeacher ? 'Guru Sekolah' : 'Siswa'}>
            <Head title="Katalog Internal" />
            <section className="rounded-3xl border border-slate-200 bg-white p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-bold tracking-wider text-blue-700 uppercase">Katalog akun</p>
                        <h2 className="mt-2 text-3xl font-extrabold text-slate-950">
                            {isTeacher ? 'Kelas dari akses sekolah' : 'Kelas yang tersedia untuk Anda'}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                            Halaman ini berbeda dari katalog publik. Status akses dan progress Anda ditampilkan langsung di sini.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <label className="relative">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                className="h-11 w-full pl-9 sm:w-72"
                                placeholder="Cari kelas atau learning path..."
                                value={term}
                                onChange={(event) => setTerm(event.target.value)}
                            />
                        </label>
                        <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                            {[
                                ['all', 'Semua'],
                                ['enrolled', 'Diikuti'],
                                ['available', 'Tersedia'],
                            ].map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setStatus(value as 'all' | 'enrolled' | 'available')}
                                    className={cn(
                                        'rounded-lg px-3 py-2 text-xs font-bold transition',
                                        status === value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-950',
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {visibleCourses.map((course) => (
                    <article key={course.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="relative h-40 bg-blue-50">
                            <img src={course.imageUrl} alt={`Cover kelas ${course.title}`} className="h-full w-full object-cover" loading="lazy" />
                            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-blue-700">{course.level}</span>
                                {course.schoolAccess && (
                                    <span className="rounded-full bg-emerald-50/95 px-3 py-1 text-xs font-bold text-emerald-700">Akses sekolah</span>
                                )}
                            </div>
                        </div>
                        <div className="flex min-h-[280px] flex-col p-5">
                            <p className="text-xs font-bold tracking-wider text-violet-700 uppercase">{course.learningPath}</p>
                            <h3 className="mt-2 text-lg font-extrabold text-slate-950">{course.title}</h3>
                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{course.description}</p>

                            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                <Info icon={BookOpen} label={`${course.lessons} lesson`} />
                                <Info icon={Tag} label={course.priceLabel} />
                            </div>

                            {course.enrolled && (
                                <div className="mt-4 rounded-xl bg-blue-50 p-3">
                                    <div className="flex items-center justify-between text-xs font-bold text-blue-700">
                                        <span>Progress</span>
                                        <span>{course.progress}%</span>
                                    </div>
                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${course.progress}%` }} />
                                    </div>
                                </div>
                            )}

                            <div className="mt-auto flex gap-2 pt-5">
                                <Button asChild variant="outline" className="flex-1">
                                    <Link href={course.detailUrl}>Detail</Link>
                                </Button>
                                {course.enrolled ? (
                                    <Button asChild className="flex-1">
                                        <Link href={course.learningUrl}>
                                            Lanjut
                                            <ArrowRight className="size-4" />
                                        </Link>
                                    </Button>
                                ) : course.priceType === 'free' || course.schoolAccess ? (
                                    <Button asChild className="flex-1">
                                        <Link href={course.enrollUrl} method="post" as="button">
                                            Ikuti
                                            <ArrowRight className="size-4" />
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button asChild className="flex-1">
                                        <Link href={`/checkout?course=${course.id}`}>
                                            Beli
                                            <ArrowRight className="size-4" />
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </article>
                ))}
            </div>

            {visibleCourses.length === 0 && (
                <Panel className="mt-6" title="Kelas tidak ditemukan">
                    <p className="text-sm text-slate-600">
                        Tidak ada kelas yang cocok dengan filter saat ini. Untuk guru, kelas hanya muncul jika learning path sudah diberikan ke
                        sekolah.
                    </p>
                </Panel>
            )}
        </Shell>
    );
}

function Info({ icon: Icon, label }: { icon: typeof BookOpen; label: string }) {
    return (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-600">
            <Icon className="size-4 text-blue-700" />
            <span>{label}</span>
            {label.includes('Gratis') && <CheckCircle2 className="ml-auto size-4 text-emerald-600" />}
        </div>
    );
}
