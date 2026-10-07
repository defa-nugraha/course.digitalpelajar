import { FieldLabel } from '@/components/form-field';
import InputError from '@/components/input-error';
import { Panel, Shell } from '@/components/platform';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface CourseInfo {
    id: number;
    title: string;
}

interface LessonOption {
    id: number;
    title: string;
    chapter: string;
    chapterOrder: number;
    orderNo: number;
}

interface QuizInfo {
    id: number;
    lesson_id?: number | null;
    title: string;
    order_no: number;
    passing_score: number;
    time_limit_mode?: TimerMode | null;
    time_limit_seconds?: number | null;
    is_final_exam: boolean;
    questions: StoredQuestion[];
}

type TimerMode = 'none' | 'total' | 'per_question';

interface StoredQuestion {
    id?: string;
    question?: string;
    answer?: string;
    options?: string[];
}

interface QuestionForm {
    id: string;
    question: string;
    answer: string;
    options: string[];
}

interface QuizForm {
    [key: string]: string | boolean;
    lesson_id: string;
    title: string;
    order_no: string;
    passing_score: string;
    time_limit_mode: TimerMode;
    time_limit_seconds: string;
    is_final_exam: boolean;
    questions: string;
}

const timerModeOptions = [
    { value: 'none', label: 'Tanpa batas waktu' },
    { value: 'total', label: 'Batas waktu keseluruhan quiz' },
    { value: 'per_question', label: 'Batas waktu per soal' },
];

export default function QuizEditor({
    course,
    quiz,
    selectedLessonId,
    lessons,
    backUrl,
    routeBase,
}: {
    course: CourseInfo;
    quiz?: QuizInfo | null;
    selectedLessonId?: number | null;
    lessons: LessonOption[];
    backUrl: string;
    routeBase: string;
}) {
    const [questions, setQuestions] = useState<QuestionForm[]>(normalizeQuestions(quiz?.questions));
    const initialLessonId = quiz?.lesson_id ?? selectedLessonId ?? null;
    const form = useForm<QuizForm>({
        lesson_id: initialLessonId ? String(initialLessonId) : '',
        title: quiz?.title ?? (initialLessonId ? 'Kuis Lesson' : 'Ujian Akhir'),
        order_no: String(quiz?.order_no ?? 0),
        passing_score: String(quiz?.passing_score ?? (initialLessonId ? 70 : 75)),
        time_limit_mode: quiz?.time_limit_mode ?? 'none',
        time_limit_seconds: quiz?.time_limit_seconds ? String(quiz.time_limit_seconds) : '',
        is_final_exam: quiz?.is_final_exam ?? !initialLessonId,
        questions: '',
    });
    const timerMode = form.data.time_limit_mode || 'none';

    const updateQuestion = (index: number, patch: Partial<QuestionForm>) => {
        setQuestions((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
    };

    const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
        setQuestions((items) =>
            items.map((item, itemIndex) =>
                itemIndex === questionIndex
                    ? {
                          ...item,
                          options: item.options.map((option, currentIndex) => (currentIndex === optionIndex ? value : option)),
                      }
                    : item,
            ),
        );
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const seenQuestionIds = new Set<string>();
        const cleanedQuestions = questions
            .map((item) => ({
                id: item.id,
                question: item.question.trim(),
                answer: item.answer.trim(),
                options: item.options.map((option) => option.trim()).filter(Boolean),
            }))
            .filter((item) => {
                if (seenQuestionIds.has(item.id)) {
                    return false;
                }

                seenQuestionIds.add(item.id);
                return true;
            });

        form.transform((data) => ({
            ...data,
            lesson_id: data.lesson_id || null,
            order_no: Number(data.order_no),
            passing_score: Number(data.passing_score),
            time_limit_mode: data.time_limit_mode || 'none',
            time_limit_seconds: data.time_limit_mode === 'none' ? null : Number(data.time_limit_seconds),
            is_final_exam: !data.lesson_id || data.is_final_exam,
            questions: JSON.stringify(cleanedQuestions),
        }));

        const options = { preserveScroll: true };

        if (quiz) {
            form.patch(`${routeBase}/quizzes/${quiz.id}`, options);
        } else {
            form.post(`${routeBase}/courses/${course.id}/quizzes`, options);
        }
    };

    return (
        <Shell
            title={quiz ? 'Edit Ujian/Kuis' : 'Tambah Ujian/Kuis'}
            eyebrow={course.title}
            actions={
                <Button asChild variant="outline">
                    <Link href={backUrl}>
                        <ArrowLeft className="size-4" />
                        Kembali ke Course Builder
                    </Link>
                </Button>
            }
        >
            <Head title={`${quiz ? 'Edit' : 'Tambah'} Ujian`} />
            <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_360px]">
                <div className="space-y-5">
                    <Panel title="Informasi ujian">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Judul" error={form.errors.title} required>
                                <Input value={form.data.title} onChange={(event) => form.setData('title', event.target.value)} />
                            </Field>
                            <Field label="Passing score" error={form.errors.passing_score} required>
                                <Input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={form.data.passing_score}
                                    onChange={(event) => form.setData('passing_score', event.target.value)}
                                />
                            </Field>
                            <Field label={form.data.lesson_id ? 'Posisi dalam lesson' : 'Posisi ujian akhir'} error={form.errors.order_no} required>
                                <Input
                                    type="number"
                                    min={0}
                                    value={form.data.order_no}
                                    onChange={(event) => form.setData('order_no', event.target.value)}
                                />
                            </Field>
                            <Field label="Letak ujian" error={form.errors.lesson_id}>
                                <SearchableSelect
                                    value={form.data.lesson_id}
                                    onChange={(lessonId) => {
                                        form.setData({
                                            ...form.data,
                                            lesson_id: lessonId,
                                            is_final_exam: !lessonId,
                                            passing_score: lessonId ? form.data.passing_score || '70' : form.data.passing_score || '75',
                                        });
                                    }}
                                    options={[
                                        { value: '', label: 'Ujian akhir kursus' },
                                        ...lessons.map((lesson) => ({
                                            value: String(lesson.id),
                                            label: `${lesson.chapterOrder}.${lesson.orderNo} ${lesson.chapter} — ${lesson.title}`,
                                        })),
                                    ]}
                                    placeholder="Pilih letak ujian"
                                />
                            </Field>
                            <Field label="Batas waktu" error={form.errors.time_limit_mode}>
                                <SearchableSelect
                                    value={timerMode}
                                    onChange={(mode) => {
                                        form.setData({
                                            ...form.data,
                                            time_limit_mode: mode as TimerMode,
                                            time_limit_seconds: mode === 'none' ? '' : form.data.time_limit_seconds,
                                        });
                                    }}
                                    options={timerModeOptions}
                                    placeholder="Pilih mode waktu"
                                />
                            </Field>
                            {timerMode !== 'none' && (
                                <Field
                                    label={timerMode === 'per_question' ? 'Durasi per soal (detik)' : 'Durasi total quiz (detik)'}
                                    error={form.errors.time_limit_seconds}
                                    required
                                >
                                    <Input
                                        type="number"
                                        min={15}
                                        max={14400}
                                        value={form.data.time_limit_seconds}
                                        placeholder={timerMode === 'per_question' ? 'Contoh: 60' : 'Contoh: 1800'}
                                        onChange={(event) => form.setData('time_limit_seconds', event.target.value)}
                                    />
                                    <p className="text-xs text-slate-500">
                                        {timerMode === 'per_question'
                                            ? 'Timer akan reset setiap siswa pindah ke soal berikutnya.'
                                            : 'Timer berjalan untuk seluruh quiz dan akan submit otomatis saat habis.'}
                                    </p>
                                </Field>
                            )}
                        </div>
                    </Panel>

                    <Panel title="Pertanyaan">
                        <div className="space-y-5">
                            {questions.map((question, questionIndex) => (
                                <section key={question.id} className="rounded-xl border border-slate-200 p-4">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <h2 className="font-bold text-slate-950">Pertanyaan {questionIndex + 1}</h2>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            aria-label="Hapus pertanyaan"
                                            disabled={questions.length === 1}
                                            onClick={() => setQuestions((items) => items.filter((_, index) => index !== questionIndex))}
                                        >
                                            <Trash2 className="size-4 text-red-600" />
                                        </Button>
                                    </div>
                                    <div className="space-y-4">
                                        <Field label="Teks pertanyaan" required>
                                            <textarea
                                                className="min-h-24 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                                                value={question.question}
                                                onChange={(event) => updateQuestion(questionIndex, { question: event.target.value })}
                                            />
                                        </Field>
                                        <Field label="Jawaban benar" required>
                                            <Input
                                                value={question.answer}
                                                onChange={(event) => updateQuestion(questionIndex, { answer: event.target.value })}
                                            />
                                        </Field>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <Label>Pilihan jawaban opsional</Label>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => updateQuestion(questionIndex, { options: [...question.options, ''] })}
                                                >
                                                    <Plus className="size-4" />
                                                    Opsi
                                                </Button>
                                            </div>
                                            <div className="space-y-2">
                                                {question.options.map((option, optionIndex) => (
                                                    <div key={optionIndex} className="flex gap-2">
                                                        <Input
                                                            value={option}
                                                            placeholder={`Opsi ${optionIndex + 1}`}
                                                            onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)}
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => updateQuestion(questionIndex, { answer: option })}
                                                        >
                                                            Benar
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label="Hapus opsi"
                                                            onClick={() =>
                                                                updateQuestion(questionIndex, {
                                                                    options: question.options.filter((_, index) => index !== optionIndex),
                                                                })
                                                            }
                                                        >
                                                            <Trash2 className="size-4 text-red-600" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            ))}
                        </div>
                        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
                            <p className="text-sm text-slate-500">{questions.length} pertanyaan</p>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setQuestions((items) => [...items, blankQuestion(items.length + 1)])}
                            >
                                <Plus className="size-4" />
                                Tambah pertanyaan
                            </Button>
                        </div>
                        <InputError message={form.errors.questions} className="mt-4" />
                    </Panel>
                </div>

                <Panel title="Preview siswa">
                    <div className="space-y-4">
                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                            <p className="text-xs font-bold tracking-wider text-blue-700 uppercase">
                                {form.data.lesson_id ? 'Kuis lesson' : 'Ujian akhir'}
                            </p>
                            <h2 className="mt-2 text-xl font-extrabold text-slate-950">{form.data.title || 'Judul ujian'}</h2>
                            <p className="mt-2 text-sm text-slate-600">Passing score {form.data.passing_score || 70}.</p>
                            <p className="mt-1 text-sm text-slate-600">{timerSummary(timerMode, form.data.time_limit_seconds)}</p>
                        </div>
                        {questions.map((question, index) => (
                            <div key={index} className="rounded-xl border border-slate-200 p-4">
                                <Label>
                                    {index + 1}. {question.question || 'Teks pertanyaan akan tampil di sini'}
                                </Label>
                                {question.options.filter(Boolean).length > 0 ? (
                                    <div className="mt-3 space-y-2">
                                        {question.options.filter(Boolean).map((option) => (
                                            <label key={option} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm">
                                                <input type="radio" readOnly />
                                                {option}
                                                {option === question.answer && <CheckCircle2 className="ml-auto size-4 text-emerald-600" />}
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <Input className="mt-3" disabled placeholder="Field jawaban siswa" />
                                )}
                            </div>
                        ))}
                        <Button type="submit" className="w-full bg-[#1C7DE8] hover:bg-[#1469c7]" disabled={form.processing}>
                            Simpan Ujian
                        </Button>
                    </div>
                </Panel>
            </form>
        </Shell>
    );
}

function createQuestionId(): string {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
    }

    return `q-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function blankQuestion(index: number): QuestionForm {
    return {
        id: createQuestionId(),
        question: `Pertanyaan ${index}`,
        answer: '',
        options: ['', '', '', ''],
    };
}

function normalizeQuestions(questions?: StoredQuestion[] | null): QuestionForm[] {
    if (!questions || questions.length === 0) {
        return [blankQuestion(1)];
    }

    const seenIds = new Set<string>();
    const seenContent = new Set<string>();

    return questions.flatMap((question, index) => {
        const contentKey = JSON.stringify({
            question: (question.question ?? '').trim(),
            answer: (question.answer ?? '').trim(),
            options: (question.options ?? []).map((option) => option.trim()).filter(Boolean),
        });
        const id = question.id?.trim() || `legacy-${hashString(contentKey)}`;

        if (seenIds.has(id) || seenContent.has(contentKey)) {
            return [];
        }

        seenIds.add(id);
        seenContent.add(contentKey);

        return [
            {
                id,
                question: question.question ?? `Pertanyaan ${index + 1}`,
                answer: question.answer ?? '',
                options: Array.isArray(question.options) && question.options.length > 0 ? question.options : ['', '', '', ''],
            },
        ];
    });
}

function hashString(value: string): string {
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
        hash = (hash << 5) - hash + value.charCodeAt(index);
        hash |= 0;
    }

    return Math.abs(hash).toString(36);
}

function timerSummary(mode: TimerMode, seconds: string): string {
    if (mode === 'none') {
        return 'Tanpa batas waktu pengerjaan.';
    }

    const duration = Number(seconds || 0);
    const label = duration > 0 ? formatDuration(duration) : 'durasi belum diatur';

    return mode === 'per_question' ? `Batas waktu ${label} per soal.` : `Batas waktu total ${label}.`;
}

function formatDuration(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes <= 0) {
        return `${seconds} detik`;
    }

    return seconds > 0 ? `${minutes} menit ${seconds} detik` : `${minutes} menit`;
}

function Field({ label, error, required = false, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <FieldLabel required={required}>{label}</FieldLabel>
            {children}
            <InputError message={error} />
        </div>
    );
}
