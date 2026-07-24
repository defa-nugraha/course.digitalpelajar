import { Crumb, FooterMark, PublicContent, PublicNav } from '@/components/platform';
import { SearchableSelect } from '@/components/searchable-select';
import { SeoData, SeoHead } from '@/components/seo-head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ArrowRight, BookOpen, Clock, Search, Tag } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Course {
    id: number;
    title: string;
    slug: string;
    description: string;
    level: string;
    priceType: string;
    price: number;
    priceLabel: string;
    status: string;
    lessons: number;
    duration: string;
    progress: number;
    enrolled: boolean;
    detailUrl: string;
    imageUrl?: string;
}

const courseImages = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD92fYdLbqTQj738UuB71y_vhZCCaYl5hJvx9nTRz9-H6J9aSMowuvzbKoLR53456yBKg322qUqC2UwJcttA_vqwCnQd379f5P5Ej0e63RTeohePqjz06F6C5bl_4CCse6-EnpQ545EXTz0JoDsBIPeWfCHS5nn8Wr--FljpwIHDAPUC-t-czhiSVgC9MnlqvkcV_3F8bwfr8jcUO-A4OPnnCi_9kwq2b4scoQjL8pr3zTRGIJSyFxsMW-MisteJjf5to0NNNeRRe8',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuB-qr21uzeEuYEw5K4Q2DQO52-3RT1Q2msozMxgsAKmFIwKwfh3U51s0Zi4joWC0D2NKTADcPIZ1LhH1Fs_b9ufLbUWrhwOuDMO3B5qXhKLXTIoFN1dpDXNiFUe9trE7fZf74Kx-6tjt1PlHbeLT-8UJZaTw0CXejtPurPF57b6zWUYFm9rmjnVNf1vPf1B3qkF1Xr_NuvCnv3OlzWVlaq9g9JjW404Es1rV-izoZhmcAsHYbgohYutFsKPBcEPuuALz0wuINJnFHQ',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA8I5nYJgDXHh8o6xE4PsEjgPgP0YdMabPSXPOtoJcuJ53QnGa-4y12ETSTOubHaXZUPjOyx9Vk5icJGiRV9tAnLQI9Yo0MnbpbP8cAaHOmCn7E-dmODu5ReWOYrNjKV4vJYWTLCJf7YbYzRqYv1OD42M68HoFmbTiRDXiN7e3Tsh-HJyBr4rHBdr7vhBhqu4VVnNa4ZQVDA_49Df31Kf-hN_r6Euh8j7kN9SbGgK5AF7bCqLI2Lw1YcD-HEjRtdFZFLvyCYC3tYyY',
];

export default function Catalog({ seo, courses }: { seo?: SeoData; courses: Course[] }) {
    const [term, setTerm] = useState('');
    const [levels, setLevels] = useState<string[]>([]);
    const [priceTypes, setPriceTypes] = useState<string[]>([]);
    const [availability, setAvailability] = useState<string[]>(['available']);
    const [sort, setSort] = useState('newest');

    const visibleCourses = useMemo(() => {
        return courses
            .filter((course) => {
                const matchesTerm = `${course.title} ${course.description}`.toLowerCase().includes(term.toLowerCase());
                const matchesLevel = levels.length === 0 || levels.includes(course.level.toLowerCase());
                const matchesPrice = priceTypes.length === 0 || priceTypes.includes(course.priceType);
                const matchesAvailability =
                    availability.length === 0 || availability.includes('available') || (availability.includes('enrolled') && course.enrolled);

                return matchesTerm && matchesLevel && matchesPrice && matchesAvailability;
            })
            .sort((a, b) => {
                if (sort === 'price-low') return a.price - b.price;
                if (sort === 'price-high') return b.price - a.price;
                if (sort === 'lessons') return b.lessons - a.lessons;

                return b.id - a.id;
            });
    }, [availability, courses, levels, priceTypes, sort, term]);

    return (
        <>
            <SeoHead seo={seo} fallbackTitle="Katalog Kelas" />
            <div className="min-h-screen bg-[#FAF8FF]">
                <PublicNav />
                <PublicContent skeleton="catalog">
                    <main className="mx-auto w-full max-w-7xl px-4 pt-[104px] pb-16 md:px-10">
                        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
                            <div>
                                <Crumb items={['Beranda', 'Kelas']} />
                                <h1 className="text-4xl leading-tight font-extrabold tracking-[-0.02em] text-[#131B2E] md:text-5xl">
                                    Jelajahi Kelas
                                </h1>
                                <p className="mt-2 max-w-2xl text-lg leading-8 text-[#414753]">
                                    Temukan kelas robotik dan teknologi yang disusun bertahap untuk meningkatkan kemampuan praktik Anda.
                                </p>
                            </div>
                            <label className="relative w-full md:w-80">
                                <Search className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-slate-400" />
                                <Input
                                    className="h-12 border-slate-300 bg-[#F2F3FF] pl-10"
                                    placeholder="Cari kelas..."
                                    value={term}
                                    onChange={(event) => setTerm(event.target.value)}
                                />
                            </label>
                        </div>

                        <div className="flex flex-col gap-8 lg:flex-row">
                            <aside className="w-full shrink-0 space-y-6 lg:w-64">
                                <FilterGroup
                                    title="Level"
                                    values={levels}
                                    onChange={setLevels}
                                    options={[
                                        { value: 'beginner', label: 'Pemula' },
                                        { value: 'intermediate', label: 'Menengah' },
                                        { value: 'advanced', label: 'Lanjutan' },
                                    ]}
                                />
                                <FilterGroup
                                    title="Biaya"
                                    values={priceTypes}
                                    onChange={setPriceTypes}
                                    options={[
                                        { value: 'free', label: 'Gratis' },
                                        { value: 'paid', label: 'Berbayar' },
                                    ]}
                                />
                                <FilterGroup
                                    title="Status"
                                    values={availability}
                                    onChange={setAvailability}
                                    options={[
                                        { value: 'available', label: 'Tersedia' },
                                        { value: 'enrolled', label: 'Sudah diikuti' },
                                    ]}
                                />
                            </aside>

                            <section className="flex flex-1 flex-col gap-6">
                                <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                                    <div className="text-sm leading-6 text-[#414753]">
                                        Menampilkan <span className="font-semibold text-[#131B2E]">{visibleCourses.length}</span> dari{' '}
                                        <span className="font-semibold text-[#131B2E]">{courses.length}</span> kelas
                                    </div>
                                    <label className="flex items-center gap-2 text-sm font-semibold text-[#414753]">
                                        Urutkan:
                                        <SearchableSelect
                                            className="w-48"
                                            value={sort}
                                            onChange={setSort}
                                            options={[
                                                { value: 'newest', label: 'Terbaru' },
                                                { value: 'lessons', label: 'Materi terbanyak' },
                                                { value: 'price-low', label: 'Biaya: rendah ke tinggi' },
                                                { value: 'price-high', label: 'Biaya: tinggi ke rendah' },
                                            ]}
                                        />
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                                    {visibleCourses.map((course, index) => (
                                        <CourseCard
                                            key={course.id}
                                            course={course}
                                            image={course.imageUrl || courseImages[index % courseImages.length]}
                                        />
                                    ))}
                                </div>

                                {visibleCourses.length === 0 && (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
                                        Tidak ada kelas yang cocok dengan filter saat ini.
                                    </div>
                                )}
                            </section>
                        </div>
                    </main>
                </PublicContent>
                <FooterMark />
            </div>
        </>
    );
}

function FilterGroup({
    title,
    options,
    values,
    onChange,
}: {
    title: string;
    options: { value: string; label: string }[];
    values: string[];
    onChange: (values: string[]) => void;
}) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold tracking-wider text-[#131B2E] uppercase">{title}</h2>
            <div className="space-y-3">
                {options.map((option) => {
                    const checked = values.includes(option.value);

                    return (
                        <label key={option.value} className="flex cursor-pointer items-center gap-3 text-[#414753] transition hover:text-[#131B2E]">
                            <input
                                type="checkbox"
                                className="size-5 rounded border-slate-300 text-[#005BB1] focus:ring-[#005BB1]"
                                checked={checked}
                                onChange={(event) =>
                                    onChange(event.target.checked ? [...values, option.value] : values.filter((value) => value !== option.value))
                                }
                            />
                            <span>{option.label}</span>
                        </label>
                    );
                })}
            </div>
        </section>
    );
}

function CourseCard({ course, image }: { course: Course; image: string }) {
    return (
        <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-[0_10px_30px_rgba(15,23,42,0.1)]">
            <div className="relative h-48 overflow-hidden bg-[#EAEDFF]">
                <img
                    src={image}
                    alt={`Foto produk ${course.title}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold tracking-wide text-[#005BB1] uppercase backdrop-blur-sm">
                        {levelLabel(course.level)}
                    </span>
                </div>
                <div className="absolute top-4 right-4">
                    <span
                        className={cn(
                            'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold backdrop-blur-sm',
                            course.priceType === 'free' ? 'bg-[#FFE178]/90 text-[#231B00]' : 'bg-white/90 text-[#131B2E]',
                        )}
                    >
                        <Tag className="size-3.5" />
                        {course.priceType === 'free' ? 'Gratis' : 'Berbayar'}
                    </span>
                </div>
            </div>
            <div className="flex flex-1 flex-col p-6">
                <h2 className="mb-2 line-clamp-2 text-2xl font-extrabold text-[#131B2E] transition group-hover:text-[#005BB1]">{course.title}</h2>
                <p className="mb-6 line-clamp-2 flex-1 leading-7 text-[#414753]">{course.description}</p>
                <div className="mb-6 flex items-center gap-4 text-sm font-bold text-[#414753]">
                    <span className="flex items-center gap-1">
                        <BookOpen className="size-4" />
                        {course.lessons} Materi
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="size-4" />
                        {course.duration}
                    </span>
                </div>
                <div className="mb-4 font-extrabold text-[#005BB1]">{course.priceLabel}</div>
                <Button asChild className="w-full rounded-lg bg-[#EAEDFF] text-[#005BB1] hover:bg-[#005BB1] hover:text-white">
                    <Link href={course.detailUrl}>
                        Lihat Detail
                        <ArrowRight className="size-4" />
                    </Link>
                </Button>
            </div>
        </article>
    );
}

function levelLabel(level: string) {
    const labels: Record<string, string> = {
        beginner: 'Pemula',
        intermediate: 'Menengah',
        advanced: 'Lanjutan',
        Beginner: 'Pemula',
        Intermediate: 'Menengah',
        Advanced: 'Lanjutan',
    };

    return labels[level] ?? level;
}
