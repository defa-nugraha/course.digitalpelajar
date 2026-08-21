import {
    type InteractiveButtonElement,
    type InteractiveCanvasAsset,
    type InteractiveCanvasSettings,
    type InteractiveElementState,
    type InteractiveHotspot,
    type InteractiveMedia,
    type InteractiveMetadata,
    type InteractivePosition,
    type InteractiveScene,
    coerceInteractiveMetadata,
    requiredElementIds,
} from '@/components/interactive-learning';
import type { EditorElement, ElementKind, ElementPreset, ElementSelection, ElementType } from './types';

export const CANVAS_DROPPABLE_ID = 'interactive-editor-canvas';
export const SCENE_SORTABLE_ID = 'interactive-editor-scenes';
export const LAYER_SORTABLE_ID = 'interactive-editor-layers';

export function makeId(prefix: string): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return `${prefix}-${crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function cloneMetadata(metadata: InteractiveMetadata): InteractiveMetadata {
    if (typeof structuredClone === 'function') {
        return structuredClone(metadata);
    }

    return JSON.parse(JSON.stringify(metadata)) as InteractiveMetadata;
}

export function normalizeEditorMetadata(value: unknown): InteractiveMetadata {
    const metadata = coerceInteractiveMetadata(value);

    return syncCompletionRules({
        ...metadata,
        canvas: {
            ...defaultCanvas(),
            ...(metadata.canvas ?? {}),
        },
        scenes: metadata.scenes.map((scene) => ({
            ...scene,
            hotspots: scene.hotspots.map((hotspot, index) => withLayerDefaults(hotspot, index * 10 + 100)),
            buttons: scene.buttons.map((button, index) => withLayerDefaults(button, index * 10 + 200)),
            assets: scene.assets.map((asset, index) => withLayerDefaults(asset, index * 10 + 10)),
        })),
    });
}

export function defaultCanvas(): InteractiveCanvasSettings {
    return {
        width: 1280,
        height: 720,
        aspect_ratio: '16:9',
        background_color: '#f8fafc',
    };
}

function withLayerDefaults<T extends InteractiveElementState>(element: T, layerOrder: number): T {
    return {
        ...element,
        rotation: Number.isFinite(element.rotation) ? element.rotation : 0,
        opacity: Number.isFinite(element.opacity) ? element.opacity : 1,
        layer_order: Number.isFinite(element.layer_order) ? element.layer_order : layerOrder,
        locked: Boolean(element.locked),
        hidden: Boolean(element.hidden),
    };
}

export function activeScene(metadata: InteractiveMetadata, activeSceneId: string): InteractiveScene {
    return metadata.scenes.find((scene) => scene.id === activeSceneId) ?? metadata.scenes[0];
}

export function sceneById(metadata: InteractiveMetadata, sceneId: string): InteractiveScene | null {
    return metadata.scenes.find((scene) => scene.id === sceneId) ?? null;
}

export function syncCompletionRules(metadata: InteractiveMetadata): InteractiveMetadata {
    return {
        ...metadata,
        scenes: metadata.scenes.map((scene, index) => ({ ...scene, order: index + 1 })),
        completion_rules: {
            require_last_scene: true,
            required_element_ids: requiredElementIds(metadata),
        },
    };
}

export function createScene(order: number): InteractiveScene {
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

export function duplicateScene(scene: InteractiveScene, order: number): InteractiveScene {
    const clone = cloneMetadata({ ...normalizeEditorMetadata({ scenes: [scene] }), scenes: [scene] }).scenes[0];
    const idMap = new Map<string, string>();

    return {
        ...clone,
        id: makeId('scene'),
        title: `${clone.title} Copy`,
        order,
        hotspots: clone.hotspots.map((hotspot) => remapElementId(hotspot, 'hotspot', idMap)),
        buttons: clone.buttons.map((button) => remapElementId(button, 'button', idMap)),
        assets: clone.assets.map((asset) => remapElementId(asset, 'asset', idMap)),
    };
}

function remapElementId<T extends { id: string }>(element: T, prefix: string, idMap: Map<string, string>): T {
    const nextId = makeId(prefix);
    idMap.set(element.id, nextId);

    return { ...element, id: nextId };
}

export function createElement(
    type: ElementType,
    media?: InteractiveMedia | null,
    preset?: ElementPreset,
): { kind: ElementKind; element: InteractiveCanvasAsset | InteractiveHotspot | InteractiveButtonElement } {
    const nextLayer = Date.now() % 9000;

    if (type === 'hotspot') {
        return {
            kind: 'hotspot',
            element: {
                id: makeId('hotspot'),
                type: 'hotspot',
                label: 'Hotspot baru',
                explanation: 'Tuliskan penjelasan yang muncul saat hotspot diklik.',
                required: true,
                position: { x: 44, y: 40, width: 9, height: 9 },
                ...defaultElementState(nextLayer),
            },
        };
    }

    if (type === 'button') {
        return {
            kind: 'button',
            element: {
                id: makeId('button'),
                type: 'button',
                label: 'Lanjut',
                explanation: 'Tuliskan penjelasan tombol.',
                required: false,
                action: 'show_explanation',
                target_scene_id: null,
                position: { x: 56, y: 76, width: 22, height: 10 },
                ...defaultElementState(nextLayer),
            },
        };
    }

    return {
        kind: 'asset',
        element: createAsset(type, media, nextLayer, preset),
    };
}

export function createAsset(
    type: InteractiveCanvasAsset['type'],
    media?: InteractiveMedia | null,
    layerOrder = 0,
    preset?: ElementPreset,
): InteractiveCanvasAsset {
    const base = {
        id: makeId('asset'),
        type,
        label: preset?.label ?? assetLabel(type, media),
        content: preset?.content ?? (type === 'text' ? 'Tulis materi di sini' : ''),
        position: defaultPositionForAsset(type),
        style: {
            ...defaultAssetStyle(type),
            ...(preset?.style ?? {}),
        },
        media: media ?? null,
        ...defaultElementState(layerOrder),
    };

    return base;
}

export function defaultElementState(layerOrder = 0): InteractiveElementState {
    return {
        rotation: 0,
        opacity: 1,
        layer_order: layerOrder,
        locked: false,
        hidden: false,
    };
}

function defaultPositionForAsset(type: InteractiveCanvasAsset['type']): InteractivePosition {
    if (type === 'video') return { x: 18, y: 18, width: 48, height: 32 };
    if (type === 'audio') return { x: 20, y: 68, width: 42, height: 12 };
    if (type === 'text') return { x: 14, y: 16, width: 34, height: 14 };
    if (type === 'image') return { x: 18, y: 18, width: 30, height: 26 };

    return { x: 20, y: 20, width: 18, height: 14 };
}

function assetLabel(type: InteractiveCanvasAsset['type'], media?: InteractiveMedia | null): string {
    if (media?.original_name) return media.original_name;

    return {
        text: 'Teks',
        image: 'Gambar',
        video: 'Video',
        audio: 'Audio',
        shape: 'Shape',
        icon: 'Icon',
    }[type];
}

export function defaultAssetStyle(type: InteractiveCanvasAsset['type']): InteractiveCanvasAsset['style'] {
    return {
        shape: type === 'icon' ? 'circle' : type === 'text' ? 'pill' : 'rounded-rectangle',
        icon: 'Lightbulb',
        color: type === 'shape' ? '#1d4ed8' : '#0f172a',
        backgroundColor: type === 'shape' ? '#dbeafe' : '#ffffff',
        borderColor: '#bfdbfe',
        fontSize: type === 'text' ? 24 : 16,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 1.25,
        borderWidth: type === 'text' ? 1 : 0,
        borderRadius: type === 'icon' ? 999 : type === 'text' ? 18 : 12,
        objectFit: 'contain',
    };
}

export function allSceneElements(scene: InteractiveScene): EditorElement[] {
    const assets = scene.assets.map((asset) => toEditorElement('asset', asset));
    const hotspots = scene.hotspots.map((hotspot) => toEditorElement('hotspot', hotspot));
    const buttons = scene.buttons.map((button) => toEditorElement('button', button));

    return [...assets, ...hotspots, ...buttons].sort((a, b) => a.layer_order - b.layer_order);
}

export function toEditorElement(kind: ElementKind, data: InteractiveCanvasAsset | InteractiveHotspot | InteractiveButtonElement): EditorElement {
    return {
        key: `${kind}:${data.id}`,
        id: data.id,
        kind,
        type: kind === 'asset' ? (data as InteractiveCanvasAsset).type : data.type,
        label: data.label || data.id,
        position: data.position,
        rotation: data.rotation,
        opacity: data.opacity,
        layer_order: data.layer_order,
        locked: data.locked,
        hidden: data.hidden,
        required: 'required' in data ? data.required : false,
        data,
    };
}

export function getElement(scene: InteractiveScene, selection: ElementSelection | null): EditorElement | null {
    if (!selection) return null;

    return allSceneElements(scene).find((element) => element.kind === selection.kind && element.id === selection.id) ?? null;
}

export function updateSceneInMetadata(
    metadata: InteractiveMetadata,
    sceneId: string,
    updater: (scene: InteractiveScene) => InteractiveScene,
): InteractiveMetadata {
    return syncCompletionRules({
        ...metadata,
        scenes: metadata.scenes.map((scene) => (scene.id === sceneId ? updater(scene) : scene)),
    });
}

export function updateElementInScene(scene: InteractiveScene, selection: ElementSelection, patch: Record<string, unknown>): InteractiveScene {
    if (selection.kind === 'asset') {
        return {
            ...scene,
            assets: scene.assets.map((asset) => (asset.id === selection.id ? ({ ...asset, ...patch } as InteractiveCanvasAsset) : asset)),
        };
    }

    if (selection.kind === 'hotspot') {
        return {
            ...scene,
            hotspots: scene.hotspots.map((hotspot) => (hotspot.id === selection.id ? ({ ...hotspot, ...patch } as InteractiveHotspot) : hotspot)),
        };
    }

    return {
        ...scene,
        buttons: scene.buttons.map((button) => (button.id === selection.id ? ({ ...button, ...patch } as InteractiveButtonElement) : button)),
    };
}

export function deleteElementFromScene(scene: InteractiveScene, selection: ElementSelection): InteractiveScene {
    if (selection.kind === 'asset') return { ...scene, assets: scene.assets.filter((asset) => asset.id !== selection.id) };
    if (selection.kind === 'hotspot') return { ...scene, hotspots: scene.hotspots.filter((hotspot) => hotspot.id !== selection.id) };

    return { ...scene, buttons: scene.buttons.filter((button) => button.id !== selection.id) };
}

export function duplicateElementInScene(
    scene: InteractiveScene,
    selection: ElementSelection,
): { scene: InteractiveScene; selection: ElementSelection } {
    const element = getElement(scene, selection);
    if (!element) return { scene, selection };

    const copy = {
        ...cloneElementData(element.data),
        id: makeId(selection.kind === 'asset' ? 'asset' : selection.kind),
        label: `${element.label} Copy`,
        position: clampPosition({
            ...element.position,
            x: element.position.x + 4,
            y: element.position.y + 4,
        }),
        layer_order: maxLayer(scene) + 10,
        locked: false,
        hidden: false,
    };

    if (selection.kind === 'asset') {
        return {
            scene: { ...scene, assets: [...scene.assets, copy as InteractiveCanvasAsset] },
            selection: { kind: 'asset', id: copy.id },
        };
    }

    if (selection.kind === 'hotspot') {
        return {
            scene: { ...scene, hotspots: [...scene.hotspots, copy as InteractiveHotspot] },
            selection: { kind: 'hotspot', id: copy.id },
        };
    }

    return {
        scene: { ...scene, buttons: [...scene.buttons, copy as InteractiveButtonElement] },
        selection: { kind: 'button', id: copy.id },
    };
}

function cloneElementData<T>(value: T): T {
    return typeof structuredClone === 'function' ? structuredClone(value) : (JSON.parse(JSON.stringify(value)) as T);
}

export function addElementToScene(
    scene: InteractiveScene,
    kind: ElementKind,
    element: InteractiveCanvasAsset | InteractiveHotspot | InteractiveButtonElement,
    position?: Partial<InteractivePosition>,
): InteractiveScene {
    const placed = {
        ...element,
        position: clampPosition({ ...element.position, ...position }),
        layer_order: maxLayer(scene) + 10,
    };

    if (kind === 'asset') return { ...scene, assets: [...scene.assets, placed as InteractiveCanvasAsset] };
    if (kind === 'hotspot') return { ...scene, hotspots: [...scene.hotspots, placed as InteractiveHotspot] };

    return { ...scene, buttons: [...scene.buttons, placed as InteractiveButtonElement] };
}

export function reorderSceneLayers(scene: InteractiveScene, orderedKeys: string[]): InteractiveScene {
    const orderMap = new Map(orderedKeys.map((key, index) => [key, index * 10 + 10]));
    const patch = (kind: ElementKind, element: InteractiveCanvasAsset | InteractiveHotspot | InteractiveButtonElement) => ({
        ...element,
        layer_order: orderMap.get(`${kind}:${element.id}`) ?? element.layer_order,
    });

    return {
        ...scene,
        assets: scene.assets.map((asset) => patch('asset', asset) as InteractiveCanvasAsset),
        hotspots: scene.hotspots.map((hotspot) => patch('hotspot', hotspot) as InteractiveHotspot),
        buttons: scene.buttons.map((button) => patch('button', button) as InteractiveButtonElement),
    };
}

export function clampPosition(position: Partial<InteractivePosition>): InteractivePosition {
    const width = clamp(Number(position.width ?? 10), 2, 100);
    const height = clamp(Number(position.height ?? 10), 2, 100);

    return {
        x: clamp(Number(position.x ?? 45), 0, 100 - width),
        y: clamp(Number(position.y ?? 45), 0, 100 - height),
        width,
        height,
    };
}

export function clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;

    return Math.round(Math.min(max, Math.max(min, value)) * 100) / 100;
}

export function maxLayer(scene: InteractiveScene): number {
    return Math.max(0, ...allSceneElements(scene).map((element) => element.layer_order));
}

export function csrfToken(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

export function mediaFromUpload(
    payload: { id: number; type: InteractiveMedia['type']; url: string; originalName?: string | null; mimeType?: string | null; size?: number },
    fallbackName: string,
): InteractiveMedia {
    return {
        type: payload.type,
        media_upload_id: payload.id,
        url: payload.url,
        original_name: payload.originalName ?? fallbackName,
        mime_type: payload.mimeType ?? undefined,
        size: payload.size,
        alt: payload.type === 'image' ? fallbackName.replace(/\.[^.]+$/, '') : '',
    };
}
