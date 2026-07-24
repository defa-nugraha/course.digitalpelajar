import { Panel, Shell, StatCard } from '@/components/platform';
import { SearchableSelect } from '@/components/searchable-select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Head, router } from '@inertiajs/react';
import { HelpCircle, MessageSquare, Search, Star, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Option {
    id?: number;
    name?: string;
    value?: string;
    label?: string;
}

interface FeedbackItem {
    id: number;
    student: string;
    rating: number;
    understandingLevel: string;
    understandingLabel: string;
    comment?: string | null;
    suggestion?: string | null;
    createdAt: string;
}

interface MeetingFeedback {
    id: number;
    sessionId?: number | null;
    title: string;
    topic?: string | null;
    sessionStatus?: string | null;
    school: string;
    instructor: string;
    course: string;
    mode: string;
    startsAtLabel: string;
    endsAtLabel: string;
    feedbackCount: number;
    averageRating: number;
    needHelp: number;
    items: FeedbackItem[];
}

interface Props {
    scope: 'admin' | 'instructor';
    title: string;
    stats: {
        meetings: number;
        feedbacks: number;
        averageRating: number;
        needHelp: number;
    };
    meetings: MeetingFeedback[];
    options: {
        schools: Option[];
        instructors: Option[];
        understandingLevels: Option[];
    };
}

export default function TeachingFeedbacks({ scope, title, stats, meetings, options }: Props) {
    const [term, setTerm] = useState('');
    const [school, setSchool] = useState('all');
    const [instructor, setInstructor] = useState('all');
    const [understanding, setUnderstanding] = useState('all');
    const [selectedMeeting, setSelectedMeeting] = useState<number | null>(meetings[0]?.id ?? null);
    const nav = scope === 'admin' ? 'admin' : 'instructor';
    const canFilterInstructor = scope === 'admin';
    const filteredMeetings = useMemo(() => {
        return meetings.filter((meeting) => {
            const text = `${meeting.title} ${meeting.topic ?? ''} ${meeting.school} ${meeting.instructor} ${meeting.course}`
                .toLowerCase()
                .trim();
            const matchesTerm = text.includes(term.toLowerCase());
            const matchesUnderstanding =
                understanding === 'all' || meeting.items.some((item) => item.understandingLevel === understanding);

            return matchesTerm && matchesUnderstanding;
        });
    }, [meetings, term, understanding]);

    const activeMeeting = filteredMeetings.find((meeting) => meeting.id === selectedMeeting) ?? filteredMeetings[0] ?? null;

    const applyServerFilter = (key: 'school' | 'instructor' | 'understanding', value: string) => {
        if (key === 'school') setSchool(value);
        if (key === 'instructor') setInstructor(value);
        if (key === 'understanding') setUnderstanding(value);

        const params = {
            school: key === 'school' ? value : school,
            instructor: key === 'instructor' ? value : instructor,
            understanding: key === 'understanding' ? value : understanding,
        };

        router.get(
            scope === 'admin' ? '/admin/teaching-feedbacks' : '/instructor/teaching-feedbacks',
            {
                school: params.school === 'all' ? undefined : params.school,
                instructor: params.instructor === 'all' ? undefined : params.instructor,
                understanding: params.understanding === 'all' ? undefined : params.understanding,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <Shell title={title} eyebrow={scope === 'admin' ? 'Admin Operasional' : 'Pengajar / Trainer'} nav={nav}>
            <Head title={title} />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Pertemuan" value={String(stats.meetings)} icon={MessageSquare} />
                <StatCard label="Total Feedback" value={String(stats.feedbacks)} icon={Users} tone="purple" />
                <StatCard label="Rata-rata Rating" value={stats.averageRating ? `${stats.averageRating}/5` : '-'} icon={Star} tone="amber" />
                <StatCard label="Butuh Bantuan" value={String(stats.needHelp)} icon={HelpCircle} tone="slate" />
            </div>

            <Panel className="mt-6" title="Filter feedback">
                <div className="grid gap-3 md:grid-cols-4">
                    <label className="relative md:col-span-2">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={term}
                            onChange={(event) => setTerm(event.target.value)}
                            className="pl-9"
                            placeholder="Cari pertemuan, sekolah, pengajar, atau course..."
                        />
                    </label>
                    <SearchableSelect
                        value={school}
                        onChange={(value) => applyServerFilter('school', value)}
                        options={[
                            { value: 'all', label: 'Semua sekolah' },
                            ...options.schools.map((item) => ({ value: String(item.id), label: String(item.name) })),
                        ]}
                    />
                    {canFilterInstructor ? (
                        <SearchableSelect
                            value={instructor}
                            onChange={(value) => applyServerFilter('instructor', value)}
                            options={[
                                { value: 'all', label: 'Semua pengajar' },
                                ...options.instructors.map((item) => ({ value: String(item.id), label: String(item.name) })),
                            ]}
                        />
                    ) : (
                        <SearchableSelect
                            value={understanding}
                            onChange={(value) => applyServerFilter('understanding', value)}
                            options={options.understandingLevels.map((item) => ({ value: String(item.value), label: String(item.label) }))}
                        />
                    )}
                    {canFilterInstructor && (
                        <SearchableSelect
                            className="md:col-span-4"
                            value={understanding}
                            onChange={(value) => applyServerFilter('understanding', value)}
                            options={options.understandingLevels.map((item) => ({ value: String(item.value), label: String(item.label) }))}
                        />
                    )}
                </div>
            </Panel>

            <div className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
                <Panel title="Daftar pertemuan">
                    <div className="space-y-3">
                        {filteredMeetings.map((meeting) => (
                            <button
                                key={meeting.id}
                                type="button"
                                onClick={() => setSelectedMeeting(meeting.id)}
                                className={cn(
                                    'w-full rounded-2xl border p-4 text-left transition',
                                    activeMeeting?.id === meeting.id
                                        ? 'border-blue-300 bg-blue-50'
                                        : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/60',
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-extrabold text-slate-950">{meeting.title}</p>
                                        <p className="mt-1 text-sm leading-6 text-slate-500">
                                            {meeting.school} · {meeting.course}
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700 shadow-sm">
                                        {meeting.feedbackCount}
                                    </span>
                                </div>
                                <p className="mt-3 text-xs font-bold text-slate-500">
                                    {meeting.startsAtLabel}–{meeting.endsAtLabel} · {meeting.instructor}
                                </p>
                            </button>
                        ))}
                        {filteredMeetings.length === 0 && (
                            <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                                Belum ada feedback yang cocok dengan filter.
                            </p>
                        )}
                    </div>
                </Panel>

                <Panel title={activeMeeting ? `Feedback: ${activeMeeting.title}` : 'Detail feedback'}>
                    {activeMeeting ? (
                        <div>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <MiniMetric label="Rating" value={activeMeeting.averageRating ? `${activeMeeting.averageRating}/5` : '-'} />
                                <MiniMetric label="Feedback" value={String(activeMeeting.feedbackCount)} />
                                <MiniMetric label="Butuh bantuan" value={String(activeMeeting.needHelp)} />
                            </div>
                            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                                <p>
                                    <span className="font-bold text-slate-950">Sekolah:</span> {activeMeeting.school}
                                </p>
                                <p>
                                    <span className="font-bold text-slate-950">Pengajar:</span> {activeMeeting.instructor}
                                </p>
                                <p>
                                    <span className="font-bold text-slate-950">Course:</span> {activeMeeting.course}
                                </p>
                                {activeMeeting.topic && (
                                    <p>
                                        <span className="font-bold text-slate-950">Topik laporan:</span> {activeMeeting.topic}
                                    </p>
                                )}
                            </div>
                            <div className="mt-5 space-y-4">
                                {activeMeeting.items.map((item) => (
                                    <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <p className="font-extrabold text-slate-950">{item.student}</p>
                                                <p className="mt-1 text-xs text-slate-500">{item.createdAt}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                                                    Rating {item.rating}/5
                                                </span>
                                                <span
                                                    className={cn(
                                                        'rounded-full px-3 py-1 text-xs font-bold',
                                                        item.understandingLevel === 'need_help'
                                                            ? 'bg-red-50 text-red-700'
                                                            : item.understandingLevel === 'partly_understand'
                                                              ? 'bg-blue-50 text-blue-700'
                                                              : 'bg-emerald-50 text-emerald-700',
                                                    )}
                                                >
                                                    {item.understandingLabel}
                                                </span>
                                            </div>
                                        </div>
                                        {item.comment && <p className="mt-3 text-sm leading-6 text-slate-700">{item.comment}</p>}
                                        {item.suggestion && (
                                            <p className="mt-3 rounded-xl border border-violet-100 bg-violet-50 p-3 text-sm leading-6 text-violet-900">
                                                <span className="font-bold">Saran:</span> {item.suggestion}
                                            </p>
                                        )}
                                    </article>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500">Pilih pertemuan untuk melihat detail feedback siswa.</p>
                    )}
                </Panel>
            </div>
        </Shell>
    );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">{label}</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-950">{value}</p>
        </div>
    );
}
