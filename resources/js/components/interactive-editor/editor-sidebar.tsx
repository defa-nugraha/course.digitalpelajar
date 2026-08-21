import {
    ICON_CATEGORIES,
    ICON_OPTIONS,
    LucideIconRenderer,
    SHAPE_CATEGORIES,
    SHAPE_OPTIONS,
    iconsForCategory,
    shapeStyle,
} from '@/components/interactive-asset-library';
import type { InteractiveMedia } from '@/components/interactive-learning';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useDraggable } from '@dnd-kit/core';
import {
    FileAudio,
    Film,
    Image as ImageIcon,
    Layers3,
    MousePointerClick,
    PanelLeft,
    Plus,
    RectangleHorizontal,
    Search,
    SquareMousePointer,
    TextCursorInput,
    Upload,
} from 'lucide-react';
import { type ReactNode, useMemo, useRef, useState } from 'react';
import type { EditorPanel, ElementPreset, ElementType } from './types';

const panelItems: Array<{ panel: EditorPanel; label: string; icon: typeof PanelLeft }> = [
    { panel: 'scene', label: 'Scene', icon: PanelLeft },
    { panel: 'text', label: 'Text', icon: TextCursorInput },
    { panel: 'image', label: 'Image', icon: ImageIcon },
    { panel: 'video', label: 'Video', icon: Film },
    { panel: 'audio', label: 'Audio', icon: FileAudio },
    { panel: 'button', label: 'Button', icon: SquareMousePointer },
    { panel: 'hotspot', label: 'Hotspot', icon: MousePointerClick },
    { panel: 'shape', label: 'Shape', icon: RectangleHorizontal },
    { panel: 'icon', label: 'Icon', icon: Plus },
    { panel: 'upload', label: 'Upload', icon: Upload },
    { panel: 'layers', label: 'Layers', icon: Layers3 },
];

export function EditorSidebar({
    activePanel,
    uploading,
    uploadError,
    onPanelChange,
    onAddElement,
    onUploadElement,
}: {
    activePanel: EditorPanel;
    uploading?: string | null;
    uploadError?: string | null;
    onPanelChange: (panel: EditorPanel) => void;
    onAddElement: (type: ElementType, media?: InteractiveMedia | null, preset?: ElementPreset) => void;
    onUploadElement: (type: 'image' | 'video' | 'audio', file: File) => Promise<void>;
}) {
    return (
        <TooltipProvider>
            <aside className="flex h-full w-[320px] shrink-0 border-r border-slate-200 bg-white">
                <nav className="flex w-16 flex-col items-center gap-2 border-r border-slate-200 py-3">
                    {panelItems.map((item) => {
                        const Icon = item.icon;

                        return (
                            <Tooltip key={item.panel}>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        aria-label={item.label}
                                        onClick={() => onPanelChange(item.panel)}
                                        className={cn(
                                            'flex size-11 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-blue-50 hover:text-blue-700',
                                            activePanel === item.panel && 'bg-blue-600 text-white hover:bg-blue-600 hover:text-white',
                                        )}
                                    >
                                        <Icon className="size-5" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">{item.label}</TooltipContent>
                            </Tooltip>
                        );
                    })}
                </nav>

                <div className="min-w-0 flex-1 overflow-y-auto p-4">
                    <PanelContent
                        panel={activePanel}
                        uploading={uploading}
                        uploadError={uploadError}
                        onAddElement={onAddElement}
                        onUploadElement={onUploadElement}
                    />
                </div>
            </aside>
        </TooltipProvider>
    );
}

function PanelContent({
    panel,
    uploading,
    uploadError,
    onAddElement,
    onUploadElement,
}: {
    panel: EditorPanel;
    uploading?: string | null;
    uploadError?: string | null;
    onAddElement: (type: ElementType, media?: InteractiveMedia | null, preset?: ElementPreset) => void;
    onUploadElement: (type: 'image' | 'video' | 'audio', file: File) => Promise<void>;
}) {
    if (panel === 'scene') {
        return (
            <Panel
                title="Scene"
                description="Kelola halaman materi dari navigator bawah. Gunakan tombol tambah, duplicate, delete, dan drag untuk mengubah urutan."
            >
                <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-900">
                    Scene aktif ditampilkan di canvas. Klik scene di navigator bawah untuk berpindah.
                </p>
            </Panel>
        );
    }

    if (panel === 'layers') {
        return (
            <Panel
                title="Layers"
                description="Layer ditampilkan di panel khusus kanan bawah. Pilih menu Layers untuk fokus mengatur urutan, lock, hide, duplicate, dan delete."
            >
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                    Urutan layer sama dengan urutan render pada player siswa.
                </p>
            </Panel>
        );
    }

    if (panel === 'upload') {
        return (
            <Panel title="Upload media" description="Gunakan sistem MediaUpload project. File yang berhasil diupload langsung menjadi elemen canvas.">
                <UploadButton type="image" label="Upload Gambar" accept="image/*" uploading={uploading === 'image'} onUpload={onUploadElement} />
                <UploadButton type="video" label="Upload Video" accept="video/*" uploading={uploading === 'video'} onUpload={onUploadElement} />
                <UploadButton type="audio" label="Upload Audio" accept="audio/*" uploading={uploading === 'audio'} onUpload={onUploadElement} />
                {uploadError && (
                    <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{uploadError}</p>
                )}
            </Panel>
        );
    }

    if (panel === 'shape') {
        return <ShapeLibrary onAddElement={onAddElement} />;
    }

    if (panel === 'icon') {
        return <IconLibrary onAddElement={onAddElement} />;
    }

    return (
        <Panel title={panelTitle(panel)} description={panelDescription(panel)}>
            <div className="grid gap-3">
                {paletteForPanel(panel).map((item) => (
                    <PaletteCard
                        key={item.type}
                        type={item.type}
                        title={item.title}
                        description={item.description}
                        onAdd={() => onAddElement(item.type)}
                    />
                ))}
            </div>
        </Panel>
    );
}

function Panel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
    return (
        <section>
            <p className="text-xs font-bold tracking-wide text-blue-700 uppercase">Panel editor</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
            <div className="mt-5 space-y-3">{children}</div>
        </section>
    );
}

function PaletteCard({ type, title, description, onAdd }: { type: ElementType; title: string; description: string; onAdd: () => void }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `palette:${type}`,
        data: { type },
    });

    return (
        <button
            ref={setNodeRef}
            type="button"
            onClick={onAdd}
            className={cn(
                'w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40',
                isDragging && 'opacity-50',
            )}
            style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }}
            {...listeners}
            {...attributes}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="font-bold text-slate-950">{title}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
                </div>
                <span className="rounded-xl bg-blue-600 p-2 text-white">
                    <Plus className="size-4" />
                </span>
            </div>
        </button>
    );
}

function ShapeLibrary({ onAddElement }: { onAddElement: (type: ElementType, media?: InteractiveMedia | null, preset?: ElementPreset) => void }) {
    const [category, setCategory] = useState<string>(SHAPE_CATEGORIES[0] ?? 'Dasar');
    const shapes = SHAPE_OPTIONS.filter((shape) => shape.category === category);

    return (
        <Panel title="Shape" description={`${SHAPE_OPTIONS.length} pilihan shape untuk highlight, diagram, callout, dan alur visual.`}>
            <div className="flex flex-wrap gap-2">
                {SHAPE_CATEGORIES.map((item) => (
                    <button
                        key={item}
                        type="button"
                        onClick={() => setCategory(item)}
                        className={cn(
                            'rounded-full border px-3 py-1.5 text-xs font-bold transition',
                            category === item
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-blue-50',
                        )}
                    >
                        {item}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
                {shapes.map((shape) => (
                    <PresetCard
                        key={shape.value}
                        id={`palette:shape:${shape.value}`}
                        type="shape"
                        title={shape.label}
                        description={shape.description}
                        preset={{
                            label: shape.label,
                            style: {
                                shape: shape.value,
                                backgroundColor: '#dbeafe',
                                borderColor: '#93c5fd',
                                color: '#1d4ed8',
                            },
                        }}
                        onAdd={(preset) => onAddElement('shape', null, preset)}
                        preview={
                            <span
                                className="block size-12 border border-blue-300 bg-blue-500"
                                style={shapeStyle(shape.value, shape.value === 'rounded-rectangle' ? 14 : 8)}
                            />
                        }
                    />
                ))}
            </div>
        </Panel>
    );
}

function IconLibrary({ onAddElement }: { onAddElement: (type: ElementType, media?: InteractiveMedia | null, preset?: ElementPreset) => void }) {
    const [category, setCategory] = useState<string>('popular');
    const [query, setQuery] = useState('');
    const icons = useMemo(() => {
        const source = iconsForCategory(category);
        const normalizedQuery = query.trim().toLowerCase();
        const filtered = normalizedQuery ? source.filter((icon) => icon.search.includes(normalizedQuery)) : source;

        return filtered.slice(0, 360);
    }, [category, query]);

    return (
        <Panel
            title="Icon"
            description={`${ICON_OPTIONS.length.toLocaleString('id-ID')} icon tersedia. Gunakan pencarian agar cepat menemukan icon yang relevan.`}
        >
            <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cari icon, mis. sensor, book, robot..."
                    className="pl-9"
                />
            </div>
            <div className="flex flex-wrap gap-2">
                {ICON_CATEGORIES.map((item) => (
                    <button
                        key={item.value}
                        type="button"
                        onClick={() => setCategory(item.value)}
                        className={cn(
                            'rounded-full border px-3 py-1.5 text-xs font-bold transition',
                            category === item.value
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-blue-50',
                        )}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
            <p className="text-xs font-semibold text-slate-500">
                Menampilkan {icons.length.toLocaleString('id-ID')} icon teratas{query ? ' berdasarkan pencarian' : ''}.
            </p>
            <div className="grid grid-cols-3 gap-2">
                {icons.map((icon) => (
                    <PresetCard
                        key={icon.value}
                        id={`palette:icon:${icon.value}`}
                        type="icon"
                        title={icon.label}
                        description={icon.value}
                        preset={{
                            label: icon.label,
                            style: {
                                icon: icon.value,
                                shape: 'circle',
                                backgroundColor: '#eff6ff',
                                borderColor: '#bfdbfe',
                                color: '#1d4ed8',
                            },
                        }}
                        onAdd={(preset) => onAddElement('icon', null, preset)}
                        preview={<LucideIconRenderer name={icon.value} className="size-7 text-blue-700" />}
                    />
                ))}
            </div>
            {icons.length === 0 && <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">Icon tidak ditemukan.</p>}
        </Panel>
    );
}

function PresetCard({
    id,
    type,
    title,
    description,
    preset,
    preview,
    onAdd,
}: {
    id: string;
    type: ElementType;
    title: string;
    description: string;
    preset: ElementPreset;
    preview: ReactNode;
    onAdd: (preset: ElementPreset) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id,
        data: { type, preset },
    });

    return (
        <button
            ref={setNodeRef}
            type="button"
            onClick={() => onAdd(preset)}
            className={cn(
                'rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40',
                isDragging && 'opacity-50',
            )}
            style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }}
            {...listeners}
            {...attributes}
        >
            <span className="flex h-16 items-center justify-center rounded-xl bg-slate-50">{preview}</span>
            <span className="mt-2 block truncate text-sm font-bold text-slate-950">{title}</span>
            <span className="mt-0.5 block truncate text-xs text-slate-500">{description}</span>
        </button>
    );
}

function UploadButton({
    type,
    label,
    accept,
    uploading,
    onUpload,
}: {
    type: 'image' | 'video' | 'audio';
    label: string;
    accept: string;
    uploading: boolean;
    onUpload: (type: 'image' | 'video' | 'audio', file: File) => Promise<void>;
}) {
    const inputRef = useRef<HTMLInputElement | null>(null);

    return (
        <div>
            <Button type="button" variant="outline" className="w-full justify-start" disabled={uploading} onClick={() => inputRef.current?.click()}>
                <Upload className="size-4" />
                {uploading ? 'Mengupload...' : label}
            </Button>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onUpload(type, file);
                    event.target.value = '';
                }}
            />
        </div>
    );
}

function paletteForPanel(panel: EditorPanel): Array<{ type: ElementType; title: string; description: string }> {
    if (panel === 'text') {
        return [{ type: 'text', title: 'Text block', description: 'Tambahkan teks penjelasan langsung pada canvas.' }];
    }

    if (panel === 'image') {
        return [{ type: 'image', title: 'Placeholder gambar', description: 'Tambahkan frame gambar, lalu upload media dari panel properti.' }];
    }

    if (panel === 'video') {
        return [{ type: 'video', title: 'Placeholder video', description: 'Tambahkan frame video, lalu upload file video dari panel properti.' }];
    }

    if (panel === 'audio') {
        return [{ type: 'audio', title: 'Audio player', description: 'Tambahkan audio player untuk narasi atau instruksi tambahan.' }];
    }

    if (panel === 'button') {
        return [{ type: 'button', title: 'Button interaktif', description: 'Tombol untuk membuka penjelasan atau berpindah scene.' }];
    }

    if (panel === 'hotspot') {
        return [{ type: 'hotspot', title: 'Hotspot', description: 'Titik klik wajib/opsional yang membuka penjelasan.' }];
    }

    if (panel === 'shape') {
        return [
            { type: 'shape', title: 'Shape', description: 'Kotak/lingkaran untuk highlight visual.' },
            { type: 'icon', title: 'Icon', description: 'Icon sederhana untuk memperjelas objek.' },
        ];
    }

    return [];
}

function panelTitle(panel: EditorPanel): string {
    return {
        scene: 'Scene',
        text: 'Text',
        image: 'Image',
        video: 'Video',
        audio: 'Audio',
        button: 'Button',
        hotspot: 'Hotspot',
        shape: 'Shape',
        icon: 'Icon',
        upload: 'Upload',
        layers: 'Layers',
    }[panel];
}

function panelDescription(panel: EditorPanel): string {
    return {
        scene: 'Atur halaman materi.',
        text: 'Tambahkan teks yang bisa diposisikan bebas.',
        image: 'Tambahkan gambar ke canvas.',
        video: 'Tambahkan video pembelajaran ke canvas.',
        audio: 'Tambahkan audio atau narasi.',
        button: 'Tambahkan tombol dengan aksi.',
        hotspot: 'Tambahkan area klik interaktif.',
        shape: 'Tambahkan shape pendukung.',
        icon: 'Tambahkan icon pendukung.',
        upload: 'Upload media.',
        layers: 'Atur urutan layer.',
    }[panel];
}
