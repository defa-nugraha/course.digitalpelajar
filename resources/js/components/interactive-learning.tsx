import { LucideIconRenderer, shapeLabel, shapeStyle } from '@/components/interactive-asset-library';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    CheckCircle2,
    Image as ImageIcon,
    Lightbulb,
    Loader2,
    MousePointerClick,
    Plus,
    Shapes,
    Square,
    Trash2,
    Type,
    Video,
    Volume2,
} from 'lucide-react';
import { ChangeEvent, MouseEvent, PointerEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';

export type InteractiveMediaType = 'image' | 'video' | 'audio' | 'tts';

export interface InteractiveMedia {
    type: InteractiveMediaType;
    media_upload_id?: number | null;
    alt?: string;
    url?: string;
    original_name?: string;
    mime_type?: string;
    size?: number;
    text?: string;
    lang?: string;
    voice_name?: string;
    rate?: number;
    pitch?: number;
}

export interface InteractivePosition {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface InteractiveCanvasSettings {
    width: number;
    height: number;
    aspect_ratio: string;
    background_color: string;
}

export interface InteractiveElementState {
    rotation: number;
    opacity: number;
    layer_order: number;
    locked: boolean;
    hidden: boolean;
}

export interface InteractiveHotspot extends InteractiveElementState {
    id: string;
    type: 'hotspot';
    label: string;
    explanation: string;
    required: boolean;
    position: InteractivePosition;
}

export interface InteractiveButtonElement extends InteractiveElementState {
    id: string;
    type: 'button';
    label: string;
    explanation: string;
    required: boolean;
    action: 'show_explanation' | 'next_scene' | 'go_to_scene';
    target_scene_id?: string | null;
    position: InteractivePosition;
}

export interface InteractiveCanvasAsset extends InteractiveElementState {
    id: string;
    type: 'shape' | 'icon' | 'text' | 'image' | 'video' | 'audio';
    label: string;
    content: string;
    position: InteractivePosition;
    style: {
        shape: string;
        icon: string;
        color: string;
        backgroundColor: string;
        borderColor: string;
        fontSize: number;
        fontWeight: '400' | '500' | '600' | '700' | '800';
        textAlign: 'left' | 'center' | 'right';
        lineHeight: number;
        borderWidth: number;
        borderRadius: number;
        objectFit: 'contain' | 'cover' | 'fill';
    };
    media: InteractiveMedia | null;
}

export interface InteractiveScene {
    id: string;
    title: string;
    order: number;
    text: string;
    background: InteractiveMedia | null;
    narration: InteractiveMedia | null;
    hotspots: InteractiveHotspot[];
    buttons: InteractiveButtonElement[];
    assets: InteractiveCanvasAsset[];
}

export interface InteractiveMetadata {
    schema_version: number;
    canvas: InteractiveCanvasSettings;
    settings: {
        navigation: 'sequential';
        show_progress: boolean;
        allow_scene_back: boolean;
    };
    scenes: InteractiveScene[];
    completion_rules: {
        require_last_scene: boolean;
        required_element_ids: string[];
    };
}

export interface InteractiveProgressPayload {
    currentSceneId?: string | null;
    currentSceneIndex: number;
    completedElementIds: string[];
    videoTimestampSeconds: number;
    videoWatchedPercent: number;
    status: 'not_started' | 'in_progress' | 'completed';
    completedAt?: string | null;
    requiredElementIds: string[];
}

interface UploadResponse {
    id: number;
    type: InteractiveMediaType;
    url: string;
    originalName?: string | null;
    mimeType?: string | null;
    size?: number;
}

const DEFAULT_POSITION: InteractivePosition = { x: 45, y: 45, width: 10, height: 10 };
const DEFAULT_BUTTON_POSITION: InteractivePosition = { x: 58, y: 76, width: 22, height: 10 };
const DEFAULT_ASSET_POSITION: InteractivePosition = { x: 12, y: 12, width: 18, height: 14 };

export function createDefaultInteractiveMetadata(): InteractiveMetadata {
    const scene = createScene(1);

    return {
        schema_version: 1,
        canvas: defaultCanvasSettings(),
        settings: {
            navigation: 'sequential',
            show_progress: true,
            allow_scene_back: true,
        },
        scenes: [scene],
        completion_rules: {
            require_last_scene: true,
            required_element_ids: [],
        },
    };
}

export function coerceInteractiveMetadata(value: unknown): InteractiveMetadata {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return createDefaultInteractiveMetadata();
    }

    const source = value as Partial<InteractiveMetadata>;
    const scenes = Array.isArray(source.scenes) ? source.scenes.map((scene, index) => coerceScene(scene, index)).filter(Boolean) : [];
    const metadata: InteractiveMetadata = {
        schema_version: 1,
        canvas: coerceCanvas(source.canvas),
        settings: {
            navigation: 'sequential',
            show_progress: true,
            allow_scene_back: true,
        },
        scenes: scenes.length > 0 ? scenes : [createScene(1)],
        completion_rules: {
            require_last_scene: true,
            required_element_ids: [],
        },
    };

    metadata.completion_rules.required_element_ids = requiredElementIds(metadata);

    return reorderScenes(metadata);
}

export function requiredElementIds(metadata: InteractiveMetadata): string[] {
    return metadata.scenes.flatMap((scene) => [
        ...scene.hotspots.filter((hotspot) => hotspot.required && !hotspot.hidden).map((hotspot) => hotspot.id),
        ...scene.buttons.filter((button) => button.required && !button.hidden).map((button) => button.id),
    ]);
}

export function InteractiveBlockBuilder({
    value,
    uploadUrl,
    onChange,
}: {
    value: Record<string, unknown>;
    uploadUrl: string;
    onChange: (metadata: Record<string, unknown>) => void;
}) {
    const metadata = coerceInteractiveMetadata(value);
    const [activeSceneIndex, setActiveSceneIndex] = useState(0);
    const [selectedElement, setSelectedElement] = useState<CanvasElementSelection | null>(null);
    const [previewMessage, setPreviewMessage] = useState<string | null>(null);
    const [uploading, setUploading] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const activeScene = metadata.scenes[Math.min(activeSceneIndex, metadata.scenes.length - 1)] ?? metadata.scenes[0];

    useEffect(() => {
        if (activeSceneIndex > metadata.scenes.length - 1) {
            setActiveSceneIndex(Math.max(0, metadata.scenes.length - 1));
        }
    }, [activeSceneIndex, metadata.scenes.length]);

    const update = (next: InteractiveMetadata) => {
        const normalized = reorderScenes({
            ...next,
            completion_rules: {
                require_last_scene: true,
                required_element_ids: requiredElementIds(next),
            },
        });

        onChange(normalized as unknown as Record<string, unknown>);
    };

    const updateScene = (sceneIndex: number, patch: Partial<InteractiveScene>) => {
        update({
            ...metadata,
            scenes: metadata.scenes.map((scene, index) => (index === sceneIndex ? { ...scene, ...patch } : scene)),
        });
    };

    const uploadMedia = async (sceneIndex: number, type: InteractiveMediaType, file: File | null, target: 'background' | 'narration') => {
        if (!file) return;
        setUploading(`${target}-${sceneIndex}`);
        setUploadError(null);

        const body = new FormData();
        body.append('type', type);
        body.append('media', file);

        try {
            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body,
            });
            const payload = (await response.json()) as UploadResponse & { message?: string };

            if (!response.ok) {
                throw new Error(payload.message || 'Upload media gagal.');
            }

            const media: InteractiveMedia = {
                type: payload.type,
                media_upload_id: payload.id,
                url: payload.url,
                original_name: payload.originalName ?? file.name,
                mime_type: payload.mimeType ?? file.type,
                size: payload.size,
                alt: target === 'background' && payload.type === 'image' ? file.name.replace(/\.[^.]+$/, '') : '',
            };

            updateScene(sceneIndex, target === 'background' ? { background: media } : { narration: media });
        } catch (error) {
            setUploadError(error instanceof Error ? error.message : 'Upload media gagal.');
        } finally {
            setUploading(null);
        }
    };

    const addScene = () => {
        update({ ...metadata, scenes: [...metadata.scenes, createScene(metadata.scenes.length + 1)] });
        setActiveSceneIndex(metadata.scenes.length);
        setSelectedElement(null);
    };

    const removeScene = (sceneIndex: number) => {
        if (metadata.scenes.length === 1) return;
        update({ ...metadata, scenes: metadata.scenes.filter((_, index) => index !== sceneIndex) });
        setActiveSceneIndex(Math.max(0, sceneIndex - 1));
        setSelectedElement(null);
    };

    const moveScene = (sceneIndex: number, direction: -1 | 1) => {
        const targetIndex = sceneIndex + direction;
        if (targetIndex < 0 || targetIndex >= metadata.scenes.length) return;
        const scenes = [...metadata.scenes];
        const [scene] = scenes.splice(sceneIndex, 1);
        scenes.splice(targetIndex, 0, scene);
        update({ ...metadata, scenes });
        setActiveSceneIndex(targetIndex);
    };

    const addHotspot = () => {
        const hotspot = createHotspot();
        updateScene(activeSceneIndex, { hotspots: [...activeScene.hotspots, hotspot] });
        setSelectedElement({ kind: 'hotspot', id: hotspot.id });
    };

    const addButton = () => {
        const button = createButton();
        updateScene(activeSceneIndex, { buttons: [...activeScene.buttons, button] });
        setSelectedElement({ kind: 'button', id: button.id });
    };

    const addAsset = (asset: InteractiveCanvasAsset) => {
        updateScene(activeSceneIndex, { assets: [...activeScene.assets, asset] });
        setSelectedElement({ kind: 'asset', id: asset.id });
    };

    const uploadAssetImage = async (file: File | null) => {
        if (!file) return;
        setUploading(`asset-${activeSceneIndex}`);
        setUploadError(null);

        const body = new FormData();
        body.append('type', 'image');
        body.append('media', file);

        try {
            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body,
            });
            const payload = (await response.json()) as UploadResponse & { message?: string };

            if (!response.ok) {
                throw new Error(payload.message || 'Upload gambar asset gagal.');
            }

            addAsset(
                createImageAsset({
                    type: 'image',
                    media_upload_id: payload.id,
                    url: payload.url,
                    original_name: payload.originalName ?? file.name,
                    mime_type: payload.mimeType ?? file.type,
                    size: payload.size,
                    alt: file.name.replace(/\.[^.]+$/, ''),
                }),
            );
        } catch (error) {
            setUploadError(error instanceof Error ? error.message : 'Upload gambar asset gagal.');
        } finally {
            setUploading(null);
        }
    };

    const moveSelectedElement = (event: MouseEvent<HTMLDivElement>) => {
        if (!selectedElement) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const position = elementPosition(activeScene, selectedElement);
        if (!position) return;

        const nextX = ((event.clientX - rect.left) / rect.width) * 100 - position.width / 2;
        const nextY = ((event.clientY - rect.top) / rect.height) * 100 - position.height / 2;

        updateElementPosition(selectedElement.kind, selectedElement.id, clampPosition({ ...position, x: nextX, y: nextY }));
    };

    const updateElementPosition = (kind: CanvasElementKind, id: string, position: InteractivePosition) => {
        if (kind === 'hotspot') {
            updateScene(activeSceneIndex, {
                hotspots: activeScene.hotspots.map((item) => (item.id === id ? { ...item, position } : item)),
            });
            return;
        }

        if (kind === 'button') {
            updateScene(activeSceneIndex, {
                buttons: activeScene.buttons.map((item) => (item.id === id ? { ...item, position } : item)),
            });
            return;
        }

        updateScene(activeSceneIndex, {
            assets: activeScene.assets.map((item) => (item.id === id ? { ...item, position } : item)),
        });
    };

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm leading-6 text-blue-900">
                <p className="font-bold text-slate-950">Lesson interaktif</p>
                <p className="mt-1">
                    Buat scene bertahap dengan teks, background gambar/video, narator TTS, hotspot, tombol, dan asset canvas. Hotspot atau tombol yang
                    wajib harus diklik siswa sebelum lanjut.
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {metadata.scenes.map((scene, index) => (
                    <button
                        key={scene.id}
                        type="button"
                        onClick={() => {
                            setActiveSceneIndex(index);
                            setSelectedElement(null);
                        }}
                        className={cn(
                            'rounded-full border px-3 py-2 text-sm font-bold transition',
                            index === activeSceneIndex ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600',
                        )}
                    >
                        Scene {index + 1}
                    </button>
                ))}
                <Button type="button" variant="outline" onClick={addScene}>
                    <Plus className="size-4" />
                    Tambah Scene
                </Button>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                <div className="space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-xs font-bold tracking-wide text-blue-700 uppercase">Scene {activeSceneIndex + 1}</p>
                                <h3 className="text-lg font-extrabold text-slate-950">{activeScene.title || 'Scene interaktif'}</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={activeSceneIndex === 0}
                                    onClick={() => moveScene(activeSceneIndex, -1)}
                                >
                                    <ArrowUp className="size-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={activeSceneIndex === metadata.scenes.length - 1}
                                    onClick={() => moveScene(activeSceneIndex, 1)}
                                >
                                    <ArrowDown className="size-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={metadata.scenes.length === 1}
                                    onClick={() => removeScene(activeSceneIndex)}
                                >
                                    <Trash2 className="size-4" />
                                    Hapus
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Judul scene" required>
                                <Input value={activeScene.title} onChange={(event) => updateScene(activeSceneIndex, { title: event.target.value })} />
                            </Field>
                            <Field label="Narator text-to-speech">
                                <TtsNarrationEditor
                                    narration={activeScene.narration}
                                    fallbackText={activeScene.text}
                                    onChange={(narration) => updateScene(activeSceneIndex, { narration })}
                                />
                            </Field>
                        </div>

                        <div className="mt-4">
                            <Field label="Teks materi scene">
                                <textarea
                                    className="min-h-32 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                                    value={activeScene.text}
                                    onChange={(event) => updateScene(activeSceneIndex, { text: event.target.value })}
                                    placeholder="Tuliskan penjelasan materi pada scene ini."
                                />
                            </Field>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <Field label="Background gambar">
                                <MediaInput
                                    accept="image/*"
                                    icon={<ImageIcon className="size-4" />}
                                    label={
                                        activeScene.background?.type === 'image'
                                            ? activeScene.background.original_name || 'Gambar terupload'
                                            : 'Upload gambar'
                                    }
                                    loading={uploading === `background-${activeSceneIndex}`}
                                    onChange={(file) => uploadMedia(activeSceneIndex, 'image', file, 'background')}
                                    onRemove={() => updateScene(activeSceneIndex, { background: null })}
                                    hasValue={activeScene.background?.type === 'image'}
                                />
                            </Field>
                            <Field label="Background video">
                                <MediaInput
                                    accept="video/*"
                                    icon={<Video className="size-4" />}
                                    label={
                                        activeScene.background?.type === 'video'
                                            ? activeScene.background.original_name || 'Video terupload'
                                            : 'Upload video'
                                    }
                                    loading={uploading === `background-${activeSceneIndex}`}
                                    onChange={(file) => uploadMedia(activeSceneIndex, 'video', file, 'background')}
                                    onRemove={() => updateScene(activeSceneIndex, { background: null })}
                                    hasValue={activeScene.background?.type === 'video'}
                                />
                            </Field>
                        </div>

                        {uploadError && (
                            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                                {uploadError}
                            </p>
                        )}
                    </div>

                    <AssetLibrary
                        assets={activeScene.assets}
                        uploading={uploading === `asset-${activeSceneIndex}`}
                        onAddAsset={addAsset}
                        onUploadImage={uploadAssetImage}
                        onChange={(assetId, patch) =>
                            updateScene(activeSceneIndex, {
                                assets: activeScene.assets.map((asset) => (asset.id === assetId ? { ...asset, ...patch } : asset)),
                            })
                        }
                        onDelete={(assetId) =>
                            updateScene(activeSceneIndex, {
                                assets: activeScene.assets.filter((asset) => asset.id !== assetId),
                            })
                        }
                        onSelect={(assetId) => setSelectedElement({ kind: 'asset', id: assetId })}
                    />

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="font-bold text-slate-950">Hotspot</p>
                                <p className="text-sm text-slate-500">Klik hotspot lalu klik area preview untuk mengatur posisi.</p>
                            </div>
                            <Button type="button" variant="outline" onClick={addHotspot}>
                                <Plus className="size-4" />
                                Tambah Hotspot
                            </Button>
                        </div>
                        <div className="mt-4 space-y-4">
                            {activeScene.hotspots.map((hotspot, hotspotIndex) => (
                                <HotspotForm
                                    key={hotspot.id}
                                    hotspot={hotspot}
                                    selected={selectedElement?.kind === 'hotspot' && selectedElement.id === hotspot.id}
                                    onSelect={() => setSelectedElement({ kind: 'hotspot', id: hotspot.id })}
                                    onChange={(patch) =>
                                        updateScene(activeSceneIndex, {
                                            hotspots: activeScene.hotspots.map((item, index) =>
                                                index === hotspotIndex ? { ...item, ...patch } : item,
                                            ),
                                        })
                                    }
                                    onDelete={() =>
                                        updateScene(activeSceneIndex, {
                                            hotspots: activeScene.hotspots.filter((_, index) => index !== hotspotIndex),
                                        })
                                    }
                                />
                            ))}
                            {activeScene.hotspots.length === 0 && <p className="text-sm text-slate-500">Belum ada hotspot pada scene ini.</p>}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="font-bold text-slate-950">Tombol interaktif</p>
                                <p className="text-sm text-slate-500">Tombol dapat menampilkan penjelasan atau lanjut ke scene berikutnya.</p>
                            </div>
                            <Button type="button" variant="outline" onClick={addButton}>
                                <Plus className="size-4" />
                                Tambah Tombol
                            </Button>
                        </div>
                        <div className="mt-4 space-y-4">
                            {activeScene.buttons.map((button, buttonIndex) => (
                                <ButtonElementForm
                                    key={button.id}
                                    button={button}
                                    onChange={(patch) =>
                                        updateScene(activeSceneIndex, {
                                            buttons: activeScene.buttons.map((item, index) => (index === buttonIndex ? { ...item, ...patch } : item)),
                                        })
                                    }
                                    onDelete={() =>
                                        updateScene(activeSceneIndex, {
                                            buttons: activeScene.buttons.filter((_, index) => index !== buttonIndex),
                                        })
                                    }
                                />
                            ))}
                            {activeScene.buttons.length === 0 && (
                                <p className="text-sm text-slate-500">Belum ada tombol interaktif pada scene ini.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="mb-3 font-bold text-slate-950">Canvas preview & posisi elemen</p>
                        <SceneCanvas
                            scene={activeScene}
                            selectedElement={selectedElement}
                            onCanvasClick={moveSelectedElement}
                            onMoveElement={updateElementPosition}
                            onSelectElement={setSelectedElement}
                            onHotspotClick={(hotspot) => {
                                setSelectedElement({ kind: 'hotspot', id: hotspot.id });
                                setPreviewMessage(hotspot.explanation);
                            }}
                            onButtonClick={(button) => {
                                setSelectedElement({ kind: 'button', id: button.id });
                                setPreviewMessage(button.explanation || button.label);
                            }}
                        />
                        {previewMessage && (
                            <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-900">
                                <p className="font-bold">Penjelasan preview</p>
                                <p className="mt-1 whitespace-pre-wrap">{previewMessage}</p>
                            </div>
                        )}
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
                        <p className="font-bold text-slate-950">Aturan selesai</p>
                        <p className="mt-1">Siswa harus membuka scene terakhir dan menyelesaikan semua hotspot/tombol wajib.</p>
                        <p className="mt-2 font-semibold text-blue-700">{requiredElementIds(metadata).length} interaksi wajib</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function InteractiveBlockPlayer({
    metadata: rawMetadata,
    progress,
    progressUrl,
    onProgress,
}: {
    metadata: Record<string, unknown>;
    progress?: InteractiveProgressPayload | null;
    progressUrl?: string;
    onProgress?: (progress: InteractiveProgressPayload) => void;
}) {
    const metadata = useMemo(() => coerceInteractiveMetadata(rawMetadata), [rawMetadata]);
    const initialIndex = Math.min(progress?.currentSceneIndex ?? 0, Math.max(0, metadata.scenes.length - 1));
    const [currentSceneIndex, setCurrentSceneIndex] = useState(initialIndex);
    const [completedIds, setCompletedIds] = useState<string[]>(progress?.completedElementIds ?? []);
    const [message, setMessage] = useState<{ title: string; body: string } | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const mountedRef = useRef(false);
    const scene = metadata.scenes[currentSceneIndex] ?? metadata.scenes[0];
    const currentRequiredIds = requiredIdsForScene(scene);
    const canAdvance = currentRequiredIds.every((id) => completedIds.includes(id));
    const completedRequiredCount = requiredElementIds(metadata).filter((id) => completedIds.includes(id)).length;
    const totalRequiredCount = requiredElementIds(metadata).length;
    const isLastScene = currentSceneIndex >= metadata.scenes.length - 1;

    useEffect(() => {
        setCurrentSceneIndex(initialIndex);
        setCompletedIds(progress?.completedElementIds ?? []);
    }, [initialIndex, progress?.completedElementIds]);

    useEffect(() => {
        if (mountedRef.current || !scene) return;
        mountedRef.current = true;
        persistProgress(currentSceneIndex, completedIds);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scene?.id]);

    const persistProgress = async (sceneIndex: number, nextCompletedIds: string[], video?: { seconds?: number; percent?: number }) => {
        if (!progressUrl) return;
        const nextScene = metadata.scenes[sceneIndex];
        if (!nextScene) return;

        setSaving(true);
        setSaveError(null);
        try {
            const response = await fetch(progressUrl, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify({
                    scene_id: nextScene.id,
                    scene_index: sceneIndex,
                    completed_element_ids: nextCompletedIds,
                    video_timestamp_seconds: video?.seconds ?? 0,
                    video_watched_percent: video?.percent ?? 0,
                }),
            });
            const payload = (await response.json()) as { progress?: InteractiveProgressPayload; message?: string };
            if (!response.ok) {
                throw new Error(payload.message || 'Progress interactive gagal disimpan.');
            }
            if (payload.progress) {
                onProgress?.(payload.progress);
            }
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Progress interactive gagal disimpan.');
        } finally {
            setSaving(false);
        }
    };

    const completeElement = (id: string) => {
        const nextCompletedIds = completedIds.includes(id) ? completedIds : [...completedIds, id];
        setCompletedIds(nextCompletedIds);
        persistProgress(currentSceneIndex, nextCompletedIds);

        return nextCompletedIds;
    };

    const handleHotspot = (hotspot: InteractiveHotspot) => {
        completeElement(hotspot.id);
        setMessage({ title: hotspot.label, body: hotspot.explanation });
    };

    const handleButton = (button: InteractiveButtonElement) => {
        const nextCompletedIds = completeElement(button.id);
        if (button.action === 'next_scene' || button.action === 'go_to_scene') {
            const nextSceneRequiredDone = currentRequiredIds.every((id) => nextCompletedIds.includes(id));
            if (!nextSceneRequiredDone) {
                return;
            }

            if (button.action === 'go_to_scene' && button.target_scene_id) {
                const targetIndex = metadata.scenes.findIndex((scene) => scene.id === button.target_scene_id);
                if (targetIndex >= 0) {
                    goToScene(targetIndex, nextCompletedIds);
                }

                return;
            }

            if (!isLastScene) {
                goToScene(currentSceneIndex + 1, nextCompletedIds);
            }

            return;
        }

        setMessage({ title: button.label, body: button.explanation });
    };

    const goToScene = (sceneIndex: number, ids = completedIds) => {
        const target = Math.min(Math.max(sceneIndex, 0), metadata.scenes.length - 1);
        const nextCanAdvance = currentRequiredIds.every((id) => ids.includes(id));
        if (target > currentSceneIndex && !nextCanAdvance) return;
        setCurrentSceneIndex(target);
        setMessage(null);
        persistProgress(target, ids);
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <p className="text-xs font-bold tracking-wide text-blue-700 uppercase">
                        Scene {currentSceneIndex + 1} dari {metadata.scenes.length}
                    </p>
                    <h3 className="mt-1 text-xl font-extrabold text-slate-950">{scene.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                        {completedRequiredCount}/{totalRequiredCount} interaksi wajib selesai
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4 text-emerald-600" />}
                    {saving ? 'Menyimpan progress' : 'Progress tersimpan'}
                </div>
            </div>

            <SceneCanvas scene={scene} completedIds={completedIds} onHotspotClick={handleHotspot} onButtonClick={handleButton} />

            {scene.narration && <NarrationPlayer narration={scene.narration} fallbackText={scene.text} />}

            {scene.text && <p className="mt-4 leading-7 whitespace-pre-wrap text-slate-700">{scene.text}</p>}

            {message && (
                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-blue-950">
                    <p className="font-bold">{message.title}</p>
                    <p className="mt-2 leading-7 whitespace-pre-wrap">{message.body}</p>
                </div>
            )}

            {saveError && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{saveError}</div>}

            {scene.buttons.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {scene.buttons.map((button) => (
                        <Button
                            key={button.id}
                            type="button"
                            variant={completedIds.includes(button.id) ? 'outline' : 'default'}
                            onClick={() => handleButton(button)}
                        >
                            {completedIds.includes(button.id) && <CheckCircle2 className="size-4" />}
                            {button.label}
                        </Button>
                    ))}
                </div>
            )}

            {!canAdvance && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                    Selesaikan semua hotspot atau tombol wajib pada scene ini sebelum lanjut.
                </div>
            )}

            <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <Button type="button" variant="outline" disabled={currentSceneIndex === 0} onClick={() => goToScene(currentSceneIndex - 1)}>
                    <ArrowLeft className="size-4" />
                    Sebelumnya
                </Button>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${((currentSceneIndex + 1) / metadata.scenes.length) * 100}%` }}
                    />
                </div>
                <Button type="button" disabled={isLastScene || !canAdvance} onClick={() => goToScene(currentSceneIndex + 1)}>
                    Berikutnya
                    <ArrowRight className="size-4" />
                </Button>
            </div>
        </div>
    );
}

function SceneCanvas({
    scene,
    selectedElement,
    completedIds = [],
    onCanvasClick,
    onMoveElement,
    onSelectElement,
    onHotspotClick,
    onButtonClick,
}: {
    scene: InteractiveScene;
    selectedElement?: CanvasElementSelection | null;
    completedIds?: string[];
    onCanvasClick?: (event: MouseEvent<HTMLDivElement>) => void;
    onMoveElement?: (kind: CanvasElementKind, id: string, position: InteractivePosition) => void;
    onSelectElement?: (selection: CanvasElementSelection) => void;
    onHotspotClick?: (hotspot: InteractiveHotspot) => void;
    onButtonClick?: (button: InteractiveButtonElement) => void;
}) {
    const background = scene.background;
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef<{ kind: CanvasElementKind; id: string; offsetX: number; offsetY: number } | null>(null);

    const startDrag = (event: PointerEvent<HTMLElement>, selection: CanvasElementSelection, position: InteractivePosition) => {
        if (!onMoveElement) return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const pointerX = ((event.clientX - rect.left) / rect.width) * 100;
        const pointerY = ((event.clientY - rect.top) / rect.height) * 100;

        dragRef.current = {
            kind: selection.kind,
            id: selection.id,
            offsetX: pointerX - position.x,
            offsetY: pointerY - position.y,
        };
        onSelectElement?.(selection);
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!drag || !rect || !onMoveElement) return;
        const currentPosition = elementPosition(scene, drag);
        if (!currentPosition) return;

        const pointerX = ((event.clientX - rect.left) / rect.width) * 100;
        const pointerY = ((event.clientY - rect.top) / rect.height) * 100;

        onMoveElement(
            drag.kind,
            drag.id,
            clampPosition({
                ...currentPosition,
                x: pointerX - drag.offsetX,
                y: pointerY - drag.offsetY,
            }),
        );
    };

    return (
        <div
            ref={canvasRef}
            role={onCanvasClick ? 'button' : undefined}
            tabIndex={onCanvasClick ? 0 : undefined}
            onClick={onCanvasClick}
            onPointerMove={moveDrag}
            onPointerUp={() => {
                dragRef.current = null;
            }}
            onPointerCancel={() => {
                dragRef.current = null;
            }}
            className={cn(
                'relative flex aspect-video w-full touch-none overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-100 to-blue-50',
                onCanvasClick && 'cursor-crosshair',
            )}
        >
            {background?.type === 'image' && background.url && (
                <img src={background.url} alt={background.alt || scene.title} className="absolute inset-0 size-full object-contain" />
            )}
            {background?.type === 'video' && background.url && (
                <video controls preload="metadata" src={background.url} className="absolute inset-0 size-full bg-black object-contain" />
            )}
            {!background?.url && (
                <div className="m-auto max-w-md px-4 text-center text-slate-500">
                    <MousePointerClick className="mx-auto size-10 text-blue-500" />
                    <p className="mt-3 text-sm font-semibold">Preview scene interaktif</p>
                    <p className="mt-1 text-xs">Upload background atau tambahkan asset, hotspot, dan tombol pada canvas.</p>
                </div>
            )}

            {scene.assets
                .filter((asset) => !asset.hidden)
                .sort(byLayerOrder)
                .map((asset) => {
                    const selected = selectedElement?.kind === 'asset' && selectedElement.id === asset.id;

                    return (
                        <button
                            key={asset.id}
                            type="button"
                            onPointerDown={(event) => {
                                if (!asset.locked) {
                                    startDrag(event, { kind: 'asset', id: asset.id }, asset.position);
                                }
                            }}
                            onClick={(event) => {
                                event.stopPropagation();
                                onSelectElement?.({ kind: 'asset', id: asset.id });
                            }}
                            className={cn(
                                'absolute overflow-hidden border text-xs font-bold shadow-sm transition focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none',
                                selected ? 'border-blue-700 ring-2 ring-blue-200' : 'border-white/70',
                                onMoveElement && 'cursor-grab active:cursor-grabbing',
                            )}
                            style={{
                                ...elementVisualStyle(asset),
                            }}
                            aria-label={asset.label}
                        >
                            <CanvasAssetPreview asset={asset} />
                        </button>
                    );
                })}

            {scene.hotspots
                .filter((hotspot) => !hotspot.hidden)
                .sort(byLayerOrder)
                .map((hotspot) => {
                    const done = completedIds.includes(hotspot.id);
                    const selected = selectedElement?.kind === 'hotspot' && selectedElement.id === hotspot.id;

                    return (
                        <button
                            key={hotspot.id}
                            type="button"
                            onPointerDown={(event) => {
                                if (!hotspot.locked) {
                                    startDrag(event, { kind: 'hotspot', id: hotspot.id }, hotspot.position);
                                }
                            }}
                            onClick={(event) => {
                                event.stopPropagation();
                                onHotspotClick?.(hotspot);
                            }}
                            className={cn(
                                'absolute flex items-center justify-center rounded-full border-2 text-xs font-black shadow-lg transition focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none',
                                onMoveElement && 'cursor-grab active:cursor-grabbing',
                                selected
                                    ? 'border-blue-700 bg-blue-600 text-white'
                                    : done
                                      ? 'border-emerald-600 bg-emerald-500 text-white'
                                      : hotspot.required
                                        ? 'border-amber-500 bg-amber-400 text-slate-950'
                                        : 'border-blue-500 bg-white text-blue-700',
                            )}
                            style={{
                                ...elementVisualStyle(hotspot),
                            }}
                            aria-label={hotspot.label}
                        >
                            {done ? <CheckCircle2 className="size-4" /> : <MousePointerClick className="size-4" />}
                        </button>
                    );
                })}

            {scene.buttons
                .filter((button) => !button.hidden)
                .sort(byLayerOrder)
                .map((button) => {
                    const done = completedIds.includes(button.id);
                    const selected = selectedElement?.kind === 'button' && selectedElement.id === button.id;

                    return (
                        <button
                            key={button.id}
                            type="button"
                            onPointerDown={(event) => {
                                if (!button.locked) {
                                    startDrag(event, { kind: 'button', id: button.id }, button.position);
                                }
                            }}
                            onClick={(event) => {
                                event.stopPropagation();
                                onButtonClick?.(button);
                            }}
                            className={cn(
                                'absolute flex items-center justify-center rounded-xl border px-3 text-center text-xs font-extrabold shadow-lg transition focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none',
                                onMoveElement && 'cursor-grab active:cursor-grabbing',
                                selected
                                    ? 'border-blue-700 bg-blue-600 text-white'
                                    : done
                                      ? 'border-emerald-600 bg-emerald-500 text-white'
                                      : button.required
                                        ? 'border-amber-500 bg-amber-400 text-slate-950'
                                        : 'border-blue-500 bg-white text-blue-700',
                            )}
                            style={{
                                ...elementVisualStyle(button),
                            }}
                            aria-label={button.label}
                        >
                            {done && <CheckCircle2 className="mr-1 size-4 shrink-0" />}
                            <span className="line-clamp-2">{button.label}</span>
                        </button>
                    );
                })}
        </div>
    );
}

function AssetLibrary({
    assets,
    uploading,
    onAddAsset,
    onUploadImage,
    onChange,
    onDelete,
    onSelect,
}: {
    assets: InteractiveCanvasAsset[];
    uploading: boolean;
    onAddAsset: (asset: InteractiveCanvasAsset) => void;
    onUploadImage: (file: File | null) => void;
    onChange: (assetId: string, patch: Partial<InteractiveCanvasAsset>) => void;
    onDelete: (assetId: string) => void;
    onSelect: (assetId: string) => void;
}) {
    const imageInputRef = useRef<HTMLInputElement | null>(null);

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="font-bold text-slate-950">Asset canvas</p>
                    <p className="text-sm text-slate-500">Tambahkan elemen visual lalu drag langsung di preview seperti canvas desain.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => onAddAsset(createShapeAsset('rectangle'))}>
                        <Square className="size-4" />
                        Shape
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => onAddAsset(createIconAsset('Lightbulb'))}>
                        <Lightbulb className="size-4" />
                        Icon
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => onAddAsset(createTextAsset())}>
                        <Type className="size-4" />
                        Teks
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => imageInputRef.current?.click()}>
                        {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
                        Gambar
                    </Button>
                    <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                            onUploadImage(event.target.files?.[0] ?? null);
                            event.target.value = '';
                        }}
                    />
                </div>
            </div>
            <div className="mt-4 space-y-3">
                {assets.map((asset) => (
                    <div key={asset.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <button
                                type="button"
                                onClick={() => onSelect(asset.id)}
                                className="flex items-center gap-2 text-left font-bold text-slate-950"
                            >
                                <Shapes className="size-4 text-blue-700" />
                                {asset.label}
                            </button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(asset.id)}>
                                <Trash2 className="size-4 text-red-600" />
                                Hapus
                            </Button>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <Field label="Label asset">
                                <Input value={asset.label} onChange={(event) => onChange(asset.id, { label: event.target.value })} />
                            </Field>
                            {asset.type === 'text' && (
                                <Field label="Isi teks">
                                    <Input value={asset.content} onChange={(event) => onChange(asset.id, { content: event.target.value })} />
                                </Field>
                            )}
                            {asset.type === 'shape' && (
                                <Field label="Bentuk">
                                    <select
                                        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                                        value={asset.style.shape}
                                        onChange={(event) =>
                                            onChange(asset.id, {
                                                style: { ...asset.style, shape: event.target.value as InteractiveCanvasAsset['style']['shape'] },
                                            })
                                        }
                                    >
                                        <option value="rectangle">Kotak</option>
                                        <option value="pill">Pill</option>
                                        <option value="circle">Lingkaran</option>
                                    </select>
                                </Field>
                            )}
                            {asset.type === 'icon' && (
                                <Field label="Icon">
                                    <select
                                        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                                        value={asset.style.icon}
                                        onChange={(event) =>
                                            onChange(asset.id, {
                                                style: { ...asset.style, icon: event.target.value as InteractiveCanvasAsset['style']['icon'] },
                                            })
                                        }
                                    >
                                        <option value="lightbulb">Ide</option>
                                        <option value="cpu">Mikrokontroler</option>
                                        <option value="zap">Energi</option>
                                        <option value="book">Materi</option>
                                    </select>
                                </Field>
                            )}
                            <Field label="Warna">
                                <Input
                                    type="color"
                                    value={asset.style.color}
                                    onChange={(event) => onChange(asset.id, { style: { ...asset.style, color: event.target.value } })}
                                />
                            </Field>
                            <Field label="Background">
                                <Input
                                    type="color"
                                    value={asset.style.backgroundColor}
                                    onChange={(event) => onChange(asset.id, { style: { ...asset.style, backgroundColor: event.target.value } })}
                                />
                            </Field>
                        </div>
                    </div>
                ))}
                {assets.length === 0 && <p className="text-sm text-slate-500">Belum ada asset. Tambahkan shape, icon, teks, atau gambar.</p>}
            </div>
        </div>
    );
}

function TtsNarrationEditor({
    narration,
    fallbackText,
    onChange,
}: {
    narration: InteractiveMedia | null;
    fallbackText: string;
    onChange: (narration: InteractiveMedia | null) => void;
}) {
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const current = narration?.type === 'tts' ? narration : createTtsNarration(fallbackText);

    useEffect(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
        loadVoices();
        window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

        return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    }, []);

    const update = (patch: Partial<InteractiveMedia>) => {
        onChange({ ...current, ...patch, type: 'tts' });
    };

    return (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            {narration?.type === 'audio' && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                    Audio upload lama masih tersimpan. Isi teks narator untuk menggantinya dengan text-to-speech.
                </p>
            )}
            <textarea
                className="min-h-24 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                value={current.text ?? ''}
                onChange={(event) => update({ text: event.target.value })}
                placeholder="Tuliskan teks narator. Jika kosong, gunakan ringkasan teks scene."
            />
            <div className="grid gap-3 md:grid-cols-2">
                <select
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={current.voice_name ?? ''}
                    onChange={(event) => update({ voice_name: event.target.value })}
                >
                    <option value="">Otomatis pilih suara Indonesia</option>
                    {voices.map((voice) => (
                        <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                            {voice.name} · {voice.lang}
                        </option>
                    ))}
                </select>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => speakText(current)}>
                        <Volume2 className="size-4" />
                        Preview suara
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => onChange(null)}>
                        Hapus
                    </Button>
                </div>
            </div>
            <p className="text-xs leading-5 text-slate-500">
                TTS berjalan dari browser, jadi tidak membutuhkan API key dan bisa langsung dipakai pada Chrome/Edge/Safari/Firefox modern.
            </p>
        </div>
    );
}

function NarrationPlayer({ narration, fallbackText }: { narration: InteractiveMedia; fallbackText: string }) {
    if (narration.type === 'audio' && narration.url) {
        return (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-950">
                    <Volume2 className="size-4 text-blue-700" />
                    Audio narator
                </p>
                <audio controls preload="none" src={narration.url} className="w-full" />
            </div>
        );
    }

    if (narration.type !== 'tts') {
        return null;
    }

    return (
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-950">
                <Volume2 className="size-4 text-blue-700" />
                Narator
            </p>
            <Button type="button" variant="outline" onClick={() => speakText({ ...narration, text: narration.text || fallbackText })}>
                Putar narator
            </Button>
        </div>
    );
}

function HotspotForm({
    hotspot,
    selected,
    onSelect,
    onChange,
    onDelete,
}: {
    hotspot: InteractiveHotspot;
    selected: boolean;
    onSelect: () => void;
    onChange: (patch: Partial<InteractiveHotspot>) => void;
    onDelete: () => void;
}) {
    const updatePosition = (patch: Partial<InteractivePosition>) => onChange({ position: clampPosition({ ...hotspot.position, ...patch }) });

    return (
        <div className={cn('space-y-3 rounded-xl border p-4', selected ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200 bg-slate-50')}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <button type="button" onClick={onSelect} className="text-left font-bold text-slate-950">
                    {hotspot.label || 'Hotspot baru'}
                </button>
                <Button type="button" variant="outline" size="sm" onClick={onDelete}>
                    <Trash2 className="size-4" />
                    Hapus
                </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
                <Field label="Judul hotspot" required>
                    <Input value={hotspot.label} onChange={(event) => onChange({ label: event.target.value })} />
                </Field>
                <label className="flex items-center gap-2 pt-7 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={hotspot.required} onChange={(event) => onChange({ required: event.target.checked })} />
                    Wajib diklik
                </label>
            </div>
            <Field label="Penjelasan hotspot" required>
                <textarea
                    className="min-h-24 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                    value={hotspot.explanation}
                    onChange={(event) => onChange({ explanation: event.target.value })}
                />
            </Field>
            <div className="grid gap-3 md:grid-cols-4">
                <PercentInput label="X" value={hotspot.position.x} onChange={(value) => updatePosition({ x: value })} />
                <PercentInput label="Y" value={hotspot.position.y} onChange={(value) => updatePosition({ y: value })} />
                <PercentInput label="Lebar" value={hotspot.position.width} onChange={(value) => updatePosition({ width: value })} />
                <PercentInput label="Tinggi" value={hotspot.position.height} onChange={(value) => updatePosition({ height: value })} />
            </div>
        </div>
    );
}

function ButtonElementForm({
    button,
    onChange,
    onDelete,
}: {
    button: InteractiveButtonElement;
    onChange: (patch: Partial<InteractiveButtonElement>) => void;
    onDelete: () => void;
}) {
    const updatePosition = (patch: Partial<InteractivePosition>) => onChange({ position: clampPosition({ ...button.position, ...patch }) });

    return (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="font-bold text-slate-950">{button.label || 'Tombol baru'}</p>
                <Button type="button" variant="outline" size="sm" onClick={onDelete}>
                    <Trash2 className="size-4" />
                    Hapus
                </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
                <Field label="Label tombol" required>
                    <Input value={button.label} onChange={(event) => onChange({ label: event.target.value })} />
                </Field>
                <Field label="Aksi tombol">
                    <select
                        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                        value={button.action}
                        onChange={(event) => onChange({ action: event.target.value as InteractiveButtonElement['action'] })}
                    >
                        <option value="show_explanation">Tampilkan penjelasan</option>
                        <option value="next_scene">Lanjut scene berikutnya</option>
                    </select>
                </Field>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={button.required} onChange={(event) => onChange({ required: event.target.checked })} />
                Wajib diklik
            </label>
            {button.action === 'show_explanation' && (
                <Field label="Penjelasan tombol" required>
                    <textarea
                        className="min-h-24 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                        value={button.explanation}
                        onChange={(event) => onChange({ explanation: event.target.value })}
                    />
                </Field>
            )}
            <div className="grid gap-3 md:grid-cols-4">
                <PercentInput label="X" value={button.position.x} onChange={(value) => updatePosition({ x: value })} />
                <PercentInput label="Y" value={button.position.y} onChange={(value) => updatePosition({ y: value })} />
                <PercentInput label="Lebar" value={button.position.width} onChange={(value) => updatePosition({ width: value })} />
                <PercentInput label="Tinggi" value={button.position.height} onChange={(value) => updatePosition({ height: value })} />
            </div>
        </div>
    );
}

function MediaInput({
    accept,
    icon,
    label,
    loading,
    hasValue,
    onChange,
    onRemove,
}: {
    accept: string;
    icon: ReactNode;
    label: string;
    loading: boolean;
    hasValue: boolean;
    onChange: (file: File | null) => void;
    onRemove: () => void;
}) {
    const inputRef = useRef<HTMLInputElement | null>(null);

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={loading}>
                    {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
                    {label}
                </Button>
                {hasValue && (
                    <Button type="button" variant="outline" onClick={onRemove}>
                        <Trash2 className="size-4" />
                        Hapus
                    </Button>
                )}
            </div>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    onChange(event.target.files?.[0] ?? null);
                    event.target.value = '';
                }}
            />
        </div>
    );
}

function Field({ label, children, required = false }: { label: string; children: ReactNode; required?: boolean }) {
    return (
        <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">
                {label} {required && <span className="text-red-600">*</span>}
            </span>
            {children}
        </label>
    );
}

function PercentInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
    return (
        <Field label={label}>
            <Input type="number" min={0} max={100} step={1} value={value} onChange={(event) => onChange(Number(event.target.value))} />
        </Field>
    );
}

function createScene(order: number): InteractiveScene {
    return {
        id: makeId('scene'),
        title: `Scene ${order}`,
        order,
        text: '',
        background: null,
        narration: null,
        hotspots: [],
        buttons: [],
        assets: [],
    };
}

function createHotspot(): InteractiveHotspot {
    return {
        id: makeId('hotspot'),
        type: 'hotspot',
        label: 'Hotspot baru',
        explanation: 'Tuliskan penjelasan hotspot.',
        required: true,
        position: DEFAULT_POSITION,
        ...defaultElementState(),
    };
}

function createButton(): InteractiveButtonElement {
    return {
        id: makeId('button'),
        type: 'button',
        label: 'Lanjut',
        explanation: 'Penjelasan tombol.',
        required: false,
        action: 'show_explanation',
        target_scene_id: null,
        position: DEFAULT_BUTTON_POSITION,
        ...defaultElementState(),
    };
}

function coerceScene(value: unknown, index: number): InteractiveScene {
    const scene = (value && typeof value === 'object' ? value : {}) as Partial<InteractiveScene>;

    return {
        id: String(scene.id || makeId('scene')),
        title: String(scene.title || `Scene ${index + 1}`),
        order: index + 1,
        text: String(scene.text || ''),
        background: coerceMedia(scene.background, ['image', 'video']),
        narration: coerceNarration(scene.narration),
        hotspots: Array.isArray(scene.hotspots) ? scene.hotspots.map(coerceHotspot) : [],
        buttons: Array.isArray(scene.buttons) ? scene.buttons.map(coerceButton) : [],
        assets: Array.isArray(scene.assets) ? scene.assets.map(coerceAsset) : [],
    };
}

function defaultCanvasSettings(): InteractiveCanvasSettings {
    return {
        width: 1280,
        height: 720,
        aspect_ratio: '16:9',
        background_color: '#f8fafc',
    };
}

function coerceCanvas(value: unknown): InteractiveCanvasSettings {
    const canvas = (value && typeof value === 'object' ? value : {}) as Partial<InteractiveCanvasSettings>;

    return {
        width: clamp(Number(canvas.width ?? 1280), 640, 3840),
        height: clamp(Number(canvas.height ?? 720), 360, 2160),
        aspect_ratio: String(canvas.aspect_ratio || '16:9'),
        background_color: cssColor(canvas.background_color, '#f8fafc'),
    };
}

function coerceMedia(value: unknown, allowed: InteractiveMediaType[]): InteractiveMedia | null {
    if (!value || typeof value !== 'object') return null;
    const media = value as Partial<InteractiveMedia>;
    if (!media.media_upload_id || !media.type || !allowed.includes(media.type)) return null;

    return {
        type: media.type,
        media_upload_id: Number(media.media_upload_id),
        alt: String(media.alt || ''),
        url: media.url ? String(media.url) : undefined,
        original_name: media.original_name ? String(media.original_name) : undefined,
        mime_type: media.mime_type ? String(media.mime_type) : undefined,
        size: media.size ? Number(media.size) : undefined,
    };
}

function coerceNarration(value: unknown): InteractiveMedia | null {
    if (!value || typeof value !== 'object') return null;
    const narration = value as Partial<InteractiveMedia>;

    if (narration.type === 'tts') {
        return {
            type: 'tts',
            text: String(narration.text || ''),
            lang: String(narration.lang || 'id-ID'),
            voice_name: narration.voice_name ? String(narration.voice_name) : '',
            rate: clamp(Number(narration.rate ?? 1), 0.6, 1.4),
            pitch: clamp(Number(narration.pitch ?? 1), 0.6, 1.4),
        };
    }

    return coerceMedia(value, ['audio']);
}

function coerceHotspot(value: unknown): InteractiveHotspot {
    const hotspot = (value && typeof value === 'object' ? value : {}) as Partial<InteractiveHotspot>;

    return {
        id: String(hotspot.id || makeId('hotspot')),
        type: 'hotspot',
        label: String(hotspot.label || 'Hotspot'),
        explanation: String(hotspot.explanation || ''),
        required: Boolean(hotspot.required),
        position: clampPosition(hotspot.position || DEFAULT_POSITION),
        ...coerceElementState(hotspot),
    };
}

function coerceButton(value: unknown): InteractiveButtonElement {
    const button = (value && typeof value === 'object' ? value : {}) as Partial<InteractiveButtonElement>;

    return {
        id: String(button.id || makeId('button')),
        type: 'button',
        label: String(button.label || 'Tombol'),
        explanation: String(button.explanation || ''),
        required: Boolean(button.required),
        action: button.action === 'next_scene' || button.action === 'go_to_scene' ? button.action : 'show_explanation',
        target_scene_id: button.target_scene_id ? String(button.target_scene_id) : null,
        position: clampPosition(button.position || DEFAULT_BUTTON_POSITION),
        ...coerceElementState(button),
    };
}

function coerceAsset(value: unknown): InteractiveCanvasAsset {
    const asset = (value && typeof value === 'object' ? value : {}) as Partial<InteractiveCanvasAsset>;
    const style = (asset.style && typeof asset.style === 'object' ? asset.style : {}) as Partial<InteractiveCanvasAsset['style']>;
    const type = ['shape', 'icon', 'text', 'image', 'video', 'audio'].includes(String(asset.type)) ? asset.type! : 'shape';
    const media =
        type === 'image'
            ? coerceMedia(asset.media, ['image'])
            : type === 'video'
              ? coerceMedia(asset.media, ['video'])
              : type === 'audio'
                ? coerceMedia(asset.media, ['audio'])
                : null;

    return {
        id: String(asset.id || makeId('asset')),
        type,
        label: String(asset.label || asset.content || 'Asset'),
        content: String(asset.content || (type === 'text' ? 'Teks baru' : '')),
        position: clampPosition(asset.position || DEFAULT_ASSET_POSITION),
        style: {
            shape: String(style.shape || 'rectangle'),
            icon: String(style.icon || 'Lightbulb'),
            color: cssColor(style.color, '#1d4ed8'),
            backgroundColor: cssColor(style.backgroundColor, '#dbeafe'),
            borderColor: cssColor(style.borderColor, '#dbeafe'),
            fontSize: clamp(Number(style.fontSize ?? 16), 8, 96),
            fontWeight: ['400', '500', '600', '700', '800'].includes(String(style.fontWeight))
                ? (style.fontWeight as InteractiveCanvasAsset['style']['fontWeight'])
                : '700',
            textAlign: ['left', 'center', 'right'].includes(String(style.textAlign))
                ? (style.textAlign as InteractiveCanvasAsset['style']['textAlign'])
                : 'center',
            lineHeight: clamp(Number(style.lineHeight ?? 1.25), 1, 2.2),
            borderWidth: clamp(Number(style.borderWidth ?? 0), 0, 12),
            borderRadius: clamp(Number(style.borderRadius ?? 12), 0, 80),
            objectFit: ['contain', 'cover', 'fill'].includes(String(style.objectFit))
                ? (style.objectFit as InteractiveCanvasAsset['style']['objectFit'])
                : 'contain',
        },
        media,
        ...coerceElementState(asset),
    };
}

function defaultElementState(layerOrder = 0): InteractiveElementState {
    return {
        rotation: 0,
        opacity: 1,
        layer_order: layerOrder,
        locked: false,
        hidden: false,
    };
}

function coerceElementState(value: Partial<InteractiveElementState>): InteractiveElementState {
    return {
        rotation: clamp(Number(value.rotation ?? 0), -180, 180),
        opacity: clamp(Number(value.opacity ?? 1), 0.1, 1),
        layer_order: clamp(Number(value.layer_order ?? 0), 0, 9999),
        locked: Boolean(value.locked),
        hidden: Boolean(value.hidden),
    };
}

function reorderScenes(metadata: InteractiveMetadata): InteractiveMetadata {
    return {
        ...metadata,
        scenes: metadata.scenes.map((scene, index) => ({ ...scene, order: index + 1 })),
    };
}

function clampPosition(position: Partial<InteractivePosition>): InteractivePosition {
    const width = clamp(Number(position.width ?? DEFAULT_POSITION.width), 2, 100);
    const height = clamp(Number(position.height ?? DEFAULT_POSITION.height), 2, 100);

    return {
        x: clamp(Number(position.x ?? DEFAULT_POSITION.x), 0, 100 - width),
        y: clamp(Number(position.y ?? DEFAULT_POSITION.y), 0, 100 - height),
        width,
        height,
    };
}

function requiredIdsForScene(scene: InteractiveScene): string[] {
    return [
        ...scene.hotspots.filter((hotspot) => hotspot.required && !hotspot.hidden).map((hotspot) => hotspot.id),
        ...scene.buttons.filter((button) => button.required && !button.hidden).map((button) => button.id),
    ];
}

type CanvasElementKind = 'hotspot' | 'button' | 'asset';
type CanvasElementSelection = { kind: CanvasElementKind; id: string };

function byLayerOrder<T extends InteractiveElementState>(left: T, right: T): number {
    return left.layer_order - right.layer_order;
}

function elementVisualStyle(element: InteractiveElementState & { position: InteractivePosition }) {
    return {
        left: `${element.position.x}%`,
        top: `${element.position.y}%`,
        width: `${element.position.width}%`,
        height: `${element.position.height}%`,
        opacity: element.opacity,
        transform: `rotate(${element.rotation}deg)`,
        zIndex: element.layer_order,
    };
}

function elementPosition(scene: InteractiveScene, selection: CanvasElementSelection): InteractivePosition | null {
    if (selection.kind === 'hotspot') {
        return scene.hotspots.find((hotspot) => hotspot.id === selection.id)?.position ?? null;
    }

    if (selection.kind === 'button') {
        return scene.buttons.find((button) => button.id === selection.id)?.position ?? null;
    }

    return scene.assets.find((asset) => asset.id === selection.id)?.position ?? null;
}

function createShapeAsset(shape: InteractiveCanvasAsset['style']['shape']): InteractiveCanvasAsset {
    return {
        id: makeId('asset'),
        type: 'shape',
        label: shapeLabel(shape),
        content: '',
        position: DEFAULT_ASSET_POSITION,
        style: {
            shape,
            icon: 'Lightbulb',
            color: '#1d4ed8',
            backgroundColor: '#dbeafe',
            borderColor: '#dbeafe',
            fontSize: 16,
            fontWeight: '700',
            textAlign: 'center',
            lineHeight: 1.25,
            borderWidth: 0,
            borderRadius: 12,
            objectFit: 'contain',
        },
        media: null,
        ...defaultElementState(),
    };
}

function createIconAsset(icon: InteractiveCanvasAsset['style']['icon']): InteractiveCanvasAsset {
    return {
        id: makeId('asset'),
        type: 'icon',
        label: 'Icon',
        content: '',
        position: DEFAULT_ASSET_POSITION,
        style: {
            shape: 'circle',
            icon,
            color: '#1d4ed8',
            backgroundColor: '#dbeafe',
            borderColor: '#dbeafe',
            fontSize: 20,
            fontWeight: '700',
            textAlign: 'center',
            lineHeight: 1.25,
            borderWidth: 0,
            borderRadius: 999,
            objectFit: 'contain',
        },
        media: null,
        ...defaultElementState(),
    };
}

function createTextAsset(): InteractiveCanvasAsset {
    return {
        id: makeId('asset'),
        type: 'text',
        label: 'Teks',
        content: 'Teks baru',
        position: { x: 16, y: 18, width: 28, height: 12 },
        style: {
            shape: 'pill',
            icon: 'book',
            color: '#0f172a',
            backgroundColor: '#ffffff',
            borderColor: '#dbeafe',
            fontSize: 16,
            fontWeight: '700',
            textAlign: 'center',
            lineHeight: 1.25,
            borderWidth: 0,
            borderRadius: 16,
            objectFit: 'contain',
        },
        media: null,
        ...defaultElementState(),
    };
}

function createImageAsset(media: InteractiveMedia): InteractiveCanvasAsset {
    return {
        id: makeId('asset'),
        type: 'image',
        label: media.alt || media.original_name || 'Gambar asset',
        content: '',
        position: { x: 12, y: 12, width: 24, height: 24 },
        style: {
            shape: 'rectangle',
            icon: 'book',
            color: '#1d4ed8',
            backgroundColor: '#ffffff',
            borderColor: '#dbeafe',
            fontSize: 16,
            fontWeight: '700',
            textAlign: 'center',
            lineHeight: 1.25,
            borderWidth: 0,
            borderRadius: 12,
            objectFit: 'contain',
        },
        media,
        ...defaultElementState(),
    };
}

function createTtsNarration(fallbackText: string): InteractiveMedia {
    return {
        type: 'tts',
        text: fallbackText,
        lang: 'id-ID',
        voice_name: '',
        rate: 1,
        pitch: 1,
    };
}

function CanvasAssetPreview({ asset }: { asset: InteractiveCanvasAsset }) {
    const style = {
        color: asset.style.color,
        backgroundColor: ['image', 'video', 'audio'].includes(asset.type) ? 'transparent' : asset.style.backgroundColor,
        borderColor: asset.style.borderColor,
        borderWidth: `${asset.style.borderWidth}px`,
        borderStyle: asset.style.borderWidth > 0 ? 'solid' : 'none',
        fontSize: `${asset.style.fontSize}px`,
        fontWeight: asset.style.fontWeight,
        lineHeight: asset.style.lineHeight,
        textAlign: asset.style.textAlign,
        borderRadius: `${asset.style.borderRadius}px`,
        ...shapeStyle(asset.style.shape, asset.style.borderRadius),
    };

    if (asset.type === 'image' && asset.media?.url) {
        return <img src={asset.media.url} alt={asset.media.alt || asset.label} className="size-full" style={{ objectFit: asset.style.objectFit }} />;
    }

    if (asset.type === 'video' && asset.media?.url) {
        return (
            <video src={asset.media.url} controls preload="metadata" className="size-full bg-black" style={{ objectFit: asset.style.objectFit }} />
        );
    }

    if (asset.type === 'audio' && asset.media?.url) {
        return (
            <span className="flex size-full items-center justify-center bg-white p-2" style={style}>
                <audio src={asset.media.url} controls className="w-full" />
            </span>
        );
    }

    if (asset.type === 'icon') {
        return (
            <span className="flex size-full items-center justify-center" style={style}>
                <LucideIconRenderer name={asset.style.icon} className="size-1/2" />
            </span>
        );
    }

    if (asset.type === 'text') {
        return (
            <span className="flex size-full items-center justify-center px-2" style={style}>
                {asset.content}
            </span>
        );
    }

    return <span className="block size-full" style={style} />;
}

function speakText(narration: InteractiveMedia) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
    }

    const text = (narration.text ?? '').trim();
    if (!text) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = narration.lang || 'id-ID';
    utterance.rate = narration.rate ?? 1;
    utterance.pitch = narration.pitch ?? 1;

    const voices = window.speechSynthesis.getVoices();
    utterance.voice =
        voices.find((voice) => voice.name === narration.voice_name) ??
        voices.find((voice) => voice.lang.toLowerCase().startsWith('id')) ??
        voices[0] ??
        null;

    window.speechSynthesis.speak(utterance);
}

function cssColor(value: unknown, fallback: string): string {
    const color = String(value || '');

    return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : fallback;
}

function makeId(prefix: string): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return `${prefix}-${crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;

    return Math.round(Math.min(max, Math.max(min, value)) * 100) / 100;
}

function csrfToken(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}
