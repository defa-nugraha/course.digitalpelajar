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
    Loader2,
    MousePointerClick,
    Plus,
    Trash2,
    Video,
    Volume2,
} from 'lucide-react';
import { ChangeEvent, MouseEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';

export type InteractiveMediaType = 'image' | 'video' | 'audio';

export interface InteractiveMedia {
    type: InteractiveMediaType;
    media_upload_id?: number | null;
    alt?: string;
    url?: string;
    original_name?: string;
    mime_type?: string;
    size?: number;
}

export interface InteractivePosition {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface InteractiveHotspot {
    id: string;
    type: 'hotspot';
    label: string;
    explanation: string;
    required: boolean;
    position: InteractivePosition;
}

export interface InteractiveButtonElement {
    id: string;
    type: 'button';
    label: string;
    explanation: string;
    required: boolean;
    action: 'show_explanation' | 'next_scene';
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
}

export interface InteractiveMetadata {
    schema_version: number;
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

export function createDefaultInteractiveMetadata(): InteractiveMetadata {
    const scene = createScene(1);

    return {
        schema_version: 1,
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
    const scenes = Array.isArray(source.scenes)
        ? source.scenes.map((scene, index) => coerceScene(scene, index)).filter(Boolean)
        : [];
    const metadata: InteractiveMetadata = {
        schema_version: 1,
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
        ...scene.hotspots.filter((hotspot) => hotspot.required).map((hotspot) => hotspot.id),
        ...scene.buttons.filter((button) => button.required).map((button) => button.id),
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
    const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
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
        setSelectedHotspotId(null);
    };

    const removeScene = (sceneIndex: number) => {
        if (metadata.scenes.length === 1) return;
        update({ ...metadata, scenes: metadata.scenes.filter((_, index) => index !== sceneIndex) });
        setActiveSceneIndex(Math.max(0, sceneIndex - 1));
        setSelectedHotspotId(null);
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
        setSelectedHotspotId(hotspot.id);
    };

    const addButton = () => {
        updateScene(activeSceneIndex, { buttons: [...activeScene.buttons, createButton()] });
    };

    const moveSelectedHotspot = (event: MouseEvent<HTMLDivElement>) => {
        if (!selectedHotspotId) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const hotspot = activeScene.hotspots.find((item) => item.id === selectedHotspotId);
        if (!hotspot) return;

        const nextX = ((event.clientX - rect.left) / rect.width) * 100 - hotspot.position.width / 2;
        const nextY = ((event.clientY - rect.top) / rect.height) * 100 - hotspot.position.height / 2;

        updateScene(activeSceneIndex, {
            hotspots: activeScene.hotspots.map((item) =>
                item.id === selectedHotspotId
                    ? { ...item, position: clampPosition({ ...item.position, x: nextX, y: nextY }) }
                    : item,
            ),
        });
    };

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm leading-6 text-blue-900">
                <p className="font-bold text-slate-950">Interactive lesson</p>
                <p className="mt-1">
                    Buat scene bertahap dengan teks, background gambar/video, audio narator, hotspot, dan tombol. Hotspot atau tombol yang wajib
                    harus diklik siswa sebelum lanjut.
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {metadata.scenes.map((scene, index) => (
                    <button
                        key={scene.id}
                        type="button"
                        onClick={() => {
                            setActiveSceneIndex(index);
                            setSelectedHotspotId(null);
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
                                <h3 className="text-lg font-extrabold text-slate-950">{activeScene.title || 'Scene interactive'}</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button type="button" variant="outline" size="sm" disabled={activeSceneIndex === 0} onClick={() => moveScene(activeSceneIndex, -1)}>
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
                                <Button type="button" variant="outline" size="sm" disabled={metadata.scenes.length === 1} onClick={() => removeScene(activeSceneIndex)}>
                                    <Trash2 className="size-4" />
                                    Hapus
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Judul scene" required>
                                <Input value={activeScene.title} onChange={(event) => updateScene(activeSceneIndex, { title: event.target.value })} />
                            </Field>
                            <Field label="Audio narator">
                                <MediaInput
                                    accept="audio/*"
                                    icon={<Volume2 className="size-4" />}
                                    label={activeScene.narration?.original_name || 'Upload audio'}
                                    loading={uploading === `narration-${activeSceneIndex}`}
                                    onChange={(file) => uploadMedia(activeSceneIndex, 'audio', file, 'narration')}
                                    onRemove={() => updateScene(activeSceneIndex, { narration: null })}
                                    hasValue={Boolean(activeScene.narration?.media_upload_id)}
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
                                    label={activeScene.background?.type === 'image' ? activeScene.background.original_name || 'Gambar terupload' : 'Upload gambar'}
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
                                    label={activeScene.background?.type === 'video' ? activeScene.background.original_name || 'Video terupload' : 'Upload video'}
                                    loading={uploading === `background-${activeSceneIndex}`}
                                    onChange={(file) => uploadMedia(activeSceneIndex, 'video', file, 'background')}
                                    onRemove={() => updateScene(activeSceneIndex, { background: null })}
                                    hasValue={activeScene.background?.type === 'video'}
                                />
                            </Field>
                        </div>

                        {uploadError && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{uploadError}</p>}
                    </div>

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
                                    selected={selectedHotspotId === hotspot.id}
                                    onSelect={() => setSelectedHotspotId(hotspot.id)}
                                    onChange={(patch) =>
                                        updateScene(activeSceneIndex, {
                                            hotspots: activeScene.hotspots.map((item, index) => (index === hotspotIndex ? { ...item, ...patch } : item)),
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
                            {activeScene.buttons.length === 0 && <p className="text-sm text-slate-500">Belum ada tombol interaktif pada scene ini.</p>}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="mb-3 font-bold text-slate-950">Preview & posisi hotspot</p>
                        <SceneCanvas scene={activeScene} selectedHotspotId={selectedHotspotId} onCanvasClick={moveSelectedHotspot} onHotspotClick={(hotspot) => {
                            setSelectedHotspotId(hotspot.id);
                            setPreviewMessage(hotspot.explanation);
                        }} />
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
        if (button.action === 'next_scene') {
            const nextSceneRequiredDone = currentRequiredIds.every((id) => nextCompletedIds.includes(id));
            if (nextSceneRequiredDone && !isLastScene) {
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

            <SceneCanvas scene={scene} completedIds={completedIds} onHotspotClick={handleHotspot} />

            {scene.narration?.url && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-950">
                        <Volume2 className="size-4 text-blue-700" />
                        Audio narator
                    </p>
                    <audio controls preload="none" src={scene.narration.url} className="w-full" />
                </div>
            )}

            {scene.text && <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-700">{scene.text}</p>}

            {message && (
                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-blue-950">
                    <p className="font-bold">{message.title}</p>
                    <p className="mt-2 whitespace-pre-wrap leading-7">{message.body}</p>
                </div>
            )}

            {saveError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                    {saveError}
                </div>
            )}

            {scene.buttons.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {scene.buttons.map((button) => (
                        <Button key={button.id} type="button" variant={completedIds.includes(button.id) ? 'outline' : 'default'} onClick={() => handleButton(button)}>
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
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${((currentSceneIndex + 1) / metadata.scenes.length) * 100}%` }} />
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
    selectedHotspotId,
    completedIds = [],
    onCanvasClick,
    onHotspotClick,
}: {
    scene: InteractiveScene;
    selectedHotspotId?: string | null;
    completedIds?: string[];
    onCanvasClick?: (event: MouseEvent<HTMLDivElement>) => void;
    onHotspotClick?: (hotspot: InteractiveHotspot) => void;
}) {
    const background = scene.background;

    return (
        <div
            role={onCanvasClick ? 'button' : undefined}
            tabIndex={onCanvasClick ? 0 : undefined}
            onClick={onCanvasClick}
            className={cn(
                'relative flex aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-100 to-blue-50',
                onCanvasClick && 'cursor-crosshair',
            )}
        >
            {background?.type === 'image' && background.url && (
                <img src={background.url} alt={background.alt || scene.title} className="absolute inset-0 size-full object-contain" />
            )}
            {background?.type === 'video' && background.url && (
                <video
                    controls
                    preload="metadata"
                    src={background.url}
                    className="absolute inset-0 size-full bg-black object-contain"
                />
            )}
            {!background?.url && (
                <div className="m-auto max-w-md px-4 text-center text-slate-500">
                    <MousePointerClick className="mx-auto size-10 text-blue-500" />
                    <p className="mt-3 text-sm font-semibold">Preview scene interactive</p>
                    <p className="mt-1 text-xs">Upload background atau gunakan area ini untuk mengatur posisi hotspot.</p>
                </div>
            )}

            {scene.hotspots.map((hotspot) => {
                const done = completedIds.includes(hotspot.id);

                return (
                    <button
                        key={hotspot.id}
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onHotspotClick?.(hotspot);
                        }}
                        className={cn(
                            'absolute flex items-center justify-center rounded-full border-2 text-xs font-black shadow-lg transition focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none',
                            selectedHotspotId === hotspot.id
                                ? 'border-blue-700 bg-blue-600 text-white'
                                : done
                                  ? 'border-emerald-600 bg-emerald-500 text-white'
                                  : hotspot.required
                                    ? 'border-amber-500 bg-amber-400 text-slate-950'
                                    : 'border-blue-500 bg-white text-blue-700',
                        )}
                        style={{
                            left: `${hotspot.position.x}%`,
                            top: `${hotspot.position.y}%`,
                            width: `${hotspot.position.width}%`,
                            height: `${hotspot.position.height}%`,
                        }}
                        aria-label={hotspot.label}
                    >
                        {done ? <CheckCircle2 className="size-4" /> : <MousePointerClick className="size-4" />}
                    </button>
                );
            })}
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
        narration: coerceMedia(scene.narration, ['audio']),
        hotspots: Array.isArray(scene.hotspots) ? scene.hotspots.map(coerceHotspot) : [],
        buttons: Array.isArray(scene.buttons) ? scene.buttons.map(coerceButton) : [],
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

function coerceHotspot(value: unknown): InteractiveHotspot {
    const hotspot = (value && typeof value === 'object' ? value : {}) as Partial<InteractiveHotspot>;

    return {
        id: String(hotspot.id || makeId('hotspot')),
        type: 'hotspot',
        label: String(hotspot.label || 'Hotspot'),
        explanation: String(hotspot.explanation || ''),
        required: Boolean(hotspot.required),
        position: clampPosition(hotspot.position || DEFAULT_POSITION),
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
        action: button.action === 'next_scene' ? 'next_scene' : 'show_explanation',
    };
}

function reorderScenes(metadata: InteractiveMetadata): InteractiveMetadata {
    return {
        ...metadata,
        scenes: metadata.scenes.map((scene, index) => ({ ...scene, order: index + 1 })),
    };
}

function clampPosition(position: Partial<InteractivePosition>): InteractivePosition {
    const width = clamp(Number(position.width ?? DEFAULT_POSITION.width), 4, 40);
    const height = clamp(Number(position.height ?? DEFAULT_POSITION.height), 4, 40);

    return {
        x: clamp(Number(position.x ?? DEFAULT_POSITION.x), 0, 100 - width),
        y: clamp(Number(position.y ?? DEFAULT_POSITION.y), 0, 100 - height),
        width,
        height,
    };
}

function requiredIdsForScene(scene: InteractiveScene): string[] {
    return [
        ...scene.hotspots.filter((hotspot) => hotspot.required).map((hotspot) => hotspot.id),
        ...scene.buttons.filter((button) => button.required).map((button) => button.id),
    ];
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
