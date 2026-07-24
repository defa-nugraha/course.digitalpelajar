import { cn } from '@/lib/utils';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Code2, Heading2, Italic, List, ListOrdered, Quote, Redo2, Undo2 } from 'lucide-react';
import { useEffect } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export function RichTextEditor({ value, onChange, className }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [StarterKit],
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

    if (!editor) {
        return <div className="min-h-64 rounded-md border border-slate-200 bg-slate-50" />;
    }

    return (
        <div className={cn('overflow-hidden rounded-md', className)}>
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
                <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()}>
                    <Undo2 className="size-4" />
                </ToolbarButton>
                <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()}>
                    <Redo2 className="size-4" />
                </ToolbarButton>
            </div>
            <EditorContent editor={editor} />
        </div>
    );
}

function ToolbarButton({
    label,
    active = false,
    children,
    onClick,
}: {
    label: string;
    active?: boolean;
    children: React.ReactNode;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            onClick={onClick}
            className={cn(
                'inline-flex size-8 items-center justify-center rounded border text-slate-600 transition hover:bg-white hover:text-blue-700',
                active ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-transparent',
            )}
        >
            {children}
        </button>
    );
}
