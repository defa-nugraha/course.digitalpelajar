import { ICON_OPTIONS, SHAPE_OPTIONS } from '@/components/interactive-asset-library';
import type {
    InteractiveButtonElement,
    InteractiveCanvasAsset,
    InteractiveHotspot,
    InteractiveMedia,
    InteractivePosition,
    InteractiveScene,
} from '@/components/interactive-learning';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Lock, Trash2, Unlock, Upload, Volume2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { EditorElement, ElementSelection } from './types';

export function PropertiesPanel({
    scene,
    selectedElement,
    sceneOptions,
    uploading,
    uploadError,
    onSceneChange,
    onElementChange,
    onDeleteElement,
    onUploadMedia,
}: {
    scene: InteractiveScene;
    selectedElement: EditorElement | null;
    sceneOptions: Array<{ id: string; title: string }>;
    uploading?: string | null;
    uploadError?: string | null;
    onSceneChange: (scene: InteractiveScene) => void;
    onElementChange: (selection: ElementSelection, patch: Record<string, unknown>) => void;
    onDeleteElement: () => void;
    onUploadMedia: (type: 'image' | 'video' | 'audio', file: File) => Promise<InteractiveMedia | null>;
}) {
    return (
        <aside className="h-full w-[360px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-4">
            {selectedElement ? (
                <ElementProperties
                    element={selectedElement}
                    sceneOptions={sceneOptions}
                    uploading={uploading}
                    uploadError={uploadError}
                    onChange={(patch) => onElementChange({ kind: selectedElement.kind, id: selectedElement.id }, patch)}
                    onDelete={onDeleteElement}
                    onUploadMedia={onUploadMedia}
                />
            ) : (
                <SceneProperties
                    scene={scene}
                    uploading={uploading}
                    uploadError={uploadError}
                    onChange={onSceneChange}
                    onUploadMedia={onUploadMedia}
                />
            )}
        </aside>
    );
}

function SceneProperties({
    scene,
    uploading,
    uploadError,
    onChange,
    onUploadMedia,
}: {
    scene: InteractiveScene;
    uploading?: string | null;
    uploadError?: string | null;
    onChange: (scene: InteractiveScene) => void;
    onUploadMedia: (type: 'image' | 'video' | 'audio', file: File) => Promise<InteractiveMedia | null>;
}) {
    return (
        <PanelHeader title="Scene properties" description="Atur informasi utama scene aktif. Jika tidak ada elemen dipilih, panel ini muncul.">
            <Field label="Judul scene" required>
                <Input value={scene.title} onChange={(event) => onChange({ ...scene, title: event.target.value })} />
            </Field>
            <Field label="Penjelasan scene">
                <textarea
                    className="min-h-28 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                    value={scene.text}
                    onChange={(event) => onChange({ ...scene, text: event.target.value })}
                    placeholder="Teks ini tampil di bawah canvas pada player siswa."
                />
            </Field>
            <MediaField
                label="Background gambar/video"
                accept="image/*,video/*"
                uploading={uploading === 'background'}
                current={scene.background}
                onUpload={async (file) => {
                    const type = file.type.startsWith('video/') ? 'video' : 'image';
                    const media = await onUploadMedia(type, file);
                    if (media) onChange({ ...scene, background: media });
                }}
                onRemove={() => onChange({ ...scene, background: null })}
            />
            <MediaField
                label="Audio narration"
                accept="audio/*"
                uploading={uploading === 'audio'}
                current={scene.narration}
                onUpload={async (file) => {
                    const media = await onUploadMedia('audio', file);
                    if (media) onChange({ ...scene, narration: media });
                }}
                onRemove={() => onChange({ ...scene, narration: null })}
            />
            <Field label="Preview TTS browser">
                <div className="space-y-2">
                    <textarea
                        className="min-h-20 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                        value={scene.narration?.type === 'tts' ? (scene.narration.text ?? '') : scene.text}
                        onChange={(event) =>
                            onChange({ ...scene, narration: { type: 'tts', text: event.target.value, lang: 'id-ID', rate: 1, pitch: 1 } })
                        }
                        placeholder="Opsional untuk preview narasi di browser."
                    />
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => speak(scene.narration?.type === 'tts' ? scene.narration.text : scene.text)}
                    >
                        <Volume2 className="size-4" />
                        Preview Suara
                    </Button>
                </div>
            </Field>
            {uploadError && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{uploadError}</p>}
        </PanelHeader>
    );
}

function ElementProperties({
    element,
    sceneOptions,
    uploading,
    uploadError,
    onChange,
    onDelete,
    onUploadMedia,
}: {
    element: EditorElement;
    sceneOptions: Array<{ id: string; title: string }>;
    uploading?: string | null;
    uploadError?: string | null;
    onChange: (patch: Record<string, unknown>) => void;
    onDelete: () => void;
    onUploadMedia: (type: 'image' | 'video' | 'audio', file: File) => Promise<InteractiveMedia | null>;
}) {
    const data = element.data;

    return (
        <PanelHeader title="Element properties" description={`${element.label} · ${element.type}`}>
            <Field label="Nama layer" required>
                <Input value={element.label} onChange={(event) => onChange({ label: event.target.value })} />
            </Field>
            <PositionFields position={element.position} rotation={element.rotation} opacity={element.opacity} onChange={onChange} />
            <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={() => onChange({ locked: !element.locked })}>
                    {element.locked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
                    {element.locked ? 'Unlock' : 'Lock'}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onChange({ hidden: !element.hidden, required: element.hidden ? element.required : false })}
                >
                    {element.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    {element.hidden ? 'Show' : 'Hide'}
                </Button>
            </div>
            {'required' in data && (
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700">
                    <input
                        type="checkbox"
                        checked={Boolean(data.required)}
                        disabled={element.hidden}
                        onChange={(event) => onChange({ required: event.target.checked })}
                    />
                    Wajib diklik sebelum lanjut
                </label>
            )}
            {element.kind === 'asset' && (
                <AssetProperties asset={data as InteractiveCanvasAsset} uploading={uploading} onChange={onChange} onUploadMedia={onUploadMedia} />
            )}
            {element.kind === 'hotspot' && <HotspotProperties hotspot={data as InteractiveHotspot} onChange={onChange} />}
            {element.kind === 'button' && (
                <ButtonProperties button={data as InteractiveButtonElement} sceneOptions={sceneOptions} onChange={onChange} />
            )}
            {uploadError && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{uploadError}</p>}
            <Button type="button" variant="outline" className="w-full border-red-200 text-red-700 hover:bg-red-50" onClick={onDelete}>
                <Trash2 className="size-4" />
                Hapus elemen
            </Button>
        </PanelHeader>
    );
}

function AssetProperties({
    asset,
    uploading,
    onChange,
    onUploadMedia,
}: {
    asset: InteractiveCanvasAsset;
    uploading?: string | null;
    onChange: (patch: Record<string, unknown>) => void;
    onUploadMedia: (type: 'image' | 'video' | 'audio', file: File) => Promise<InteractiveMedia | null>;
}) {
    return (
        <>
            {asset.type === 'text' && (
                <>
                    <Field label="Isi teks" required>
                        <textarea
                            className="min-h-24 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                            value={asset.content}
                            onChange={(event) => onChange({ content: event.target.value })}
                        />
                    </Field>
                    <Field label="Ukuran font">
                        <Input
                            type="number"
                            min={8}
                            max={96}
                            value={asset.style.fontSize}
                            onChange={(event) => onChange({ style: { ...asset.style, fontSize: Number(event.target.value) } })}
                        />
                    </Field>
                    <Field label="Alignment">
                        <select
                            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                            value={asset.style.textAlign}
                            onChange={(event) => onChange({ style: { ...asset.style, textAlign: event.target.value } })}
                        >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                        </select>
                    </Field>
                </>
            )}
            {(asset.type === 'image' || asset.type === 'video' || asset.type === 'audio') && (
                <AssetMediaField
                    asset={asset as InteractiveCanvasAsset & { type: 'image' | 'video' | 'audio' }}
                    uploading={uploading}
                    onUploadMedia={onUploadMedia}
                    onChange={onChange}
                />
            )}
            {asset.type === 'shape' && (
                <Field label="Bentuk shape">
                    <select
                        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                        value={asset.style.shape}
                        onChange={(event) => onChange({ style: { ...asset.style, shape: event.target.value } })}
                    >
                        {SHAPE_OPTIONS.map((shape) => (
                            <option key={shape.value} value={shape.value}>
                                {shape.category} · {shape.label}
                            </option>
                        ))}
                    </select>
                </Field>
            )}
            {asset.type === 'icon' && (
                <>
                    <Field label="Nama icon">
                        <Input
                            list={`interactive-icon-options-${asset.id}`}
                            value={asset.style.icon}
                            onChange={(event) => onChange({ style: { ...asset.style, icon: event.target.value } })}
                            placeholder="Contoh: Cpu, Bot, BookOpen"
                        />
                        <datalist id={`interactive-icon-options-${asset.id}`}>
                            {ICON_OPTIONS.slice(0, 500).map((icon) => (
                                <option key={icon.value} value={icon.value}>
                                    {icon.label}
                                </option>
                            ))}
                        </datalist>
                    </Field>
                    <Field label="Bentuk background icon">
                        <select
                            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                            value={asset.style.shape}
                            onChange={(event) => onChange({ style: { ...asset.style, shape: event.target.value } })}
                        >
                            {SHAPE_OPTIONS.map((shape) => (
                                <option key={shape.value} value={shape.value}>
                                    {shape.category} · {shape.label}
                                </option>
                            ))}
                        </select>
                    </Field>
                </>
            )}
            <Field label="Warna teks / icon">
                <Input
                    type="color"
                    value={asset.style.color}
                    onChange={(event) => onChange({ style: { ...asset.style, color: event.target.value } })}
                />
            </Field>
            <Field label="Background">
                <Input
                    type="color"
                    value={asset.style.backgroundColor}
                    onChange={(event) => onChange({ style: { ...asset.style, backgroundColor: event.target.value } })}
                />
            </Field>
            <Field label="Border radius">
                <Input
                    type="number"
                    min={0}
                    max={80}
                    value={asset.style.borderRadius}
                    onChange={(event) => onChange({ style: { ...asset.style, borderRadius: Number(event.target.value) } })}
                />
            </Field>
            <Field label="Object fit">
                <select
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={asset.style.objectFit}
                    onChange={(event) => onChange({ style: { ...asset.style, objectFit: event.target.value } })}
                >
                    <option value="contain">Contain</option>
                    <option value="cover">Cover</option>
                    <option value="fill">Fill</option>
                </select>
            </Field>
        </>
    );
}

function AssetMediaField({
    asset,
    uploading,
    onUploadMedia,
    onChange,
}: {
    asset: InteractiveCanvasAsset & { type: 'image' | 'video' | 'audio' };
    uploading: string | null | undefined;
    onUploadMedia: (type: 'image' | 'video' | 'audio', file: File) => Promise<InteractiveMedia | null>;
    onChange: (patch: Record<string, unknown>) => void;
}) {
    return (
        <MediaField
            label={`Upload ${asset.type}`}
            accept={asset.type === 'image' ? 'image/*' : asset.type === 'video' ? 'video/*' : 'audio/*'}
            uploading={uploading === asset.type}
            current={asset.media}
            onUpload={async (file) => {
                const media = await onUploadMedia(asset.type, file);
                if (media) onChange({ media, label: media.original_name || asset.label });
            }}
            onRemove={() => onChange({ media: null })}
        />
    );
}

function HotspotProperties({ hotspot, onChange }: { hotspot: InteractiveHotspot; onChange: (patch: Record<string, unknown>) => void }) {
    return (
        <>
            <Field label="Label hotspot" required>
                <Input value={hotspot.label} onChange={(event) => onChange({ label: event.target.value })} />
            </Field>
            <Field label="Penjelasan" required>
                <textarea
                    className="min-h-28 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                    value={hotspot.explanation}
                    onChange={(event) => onChange({ explanation: event.target.value })}
                />
            </Field>
        </>
    );
}

function ButtonProperties({
    button,
    sceneOptions,
    onChange,
}: {
    button: InteractiveButtonElement;
    sceneOptions: Array<{ id: string; title: string }>;
    onChange: (patch: Record<string, unknown>) => void;
}) {
    return (
        <>
            <Field label="Label button" required>
                <Input value={button.label} onChange={(event) => onChange({ label: event.target.value })} />
            </Field>
            <Field label="Action type">
                <select
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={button.action}
                    onChange={(event) => onChange({ action: event.target.value })}
                >
                    <option value="show_explanation">Tampilkan penjelasan</option>
                    <option value="next_scene">Ke scene berikutnya</option>
                    <option value="go_to_scene">Ke scene tertentu</option>
                </select>
            </Field>
            {button.action === 'go_to_scene' && (
                <Field label="Target scene">
                    <select
                        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                        value={button.target_scene_id ?? ''}
                        onChange={(event) => onChange({ target_scene_id: event.target.value || null })}
                    >
                        <option value="">Pilih scene</option>
                        {sceneOptions.map((scene) => (
                            <option key={scene.id} value={scene.id}>
                                {scene.title}
                            </option>
                        ))}
                    </select>
                </Field>
            )}
            {button.action === 'show_explanation' && (
                <Field label="Penjelasan" required>
                    <textarea
                        className="min-h-28 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                        value={button.explanation}
                        onChange={(event) => onChange({ explanation: event.target.value })}
                    />
                </Field>
            )}
        </>
    );
}

function PositionFields({
    position,
    rotation,
    opacity,
    onChange,
}: {
    position: InteractivePosition;
    rotation: number;
    opacity: number;
    onChange: (patch: Record<string, unknown>) => void;
}) {
    const setPosition = (patch: Partial<InteractivePosition>) => onChange({ position: { ...position, ...patch } });

    return (
        <div className="grid grid-cols-2 gap-3">
            <Field label="X">
                <Input type="number" min={0} max={100} value={position.x} onChange={(event) => setPosition({ x: Number(event.target.value) })} />
            </Field>
            <Field label="Y">
                <Input type="number" min={0} max={100} value={position.y} onChange={(event) => setPosition({ y: Number(event.target.value) })} />
            </Field>
            <Field label="Width">
                <Input
                    type="number"
                    min={2}
                    max={100}
                    value={position.width}
                    onChange={(event) => setPosition({ width: Number(event.target.value) })}
                />
            </Field>
            <Field label="Height">
                <Input
                    type="number"
                    min={2}
                    max={100}
                    value={position.height}
                    onChange={(event) => setPosition({ height: Number(event.target.value) })}
                />
            </Field>
            <Field label="Rotation">
                <Input type="number" min={-180} max={180} value={rotation} onChange={(event) => onChange({ rotation: Number(event.target.value) })} />
            </Field>
            <Field label="Opacity">
                <Input
                    type="number"
                    min={0.1}
                    max={1}
                    step={0.1}
                    value={opacity}
                    onChange={(event) => onChange({ opacity: Number(event.target.value) })}
                />
            </Field>
        </div>
    );
}

function MediaField({
    label,
    accept,
    uploading,
    current,
    onUpload,
    onRemove,
}: {
    label: string;
    accept: string;
    uploading: boolean;
    current?: InteractiveMedia | null;
    onUpload: (file: File) => void | Promise<void>;
    onRemove: () => void;
}) {
    return (
        <Field label={label}>
            <div className="space-y-2">
                {current?.original_name && (
                    <p className="truncate rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">{current.original_name}</p>
                )}
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-blue-50">
                    <Upload className="size-4" />
                    {uploading ? 'Mengupload...' : 'Upload file'}
                    <input
                        type="file"
                        accept={accept}
                        className="hidden"
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void onUpload(file);
                            event.target.value = '';
                        }}
                    />
                </label>
                {current && (
                    <Button type="button" variant="outline" className="w-full" onClick={onRemove}>
                        <Trash2 className="size-4" />
                        Hapus media
                    </Button>
                )}
            </div>
        </Field>
    );
}

function PanelHeader({ title, description, children }: { title: string; description: string; children: ReactNode }) {
    return (
        <section className="space-y-4">
            <div>
                <p className="text-xs font-bold tracking-wide text-blue-700 uppercase">Properties</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
            </div>
            {children}
        </section>
    );
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: ReactNode }) {
    return (
        <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">
                {label} {required && <span className="text-red-600">*</span>}
            </span>
            {children}
        </label>
    );
}

function speak(text?: string | null) {
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    window.speechSynthesis.speak(utterance);
}
