import { LucideIconRenderer, shapeStyle } from '@/components/interactive-asset-library';
import type {
    InteractiveButtonElement,
    InteractiveCanvasAsset,
    InteractiveHotspot,
    InteractivePosition,
    InteractiveScene,
} from '@/components/interactive-learning';
import { cn } from '@/lib/utils';
import { useDroppable } from '@dnd-kit/core';
import { CheckCircle2, EyeOff, Lock, MousePointerClick } from 'lucide-react';
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import Moveable from 'react-moveable';
import type { ElementSelection } from './types';
import { CANVAS_DROPPABLE_ID, allSceneElements, clamp, clampPosition, getElement, updateElementInScene } from './utils';

const BASE_CANVAS_WIDTH = 1120;

export function EditorCanvas({
    scene,
    selectedElement,
    zoom,
    onSelectElement,
    onSceneChange,
    onDeleteSelected,
    onDuplicateSelected,
}: {
    scene: InteractiveScene;
    selectedElement: ElementSelection | null;
    zoom: number;
    onSelectElement: (selection: ElementSelection | null) => void;
    onSceneChange: (scene: InteractiveScene, options?: { history?: boolean }) => void;
    onDeleteSelected: () => void;
    onDuplicateSelected: () => void;
}) {
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const interactionRef = useRef<'drag' | 'resize' | 'rotate' | null>(null);
    const pendingRotationRef = useRef<number | null>(null);
    const [moveableTarget, setMoveableTarget] = useState<HTMLElement | null>(null);
    const [canvasRect, setCanvasRect] = useState({ width: 0, height: 0 });
    const { setNodeRef, isOver } = useDroppable({ id: CANVAS_DROPPABLE_ID });
    const selected = getElement(scene, selectedElement);
    const elements = useMemo(() => allSceneElements(scene), [scene]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const observer = new ResizeObserver(([entry]) => {
            setCanvasRect({
                width: entry.contentRect.width,
                height: entry.contentRect.height,
            });
        });

        observer.observe(canvas);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!selectedElement || !canvasRef.current) {
            setMoveableTarget(null);

            return;
        }

        setMoveableTarget(canvasRef.current.querySelector<HTMLElement>(`[data-element-key="${selectedElement.kind}:${selectedElement.id}"]`));
    }, [selectedElement, scene]);

    const readTargetLayout = () => {
        if (!selectedElement || !moveableTarget || !canvasRef.current) return;

        const canvasWidth = canvasRef.current.clientWidth || canvasRect.width;
        const canvasHeight = canvasRef.current.clientHeight || canvasRect.height;
        if (!canvasWidth || !canvasHeight) return;

        return {
            canvasWidth,
            canvasHeight,
            left: readPixelValue(moveableTarget.style.left, moveableTarget.offsetLeft),
            top: readPixelValue(moveableTarget.style.top, moveableTarget.offsetTop),
            width: readPixelValue(moveableTarget.style.width, moveableTarget.offsetWidth),
            height: readPixelValue(moveableTarget.style.height, moveableTarget.offsetHeight),
        };
    };

    const resetTargetInlineBox = () => {
        if (!moveableTarget) return;

        moveableTarget.style.left = '';
        moveableTarget.style.top = '';
        moveableTarget.style.width = '';
        moveableTarget.style.height = '';
    };

    const commitDragTransform = () => {
        if (interactionRef.current === 'rotate') return;
        if (!selectedElement || !moveableTarget || !selected) return;
        const layout = readTargetLayout();
        if (!layout) return;

        const nextPosition = clampPosition({
            ...selected.position,
            x: (layout.left / layout.canvasWidth) * 100,
            y: (layout.top / layout.canvasHeight) * 100,
        });

        onSceneChange(updateElementInScene(scene, selectedElement, { position: nextPosition }), { history: true });
        resetTargetInlineBox();
        interactionRef.current = null;
    };

    const commitResizeTransform = () => {
        if (interactionRef.current === 'rotate') return;
        if (!selectedElement || !moveableTarget) return;
        const layout = readTargetLayout();
        if (!layout) return;

        const nextPosition = clampPosition({
            x: (layout.left / layout.canvasWidth) * 100,
            y: (layout.top / layout.canvasHeight) * 100,
            width: (layout.width / layout.canvasWidth) * 100,
            height: (layout.height / layout.canvasHeight) * 100,
        });

        onSceneChange(updateElementInScene(scene, selectedElement, { position: nextPosition }), { history: true });
        resetTargetInlineBox();
        interactionRef.current = null;
    };

    const commitRotateTransform = () => {
        if (!selectedElement || !moveableTarget || !selected) return;
        const rotation = pendingRotationRef.current ?? parseRotation(moveableTarget.style.transform, selected.rotation ?? 0);

        onSceneChange(updateElementInScene(scene, selectedElement, { rotation }), { history: true });
        moveableTarget.style.transform = '';
        pendingRotationRef.current = null;
        window.setTimeout(() => {
            if (interactionRef.current === 'rotate') {
                interactionRef.current = null;
            }
        }, 0);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement;
        const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
        if (isTyping) return;

        if (event.key === 'Escape') {
            onSelectElement(null);
        }

        if ((event.key === 'Delete' || event.key === 'Backspace') && selectedElement) {
            event.preventDefault();
            onDeleteSelected();
        }

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd' && selectedElement) {
            event.preventDefault();
            onDuplicateSelected();
        }
    };

    const canvasWidth = BASE_CANVAS_WIDTH * zoom;

    return (
        <div className="relative flex min-w-0 flex-1 items-center justify-center overflow-auto bg-[radial-gradient(circle_at_1px_1px,#dbeafe_1px,transparent_0)] bg-[length:24px_24px] p-8">
            <div
                ref={(node) => {
                    canvasRef.current = node;
                    setNodeRef(node);
                }}
                role="application"
                tabIndex={0}
                aria-label={`Canvas ${scene.title}`}
                onKeyDown={handleKeyDown}
                onMouseDown={(event) => {
                    if (event.target === event.currentTarget) {
                        onSelectElement(null);
                    }
                }}
                className={cn(
                    'relative overflow-hidden rounded-[28px] border bg-white shadow-2xl shadow-slate-200/70 transition outline-none',
                    isOver ? 'border-blue-500 ring-4 ring-blue-100' : 'border-slate-200',
                )}
                style={{
                    width: `${canvasWidth}px`,
                    aspectRatio: `${sceneCanvasWidth()} / ${sceneCanvasHeight()}`,
                    backgroundColor: '#f8fafc',
                }}
            >
                <SceneBackground scene={scene} />

                {elements
                    .filter((element) => !element.hidden)
                    .map((element) => (
                        <CanvasElementNode
                            key={element.key}
                            scene={scene}
                            selection={{ kind: element.kind, id: element.id }}
                            selected={selectedElement?.kind === element.kind && selectedElement.id === element.id}
                            onSelect={onSelectElement}
                        />
                    ))}

                {elements.filter((element) => element.hidden).length > 0 && (
                    <div className="absolute right-4 bottom-4 flex items-center gap-2 rounded-full bg-slate-950/70 px-3 py-1.5 text-xs font-bold text-white">
                        <EyeOff className="size-3.5" />
                        {elements.filter((element) => element.hidden).length} hidden
                    </div>
                )}

                {moveableTarget && selected && !selected.locked && (
                    <Moveable
                        target={moveableTarget}
                        container={canvasRef.current}
                        useResizeObserver
                        useMutationObserver
                        draggable
                        resizable
                        rotatable
                        snappable
                        origin={false}
                        throttleDrag={0}
                        throttleResize={0}
                        throttleRotate={0}
                        snapThreshold={8}
                        bounds={{ left: 0, top: 0, right: canvasRect.width, bottom: canvasRect.height }}
                        verticalGuidelines={[canvasRect.width / 2]}
                        horizontalGuidelines={[canvasRect.height / 2]}
                        onDragStart={() => {
                            if (interactionRef.current !== 'rotate') {
                                interactionRef.current = 'drag';
                            }
                        }}
                        onDrag={(event) => {
                            if (interactionRef.current === 'rotate') return;
                            event.target.style.left = `${event.left}px`;
                            event.target.style.top = `${event.top}px`;
                        }}
                        onDragEnd={commitDragTransform}
                        onResizeStart={() => {
                            if (interactionRef.current !== 'rotate') {
                                interactionRef.current = 'resize';
                            }
                        }}
                        onResize={(event) => {
                            if (interactionRef.current === 'rotate') return;
                            event.target.style.width = `${event.width}px`;
                            event.target.style.height = `${event.height}px`;
                            if (event.drag) {
                                event.target.style.left = `${event.drag.left}px`;
                                event.target.style.top = `${event.drag.top}px`;
                            }
                        }}
                        onResizeEnd={commitResizeTransform}
                        onRotateStart={(event) => {
                            interactionRef.current = 'rotate';
                            pendingRotationRef.current = selected.rotation ?? 0;
                            event.set(selected.rotation ?? 0);
                        }}
                        onRotate={(event) => {
                            pendingRotationRef.current = event.rotation;
                            event.target.style.transform = `rotate(${event.rotation}deg)`;
                        }}
                        onRotateEnd={commitRotateTransform}
                    />
                )}
            </div>
        </div>
    );
}

function CanvasElementNode({
    scene,
    selection,
    selected,
    onSelect,
}: {
    scene: InteractiveScene;
    selection: ElementSelection;
    selected: boolean;
    onSelect: (selection: ElementSelection) => void;
}) {
    const element = getElement(scene, selection);
    if (!element) return null;

    const locked = element.locked;

    return (
        <div
            data-element-key={`${selection.kind}:${selection.id}`}
            role="button"
            tabIndex={0}
            aria-label={element.label}
            onMouseDown={(event) => {
                event.stopPropagation();
                onSelect(selection);
            }}
            onFocus={() => onSelect(selection)}
            className={cn(
                'group absolute overflow-hidden transition outline-none',
                locked ? 'cursor-not-allowed' : 'cursor-move',
                selected && 'ring-2 ring-blue-600 ring-offset-2',
            )}
            style={elementStyle(element.position, element.rotation, element.opacity, element.layer_order)}
        >
            {selection.kind === 'asset' && <AssetRenderer asset={element.data as InteractiveCanvasAsset} />}
            {selection.kind === 'hotspot' && <HotspotRenderer hotspot={element.data as InteractiveHotspot} selected={selected} />}
            {selection.kind === 'button' && <ButtonRenderer button={element.data as InteractiveButtonElement} selected={selected} />}
            {locked && (
                <span className="absolute top-1 right-1 rounded-full bg-slate-950/70 p-1 text-white">
                    <Lock className="size-3" />
                </span>
            )}
        </div>
    );
}

function SceneBackground({ scene }: { scene: InteractiveScene }) {
    if (scene.background?.type === 'image' && scene.background.url) {
        return <img src={scene.background.url} alt={scene.background.alt || scene.title} className="absolute inset-0 size-full object-cover" />;
    }

    if (scene.background?.type === 'video' && scene.background.url) {
        return <video src={scene.background.url} muted loop controls className="absolute inset-0 size-full bg-black object-cover" />;
    }

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white via-blue-50 to-slate-100">
            <div className="max-w-md text-center text-slate-400">
                <MousePointerClick className="mx-auto size-12 text-blue-300" />
                <p className="mt-3 text-sm font-bold">Drop elemen dari panel kiri atau klik palette untuk mulai menyusun scene.</p>
            </div>
        </div>
    );
}

function AssetRenderer({ asset }: { asset: InteractiveCanvasAsset }) {
    const style = {
        color: asset.style.color,
        backgroundColor: ['image', 'video', 'audio'].includes(asset.type) ? 'transparent' : asset.style.backgroundColor,
        borderColor: asset.style.borderColor,
        borderWidth: `${asset.style.borderWidth}px`,
        borderStyle: asset.style.borderWidth > 0 ? 'solid' : 'none',
        borderRadius: `${asset.style.borderRadius}px`,
        fontSize: `${asset.style.fontSize}px`,
        fontWeight: asset.style.fontWeight,
        textAlign: asset.style.textAlign,
        lineHeight: asset.style.lineHeight,
    } as const;

    if (asset.type === 'image') {
        return asset.media?.url ? (
            <img src={asset.media.url} alt={asset.media.alt || asset.label} className="size-full" style={{ objectFit: asset.style.objectFit }} />
        ) : (
            <Placeholder label="Upload gambar dari panel kanan" />
        );
    }

    if (asset.type === 'video') {
        return asset.media?.url ? (
            <video src={asset.media.url} controls preload="metadata" className="size-full bg-black" style={{ objectFit: asset.style.objectFit }} />
        ) : (
            <Placeholder label="Upload video dari panel kanan" />
        );
    }

    if (asset.type === 'audio') {
        return (
            <div className="flex size-full items-center justify-center rounded-2xl bg-white p-3 shadow-sm" style={style}>
                {asset.media?.url ? (
                    <audio src={asset.media.url} controls className="w-full" />
                ) : (
                    <span className="text-xs">Upload audio dari panel kanan</span>
                )}
            </div>
        );
    }

    if (asset.type === 'icon') {
        return (
            <div
                className="flex size-full items-center justify-center"
                style={{ ...style, ...shapeStyle(asset.style.shape, asset.style.borderRadius) }}
            >
                <LucideIconRenderer name={asset.style.icon} className="size-1/2" />
            </div>
        );
    }

    if (asset.type === 'text') {
        return (
            <div className="flex size-full items-center justify-center px-4" style={style}>
                {asset.content}
            </div>
        );
    }

    return <div className="size-full" style={{ ...style, ...shapeStyle(asset.style.shape, asset.style.borderRadius) }} />;
}

function HotspotRenderer({ hotspot, selected }: { hotspot: InteractiveHotspot; selected: boolean }) {
    return (
        <div
            className={cn(
                'flex size-full items-center justify-center rounded-full border-2 text-xs font-black shadow-lg',
                selected
                    ? 'border-blue-700 bg-blue-600 text-white'
                    : hotspot.required
                      ? 'border-amber-500 bg-amber-400 text-slate-950'
                      : 'border-blue-500 bg-white text-blue-700',
            )}
        >
            <MousePointerClick className="size-1/2" />
        </div>
    );
}

function ButtonRenderer({ button, selected }: { button: InteractiveButtonElement; selected: boolean }) {
    return (
        <div
            className={cn(
                'flex size-full items-center justify-center rounded-xl border px-3 text-center text-sm font-extrabold shadow-lg',
                selected
                    ? 'border-blue-700 bg-blue-600 text-white'
                    : button.required
                      ? 'border-amber-500 bg-amber-400 text-slate-950'
                      : 'border-blue-500 bg-white text-blue-700',
            )}
        >
            {button.required && <CheckCircle2 className="mr-1 size-4 shrink-0" />}
            <span className="line-clamp-2">{button.label}</span>
        </div>
    );
}

function Placeholder({ label }: { label: string }) {
    return (
        <div className="flex size-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4 text-center text-xs font-bold text-slate-500">
            {label}
        </div>
    );
}

function elementStyle(position: InteractivePosition, rotation: number, opacity: number, layerOrder: number) {
    return {
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: `${position.width}%`,
        height: `${position.height}%`,
        transform: `rotate(${rotation}deg)`,
        opacity: clamp(opacity, 0.1, 1),
        zIndex: layerOrder,
    };
}

function parseRotation(transform: string, fallback: number) {
    const match = transform.match(/rotate\((-?\d+(?:\.\d+)?)deg\)/);

    return match ? Number(match[1]) : fallback;
}

function readPixelValue(value: string, fallback: number) {
    const parsed = Number.parseFloat(value);

    return Number.isFinite(parsed) ? parsed : fallback;
}

function sceneCanvasWidth() {
    return 16;
}

function sceneCanvasHeight() {
    return 9;
}
