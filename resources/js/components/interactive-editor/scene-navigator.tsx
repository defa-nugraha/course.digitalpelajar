import type { InteractiveScene } from '@/components/interactive-learning';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Copy, GripVertical, Plus, Trash2 } from 'lucide-react';

export function SceneNavigator({
    scenes,
    activeSceneId,
    onSelect,
    onAdd,
    onDuplicate,
    onDelete,
    onRename,
    onReorder,
}: {
    scenes: InteractiveScene[];
    activeSceneId: string;
    onSelect: (sceneId: string) => void;
    onAdd: () => void;
    onDuplicate: (sceneId: string) => void;
    onDelete: (sceneId: string) => void;
    onRename: (sceneId: string, title: string) => void;
    onReorder: (sceneIds: string[]) => void;
}) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = scenes.findIndex((scene) => scene.id === active.id);
        const newIndex = scenes.findIndex((scene) => scene.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;

        onReorder(arrayMove(scenes, oldIndex, newIndex).map((scene) => scene.id));
    };

    return (
        <footer className="flex h-28 shrink-0 items-center gap-3 border-t border-slate-200 bg-white px-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={scenes.map((scene) => scene.id)}>
                    <div className="scrollbar-none flex min-w-0 flex-1 gap-3 overflow-x-auto py-2">
                        {scenes.map((scene, index) => (
                            <SceneCard
                                key={scene.id}
                                scene={scene}
                                index={index}
                                active={scene.id === activeSceneId}
                                canDelete={scenes.length > 1}
                                onSelect={() => onSelect(scene.id)}
                                onDuplicate={() => onDuplicate(scene.id)}
                                onDelete={() => onDelete(scene.id)}
                                onRename={(title) => onRename(scene.id, title)}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
            <Button type="button" className="shrink-0" onClick={onAdd}>
                <Plus className="size-4" />
                Scene
            </Button>
        </footer>
    );
}

function SceneCard({
    scene,
    index,
    active,
    canDelete,
    onSelect,
    onDuplicate,
    onDelete,
    onRename,
}: {
    scene: InteractiveScene;
    index: number;
    active: boolean;
    canDelete: boolean;
    onSelect: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onRename: (title: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: scene.id });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
            className={cn(
                'flex w-56 shrink-0 items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm',
                active ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-200',
                isDragging && 'opacity-60',
            )}
        >
            <button
                type="button"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-blue-700"
                {...attributes}
                {...listeners}
                aria-label="Drag scene"
            >
                <GripVertical className="size-4" />
            </button>
            <button type="button" className="min-w-0 flex-1 text-left" onClick={onSelect}>
                <p className="text-xs font-bold text-blue-700 uppercase">Scene {index + 1}</p>
                <input
                    className="mt-1 w-full rounded-md border-0 bg-transparent p-0 text-sm font-black text-slate-950 outline-none focus:bg-blue-50 focus:px-2 focus:py-1"
                    value={scene.title}
                    onChange={(event) => onRename(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Judul ${scene.title}`}
                />
            </button>
            <div className="flex flex-col gap-1">
                <button
                    type="button"
                    onClick={onDuplicate}
                    className="rounded-lg p-1 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                    aria-label="Duplicate scene"
                >
                    <Copy className="size-4" />
                </button>
                <button
                    type="button"
                    disabled={!canDelete}
                    onClick={onDelete}
                    className="rounded-lg p-1 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Hapus scene"
                >
                    <Trash2 className="size-4" />
                </button>
            </div>
        </div>
    );
}
