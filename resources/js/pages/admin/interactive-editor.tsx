import { ConfirmationDialogHost } from '@/components/confirmation-dialog-host';
import { EditorCanvas } from '@/components/interactive-editor/editor-canvas';
import { EditorSidebar } from '@/components/interactive-editor/editor-sidebar';
import { EditorToolbar } from '@/components/interactive-editor/editor-toolbar';
import { LayersPanel } from '@/components/interactive-editor/layers-panel';
import { PreviewDialog } from '@/components/interactive-editor/preview-dialog';
import { PropertiesPanel } from '@/components/interactive-editor/properties-panel';
import { SceneNavigator } from '@/components/interactive-editor/scene-navigator';
import type {
    ElementPreset,
    ElementSelection,
    ElementType,
    InteractiveEditorBlock,
    InteractiveEditorCourse,
    InteractiveEditorLesson,
} from '@/components/interactive-editor/types';
import { useInteractiveAutosave } from '@/components/interactive-editor/use-autosave';
import { useInteractiveEditor } from '@/components/interactive-editor/use-interactive-editor';
import {
    CANVAS_DROPPABLE_ID,
    activeScene,
    addElementToScene,
    allSceneElements,
    createElement,
    createScene,
    csrfToken,
    deleteElementFromScene,
    duplicateElementInScene,
    duplicateScene,
    getElement,
    mediaFromUpload,
    reorderSceneLayers,
    syncCompletionRules,
    updateElementInScene,
    updateSceneInMetadata,
} from '@/components/interactive-editor/utils';
import type { InteractiveCanvasAsset, InteractiveMedia, InteractiveMetadata, InteractiveScene } from '@/components/interactive-learning';
import { confirmAction, confirmDelete } from '@/lib/confirm-delete';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { Toaster, toast } from 'sonner';

interface InteractiveEditorProps {
    block: InteractiveEditorBlock;
    lesson: InteractiveEditorLesson;
    course: InteractiveEditorCourse;
    backUrl: string;
    blockEditUrl: string;
    autosaveUrl: string;
    interactiveUploadUrl: string;
}

export default function InteractiveEditorPage({
    block,
    lesson,
    course,
    backUrl,
    blockEditUrl,
    autosaveUrl,
    interactiveUploadUrl,
}: InteractiveEditorProps) {
    const editor = useInteractiveEditor(block);
    const { state, dispatch, commitMetadata, setActiveScene, selectElement, setLeftPanel, setZoom, setStatus, undo, redo, canUndo, canRedo } = editor;
    const { saveNow } = useInteractiveAutosave(state, dispatch, autosaveUrl);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const scene = activeScene(state.metadata, state.activeSceneId);
    const selected = getElement(scene, state.selectedElement);
    const layers = useMemo(() => allSceneElements(scene), [scene]);
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

    useEffect(() => {
        const handleKeydown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
            if (isTyping) return;

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
                event.preventDefault();
                undo();
            }

            if (
                ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'z') ||
                ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y')
            ) {
                event.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', handleKeydown);

        return () => window.removeEventListener('keydown', handleKeydown);
    }, [redo, undo]);

    const commitScene = (nextScene: InteractiveScene, options: { history?: boolean; select?: ElementSelection | null } = {}) => {
        commitMetadata(
            updateSceneInMetadata(state.metadata, scene.id, () => nextScene),
            {
                history: options.history ?? true,
                select: options.select,
            },
        );
    };

    const addElement = (type: ElementType, media?: InteractiveMedia | null, preset?: ElementPreset) => {
        const { kind, element } = createElement(type, media ?? null, preset);
        const nextScene = addElementToScene(scene, kind, element, { x: 42, y: 38 });
        commitScene(nextScene, { select: { kind, id: element.id } });
        setLeftPanel(type === 'hotspot' || type === 'button' ? type : type === 'shape' || type === 'icon' ? type : type);
    };

    const updateSelectedElement = (selection: ElementSelection, patch: Record<string, unknown>) => {
        commitScene(updateElementInScene(scene, selection, patch), { select: selection });
    };

    const deleteSelected = (selection = state.selectedElement) => {
        if (!selection) return;
        const element = getElement(scene, selection);
        confirmDelete(`Hapus elemen "${element?.label ?? selection.id}" dari scene ini?`, () => {
            commitScene(deleteElementFromScene(scene, selection), { select: null });
        });
    };

    const duplicateSelected = (selection = state.selectedElement) => {
        if (!selection) return;
        const result = duplicateElementInScene(scene, selection);
        commitScene(result.scene, { select: result.selection });
    };

    const uploadMedia = async (type: 'image' | 'video' | 'audio', file: File): Promise<InteractiveMedia | null> => {
        setUploading(type);
        setUploadError(null);

        const body = new FormData();
        body.append('type', type);
        body.append('media', file);

        try {
            const response = await fetch(interactiveUploadUrl, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body,
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.message || `Upload ${type} gagal.`);
            }

            toast.success('Media berhasil diupload.');

            return mediaFromUpload(payload, file.name);
        } catch (error) {
            const message = error instanceof Error ? error.message : `Upload ${type} gagal.`;
            setUploadError(message);
            toast.error(message);

            return null;
        } finally {
            setUploading(null);
        }
    };

    const uploadAndAddElement = async (type: 'image' | 'video' | 'audio', file: File) => {
        const media = await uploadMedia(type, file);
        if (!media) return;
        addElement(type, media);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const overId = String(event.over?.id ?? '');
        const activeId = String(event.active.id);
        if (overId !== CANVAS_DROPPABLE_ID || !activeId.startsWith('palette:')) return;

        const type = event.active.data.current?.type as ElementType | undefined;
        if (!type) return;
        addElement(type, null, event.active.data.current?.preset as ElementPreset | undefined);
    };

    const addScene = () => {
        const next = createScene(state.metadata.scenes.length + 1);
        commitMetadata(syncCompletionRules({ ...state.metadata, scenes: [...state.metadata.scenes, next] }), { select: null });
        setActiveScene(next.id);
    };

    const removeScene = (sceneId: string) => {
        if (state.metadata.scenes.length <= 1) {
            toast.error('Minimal harus ada satu scene.');

            return;
        }

        const target = state.metadata.scenes.find((item) => item.id === sceneId);
        confirmDelete(`Hapus scene "${target?.title ?? sceneId}" beserta semua elemennya?`, () => {
            const scenes = state.metadata.scenes.filter((item) => item.id !== sceneId);
            commitMetadata(syncCompletionRules({ ...state.metadata, scenes }), { select: null });
            setActiveScene(scenes[0]?.id ?? '');
        });
    };

    const copyScene = (sceneId: string) => {
        const source = state.metadata.scenes.find((item) => item.id === sceneId);
        if (!source) return;
        const copy = duplicateScene(source, state.metadata.scenes.length + 1);
        commitMetadata(syncCompletionRules({ ...state.metadata, scenes: [...state.metadata.scenes, copy] }), { select: null });
        setActiveScene(copy.id);
    };

    const renameScene = (sceneId: string, title: string) => {
        commitMetadata(
            syncCompletionRules({
                ...state.metadata,
                scenes: state.metadata.scenes.map((item) => (item.id === sceneId ? { ...item, title } : item)),
            }),
            { history: false },
        );
    };

    const reorderScenes = (sceneIds: string[]) => {
        const sceneMap = new Map(state.metadata.scenes.map((item) => [item.id, item]));
        const scenes = sceneIds.map((sceneId) => sceneMap.get(sceneId)).filter(Boolean) as InteractiveScene[];
        commitMetadata(syncCompletionRules({ ...state.metadata, scenes }), { select: null });
    };

    const reorderLayers = (keys: string[]) => {
        commitScene(reorderSceneLayers(scene, keys), { select: state.selectedElement });
    };

    const toggleLock = (selection: ElementSelection) => {
        const element = getElement(scene, selection);
        if (!element) return;
        updateSelectedElement(selection, { locked: !element.locked });
    };

    const toggleHidden = (selection: ElementSelection) => {
        const element = getElement(scene, selection);
        if (!element) return;
        updateSelectedElement(selection, { hidden: !element.hidden, required: element.hidden ? element.required : false });
    };

    const publish = () => {
        const missingMedia = missingRequiredMedia(state.metadata);
        if (missingMedia.length > 0) {
            toast.error(`Lengkapi media sebelum publish: ${missingMedia.slice(0, 3).join(', ')}`);

            return;
        }

        confirmAction({
            title: 'Publish interactive lesson?',
            message: 'Materi akan tersedia untuk siswa sesuai akses course.',
            confirmLabel: 'Publish',
            cancelLabel: 'Batal',
            tone: 'default',
            onConfirm: () => {
                setStatus('published');
                toast.success('Status publish disiapkan. Autosave akan menyimpan perubahan.');
            },
        });
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-950">
            <Head title={`Editor Interaktif - ${course.title}`} />
            <Toaster richColors position="top-center" />
            <ConfirmationDialogHost />

            <div className="flex h-screen flex-col md:hidden">
                <div className="m-auto max-w-md p-6 text-center">
                    <p className="text-xs font-bold tracking-wide text-blue-700 uppercase">Studio Interaktif</p>
                    <h1 className="mt-2 text-2xl font-black text-slate-950">Editor visual optimal di desktop/laptop</h1>
                    <p className="mt-3 leading-7 text-slate-600">
                        Di mobile, gunakan mode preview atau kembali ke Course Builder. Drag-and-drop penuh membutuhkan layar yang lebih besar.
                    </p>
                    <div className="mt-5 flex justify-center gap-3">
                        <button
                            type="button"
                            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
                            onClick={() => setPreviewOpen(true)}
                        >
                            Preview
                        </button>
                        <a href={backUrl} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">
                            Kembali
                        </a>
                    </div>
                </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="hidden h-screen flex-col overflow-hidden md:flex">
                    <EditorToolbar
                        course={course}
                        lesson={lesson}
                        blockStatus={state.blockStatus}
                        saveStatus={state.saveStatus}
                        saveError={state.saveError}
                        zoom={state.zoom}
                        backUrl={backUrl}
                        blockEditUrl={blockEditUrl}
                        canUndo={canUndo}
                        canRedo={canRedo}
                        onUndo={undo}
                        onRedo={redo}
                        onZoomIn={() => setZoom(state.zoom + 0.1)}
                        onZoomOut={() => setZoom(state.zoom - 0.1)}
                        onFit={() => setZoom(1)}
                        onPreview={() => setPreviewOpen(true)}
                        onSave={() => void saveNow()}
                        onPublish={publish}
                    />

                    {state.conflict && (
                        <div className="flex items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                            <span>{state.conflict.message}</span>
                            <button
                                type="button"
                                className="rounded-lg bg-white px-3 py-1.5 text-red-700 shadow-sm"
                                onClick={() => dispatch({ type: 'accept-server-conflict' })}
                            >
                                Muat versi server
                            </button>
                        </div>
                    )}

                    <div className="flex min-h-0 flex-1">
                        <EditorSidebar
                            activePanel={state.leftPanel}
                            uploading={uploading}
                            uploadError={uploadError}
                            onPanelChange={setLeftPanel}
                            onAddElement={addElement}
                            onUploadElement={uploadAndAddElement}
                        />
                        <main className="flex min-w-0 flex-1 flex-col">
                            <div className="flex min-h-0 flex-1">
                                <EditorCanvas
                                    scene={scene}
                                    selectedElement={state.selectedElement}
                                    zoom={state.zoom}
                                    onSelectElement={selectElement}
                                    onSceneChange={(nextScene, options) => commitScene(nextScene, options)}
                                    onDeleteSelected={() => deleteSelected()}
                                    onDuplicateSelected={() => duplicateSelected()}
                                />
                                <div className="flex h-full flex-col">
                                    <PropertiesPanel
                                        scene={scene}
                                        selectedElement={selected}
                                        sceneOptions={state.metadata.scenes.map((item) => ({ id: item.id, title: item.title }))}
                                        uploading={uploading}
                                        uploadError={uploadError}
                                        onSceneChange={(nextScene) => commitScene(nextScene)}
                                        onElementChange={updateSelectedElement}
                                        onDeleteElement={() => deleteSelected()}
                                        onUploadMedia={uploadMedia}
                                    />
                                    <LayersPanel
                                        elements={layers}
                                        selected={state.selectedElement}
                                        onSelect={selectElement}
                                        onRename={(selection, label) => updateSelectedElement(selection, { label })}
                                        onReorder={reorderLayers}
                                        onToggleLock={toggleLock}
                                        onToggleHidden={toggleHidden}
                                        onDuplicate={duplicateSelected}
                                        onDelete={deleteSelected}
                                    />
                                </div>
                            </div>
                            <SceneNavigator
                                scenes={state.metadata.scenes}
                                activeSceneId={state.activeSceneId}
                                onSelect={setActiveScene}
                                onAdd={addScene}
                                onDuplicate={copyScene}
                                onDelete={removeScene}
                                onRename={renameScene}
                                onReorder={reorderScenes}
                            />
                        </main>
                    </div>
                </div>
            </DndContext>

            <PreviewDialog open={previewOpen} metadata={state.metadata} onOpenChange={setPreviewOpen} />
        </div>
    );
}

function missingRequiredMedia(metadata: InteractiveMetadata): string[] {
    return metadata.scenes.flatMap((scene) =>
        scene.assets
            .filter((asset): asset is InteractiveCanvasAsset => ['image', 'video', 'audio'].includes(asset.type))
            .filter((asset) => !asset.hidden && !asset.media?.media_upload_id)
            .map((asset) => `${scene.title} / ${asset.label}`),
    );
}
