import type { InteractiveMetadata } from '@/components/interactive-learning';
import { type Dispatch, useCallback, useEffect, useRef } from 'react';
import type { InteractiveEditorBlock, InteractiveEditorState } from './types';
import type { EditorAction } from './use-interactive-editor';
import { csrfToken } from './utils';

interface SaveResponse {
    message?: string;
    metadata?: Record<string, unknown>;
    status?: InteractiveEditorBlock['status'];
    content?: string;
    updatedAt?: string | null;
    errors?: Record<string, string[]>;
}

export function useInteractiveAutosave(state: InteractiveEditorState, dispatch: Dispatch<EditorAction>, autosaveUrl: string) {
    const saveInFlightRef = useRef(false);

    const saveNow = useCallback(async () => {
        if (saveInFlightRef.current || !state.serverUpdatedAt) return;
        saveInFlightRef.current = true;
        dispatch({ type: 'save-started' });

        try {
            const response = await fetch(autosaveUrl, {
                method: 'PATCH',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify({
                    metadata: state.metadata,
                    status: state.blockStatus,
                    updated_at: state.serverUpdatedAt,
                }),
            });
            const payload = (await response.json()) as SaveResponse;

            if (response.status === 409) {
                dispatch({
                    type: 'save-conflict',
                    message: payload.message || 'Konten sudah berubah di server.',
                    metadata: (payload.metadata ?? state.metadata) as unknown as InteractiveMetadata,
                    status: payload.status ?? state.blockStatus,
                    updatedAt: payload.updatedAt ?? state.serverUpdatedAt,
                });

                return;
            }

            if (!response.ok) {
                throw new Error(validationMessage(payload) || payload.message || 'Autosave gagal.');
            }

            dispatch({
                type: 'save-succeeded',
                metadata: (payload.metadata ?? state.metadata) as unknown as InteractiveMetadata,
                status: payload.status ?? state.blockStatus,
                updatedAt: payload.updatedAt ?? new Date().toISOString(),
            });
        } catch (error) {
            dispatch({
                type: 'save-failed',
                message: error instanceof Error ? error.message : 'Autosave gagal.',
            });
        } finally {
            saveInFlightRef.current = false;
        }
    }, [autosaveUrl, dispatch, state.blockStatus, state.metadata, state.serverUpdatedAt]);

    useEffect(() => {
        if (!state.dirty || state.saveStatus === 'saving' || state.saveStatus === 'conflict') return;

        const timeout = window.setTimeout(() => {
            void saveNow();
        }, 1200);

        return () => window.clearTimeout(timeout);
    }, [saveNow, state.dirty, state.saveStatus]);

    return { saveNow };
}

function validationMessage(payload: SaveResponse): string | null {
    const first = Object.values(payload.errors ?? {})[0]?.[0];

    return first ?? null;
}
