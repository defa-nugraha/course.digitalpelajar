import InputError from '@/components/input-error';
import { Panel, Shell } from '@/components/platform';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { confirmDelete } from '@/lib/confirm-delete';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Lock, MessageSquare, Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface ForumPost {
    id: number;
    body: string;
    createdAt: string;
    user: { id: number; name: string; role: string };
    canManage: boolean;
}

interface ForumThread {
    id: number;
    title: string;
    status: string;
    lesson?: string | null;
    user: { id: number; name: string; role: string };
    canManage: boolean;
    posts: ForumPost[];
}

interface ForumProps {
    course: { id: number; title: string };
    lessons: { id: number; title: string }[];
    threads: ForumThread[];
}

export default function Forum({ course, lessons, threads }: ForumProps) {
    const [threadEditor, setThreadEditor] = useState<ForumThread | 'new' | null>(null);
    const [postEditor, setPostEditor] = useState<ForumPost | null>(null);
    const threadForm = useForm({ lesson_id: '', title: '', body: '', status: 'open' });
    const postForm = useForm({ body: '' });

    const openThread = (thread: ForumThread | 'new') => {
        setThreadEditor(thread);
        threadForm.setData(
            thread === 'new'
                ? { lesson_id: '', title: '', body: '', status: 'open' }
                : { lesson_id: '', title: thread.title, body: '', status: thread.status },
        );
        threadForm.clearErrors();
    };

    const submitThread = (event: FormEvent) => {
        event.preventDefault();
        if (!threadEditor) return;
        const options = { preserveScroll: true, onSuccess: () => setThreadEditor(null) };

        if (threadEditor === 'new') threadForm.post(`/courses/${course.id}/forum`, options);
        else threadForm.patch(`/forum/threads/${threadEditor.id}`, options);
    };

    const openPost = (post: ForumPost) => {
        setPostEditor(post);
        postForm.setData('body', post.body);
        postForm.clearErrors();
    };

    const submitPost = (event: FormEvent) => {
        event.preventDefault();
        if (!postEditor) return;
        postForm.patch(`/forum/posts/${postEditor.id}`, {
            preserveScroll: true,
            onSuccess: () => setPostEditor(null),
        });
    };

    return (
        <Shell
            title={`Forum: ${course.title}`}
            eyebrow="Diskusi Kelas"
            actions={
                <div className="flex gap-2">
                    <Button asChild variant="outline">
                        <Link href={`/learning?course=${course.id}`}>
                            <ArrowLeft className="size-4" />
                            Belajar
                        </Link>
                    </Button>
                    <Button onClick={() => openThread('new')}>
                        <Plus className="size-4" />
                        Topik
                    </Button>
                </div>
            }
        >
            <Head title={`Forum ${course.title}`} />
            <div className="space-y-5">
                {threads.map((thread) => (
                    <Panel
                        key={thread.id}
                        title={thread.title}
                        action={
                            thread.canManage && (
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" aria-label="Edit topik" onClick={() => openThread(thread)}>
                                        <Pencil className="size-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Hapus topik"
                                        onClick={() => {
                                            confirmDelete(`Hapus topik "${thread.title}"?`, () => {
                                                router.delete(`/forum/threads/${thread.id}`, { preserveScroll: true });
                                            });
                                        }}
                                    >
                                        <Trash2 className="size-4 text-red-600" />
                                    </Button>
                                </div>
                            )
                        }
                    >
                        <p className="mb-4 text-xs font-semibold text-slate-500">
                            Oleh {thread.user.name} · {thread.lesson || 'Forum kelas'} · {thread.status}
                        </p>
                        <div className="space-y-3">
                            {thread.posts.map((post) => (
                                <article key={post.id} className="rounded-lg border border-slate-200 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-bold">{post.user.name}</p>
                                            <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-slate-700">{post.body}</p>
                                        </div>
                                        {post.canManage && (
                                            <div className="flex shrink-0 gap-1">
                                                <Button variant="ghost" size="icon" aria-label="Edit balasan" onClick={() => openPost(post)}>
                                                    <Pencil className="size-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label="Hapus balasan"
                                                    onClick={() => {
                                                        confirmDelete('Hapus balasan ini?', () => {
                                                            router.delete(`/forum/posts/${post.id}`, { preserveScroll: true });
                                                        });
                                                    }}
                                                >
                                                    <Trash2 className="size-4 text-red-600" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                        {thread.status === 'open' ? (
                            <ReplyForm threadId={thread.id} />
                        ) : (
                            <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-500">
                                <Lock className="size-4" />
                                Topik ditutup.
                            </p>
                        )}
                    </Panel>
                ))}
                {threads.length === 0 && (
                    <Panel title="Belum ada diskusi">
                        <p className="text-sm text-slate-600">Buat topik pertama untuk berdiskusi dengan peserta dan pengajar.</p>
                    </Panel>
                )}
            </div>

            <Dialog open={Boolean(threadEditor)} onOpenChange={(value) => !value && setThreadEditor(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{threadEditor === 'new' ? 'Topik Baru' : 'Edit Topik'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitThread} className="space-y-4">
                        {threadEditor === 'new' && (
                            <div className="space-y-2">
                                <Label>Lesson (opsional)</Label>
                                <SearchableSelect
                                    value={threadForm.data.lesson_id}
                                    onChange={(value) => threadForm.setData('lesson_id', value)}
                                    options={[
                                        { value: '', label: 'Forum kelas' },
                                        ...lessons.map((lesson) => ({ value: String(lesson.id), label: lesson.title })),
                                    ]}
                                    placeholder="Pilih lesson"
                                />
                                <InputError message={threadForm.errors.lesson_id} />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Judul</Label>
                            <Input value={threadForm.data.title} onChange={(event) => threadForm.setData('title', event.target.value)} />
                            <InputError message={threadForm.errors.title} />
                        </div>
                        {threadEditor === 'new' ? (
                            <div className="space-y-2">
                                <Label>Isi diskusi</Label>
                                <textarea
                                    className="min-h-32 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                                    value={threadForm.data.body}
                                    onChange={(event) => threadForm.setData('body', event.target.value)}
                                />
                                <InputError message={threadForm.errors.body} />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <SearchableSelect
                                    value={threadForm.data.status}
                                    onChange={(value) => threadForm.setData('status', value)}
                                    options={[
                                        { value: 'open', label: 'Open' },
                                        { value: 'closed', label: 'Closed' },
                                    ]}
                                />
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setThreadEditor(null)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={threadForm.processing}>
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(postEditor)} onOpenChange={(value) => !value && setPostEditor(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Balasan</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitPost} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Isi balasan</Label>
                            <textarea
                                className="min-h-32 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                                value={postForm.data.body}
                                onChange={(event) => postForm.setData('body', event.target.value)}
                            />
                            <InputError message={postForm.errors.body} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setPostEditor(null)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={postForm.processing}>
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Shell>
    );
}

function ReplyForm({ threadId }: { threadId: number }) {
    const form = useForm({ body: '' });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(`/forum/threads/${threadId}/posts`, {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    return (
        <form onSubmit={submit} className="mt-4 space-y-2">
            <Label>Balasan</Label>
            <textarea
                className="min-h-24 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                value={form.data.body}
                onChange={(event) => form.setData('body', event.target.value)}
            />
            <InputError message={form.errors.body} />
            <Button type="submit" size="sm" disabled={form.processing}>
                <MessageSquare className="size-4" />
                Kirim Balasan
            </Button>
        </form>
    );
}
