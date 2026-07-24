<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ForumController extends Controller
{
    public function index(Request $request, Course $course): Response
    {
        $this->authorizeCourseAccess($request, $course);

        $threads = $course->forumThreads()
            ->with(['user:id,name,role', 'lesson:id,title', 'posts.user:id,name,role'])
            ->latest('updated_at')
            ->get()
            ->map(fn (ForumThread $thread) => [
                'id' => $thread->id,
                'title' => $thread->title,
                'status' => $thread->status,
                'lesson' => $thread->lesson?->title,
                'user' => $thread->user->only(['id', 'name', 'role']),
                'canManage' => $this->canManage($request, $course, $thread->user_id),
                'posts' => $thread->posts->map(fn (ForumPost $post) => [
                    'id' => $post->id,
                    'body' => $post->body,
                    'createdAt' => $post->created_at?->toIso8601String(),
                    'user' => $post->user->only(['id', 'name', 'role']),
                    'canManage' => $this->canManage($request, $course, $post->user_id),
                ]),
            ]);

        return Inertia::render('forum/index', [
            'course' => $course->only(['id', 'title']),
            'lessons' => $course->lessons()->select('lessons.id', 'lessons.title')->orderBy('lessons.title')->get(),
            'threads' => $threads,
        ]);
    }

    public function store(Request $request, Course $course): RedirectResponse
    {
        $this->authorizeCourseAccess($request, $course);
        $data = $request->validate([
            'lesson_id' => [
                'nullable',
                Rule::exists('lessons', 'id')->where(fn ($query) => $query->whereIn(
                    'chapter_id',
                    $course->chapters()->pluck('id'),
                )),
            ],
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:10000'],
        ]);

        $thread = DB::transaction(function () use ($request, $course, $data) {
            $thread = $course->forumThreads()->create([
                'lesson_id' => $data['lesson_id'] ?? null,
                'user_id' => $request->user()->id,
                'title' => $data['title'],
                'status' => 'open',
            ]);
            $thread->posts()->create([
                'user_id' => $request->user()->id,
                'body' => $data['body'],
            ]);

            return $thread;
        });

        AuditLogger::log('forum_thread.created', $request->user(), $thread);

        return back()->with('success', 'Topik forum berhasil dibuat.');
    }

    public function update(Request $request, ForumThread $thread): RedirectResponse
    {
        $thread->load('course');
        abort_unless($this->canManage($request, $thread->course, $thread->user_id), 403);
        $thread->update($request->validate([
            'title' => ['required', 'string', 'max:255'],
            'status' => ['required', Rule::in(['open', 'closed'])],
        ]));

        AuditLogger::log('forum_thread.updated', $request->user(), $thread);

        return back()->with('success', 'Topik forum berhasil diperbarui.');
    }

    public function destroy(Request $request, ForumThread $thread): RedirectResponse
    {
        $thread->load('course');
        abort_unless($this->canManage($request, $thread->course, $thread->user_id), 403);
        AuditLogger::log('forum_thread.deleted', $request->user(), $thread, ['title' => $thread->title]);
        $thread->delete();

        return back()->with('success', 'Topik forum berhasil dihapus.');
    }

    public function storePost(Request $request, ForumThread $thread): RedirectResponse
    {
        $thread->load('course');
        $this->authorizeCourseAccess($request, $thread->course);
        if ($thread->status !== 'open') {
            return back()->with('error', 'Topik ini sudah ditutup.');
        }
        $data = $request->validate(['body' => ['required', 'string', 'max:10000']]);

        $post = $thread->posts()->create([
            'user_id' => $request->user()->id,
            'body' => $data['body'],
        ]);
        $thread->touch();
        AuditLogger::log('forum_post.created', $request->user(), $post);

        return back()->with('success', 'Balasan forum berhasil dikirim.');
    }

    public function updatePost(Request $request, ForumPost $post): RedirectResponse
    {
        $post->load('thread.course');
        abort_unless($this->canManage($request, $post->thread->course, $post->user_id), 403);
        $post->update($request->validate(['body' => ['required', 'string', 'max:10000']]));
        AuditLogger::log('forum_post.updated', $request->user(), $post);

        return back()->with('success', 'Balasan forum berhasil diperbarui.');
    }

    public function destroyPost(Request $request, ForumPost $post): RedirectResponse
    {
        $post->load('thread.course');
        abort_unless($this->canManage($request, $post->thread->course, $post->user_id), 403);
        AuditLogger::log('forum_post.deleted', $request->user(), $post);
        $post->delete();

        return back()->with('success', 'Balasan forum berhasil dihapus.');
    }

    private function authorizeCourseAccess(Request $request, Course $course): void
    {
        $user = $request->user();
        $allowed = $user->isAdmin()
            || ($user->role === 'internal_instructor' && $course->instructor_id === $user->id)
            || ($user->role === 'student' && $course->enrollments()
                ->where('user_id', $user->id)
                ->whereIn('status', ['active', 'completed'])
                ->exists());

        abort_unless($allowed, 403);
    }

    private function canManage(Request $request, Course $course, int $ownerId): bool
    {
        $user = $request->user();

        return $user->id === $ownerId
            || $user->isAdmin()
            || ($user->role === 'internal_instructor' && $course->instructor_id === $user->id);
    }
}
