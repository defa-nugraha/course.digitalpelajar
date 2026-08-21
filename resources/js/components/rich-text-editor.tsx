import { cn } from '@/lib/utils';
import { Node, mergeAttributes } from '@tiptap/core';
import ImageExtension from '@tiptap/extension-image';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    Bold,
    Code2,
    Heading2,
    ImagePlus,
    Italic,
    List,
    ListOrdered,
    Loader2,
    Maximize2,
    Minus,
    Plus,
    Quote,
    Redo2,
    Undo2,
    Video,
} from 'lucide-react';
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

const IMAGE_SIZE_MIN = 20;
const IMAGE_SIZE_MAX = 100;
const IMAGE_SIZE_STEP = 5;
const IMAGE_SIZE_PRESETS = [25, 50, 75, 100];

const ResizableImageExtension = ImageExtension.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: '100%',
                parseHTML: (element) => element.getAttribute('data-width') || element.style.width || element.getAttribute('width') || '100%',
                renderHTML: (attributes) => {
                    const width = normalizeImageWidth(attributes.width);

                    return {
                        'data-width': width,
                        style: `width: ${width}; height: auto;`,
                    };
                },
            },
        };
    },
});

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
    const [selectedImageWidth, setSelectedImageWidth] = useState<number | null>(null);
    const editor = useEditor({
        extensions: [StarterKit, ResizableImageExtension.configure({ allowBase64: false, inline: false }), VideoNode],
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

    useEffect(() => {
        if (!editor) {
            return;
        }

        const syncSelectedImage = () => {
            setSelectedImageWidth(editor.isActive('image') ? imageWidthToNumber(editor.getAttributes('image').width) : null);
        };

        syncSelectedImage();
        editor.on('selectionUpdate', syncSelectedImage);
        editor.on('transaction', syncSelectedImage);

        return () => {
            editor.off('selectionUpdate', syncSelectedImage);
            editor.off('transaction', syncSelectedImage);
        };
    }, [editor]);

    const updateSelectedImageWidth = (width: number) => {
        if (!editor || !editor.isActive('image')) {
            return;
        }

        const normalizedWidth = normalizeImageWidth(width);
        editor.chain().focus().updateAttributes('image', { width: normalizedWidth }).run();
        setSelectedImageWidth(imageWidthToNumber(normalizedWidth));
    };

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
                editor
                    .chain()
                    .focus()
                    .insertContent({ type: 'image', attrs: { src: payload.url, alt: originalName, width: '100%' } })
                    .run();
            } else {
                editor
                    .chain()
                    .focus()
                    .insertContent({ type: 'video', attrs: { src: payload.url, title: originalName } })
                    .run();
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
            <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                className="hidden"
                onChange={handleFileChange('video')}
            />
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
                <ToolbarButton label="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
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
            <div
                className={cn(
                    'flex flex-wrap items-center gap-3 border-x border-slate-200 bg-white px-3 py-2 text-xs text-slate-600',
                    selectedImageWidth === null && 'text-slate-400',
                )}
            >
                <div className="flex items-center gap-2 font-semibold">
                    <Maximize2 className="size-4" />
                    <span>Ukuran gambar</span>
                </div>
                <ToolbarButton
                    label="Kecilkan gambar"
                    disabled={selectedImageWidth === null || selectedImageWidth <= IMAGE_SIZE_MIN}
                    onClick={() => updateSelectedImageWidth((selectedImageWidth ?? IMAGE_SIZE_MAX) - IMAGE_SIZE_STEP)}
                >
                    <Minus className="size-4" />
                </ToolbarButton>
                <input
                    type="range"
                    min={IMAGE_SIZE_MIN}
                    max={IMAGE_SIZE_MAX}
                    step={IMAGE_SIZE_STEP}
                    value={selectedImageWidth ?? IMAGE_SIZE_MAX}
                    disabled={selectedImageWidth === null}
                    onChange={(event) => updateSelectedImageWidth(Number(event.target.value))}
                    className="h-2 w-36 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Ukuran gambar"
                />
                <ToolbarButton
                    label="Besarkan gambar"
                    disabled={selectedImageWidth === null || selectedImageWidth >= IMAGE_SIZE_MAX}
                    onClick={() => updateSelectedImageWidth((selectedImageWidth ?? IMAGE_SIZE_MIN) + IMAGE_SIZE_STEP)}
                >
                    <Plus className="size-4" />
                </ToolbarButton>
                <span className="w-10 text-right font-bold text-slate-700">{selectedImageWidth ? `${selectedImageWidth}%` : '-'}</span>
                <div className="flex flex-wrap items-center gap-1">
                    {IMAGE_SIZE_PRESETS.map((width) => (
                        <button
                            key={width}
                            type="button"
                            disabled={selectedImageWidth === null}
                            onClick={() => updateSelectedImageWidth(width)}
                            className={cn(
                                'rounded-full border px-2 py-1 font-semibold transition disabled:cursor-not-allowed disabled:opacity-40',
                                selectedImageWidth === width
                                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700',
                            )}
                        >
                            {width}%
                        </button>
                    ))}
                </div>
                {selectedImageWidth === null && <span>Klik gambar di editor untuk mengatur ukurannya.</span>}
            </div>
            <EditorContent editor={editor} />
            {uploadError && (
                <p className="rounded-b-md border border-t-0 border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{uploadError}</p>
            )}
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

function normalizeImageWidth(value: unknown): string {
    const width = imageWidthToNumber(value);

    return `${width}%`;
}

function imageWidthToNumber(value: unknown): number {
    const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? '').replace('%', ''), 10);
    const width = Number.isFinite(parsed) ? parsed : IMAGE_SIZE_MAX;

    return Math.min(IMAGE_SIZE_MAX, Math.max(IMAGE_SIZE_MIN, Math.round(width / IMAGE_SIZE_STEP) * IMAGE_SIZE_STEP));
}
