import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Copy, Eye, EyeOff, GripVertical, Lock, Trash2, Unlock } from 'lucide-react';
import type { ReactNode } from 'react';
import type { EditorElement, ElementSelection } from './types';

export function LayersPanel({
    elements,
    selected,
    onSelect,
    onRename,
    onReorder,
    onToggleLock,
    onToggleHidden,
    onDuplicate,
    onDelete,
}: {
    elements: EditorElement[];
    selected: ElementSelection | null;
    onSelect: (selection: ElementSelection) => void;
    onRename: (selection: ElementSelection, label: string) => void;
    onReorder: (keys: string[]) => void;
    onToggleLock: (selection: ElementSelection) => void;
    onToggleHidden: (selection: ElementSelection) => void;
    onDuplicate: (selection: ElementSelection) => void;
    onDelete: (selection: ElementSelection) => void;
}) {
    const ordered = [...elements].sort((a, b) => b.layer_order - a.layer_order);
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = ordered.findIndex((element) => element.key === active.id);
        const newIndex = ordered.findIndex((element) => element.key === over.id);
        if (oldIndex < 0 || newIndex < 0) return;

        onReorder(
            arrayMove(ordered, oldIndex, newIndex)
                .map((element) => element.key)
                .reverse(),
        );
    };

    return (
        <section className="border-t border-slate-200 bg-white p-4">
            <div className="mb-3">
                <p className="text-xs font-bold tracking-wide text-blue-700 uppercase">Layers</p>
                <h2 className="text-lg font-black text-slate-950">Layer scene aktif</h2>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={ordered.map((element) => element.key)}>
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                        {ordered.map((element) => (
                            <LayerRow
                                key={element.key}
                                element={element}
                                active={selected?.kind === element.kind && selected.id === element.id}
                                onSelect={() => onSelect({ kind: element.kind, id: element.id })}
                                onRename={(label) => onRename({ kind: element.kind, id: element.id }, label)}
                                onToggleLock={() => onToggleLock({ kind: element.kind, id: element.id })}
                                onToggleHidden={() => onToggleHidden({ kind: element.kind, id: element.id })}
                                onDuplicate={() => onDuplicate({ kind: element.kind, id: element.id })}
                                onDelete={() => onDelete({ kind: element.kind, id: element.id })}
                            />
                        ))}
                        {ordered.length === 0 && (
                            <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                                Belum ada elemen pada scene ini.
                            </p>
                        )}
                    </div>
                </SortableContext>
            </DndContext>
        </section>
    );
}

function LayerRow({
    element,
    active,
    onSelect,
    onRename,
    onToggleLock,
    onToggleHidden,
    onDuplicate,
    onDelete,
}: {
    element: EditorElement;
    active: boolean;
    onSelect: () => void;
    onRename: (label: string) => void;
    onToggleLock: () => void;
    onToggleHidden: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: element.key });

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={cn(
                'flex items-center gap-2 rounded-xl border p-2',
                active ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white',
                isDragging && 'opacity-60',
            )}
        >
            <button
                type="button"
                className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-blue-700"
                {...attributes}
                {...listeners}
                aria-label="Drag layer"
            >
                <GripVertical className="size-4" />
            </button>
            <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase">{element.type}</p>
                <input
                    className="w-full rounded border-0 bg-transparent p-0 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:px-2 focus:py-1"
                    value={element.label}
                    onChange={(event) => onRename(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                />
            </button>
            <IconButton label={element.hidden ? 'Show layer' : 'Hide layer'} onClick={onToggleHidden}>
                {element.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </IconButton>
            <IconButton label={element.locked ? 'Unlock layer' : 'Lock layer'} onClick={onToggleLock}>
                {element.locked ? <Lock className="size-4" /> : <Unlock className="size-4" />}
            </IconButton>
            <IconButton label="Duplicate layer" onClick={onDuplicate}>
                <Copy className="size-4" />
            </IconButton>
            <Button type="button" variant="ghost" size="icon" aria-label="Delete layer" onClick={onDelete}>
                <Trash2 className="size-4 text-red-600" />
            </Button>
        </div>
    );
}

function IconButton({ label, children, onClick }: { label: string; children: ReactNode; onClick: () => void }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            onClick={onClick}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-blue-700"
        >
            {children}
        </button>
    );
}
