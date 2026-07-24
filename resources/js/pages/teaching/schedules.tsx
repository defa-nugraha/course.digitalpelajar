import { FieldLabel } from '@/components/form-field';
import InputError from '@/components/input-error';
import { Panel, Shell, StatCard } from '@/components/platform';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { confirmDelete } from '@/lib/confirm-delete';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Building2, CalendarDays, CheckCircle2, Clock, Laptop, MapPin, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';

interface Option {
    id: number;
    name?: string;
    title?: string;
}

interface ScheduleRow {
    id: number;
    schoolId: number;
    school: string;
    instructorId: number;
    instructor: string;
    courseId?: number | null;
    course: string;
    scheduleBasis: 'course' | 'school';
    title: string;
    startsAt: string;
    startsAtLabel: string;
    endsAt: string;
    endsAtLabel: string;
    mode: 'offline' | 'online';
    location?: string | null;
    meetingUrl?: string | null;
    status: string;
    notes?: string | null;
    sessionId?: number | null;
    sessionStatus?: string | null;
    canEdit: boolean;
    canDelete: boolean;
}

interface SchedulesProps {
    scope: 'admin' | 'instructor' | 'teacher';
    title: string;
    schedules: ScheduleRow[];
    stats: {
        total: number;
        scheduled: number;
        completed: number;
        cancelled: number;
    };
    options: {
        schools: Option[];
        instructors: Option[];
        courses: Option[];
    };
    permissions: {
        canManage: boolean;
    };
}

interface ScheduleFormData {
    [key: string]: unknown;
    schedule_basis: 'course' | 'school';
    school_id: string;
    instructor_id: string;
    course_id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    schedule_start_date: string;
    schedule_end_date: string;
    starts_time: string;
    ends_time: string;
    weekdays: string[];
    mode: string;
    location: string;
    meeting_url: string;
    status: string;
    notes: string;
}

const emptySchedule: ScheduleFormData = {
    schedule_basis: 'course',
    school_id: '',
    instructor_id: '',
    course_id: '',
    title: '',
    starts_at: '',
    ends_at: '',
    schedule_start_date: '',
    schedule_end_date: '',
    starts_time: '08:00',
    ends_time: '10:00',
    weekdays: [],
    mode: 'offline',
    location: '',
    meeting_url: '',
    status: 'scheduled',
    notes: '',
};

export default function TeachingSchedules({ scope, title, schedules, stats, options, permissions }: SchedulesProps) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<ScheduleRow | null>(null);
    const [term, setTerm] = useState('');
    const [status, setStatus] = useState('all');
    const [mode, setMode] = useState('all');
    const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
    const [selectedInstructorId, setSelectedInstructorId] = useState<number | null>(null);
    const form = useForm<ScheduleFormData>(emptySchedule);
    const nav = scope === 'admin' ? 'admin' : scope === 'teacher' ? 'teacher' : 'instructor';
    const visibleSchedules = useMemo(
        () =>
            schedules.filter((schedule) => {
                const text =
                    `${schedule.title} ${schedule.school} ${schedule.instructor} ${schedule.course} ${schedule.location ?? ''}`.toLowerCase();

                return (
                    text.includes(term.toLowerCase()) &&
                    (status === 'all' || schedule.status === status) &&
                    (mode === 'all' || schedule.mode === mode)
                );
            }),
        [mode, schedules, status, term],
    );
    const schoolGroups = useMemo(() => {
        return Array.from(
            visibleSchedules
                .reduce((map, schedule) => {
                    const group = map.get(schedule.schoolId) ?? {
                        id: schedule.schoolId,
                        name: schedule.school,
                        total: 0,
                        scheduled: 0,
                        completed: 0,
                        instructors: new Set<number>(),
                    };

                    group.total += 1;
                    if (schedule.status === 'scheduled' || schedule.status === 'rescheduled') group.scheduled += 1;
                    if (schedule.status === 'completed') group.completed += 1;
                    group.instructors.add(schedule.instructorId);
                    map.set(schedule.schoolId, group);

                    return map;
                }, new Map<number, { id: number; name: string; total: number; scheduled: number; completed: number; instructors: Set<number> }>())
                .values(),
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [visibleSchedules]);
    const selectedSchool = schoolGroups.find((school) => school.id === selectedSchoolId) ?? null;
    const instructorGroups = useMemo(() => {
        return Array.from(
            visibleSchedules
                .filter((schedule) => !selectedSchoolId || schedule.schoolId === selectedSchoolId)
                .reduce((map, schedule) => {
                    const group = map.get(schedule.instructorId) ?? {
                        id: schedule.instructorId,
                        name: schedule.instructor,
                        total: 0,
                        scheduled: 0,
                        completed: 0,
                        schools: new Set<string>(),
                    };

                    group.total += 1;
                    if (schedule.status === 'scheduled' || schedule.status === 'rescheduled') group.scheduled += 1;
                    if (schedule.status === 'completed') group.completed += 1;
                    group.schools.add(schedule.school);
                    map.set(schedule.instructorId, group);

                    return map;
                }, new Map<number, { id: number; name: string; total: number; scheduled: number; completed: number; schools: Set<string> }>())
                .values(),
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [selectedSchoolId, visibleSchedules]);
    const selectedInstructor = instructorGroups.find((instructor) => instructor.id === selectedInstructorId) ?? null;
    const selectedInstructorSchedules = visibleSchedules.filter(
        (schedule) =>
            (!selectedSchoolId || schedule.schoolId === selectedSchoolId) &&
            (!selectedInstructorId || schedule.instructorId === selectedInstructorId),
    );
    const statusOptions = [
        { value: 'all', label: 'Semua status' },
        { value: 'scheduled', label: 'Terjadwal' },
        { value: 'rescheduled', label: 'Dijadwalkan ulang' },
        { value: 'completed', label: 'Selesai' },
        { value: 'cancelled', label: 'Dibatalkan' },
    ];
    const formStatusOptions = statusOptions.filter((option) => option.value !== 'all');
    const modeOptions = [
        { value: 'all', label: 'Semua mode' },
        { value: 'offline', label: 'Offline' },
        { value: 'online', label: 'Online' },
    ];
    const formModeOptions = modeOptions.filter((option) => option.value !== 'all');
    const basisOptions = [
        { value: 'course', label: 'Berdasarkan course' },
        { value: 'school', label: 'Berdasarkan sekolah' },
    ];
    const weekdayOptions = [
        { value: '1', label: 'Senin' },
        { value: '2', label: 'Selasa' },
        { value: '3', label: 'Rabu' },
        { value: '4', label: 'Kamis' },
        { value: '5', label: 'Jumat' },
        { value: '6', label: 'Sabtu' },
        { value: '7', label: 'Minggu' },
    ];

    useEffect(() => {
        if (selectedSchoolId && !schoolGroups.some((school) => school.id === selectedSchoolId)) {
            setSelectedSchoolId(null);
            setSelectedInstructorId(null);
        }
    }, [schoolGroups, selectedSchoolId]);

    useEffect(() => {
        if (selectedInstructorId && !instructorGroups.some((instructor) => instructor.id === selectedInstructorId)) {
            setSelectedInstructorId(null);
        }
    }, [instructorGroups, selectedInstructorId]);

    const showCreate = () => {
        setEditing(null);
        form.setData({ ...emptySchedule });
        form.clearErrors();
        setOpen(true);
    };

    const showEdit = (schedule: ScheduleRow) => {
        setEditing(schedule);
        form.setData({
            schedule_basis: schedule.scheduleBasis,
            school_id: String(schedule.schoolId),
            instructor_id: String(schedule.instructorId),
            course_id: schedule.courseId ? String(schedule.courseId) : '',
            title: schedule.title,
            starts_at: schedule.startsAt,
            ends_at: schedule.endsAt,
            schedule_start_date: datePart(schedule.startsAt),
            schedule_end_date: datePart(schedule.endsAt),
            starts_time: timePart(schedule.startsAt),
            ends_time: timePart(schedule.endsAt),
            weekdays: [],
            mode: schedule.mode,
            location: schedule.location ?? '',
            meeting_url: schedule.meetingUrl ?? '',
            status: schedule.status,
            notes: schedule.notes ?? '',
        });
        form.clearErrors();
        setOpen(true);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const payload =
            !editing && form.data.schedule_basis === 'school'
                ? {
                      schedule_basis: 'school',
                      school_id: Number(form.data.school_id),
                      instructor_id: Number(form.data.instructor_id),
                      title: form.data.title,
                      schedule_start_date: form.data.schedule_start_date,
                      schedule_end_date: form.data.schedule_end_date,
                      starts_time: form.data.starts_time,
                      ends_time: form.data.ends_time,
                      weekdays: form.data.weekdays.map((day) => Number(day)),
                      mode: form.data.mode,
                      location: form.data.location,
                      meeting_url: form.data.meeting_url,
                      status: form.data.status,
                      notes: form.data.notes,
                  }
                : {
                      ...form.data,
                      school_id: Number(form.data.school_id),
                      instructor_id: Number(form.data.instructor_id),
                      course_id: form.data.course_id ? Number(form.data.course_id) : null,
                  };

        form.transform(() => payload);
        const requestOptions = { preserveScroll: true, onSuccess: () => setOpen(false) };

        if (editing) {
            form.patch(`/admin/teaching-schedules/${editing.id}`, requestOptions);
        } else {
            form.post('/admin/teaching-schedules', requestOptions);
        }
    };

    const remove = (schedule: ScheduleRow) => {
        confirmDelete(`Hapus jadwal "${schedule.title}"?`, () => {
            router.delete(`/admin/teaching-schedules/${schedule.id}`, { preserveScroll: true });
        });
    };

    return (
        <Shell
            title={title}
            eyebrow={scopeLabel(scope)}
            nav={nav}
            actions={
                permissions.canManage && (
                    <Button onClick={showCreate}>
                        <Plus className="size-4" />
                        Tambah Jadwal
                    </Button>
                )
            }
        >
            <Head title={title} />
            <div className="grid gap-5 md:grid-cols-4">
                <StatCard label="Total Jadwal" value={String(stats.total)} icon={CalendarDays} />
                <StatCard label="Terjadwal" value={String(stats.scheduled)} icon={Clock} tone="purple" />
                <StatCard label="Selesai" value={String(stats.completed)} icon={CheckCircle2} tone="amber" />
                <StatCard label="Dibatalkan" value={String(stats.cancelled)} icon={Users} tone="slate" />
            </div>

            <Panel
                className="mt-6"
                title="Daftar jadwal mengajar"
                action={
                    <div className="flex flex-col gap-2 md:flex-row">
                        <label className="relative block w-full md:w-72">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                className="bg-[#FAF8FF] pl-9"
                                placeholder="Cari sekolah, course, pengajar..."
                                value={term}
                                onChange={(event) => setTerm(event.target.value)}
                            />
                        </label>
                        <SearchableSelect value={status} onChange={setStatus} options={statusOptions} placeholder="Status" className="md:w-56" />
                        <SearchableSelect value={mode} onChange={setMode} options={modeOptions} placeholder="Mode" className="md:w-44" />
                    </div>
                }
            >
                {!selectedSchoolId ? (
                    <div>
                        <p className="mb-4 text-sm leading-6 text-slate-600">
                            Pilih sekolah terlebih dahulu, lalu pilih pengajar untuk melihat jadwal detail.
                        </p>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {schoolGroups.map((school) => (
                                <button
                                    key={school.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedSchoolId(school.id);
                                        setSelectedInstructorId(null);
                                    }}
                                    className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-blue-300 hover:bg-blue-50"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                                            <Building2 className="size-5" />
                                        </span>
                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                            {school.instructors.size} pengajar
                                        </span>
                                    </div>
                                    <h3 className="mt-4 text-lg font-extrabold text-slate-950">{school.name}</h3>
                                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold">
                                        <MiniCount label="Total" value={school.total} />
                                        <MiniCount label="Aktif" value={school.scheduled} />
                                        <MiniCount label="Selesai" value={school.completed} />
                                    </div>
                                </button>
                            ))}
                        </div>
                        {schoolGroups.length === 0 && (
                            <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                Tidak ada jadwal yang cocok dengan filter.
                            </p>
                        )}
                    </div>
                ) : !selectedInstructorId ? (
                    <div>
                        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-xs font-bold tracking-wider text-blue-700 uppercase">Sekolah dipilih</p>
                                <h3 className="text-xl font-extrabold text-slate-950">{selectedSchool?.name}</h3>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setSelectedSchoolId(null);
                                    setSelectedInstructorId(null);
                                }}
                            >
                                <ArrowLeft className="size-4" />
                                Kembali ke sekolah
                            </Button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {instructorGroups.map((instructor) => (
                                <button
                                    key={instructor.id}
                                    type="button"
                                    onClick={() => setSelectedInstructorId(instructor.id)}
                                    className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-blue-300 hover:bg-blue-50"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="rounded-2xl bg-violet-50 p-3 text-violet-700">
                                            <Users className="size-5" />
                                        </span>
                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                            {instructor.total} jadwal
                                        </span>
                                    </div>
                                    <h3 className="mt-4 text-lg font-extrabold text-slate-950">{instructor.name}</h3>
                                    <p className="mt-2 text-sm text-slate-500">{Array.from(instructor.schools).join(', ')}</p>
                                    <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs font-bold">
                                        <MiniCount label="Aktif" value={instructor.scheduled} />
                                        <MiniCount label="Selesai" value={instructor.completed} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-xs font-bold tracking-wider text-blue-700 uppercase">
                                    {selectedSchool?.name} · {selectedInstructor?.name}
                                </p>
                                <h3 className="text-xl font-extrabold text-slate-950">Jadwal pengajar</h3>
                            </div>
                            <Button type="button" variant="outline" onClick={() => setSelectedInstructorId(null)}>
                                <ArrowLeft className="size-4" />
                                Kembali ke pengajar
                            </Button>
                        </div>
                        <ScheduleTable schedules={selectedInstructorSchedules} scope={scope} onEdit={showEdit} onDelete={remove} />
                    </div>
                )}
            </Panel>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Jadwal Mengajar' : 'Tambah Jadwal Mengajar'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        {!editing && (
                            <Field label="Tipe jadwal" error={form.errors.schedule_basis} required>
                                <SearchableSelect
                                    value={form.data.schedule_basis}
                                    onChange={(value) => form.setData('schedule_basis', value === 'school' ? 'school' : 'course')}
                                    options={basisOptions}
                                />
                            </Field>
                        )}
                        {!editing && form.data.schedule_basis === 'school' && (
                            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                                Jadwal berbasis sekolah akan membuat beberapa jadwal sekaligus sesuai periode tanggal dan hari yang dipilih.
                                Course tidak wajib karena pertemuan bersifat umum untuk sekolah.
                            </div>
                        )}
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Sekolah" error={form.errors.school_id} required>
                                <SearchableSelect
                                    value={form.data.school_id}
                                    onChange={(value) => form.setData('school_id', value)}
                                    options={[
                                        { value: '', label: 'Pilih sekolah' },
                                        ...options.schools.map((school) => ({ value: String(school.id), label: String(school.name) })),
                                    ]}
                                    placeholder="Pilih sekolah"
                                />
                            </Field>
                            <Field label="Pengajar" error={form.errors.instructor_id} required>
                                <SearchableSelect
                                    value={form.data.instructor_id}
                                    onChange={(value) => form.setData('instructor_id', value)}
                                    options={[
                                        { value: '', label: 'Pilih pengajar' },
                                        ...options.instructors.map((instructor) => ({
                                            value: String(instructor.id),
                                            label: String(instructor.name),
                                        })),
                                    ]}
                                    placeholder="Pilih pengajar"
                                />
                            </Field>
                            {(editing || form.data.schedule_basis === 'course') && (
                                <Field label="Course" error={form.errors.course_id} required={!editing || form.data.schedule_basis === 'course'}>
                                    <SearchableSelect
                                        value={form.data.course_id}
                                        onChange={(value) => form.setData('course_id', value)}
                                        options={[
                                            { value: '', label: editing && form.data.schedule_basis === 'school' ? 'Umum sekolah' : 'Pilih course' },
                                            ...options.courses.map((course) => ({ value: String(course.id), label: String(course.title) })),
                                        ]}
                                        placeholder="Pilih course"
                                    />
                                </Field>
                            )}
                            <Field label="Status" error={form.errors.status} required>
                                <SearchableSelect
                                    value={form.data.status}
                                    onChange={(value) => form.setData('status', value)}
                                    options={formStatusOptions}
                                />
                            </Field>
                        </div>
                        <Field label="Judul jadwal" error={form.errors.title} required>
                            <Input value={form.data.title} onChange={(event) => form.setData('title', event.target.value)} />
                        </Field>
                        {!editing && form.data.schedule_basis === 'school' ? (
                            <>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Field label="Tanggal mulai periode" error={form.errors.schedule_start_date} required>
                                        <Input
                                            type="date"
                                            value={form.data.schedule_start_date}
                                            onChange={(event) => form.setData('schedule_start_date', event.target.value)}
                                        />
                                    </Field>
                                    <Field label="Tanggal selesai periode" error={form.errors.schedule_end_date} required>
                                        <Input
                                            type="date"
                                            value={form.data.schedule_end_date}
                                            onChange={(event) => form.setData('schedule_end_date', event.target.value)}
                                        />
                                    </Field>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Field label="Jam mulai" error={form.errors.starts_time} required>
                                        <Input
                                            type="time"
                                            value={form.data.starts_time}
                                            onChange={(event) => form.setData('starts_time', event.target.value)}
                                        />
                                    </Field>
                                    <Field label="Jam selesai" error={form.errors.ends_time} required>
                                        <Input
                                            type="time"
                                            value={form.data.ends_time}
                                            onChange={(event) => form.setData('ends_time', event.target.value)}
                                        />
                                    </Field>
                                </div>
                                <Field label="Hari pertemuan" error={form.errors.weekdays} required>
                                    <div className="flex flex-wrap gap-2">
                                        {weekdayOptions.map((day) => {
                                            const selected = form.data.weekdays.includes(day.value);

                                            return (
                                                <button
                                                    key={day.value}
                                                    type="button"
                                                    onClick={() =>
                                                        form.setData(
                                                            'weekdays',
                                                            selected
                                                                ? form.data.weekdays.filter((value) => value !== day.value)
                                                                : [...form.data.weekdays, day.value],
                                                        )
                                                    }
                                                    className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                                                        selected
                                                            ? 'border-blue-600 bg-blue-600 text-white'
                                                            : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-700'
                                                    }`}
                                                >
                                                    {day.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </Field>
                            </>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Mulai" error={form.errors.starts_at} required>
                                    <Input
                                        type="datetime-local"
                                        value={form.data.starts_at}
                                        onChange={(event) => form.setData('starts_at', event.target.value)}
                                    />
                                </Field>
                                <Field label="Selesai" error={form.errors.ends_at} required>
                                    <Input
                                        type="datetime-local"
                                        value={form.data.ends_at}
                                        onChange={(event) => form.setData('ends_at', event.target.value)}
                                    />
                                </Field>
                            </div>
                        )}
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Mode pertemuan" error={form.errors.mode} required>
                                <SearchableSelect
                                    value={form.data.mode}
                                    onChange={(value) => form.setData('mode', value)}
                                    options={formModeOptions}
                                />
                            </Field>
                            {form.data.mode === 'offline' ? (
                                <Field label="Lokasi offline" error={form.errors.location} required>
                                    <Input value={form.data.location} onChange={(event) => form.setData('location', event.target.value)} />
                                </Field>
                            ) : (
                                <Field label="URL meeting online" error={form.errors.meeting_url} required>
                                    <Input
                                        type="url"
                                        value={form.data.meeting_url}
                                        onChange={(event) => form.setData('meeting_url', event.target.value)}
                                    />
                                </Field>
                            )}
                        </div>
                        <Field label="Catatan" error={form.errors.notes}>
                            <textarea
                                className="min-h-28 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                value={form.data.notes}
                                onChange={(event) => form.setData('notes', event.target.value)}
                            />
                        </Field>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                Simpan Jadwal
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Shell>
    );
}

function Field({ label, error, required = false, children }: { label: string; error?: string; required?: boolean; children: ReactNode }) {
    return (
        <div className="space-y-2">
            <FieldLabel required={required}>{label}</FieldLabel>
            {children}
            <InputError message={error} />
        </div>
    );
}

function MiniCount({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-slate-500">{label}</p>
            <p className="mt-1 text-lg font-extrabold text-slate-950">{value}</p>
        </div>
    );
}

function ScheduleTable({
    schedules,
    scope,
    onEdit,
    onDelete,
}: {
    schedules: ScheduleRow[];
    scope: 'admin' | 'instructor' | 'teacher';
    onEdit: (schedule: ScheduleRow) => void;
    onDelete: (schedule: ScheduleRow) => void;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="text-xs tracking-wider text-slate-500 uppercase">
                    <tr>
                        <th className="py-3">Jadwal</th>
                        <th>Course</th>
                        <th>Mode</th>
                        <th>Status</th>
                        <th>Laporan</th>
                        <th className="text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {schedules.map((schedule) => (
                        <tr key={schedule.id}>
                            <td className="min-w-72 py-4">
                                <p className="font-bold text-slate-950">{schedule.title}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                    {schedule.startsAtLabel} – {schedule.endsAtLabel}
                                </p>
                                {schedule.notes && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{schedule.notes}</p>}
                            </td>
                            <td>{schedule.course}</td>
                            <td>
                                <div className="flex items-start gap-2">
                                    {schedule.mode === 'offline' ? (
                                        <MapPin className="mt-0.5 size-4 text-blue-700" />
                                    ) : (
                                        <Laptop className="mt-0.5 size-4 text-blue-700" />
                                    )}
                                    <span>
                                        <span className="block font-semibold capitalize">{schedule.mode}</span>
                                        {schedule.mode === 'offline' ? (
                                            <span className="text-xs text-slate-500">{schedule.location || '-'}</span>
                                        ) : (
                                            <a
                                                href={schedule.meetingUrl ?? '#'}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs text-blue-700 hover:underline"
                                            >
                                                Link meeting
                                            </a>
                                        )}
                                    </span>
                                </div>
                            </td>
                            <td>
                                <StatusPill status={schedule.status} />
                            </td>
                            <td>
                                {schedule.sessionId ? (
                                    <Link href={sessionHref(scope)} className="font-semibold text-blue-700 hover:underline">
                                        {statusLabel(schedule.sessionStatus ?? 'submitted')}
                                    </Link>
                                ) : (
                                    <span className="text-xs text-slate-500">Belum ada</span>
                                )}
                            </td>
                            <td>
                                <div className="flex justify-end gap-1">
                                    {schedule.canEdit && (
                                        <Button variant="ghost" size="icon" aria-label="Edit jadwal" onClick={() => onEdit(schedule)}>
                                            <Pencil className="size-4" />
                                        </Button>
                                    )}
                                    {schedule.canDelete && (
                                        <Button variant="ghost" size="icon" aria-label="Hapus jadwal" onClick={() => onDelete(schedule)}>
                                            <Trash2 className="size-4 text-red-600" />
                                        </Button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {schedules.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Tidak ada jadwal untuk pengajar ini.</p>}
        </div>
    );
}

function scopeLabel(scope: string) {
    if (scope === 'admin') return 'Admin Operasional';
    if (scope === 'teacher') return 'Guru Sekolah';

    return 'Pengajar / Trainer';
}

function sessionHref(scope: string) {
    if (scope === 'admin') return '/admin/teaching-sessions';
    if (scope === 'teacher') return '/teacher/teaching-sessions';

    return '/instructor/teaching-sessions';
}

function statusLabel(status: string) {
    const labels: Record<string, string> = {
        scheduled: 'Terjadwal',
        rescheduled: 'Dijadwalkan ulang',
        completed: 'Selesai',
        cancelled: 'Dibatalkan',
        submitted: 'Menunggu review',
        approved: 'Disetujui',
        rejected: 'Ditolak',
    };

    return labels[status] ?? status;
}

function datePart(value?: string | null) {
    return value ? value.slice(0, 10) : '';
}

function timePart(value?: string | null) {
    return value ? value.slice(11, 16) : '';
}

function StatusPill({ status }: { status: string }) {
    const className =
        status === 'completed'
            ? 'bg-emerald-50 text-emerald-700'
            : status === 'cancelled'
              ? 'bg-red-50 text-red-700'
              : status === 'rescheduled'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-blue-50 text-blue-700';

    return <span className={`rounded-full px-2 py-1 text-xs font-bold ${className}`}>{statusLabel(status)}</span>;
}
