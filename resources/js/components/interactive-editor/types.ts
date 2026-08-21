import type {
    InteractiveButtonElement,
    InteractiveCanvasAsset,
    InteractiveHotspot,
    InteractiveMedia,
    InteractiveMetadata,
    InteractivePosition,
    InteractiveScene,
} from '@/components/interactive-learning';

export type EditorPanel = 'scene' | 'text' | 'image' | 'video' | 'audio' | 'button' | 'hotspot' | 'shape' | 'icon' | 'upload' | 'layers';
export type ElementKind = 'asset' | 'hotspot' | 'button';
export type ElementType = InteractiveCanvasAsset['type'] | 'hotspot' | 'button';
export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'failed' | 'conflict';

export interface ElementPreset {
    label?: string;
    content?: string;
    style?: Partial<InteractiveCanvasAsset['style']>;
}

export interface ElementSelection {
    kind: ElementKind;
    id: string;
}

export interface EditorElement {
    key: string;
    id: string;
    kind: ElementKind;
    type: ElementType;
    label: string;
    position: InteractivePosition;
    rotation: number;
    opacity: number;
    layer_order: number;
    locked: boolean;
    hidden: boolean;
    required?: boolean;
    data: InteractiveCanvasAsset | InteractiveHotspot | InteractiveButtonElement;
}

export interface InteractiveEditorBlock {
    id: number;
    type: string;
    content?: string | null;
    metadata: Record<string, unknown>;
    status: 'draft' | 'reviewed' | 'published';
    order_no: number;
    updatedAt: string | null;
}

export interface InteractiveEditorLesson {
    id: number;
    title: string;
    order_no: number;
    chapter: {
        id: number;
        title: string;
    };
}

export interface InteractiveEditorCourse {
    id: number;
    title: string;
    learningFormat?: string;
}

export interface InteractiveEditorState {
    metadata: InteractiveMetadata;
    activeSceneId: string;
    selectedElement: ElementSelection | null;
    selectedElementIds: string[];
    zoom: number;
    leftPanel: EditorPanel;
    blockStatus: InteractiveEditorBlock['status'];
    saveStatus: SaveStatus;
    dirty: boolean;
    serverUpdatedAt: string | null;
    lastSavedAt: string | null;
    saveError: string | null;
    conflict: {
        message: string;
        metadata: InteractiveMetadata;
        status: InteractiveEditorBlock['status'];
        updatedAt: string | null;
    } | null;
    history: {
        past: InteractiveMetadata[];
        future: InteractiveMetadata[];
        limit: number;
    };
}

export interface UploadResult extends InteractiveMedia {
    url: string;
}

export type MetadataUpdater = (metadata: InteractiveMetadata) => InteractiveMetadata;
export type SceneUpdater = (scene: InteractiveScene) => InteractiveScene;
