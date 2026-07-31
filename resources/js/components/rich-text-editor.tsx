import { cn } from '@/lib/utils';
import { Node, mergeAttributes } from '@tiptap/core';
import ImageExtension from '@tiptap/extension-image';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Code2, Heading2, ImagePlus, Italic, List, ListOrdered, Loader2, Quote, Redo2, Undo2, Video } from 'lucide-react';
import { ChangeEvent, ReactNode, useEffect, useRef, useState } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    uploadUrl?: string;
}

interface EditorMediaUploadResponse {
    url: string;
    type: 'image' | 'video';
    originalName?: string | null;
}

const VideoNode = Node.create({
    name: 'video',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            src: {
                default: null,
            },
            title: {
                default: null,
            },
        };
    },

    parseHTML() {
        return [{ tag: 'video[src]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'video',
            mergeAttributes(HTMLAttributes, {
                controls: 'true',
                class: 'my-4 aspect-video w-full rounded-xl border border-slate-200 bg-black object-contain',
            }),
        ];
    },
});

export function RichTextEditor({ value, onChange, className, uploadUrl }: RichTextEditorProps) {
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const videoInputRef = useRef<HTMLInputElement | null>(null);
    const [uploading, setUploading] = useState<'image' | 'video' | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const editor = useEditor({
        extensions: [StarterKit, ImageExtension.configure({ allowBase64: false, inline: false }), VideoNode],
        content: value || '<p></p>',
        editorProps: {
            attributes: {
                class: 'min-h-64 rounded-b-md border border-t-0 border-slate-200 bg-white p-4 text-sm leading-7 outline-none prose-content',
            },
        },
        onUpdate({ editor }) {
            onChange(editor.getHTML());
        },
    });

    useEffect(() => {
        if (!editor || editor.getHTML() === value) {
            return;
        }

        editor.commands.setContent(value || '<p></p>', { emitUpdate: false });
    }, [editor, value]);

    const uploadMedia = async (file: File, kind: 'image' | 'video') => {
        if (!editor || !uploadUrl) {
            return;
        }

        setUploading(kind);
        setUploadError(null);

        const body = new FormData();
        body.append('media', file);
        body.append('type', kind);

        try {
            const response = await fetch(uploadUrl, {
                method: 'POST',
                body,
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
            });
            const payload = (await response.json().catch(() => ({}))) as Partial<EditorMediaUploadResponse> & {
                message?: string;
                errors?: Record<string, string[]>;
            };

            if (!response.ok || !payload.url) {
                const firstError = payload.errors ? Object.values(payload.errors).flat().find(Boolean) : null;
                throw new Error(firstError || payload.message || 'Upload media gagal.');
            }

            const originalName = payload.originalName || file.name;

            if (payload.type === 'image') {
                editor.chain().focus().setImage({ src: payload.url, alt: originalName }).run();
            } else {
                editor.chain().focus().insertContent({ type: 'video', attrs: { src: payload.url, title: originalName } }).run();
            }
        } catch (error) {
            setUploadError(error instanceof Error ? error.message : 'Upload media gagal.');
        } finally {
            setUploading(null);
        }
    };

    const handleFileChange = (kind: 'image' | 'video') => (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        event.target.value = '';

        if (file) {
            void uploadMedia(file, kind);
        }
    };

    if (!editor) {
        return <div className="min-h-64 rounded-md border border-slate-200 bg-slate-50" />;
    }

    return (
        <div className={cn('overflow-hidden rounded-md', className)}>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange('image')} />
            <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime" className="hidden" onChange={handleFileChange('video')} />
            <div className="flex flex-wrap gap-1 rounded-t-md border border-slate-200 bg-slate-50 p-2">
                <ToolbarButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
                    <Bold className="size-4" />
                </ToolbarButton>
                <ToolbarButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
                    <Italic className="size-4" />
                </ToolbarButton>
                <ToolbarButton
                    label="Heading"
                    active={editor.isActive('heading', { level: 2 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                >
                    <Heading2 className="size-4" />
                </ToolbarButton>
                <ToolbarButton
                    label="Bullet list"
                    active={editor.isActive('bulletList')}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                >
                    <List className="size-4" />
                </ToolbarButton>
                <ToolbarButton
                    label="Numbered list"
                    active={editor.isActive('orderedList')}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                >
                    <ListOrdered className="size-4" />
                </ToolbarButton>
                <ToolbarButton
                    label="Quote"
                    active={editor.isActive('blockquote')}
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                >
                    <Quote className="size-4" />
                </ToolbarButton>
                <ToolbarButton
                    label="Code block"
                    active={editor.isActive('codeBlock')}
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                >
                    <Code2 className="size-4" />
                </ToolbarButton>
                <div className="mx-1 h-8 w-px bg-slate-200" />
                <ToolbarButton label="Upload gambar" disabled={!uploadUrl || uploading !== null} onClick={() => imageInputRef.current?.click()}>
                    {uploading === 'image' ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                </ToolbarButton>
                <ToolbarButton label="Upload video" disabled={!uploadUrl || uploading !== null} onClick={() => videoInputRef.current?.click()}>
                    {uploading === 'video' ? <Loader2 className="size-4 animate-spin" /> : <Video className="size-4" />}
                </ToolbarButton>
                <div className="mx-1 h-8 w-px bg-slate-200" />
                <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()}>
                    <Undo2 className="size-4" />
                </ToolbarButton>
                <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()}>
                    <Redo2 className="size-4" />
                </ToolbarButton>
            </div>
            <EditorContent editor={editor} />
            {uploadError && <p className="rounded-b-md border border-t-0 border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{uploadError}</p>}
        </div>
    );
}

function ToolbarButton({
    label,
    active = false,
    disabled = false,
    children,
    onClick,
}: {
    label: string;
    active?: boolean;
    disabled?: boolean;
    children: ReactNode;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'inline-flex size-8 items-center justify-center rounded border text-slate-600 transition hover:bg-white hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50',
                active ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-transparent',
            )}
        >
            {children}
        </button>
    );
}

function csrfToken(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}
