import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Eye, Maximize2, Minus, Plus, Redo2, RotateCcw, Save, Undo2, UploadCloud, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import type { InteractiveEditorBlock, InteractiveEditorCourse, InteractiveEditorLesson, SaveStatus } from './types';

export function EditorToolbar({
    course,
    lesson,
    blockStatus,
    saveStatus,
    saveError,
    zoom,
    backUrl,
    blockEditUrl,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onZoomIn,
    onZoomOut,
    onFit,
    onPreview,
    onSave,
    onPublish,
}: {
    course: InteractiveEditorCourse;
    lesson: InteractiveEditorLesson;
    blockStatus: InteractiveEditorBlock['status'];
    saveStatus: SaveStatus;
    saveError?: string | null;
    zoom: number;
    backUrl: string;
    blockEditUrl: string;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFit: () => void;
    onPreview: () => void;
    onSave: () => void;
    onPublish: () => void;
}) {
    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
            <div className="flex min-w-0 items-center gap-3">
                <Button asChild variant="outline" size="icon" aria-label="Kembali ke Course Builder">
                    <Link href={backUrl}>
                        <ArrowLeft className="size-4" />
                    </Link>
                </Button>
                <div className="min-w-0">
                    <p className="truncate text-xs font-bold tracking-wide text-blue-700 uppercase">Studio Interaktif · {lesson.chapter.title}</p>
                    <h1 className="truncate text-lg font-black text-slate-950">
                        {course.title} / {lesson.title}
                    </h1>
                </div>
                <span className={cn('hidden rounded-full px-3 py-1 text-xs font-bold md:inline-flex', statusClass(blockStatus))}>
                    {statusLabel(blockStatus)}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <SaveStatusPill status={saveStatus} error={saveError} />
                <div className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 xl:flex">
                    <ToolbarIcon label="Undo" disabled={!canUndo} onClick={onUndo}>
                        <Undo2 className="size-4" />
                    </ToolbarIcon>
                    <ToolbarIcon label="Redo" disabled={!canRedo} onClick={onRedo}>
                        <Redo2 className="size-4" />
                    </ToolbarIcon>
                </div>
                <div className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 lg:flex">
                    <ToolbarIcon label="Zoom out" onClick={onZoomOut}>
                        <Minus className="size-4" />
                    </ToolbarIcon>
                    <span className="w-14 text-center text-xs font-bold text-slate-600">{Math.round(zoom * 100)}%</span>
                    <ToolbarIcon label="Zoom in" onClick={onZoomIn}>
                        <Plus className="size-4" />
                    </ToolbarIcon>
                    <ToolbarIcon label="Fit to screen" onClick={onFit}>
                        <Maximize2 className="size-4" />
                    </ToolbarIcon>
                </div>
                <Button asChild variant="outline" className="hidden xl:inline-flex">
                    <Link href={blockEditUrl}>
                        <RotateCcw className="size-4" />
                        Form Lama
                    </Link>
                </Button>
                <Button type="button" variant="outline" onClick={onPreview}>
                    <Eye className="size-4" />
                    Preview
                </Button>
                <Button type="button" variant="outline" onClick={onSave}>
                    <Save className="size-4" />
                    Save
                </Button>
                <Button type="button" onClick={onPublish}>
                    <UploadCloud className="size-4" />
                    Publish
                </Button>
            </div>
        </header>
    );
}

function ToolbarIcon({
    label,
    disabled = false,
    children,
    onClick,
}: {
    label: string;
    disabled?: boolean;
    children: ReactNode;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            aria-label={label}
            title={label}
            onClick={onClick}
            className="inline-flex size-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
            {children}
        </button>
    );
}

function SaveStatusPill({ status, error }: { status: SaveStatus; error?: string | null }) {
    const label = {
        saved: 'Saved',
        dirty: 'Unsaved changes',
        saving: 'Saving',
        failed: 'Save failed',
        conflict: 'Conflict detected',
    }[status];
    const Icon = status === 'failed' || status === 'conflict' ? WifiOff : CheckCircle2;

    return (
        <span
            title={error ?? label}
            className={cn(
                'hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold md:inline-flex',
                status === 'saved' && 'bg-emerald-50 text-emerald-700',
                status === 'dirty' && 'bg-amber-50 text-amber-700',
                status === 'saving' && 'bg-blue-50 text-blue-700',
                (status === 'failed' || status === 'conflict') && 'bg-red-50 text-red-700',
            )}
        >
            <Icon className={cn('size-3.5', status === 'saving' && 'animate-pulse')} />
            {label}
        </span>
    );
}

function statusClass(status: InteractiveEditorBlock['status']) {
    return {
        draft: 'bg-slate-100 text-slate-700',
        reviewed: 'bg-amber-50 text-amber-700',
        published: 'bg-emerald-50 text-emerald-700',
    }[status];
}

function statusLabel(status: InteractiveEditorBlock['status']) {
    return {
        draft: 'Draft',
        reviewed: 'Reviewed',
        published: 'Published',
    }[status];
}
