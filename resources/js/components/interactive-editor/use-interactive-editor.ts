import type { InteractiveMetadata } from '@/components/interactive-learning';
import { type Dispatch, useCallback, useEffect, useReducer } from 'react';
import type { EditorPanel, ElementSelection, InteractiveEditorBlock, InteractiveEditorState } from './types';
import { cloneMetadata, normalizeEditorMetadata } from './utils';

export type EditorAction =
    | { type: 'commit-metadata'; metadata: InteractiveMetadata; select?: ElementSelection | null; history?: boolean }
    | { type: 'select-element'; selection: ElementSelection | null }
    | { type: 'set-active-scene'; sceneId: string }
    | { type: 'set-left-panel'; panel: EditorPanel }
    | { type: 'set-zoom'; zoom: number }
    | { type: 'set-status'; status: InteractiveEditorBlock['status'] }
    | { type: 'undo' }
    | { type: 'redo' }
    | { type: 'save-started' }
    | { type: 'save-succeeded'; metadata: InteractiveMetadata; status: InteractiveEditorBlock['status']; updatedAt: string | null }
    | { type: 'save-failed'; message: string }
    | {
          type: 'save-conflict';
          message: string;
          metadata: InteractiveMetadata;
          status: InteractiveEditorBlock['status'];
          updatedAt: string | null;
      }
    | { type: 'accept-server-conflict' };

const HISTORY_LIMIT = 80;

export function useInteractiveEditor(block: InteractiveEditorBlock) {
    const [state, dispatch] = useReducer(editorReducer, block, createInitialState);

    const commitMetadata = useCallback((metadata: InteractiveMetadata, options: { select?: ElementSelection | null; history?: boolean } = {}) => {
        dispatch({
            type: 'commit-metadata',
            metadata,
            select: options.select,
            history: options.history ?? true,
        });
    }, []);

    const setActiveScene = useCallback((sceneId: string) => dispatch({ type: 'set-active-scene', sceneId }), []);
    const selectElement = useCallback((selection: ElementSelection | null) => dispatch({ type: 'select-element', selection }), []);
    const setLeftPanel = useCallback((panel: EditorPanel) => dispatch({ type: 'set-left-panel', panel }), []);
    const setZoom = useCallback((zoom: number) => dispatch({ type: 'set-zoom', zoom }), []);
    const setStatus = useCallback((status: InteractiveEditorBlock['status']) => dispatch({ type: 'set-status', status }), []);
    const undo = useCallback(() => dispatch({ type: 'undo' }), []);
    const redo = useCallback(() => dispatch({ type: 'redo' }), []);

    useEffect(() => {
        if (!state.dirty) return;

        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', onBeforeUnload);

        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [state.dirty]);

    return {
        state,
        dispatch,
        commitMetadata,
        setActiveScene,
        selectElement,
        setLeftPanel,
        setZoom,
        setStatus,
        undo,
        redo,
        canUndo: state.history.past.length > 0,
        canRedo: state.history.future.length > 0,
    };
}

function createInitialState(block: InteractiveEditorBlock): InteractiveEditorState {
    const metadata = normalizeEditorMetadata(block.metadata);

    return {
        metadata,
        activeSceneId: metadata.scenes[0]?.id ?? '',
        selectedElement: null,
        selectedElementIds: [],
        zoom: 1,
        leftPanel: 'scene',
        blockStatus: block.status,
        saveStatus: 'saved',
        dirty: false,
        serverUpdatedAt: block.updatedAt,
        lastSavedAt: block.updatedAt,
        saveError: null,
        conflict: null,
        history: {
            past: [],
            future: [],
            limit: HISTORY_LIMIT,
        },
    };
}

function editorReducer(state: InteractiveEditorState, action: EditorAction): InteractiveEditorState {
    if (action.type === 'commit-metadata') {
        const nextMetadata = normalizeEditorMetadata(action.metadata);
        const shouldPushHistory = action.history ?? true;

        return {
            ...state,
            metadata: nextMetadata,
            activeSceneId: nextMetadata.scenes.some((scene) => scene.id === state.activeSceneId)
                ? state.activeSceneId
                : (nextMetadata.scenes[0]?.id ?? ''),
            selectedElement: action.select === undefined ? state.selectedElement : action.select,
            selectedElementIds: action.select ? [selectionKey(action.select)] : state.selectedElementIds,
            dirty: true,
            saveStatus: 'dirty',
            saveError: null,
            conflict: null,
            history: shouldPushHistory
                ? {
                      ...state.history,
                      past: [...state.history.past.slice(-state.history.limit + 1), cloneMetadata(state.metadata)],
                      future: [],
                  }
                : state.history,
        };
    }

    if (action.type === 'select-element') {
        return {
            ...state,
            selectedElement: action.selection,
            selectedElementIds: action.selection ? [selectionKey(action.selection)] : [],
        };
    }

    if (action.type === 'set-active-scene') {
        return {
            ...state,
            activeSceneId: action.sceneId,
            selectedElement: null,
            selectedElementIds: [],
        };
    }

    if (action.type === 'set-left-panel') {
        return { ...state, leftPanel: action.panel };
    }

    if (action.type === 'set-zoom') {
        return { ...state, zoom: Math.min(1.8, Math.max(0.35, action.zoom)) };
    }

    if (action.type === 'set-status') {
        return {
            ...state,
            blockStatus: action.status,
            dirty: true,
            saveStatus: 'dirty',
        };
    }

    if (action.type === 'undo') {
        const previous = state.history.past.at(-1);
        if (!previous) return state;

        return {
            ...state,
            metadata: previous,
            selectedElement: null,
            selectedElementIds: [],
            dirty: true,
            saveStatus: 'dirty',
            history: {
                ...state.history,
                past: state.history.past.slice(0, -1),
                future: [cloneMetadata(state.metadata), ...state.history.future],
            },
        };
    }

    if (action.type === 'redo') {
        const next = state.history.future[0];
        if (!next) return state;

        return {
            ...state,
            metadata: next,
            selectedElement: null,
            selectedElementIds: [],
            dirty: true,
            saveStatus: 'dirty',
            history: {
                ...state.history,
                past: [...state.history.past.slice(-state.history.limit + 1), cloneMetadata(state.metadata)],
                future: state.history.future.slice(1),
            },
        };
    }

    if (action.type === 'save-started') {
        return { ...state, saveStatus: 'saving', saveError: null };
    }

    if (action.type === 'save-succeeded') {
        const metadata = normalizeEditorMetadata(action.metadata);

        return {
            ...state,
            metadata,
            blockStatus: action.status,
            dirty: false,
            saveStatus: 'saved',
            saveError: null,
            serverUpdatedAt: action.updatedAt,
            lastSavedAt: action.updatedAt ?? new Date().toISOString(),
            conflict: null,
        };
    }

    if (action.type === 'save-failed') {
        return { ...state, saveStatus: 'failed', saveError: action.message };
    }

    if (action.type === 'save-conflict') {
        return {
            ...state,
            saveStatus: 'conflict',
            saveError: action.message,
            conflict: {
                message: action.message,
                metadata: normalizeEditorMetadata(action.metadata),
                status: action.status,
                updatedAt: action.updatedAt,
            },
        };
    }

    if (action.type === 'accept-server-conflict') {
        if (!state.conflict) return state;

        return {
            ...state,
            metadata: state.conflict.metadata,
            blockStatus: state.conflict.status,
            serverUpdatedAt: state.conflict.updatedAt,
            lastSavedAt: state.conflict.updatedAt,
            saveStatus: 'saved',
            dirty: false,
            saveError: null,
            conflict: null,
            selectedElement: null,
            selectedElementIds: [],
            history: {
                ...state.history,
                past: [],
                future: [],
            },
        };
    }

    return state;
}

function selectionKey(selection: ElementSelection): string {
    return `${selection.kind}:${selection.id}`;
}

export function acceptServerConflict(dispatch: Dispatch<EditorAction>) {
    dispatch({ type: 'accept-server-conflict' });
}
