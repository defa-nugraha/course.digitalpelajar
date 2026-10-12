import { Shell } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, useForm } from '@inertiajs/react';
import { AlertTriangle, Clock3, Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type QuizTimeLimitMode = 'none' | 'total' | 'per_question';

interface QuizQuestion {
    index: number;
    id: string;
    question: string;
    options: string[];
}

interface QuizAttemptData {
    id: number;
    title: string;
    passingScore: number;
    timeLimitMode: QuizTimeLimitMode;
    timeLimitSeconds: number | null;
    questions: QuizQuestion[];
}

interface QuizAttemptProps {
    quiz: QuizAttemptData;
    courseTitle: string;
    startedAt: number;
    deadlineAt: number | null;
}

export default function QuizAttemptPage({ quiz, courseTitle, deadlineAt }: QuizAttemptProps) {
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
    const [questionDeadline, setQuestionDeadline] = useState<number | null>(() =>
        quiz.timeLimitMode === 'per_question' && quiz.timeLimitSeconds ? Date.now() + quiz.timeLimitSeconds * 1000 : null,
    );
    const [remainingSeconds, setRemainingSeconds] = useState<number | null>(() => {
        if (quiz.timeLimitMode === 'total' && deadlineAt) {
            return Math.max(0, deadlineAt - Math.floor(Date.now() / 1000));
        }

        return quiz.timeLimitMode === 'per_question' ? quiz.timeLimitSeconds : null;
    });
    const [timeExpired, setTimeExpired] = useState(false);
    const [validationMessage, setValidationMessage] = useState<string | null>(null);
    const submittingRef = useRef(false);
    const transitionedQuestionRef = useRef<number | null>(null);
    const form = useForm<{ answers: string[]; auto_submitted: boolean }>({
        answers: quiz.questions.map(() => ''),
        auto_submitted: false,
    });

    const finishQuiz = useCallback(
        (autoSubmit = false) => {
            if (submittingRef.current) return;

            const unanswered = form.data.answers.filter((answer) => answer.trim() === '').length;
            if (!autoSubmit && unanswered > 0) {
                setValidationMessage(unanswered === 1 ? 'Masih ada 1 soal yang belum dijawab.' : `Masih ada ${unanswered} soal yang belum dijawab.`);
                return;
            }

            submittingRef.current = true;
            if (autoSubmit) setTimeExpired(true);
            setValidationMessage(null);
            form.transform((data) => ({ ...data, auto_submitted: autoSubmit }));
            form.post(`/quizzes/${quiz.id}/attempts`, {
                preserveScroll: true,
                onError: () => {
                    submittingRef.current = false;
                },
            });
        },
        [form, quiz.id],
    );

    const goToPreviousQuestion = () => {
        if (quiz.timeLimitMode === 'per_question' || activeQuestionIndex <= 0 || timeExpired) return;

        setActiveQuestionIndex((current) => current - 1);
        setValidationMessage(null);
    };

    const goToNextQuestion = () => {
        if (activeQuestionIndex >= quiz.questions.length - 1 || timeExpired) return;

        const nextIndex = activeQuestionIndex + 1;
        transitionedQuestionRef.current = null;
        setActiveQuestionIndex(nextIndex);
        if (quiz.timeLimitMode === 'per_question' && quiz.timeLimitSeconds) {
            setQuestionDeadline(Date.now() + quiz.timeLimitSeconds * 1000);
            setRemainingSeconds(quiz.timeLimitSeconds);
        }
        setValidationMessage(null);
    };

    useEffect(() => {
        if (quiz.timeLimitMode === 'none' || !quiz.timeLimitSeconds || timeExpired) {
            return;
        }

        const updateTimer = () => {
            const secondsLeft =
                quiz.timeLimitMode === 'total' && deadlineAt
                    ? Math.max(0, Math.ceil(deadlineAt - Date.now() / 1000))
                    : questionDeadline
                      ? Math.max(0, Math.ceil((questionDeadline - Date.now()) / 1000))
                      : (quiz.timeLimitSeconds ?? 0);

            setRemainingSeconds(secondsLeft);
            if (secondsLeft > 0) return;

            if (quiz.timeLimitMode === 'total') {
                finishQuiz(true);
                return;
            }

            if (transitionedQuestionRef.current === activeQuestionIndex) return;
            transitionedQuestionRef.current = activeQuestionIndex;

            if (activeQuestionIndex < quiz.questions.length - 1) {
                const nextIndex = activeQuestionIndex + 1;
                setActiveQuestionIndex(nextIndex);
                setQuestionDeadline(Date.now() + quiz.timeLimitSeconds * 1000);
            } else {
                finishQuiz(true);
            }
        };

        updateTimer();
        const interval = window.setInterval(updateTimer, 250);

        return () => window.clearInterval(interval);
    }, [
        activeQuestionIndex,
        deadlineAt,
        finishQuiz,
        questionDeadline,
        quiz.questions.length,
        quiz.timeLimitMode,
        quiz.timeLimitSeconds,
        timeExpired,
    ]);

    const question = quiz.questions[activeQuestionIndex];
    const answeredCount = form.data.answers.filter((answer) => answer.trim() !== '').length;
    const isPerQuestionTimed = quiz.timeLimitMode === 'per_question' && Boolean(quiz.timeLimitSeconds);

    return (
        <>
            <Head title={`Mengerjakan Quiz: ${quiz.title}`} />
            <Shell title="Mengerjakan Quiz" eyebrow={courseTitle}>
                <main className="mx-auto max-w-4xl space-y-6">
                    <header className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6">
                        <p className="text-xs font-bold tracking-wider text-blue-700 uppercase">Quiz sedang berlangsung</p>
                        <h1 className="mt-2 text-2xl font-extrabold text-slate-950 md:text-3xl">{quiz.title}</h1>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-600">
                                Soal {activeQuestionIndex + 1} dari {quiz.questions.length} · {answeredCount} dijawab
                            </p>
                            {remainingSeconds !== null && (
                                <span
                                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-extrabold ${remainingSeconds <= 10 ? 'bg-red-100 text-red-700' : 'bg-white text-blue-700'}`}
                                >
                                    <Clock3 className="size-4" />
                                    {formatDuration(remainingSeconds)}
                                </span>
                            )}
                        </div>
                        {isPerQuestionTimed && (
                            <p className="mt-3 text-sm leading-6 text-amber-900">
                                Waktu habis akan memindahkan Anda ke soal berikutnya. Soal sebelumnya tidak dapat dibuka kembali.
                            </p>
                        )}
                        {timeExpired && form.processing && (
                            <p className="mt-3 text-sm font-semibold text-amber-900">Waktu berakhir. Jawaban sedang dikirim otomatis…</p>
                        )}
                    </header>

                    {question ? (
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                if (activeQuestionIndex === quiz.questions.length - 1) {
                                    finishQuiz(false);
                                } else {
                                    goToNextQuestion();
                                }
                            }}
                            className="space-y-5"
                        >
                            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 md:p-7">
                                <p className="text-xs font-bold tracking-wider text-blue-700 uppercase">Pertanyaan {activeQuestionIndex + 1}</p>
                                <Label className="text-base leading-7 text-slate-950 md:text-lg">{question.question}</Label>
                                {question.options.length > 0 ? (
                                    <div className="space-y-3 pt-2">
                                        {question.options.map((option) => (
                                            <label
                                                key={option}
                                                className={`flex items-start gap-3 rounded-xl border p-4 text-sm transition ${form.data.answers[question.index] === option ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'} ${timeExpired || form.processing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`question-${question.id}`}
                                                    className="mt-0.5"
                                                    disabled={timeExpired || form.processing}
                                                    checked={form.data.answers[question.index] === option}
                                                    onChange={() => {
                                                        const answers = [...form.data.answers];
                                                        answers[question.index] = option;
                                                        form.setData('answers', answers);
                                                        setValidationMessage(null);
                                                    }}
                                                />
                                                <span>{option}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <Input
                                        value={form.data.answers[question.index] ?? ''}
                                        onChange={(event) => {
                                            const answers = [...form.data.answers];
                                            answers[question.index] = event.target.value;
                                            form.setData('answers', answers);
                                            setValidationMessage(null);
                                        }}
                                        maxLength={2000}
                                        aria-label="Jawaban"
                                        disabled={timeExpired || form.processing}
                                    />
                                )}
                                {form.errors[`answers.${question.index}` as keyof typeof form.errors] && (
                                    <p className="text-sm font-medium text-red-600">
                                        {form.errors[`answers.${question.index}` as keyof typeof form.errors]}
                                    </p>
                                )}
                            </section>

                            {validationMessage && (
                                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                    {validationMessage}
                                </div>
                            )}

                            <footer className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                                {quiz.timeLimitMode !== 'per_question' && activeQuestionIndex > 0 ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="min-h-11"
                                        onClick={goToPreviousQuestion}
                                        disabled={form.processing || timeExpired}
                                    >
                                        Soal sebelumnya
                                    </Button>
                                ) : (
                                    <span />
                                )}
                                {activeQuestionIndex < quiz.questions.length - 1 ? (
                                    <Button type="submit" className="min-h-11" disabled={form.processing || timeExpired}>
                                        Soal berikutnya
                                    </Button>
                                ) : (
                                    <Button
                                        type="submit"
                                        className="min-h-11"
                                        disabled={form.processing || timeExpired || answeredCount !== quiz.questions.length}
                                    >
                                        <Send className="size-4" />
                                        Kirim semua jawaban
                                    </Button>
                                )}
                            </footer>
                        </form>
                    ) : (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
                            Quiz ini tidak memiliki soal yang bisa dikerjakan.
                        </div>
                    )}
                </main>
            </Shell>
        </>
    );
}

function formatDuration(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes <= 0) return `${seconds} detik`;

    return seconds > 0 ? `${minutes} menit ${seconds} detik` : `${minutes} menit`;
}
