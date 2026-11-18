'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  DATA_AS_OF,
  EXAMPLE,
  ITEMS,
  SOURCES,
  type Emphasis,
  type Item,
  type Point,
  type Transfer,
  analyze,
  byId,
  connections,
  displayName,
  emphasisFor,
  getTransfer,
  layoutPositions,
  nodeSize,
  positionNew,
  programKind,
  receivedFromThousand,
} from '@/lib/catalog';
import { Glyph, Icon } from '@/components/icons';

type CanvasState = {
  ids: string[];
  positions: Record<string, Point>;
  selected: string | null;
  tab: 'card' | 'program';
  example: boolean;
};

type Camera = { x: number; y: number; scale: number };

type Gesture = {
  type: 'node' | 'pan' | 'catalog';
  id?: string;
  sx: number;
  sy: number;
  moved: boolean;
  pointerId: number;
  original?: Point;
  cam: Camera;
};

type ModelContext = {
  registerTool: (tool: unknown, options: { signal: AbortSignal }) => Promise<unknown> | unknown;
};

const ARROW: Record<Emphasis, string> = {
  best: '#1c7a34',
  above: '#3e9a52',
  par: '#a18abf',
  below: '#c9c0d4',
};

const initialState: CanvasState = {
  ids: [...EXAMPLE],
  positions: layoutPositions(EXAMPLE),
  selected: null,
  tab: 'card',
  example: true,
};

function snapshot(value: CanvasState): CanvasState {
  return {
    ids: [...value.ids],
    positions: structuredClone(value.positions),
    selected: value.selected,
    tab: value.tab,
    example: value.example,
  };
}

function edgeGeometry(from: Point, to: Point, lane: number) {
  const sx = from.x + 226;
  const sy = from.y + 70;
  const tx = to.x - 7;
  const ty = to.y + 50;
  const bend = Math.max(65, Math.abs(tx - sx) * 0.48);
  const a = sx + bend;
  const b = tx - bend;
  const t = 0.3 + (lane % 5) * 0.1;
  const nt = 1 - t;
  const lx = nt ** 3 * sx + 3 * nt ** 2 * t * a + 3 * nt * t ** 2 * b + t ** 3 * tx;
  const ly = nt ** 3 * sy + 3 * nt ** 2 * t * sy + 3 * nt * t ** 2 * ty + t ** 3 * ty;
  return { d: `M${sx},${sy} C${a},${sy} ${b},${ty} ${tx},${ty}`, lx, ly };
}

function Mark({ item, program = false }: { item: Item; program?: boolean }) {
  return (
    <span className={`mini-mark${program ? ' program-mark' : ''}`} style={{ '--item-color': item.color } as React.CSSProperties}>
      {item.mark}
    </span>
  );
}

function sentUnit(cardId: string) {
  return byId(cardId)?.family === 'capital' ? 'miles' : 'pts';
}

function bestLinkTo(programId: string, links: Transfer[]) {
  return links.filter((link) => link.to === programId).sort((a, b) => b.yield - a.yield)[0];
}

export default function Explorer() {
  const [state, setState] = useState<CanvasState>(initialState);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1 });
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; canUndo: boolean } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const stateRef = useRef(state);
  const cameraRef = useRef(camera);
  const undoRef = useRef<CanvasState | null>(null);
  const pendingFit = useRef(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const announcerRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  stateRef.current = state;
  cameraRef.current = camera;

  const links = connections(state.ids);
  const analysis = analyze(state.ids);
  const cardCount = ITEMS.filter((item) => item.type === 'card').length;
  const programCount = ITEMS.length - cardCount;

  function fit() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ids, positions } = stateRef.current;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!ids.length) {
      setCamera({ x: 48, y: 36, scale: 1 });
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const id of ids) {
      const point = positions[id];
      if (!point) continue;
      const size = nodeSize(id);
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x + size.w);
      maxY = Math.max(maxY, point.y + size.h);
    }
    const padX = w < 520 ? 36 : 88;
    const padY = h < 640 ? 108 : 160;
    const scale = Math.max(0.18, Math.min(1, (w - padX) / (maxX - minX), (h - padY) / (maxY - minY)));
    setCamera({
      scale,
      x: (w - (maxX - minX) * scale) / 2 - minX * scale,
      y: (h - (maxY - minY) * scale) / 2 - minY * scale + 8,
    });
  }

  const fitRef = useRef(fit);
  fitRef.current = fit;

  useLayoutEffect(() => {
    if (!pendingFit.current) return;
    pendingFit.current = false;
    fitRef.current();
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let timer = 0;
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fitRef.current(), 120);
    });
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const strong = links.filter((link) => {
      const emphasis = emphasisFor(link, links);
      return emphasis === 'best' || emphasis === 'above';
    }).length;
    if (announcerRef.current) {
      announcerRef.current.textContent = `${state.ids.length} items on canvas. ${links.length} direct transfer paths. ${strong} higher-ratio connections.`;
    }
  }, [state.ids, state.selected, links]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (guideOpen && !dialog.open) dialog.showModal();
    if (!guideOpen && dialog.open) dialog.close();
  }, [guideOpen]);

  function add(id: string, point?: Point) {
    const item = byId(id);
    if (!item) return;
    const already = stateRef.current.ids.includes(id);
    if (already) {
      setState((prev) => ({ ...prev, selected: id }));
      return;
    }
    if (!point) pendingFit.current = true;
    setState((prev) => {
      undoRef.current = snapshot(prev);
      return {
        ...prev,
        ids: [...prev.ids, id],
        positions: { ...prev.positions, [id]: point ?? positionNew(id, prev.ids, prev.positions) },
        example: false,
      };
    });
    setToast({ message: `${displayName(item)} added`, canUndo: true });
  }

  function remove(id: string) {
    const item = byId(id);
    if (!item || !stateRef.current.ids.includes(id)) return;
    setState((prev) => {
      if (!prev.ids.includes(id)) return prev;
      undoRef.current = snapshot(prev);
      const positions = { ...prev.positions };
      delete positions[id];
      return {
        ...prev,
        ids: prev.ids.filter((entry) => entry !== id),
        positions,
        selected: prev.selected === id ? null : prev.selected,
        example: false,
      };
    });
    setToast({ message: `${displayName(item)} removed`, canUndo: true });
    canvasRef.current?.focus({ preventScroll: true });
  }

  function select(id: string | null) {
    setState((prev) => {
      if (id && !prev.ids.includes(id)) return prev;
      return { ...prev, selected: id };
    });
    if (id) {
      const item = byId(id);
      const count = connections(stateRef.current.ids).filter((link) => link.from === id || link.to === id).length;
      if (announcerRef.current && item) announcerRef.current.textContent = `${item.name} selected. ${count} connections on canvas.`;
    }
  }

  function resetExample() {
    pendingFit.current = true;
    setState((prev) => {
      undoRef.current = snapshot(prev);
      return { ids: [...EXAMPLE], positions: layoutPositions(EXAMPLE), selected: null, tab: prev.tab, example: true };
    });
    setToast({ message: 'Example canvas loaded', canUndo: true });
  }

  function clearCanvas() {
    if (!stateRef.current.ids.length) return;
    pendingFit.current = true;
    setState((prev) => {
      undoRef.current = snapshot(prev);
      return { ...prev, ids: [], positions: {}, selected: null, example: false };
    });
    setToast({ message: 'Canvas cleared', canUndo: true });
  }

  function undo() {
    const previous = undoRef.current;
    if (!previous) return;
    undoRef.current = null;
    pendingFit.current = true;
    setState(previous);
    setToast({ message: 'Change undone', canUndo: false });
  }

  function applyZoom(scale: number, anchor: { x: number; y: number } | null) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prev = cameraRef.current;
    const nextScale = Math.max(0.18, Math.min(1.8, scale));
    const selectedId = stateRef.current.selected;
    const selectedPoint = selectedId ? stateRef.current.positions[selectedId] : undefined;
    let next: Camera;
    // Button zoom recenters a selection. Scroll and pinch stay on the gesture point,
    // so a selected item does not jump to the middle of the canvas.
    if (!anchor && selectedId && selectedPoint) {
      const size = nodeSize(selectedId);
      const worldX = selectedPoint.x + size.w / 2;
      const worldY = selectedPoint.y + size.h / 2;
      next = {
        scale: nextScale,
        x: canvas.clientWidth / 2 - worldX * nextScale,
        y: canvas.clientHeight / 2 - worldY * nextScale,
      };
    } else {
      const originX = anchor?.x ?? canvas.clientWidth / 2;
      const originY = anchor?.y ?? canvas.clientHeight / 2;
      const worldX = (originX - prev.x) / prev.scale;
      const worldY = (originY - prev.y) / prev.scale;
      next = {
        scale: nextScale,
        x: originX - worldX * nextScale,
        y: originY - worldY * nextScale,
      };
    }
    cameraRef.current = next;
    setCamera(next);
  }

  const zoomRef = useRef(applyZoom);
  zoomRef.current = applyZoom;

  function zoom(factor: number) {
    applyZoom(cameraRef.current.scale * factor, null);
  }

  function openGuide() {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setGuideOpen(true);
  }

  function openPrograms() {
    setState((prev) => ({ ...prev, tab: 'program' }));
    setCatalogOpen(true);
    window.requestAnimationFrame(() => {
      document.getElementById('programs-tab')?.focus();
      if (window.innerWidth <= 740) document.querySelector('.catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const apiRef = useRef({ add, remove, select });
  apiRef.current = { add, remove, select };
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ startDistance: number; startScale: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let lastSafariGesture = 0;
    let gestureBase = 1;

    function anchorFromClient(clientX: number, clientY: number) {
      const rect = canvas!.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      if (event.ctrlKey && performance.now() - lastSafariGesture < 40) return;
      const rect = canvas!.getBoundingClientRect();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
      const delta = event.deltaY * unit;
      const factor = Math.exp(-delta * (event.ctrlKey ? 0.012 : 0.0016));
      zoomRef.current(cameraRef.current.scale * factor, anchorFromClient(event.clientX, event.clientY));
    }

    function onGestureStart(event: Event) {
      event.preventDefault();
      gestureBase = cameraRef.current.scale;
    }

    function onGestureChange(event: Event) {
      event.preventDefault();
      lastSafariGesture = performance.now();
      const gesture = event as Event & { scale: number; clientX: number; clientY: number };
      zoomRef.current(gestureBase * gesture.scale, anchorFromClient(gesture.clientX, gesture.clientY));
    }

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('gesturestart', onGestureStart, { passive: false });
    canvas.addEventListener('gesturechange', onGestureChange, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('gesturestart', onGestureStart);
      canvas.removeEventListener('gesturechange', onGestureChange);
    };
  }, []);

  useEffect(() => {
    function cleanupGesture() {
      ghostRef.current?.remove();
      ghostRef.current = null;
      document.querySelector('.drag-source')?.classList.remove('drag-source');
      canvasRef.current?.classList.remove('drop-active');
      gestureRef.current = null;
      setDraggingId(null);
    }

    function onMove(event: PointerEvent) {
      if (pointersRef.current.has(event.pointerId)) {
        pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }
      const pinch = pinchRef.current;
      if (pinch && pointersRef.current.size >= 2) {
        const points = [...pointersRef.current.values()];
        const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        const rect = canvasRef.current?.getBoundingClientRect();
        const midX = (points[0].x + points[1].x) / 2;
        const midY = (points[0].y + points[1].y) / 2;
        zoomRef.current(pinch.startScale * (distance / pinch.startDistance), rect ? { x: midX - rect.left, y: midY - rect.top } : null);
        return;
      }
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      const dx = event.clientX - gesture.sx;
      const dy = event.clientY - gesture.sy;
      if (!gesture.moved && Math.hypot(dx, dy) < 5) return;
      gesture.moved = true;
      if (gesture.type === 'node' && gesture.id && gesture.original) {
        const scale = cameraRef.current.scale;
        const id = gesture.id;
        const next = { x: gesture.original.x + dx / scale, y: gesture.original.y + dy / scale };
        setDraggingId(id);
        setState((prev) => ({ ...prev, positions: { ...prev.positions, [id]: next } }));
      } else if (gesture.type === 'pan') {
        const next = { x: gesture.cam.x + dx, y: gesture.cam.y + dy, scale: gesture.cam.scale };
        cameraRef.current = next;
        setCamera(next);
      } else if (gesture.type === 'catalog' && gesture.id) {
        if (!ghostRef.current) {
          const ghost = document.createElement('div');
          ghost.className = 'drag-ghost';
          ghost.textContent = byId(gesture.id)?.name ?? '';
          document.body.appendChild(ghost);
          ghostRef.current = ghost;
          document.querySelector(`[data-catalog-id="${gesture.id}"]`)?.classList.add('drag-source');
        }
        ghostRef.current.style.left = `${event.clientX + 14}px`;
        ghostRef.current.style.top = `${event.clientY - 15}px`;
        const rect = canvasRef.current?.getBoundingClientRect();
        const inside = Boolean(rect && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom);
        canvasRef.current?.classList.toggle('drop-active', inside);
      }
    }

    function onUp(event: PointerEvent) {
      pointersRef.current.delete(event.pointerId);
      if (pinchRef.current) {
        if (pointersRef.current.size < 2) pinchRef.current = null;
        if (gestureRef.current?.pointerId === event.pointerId) cleanupGesture();
        return;
      }
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      if (gesture.type === 'catalog' && gesture.moved && gesture.id) {
        const rect = canvasRef.current?.getBoundingClientRect();
        const cam = cameraRef.current;
        if (rect && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) {
          apiRef.current.add(gesture.id, {
            x: (event.clientX - rect.left - cam.x) / cam.scale - 110,
            y: (event.clientY - rect.top - cam.y) / cam.scale - 50,
          });
        } else {
          setToast({ message: 'Drop the item on the canvas to add it.', canUndo: false });
        }
      }
      if (gesture.type === 'node' && gesture.id && !gesture.moved) {
        apiRef.current.select(stateRef.current.selected === gesture.id ? null : gesture.id);
      }
      if (gesture.type === 'node' && gesture.moved) {
        setState((prev) => ({ ...prev, example: false }));
      }
      if (gesture.type === 'pan' && !gesture.moved) apiRef.current.select(null);
      cleanupGesture();
    }

    function onCancel(event: PointerEvent) {
      pointersRef.current.delete(event.pointerId);
      if (pointersRef.current.size < 2) pinchRef.current = null;
      const gesture = gestureRef.current;
      if (gesture?.type === 'node' && gesture.id && gesture.original) {
        const id = gesture.id;
        const original = gesture.original;
        setState((prev) => ({ ...prev, positions: { ...prev.positions, [id]: original } }));
      }
      cleanupGesture();
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      cleanupGesture();
    };
  }, []);

  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const catalog = ITEMS.map((item) => ({ id: item.id, name: item.name, type: item.type }));
    const read = () => {
      const current = stateRef.current;
      const result = analyze(current.ids);
      return {
        items: current.ids.map((id) => ({ id, name: byId(id)?.name, type: byId(id)?.type })),
        connections: result.links.map((link) => ({
          from: link.from,
          to: link.to,
          ratio: link.ratio,
          emphasis: emphasisFor(link, result.links),
        })),
        sharedPrograms: result.shared,
      };
    };
    const tools = [
      {
        name: 'get_rewards_canvas',
        title: 'Read rewards canvas',
        description: 'Read the current canvas, direct transfer connections, shared programs and available catalog.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute() {
          return { ...read(), catalog };
        },
      },
      {
        name: 'update_rewards_canvas',
        title: 'Add or remove rewards items',
        description: 'Add and remove credit cards and loyalty programs on the visible canvas, then recompute direct transfers. This does not connect accounts or transfer points.',
        inputSchema: {
          type: 'object',
          properties: {
            add: { type: 'array', items: { type: 'string', enum: ITEMS.map((item) => item.id) }, uniqueItems: true },
            remove: { type: 'array', items: { type: 'string', enum: ITEMS.map((item) => item.id) }, uniqueItems: true },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input: { add?: string[]; remove?: string[] }) {
          if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some((key) => !['add', 'remove'].includes(key))) {
            throw new Error('Expected add and/or remove arrays.');
          }
          for (const key of ['add', 'remove'] as const) {
            if (input[key] !== undefined && (!Array.isArray(input[key]) || input[key].some((id) => typeof id !== 'string' || !byId(id)))) {
              throw new Error('Every item must be a known catalog ID.');
            }
          }
          const additions = input.add ?? [];
          const removals = input.remove ?? [];
          if (additions.some((id) => removals.includes(id))) throw new Error('An item cannot be added and removed in the same action.');
          const prev = stateRef.current;
          const positions = { ...prev.positions };
          const ids = prev.ids.filter((id) => !removals.includes(id));
          removals.forEach((id) => delete positions[id]);
          additions.forEach((id) => {
            if (!ids.includes(id)) {
              positions[id] = positionNew(id, ids, positions);
              ids.push(id);
            }
          });
          const next: CanvasState = {
            ...prev,
            ids,
            positions,
            selected: prev.selected && ids.includes(prev.selected) ? prev.selected : null,
            example: false,
          };
          undoRef.current = snapshot(prev);
          stateRef.current = next;
          pendingFit.current = true;
          setState(next);
          return read();
        },
      },
    ];
    for (const tool of tools) {
      try {
        void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {});
      } catch {
        /* Browsers without WebMCP ignore registration. */
      }
    }
    const onHide = () => lifecycle.abort();
    window.addEventListener('pagehide', onHide, { once: true });
    return () => {
      lifecycle.abort();
      window.removeEventListener('pagehide', onHide);
    };
  }, []);

  function onAction(event: React.MouseEvent) {
    const target = event.target as HTMLElement;
    const addButton = target.closest<HTMLElement>('[data-add]');
    if (addButton?.dataset.add) {
      add(addButton.dataset.add);
      return;
    }
    const removeButton = target.closest<HTMLElement>('[data-remove]');
    if (removeButton?.dataset.remove) {
      remove(removeButton.dataset.remove);
      return;
    }
    const selectButton = target.closest<HTMLElement>('[data-select]');
    if (selectButton?.dataset.select) {
      select(selectButton.dataset.select);
      return;
    }
    const tab = target.closest<HTMLElement>('[data-tab]');
    if (tab?.dataset.tab === 'card' || tab?.dataset.tab === 'program') {
      setState((prev) => ({ ...prev, tab: tab.dataset.tab as 'card' | 'program' }));
      return;
    }
    if (target.closest('#detail-back')) select(null);
    if (target.closest('#more-programs')) openPrograms();
  }

  function onTabsKeyDown(event: React.KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'card' : event.key === 'End' ? 'program' : state.tab === 'card' ? 'program' : 'card';
    setState((prev) => ({ ...prev, tab: next }));
    document.getElementById(next === 'card' ? 'cards-tab' : 'programs-tab')?.focus();
  }

  function beginPinch() {
    const gesture = gestureRef.current;
    if (gesture?.type === 'node' && gesture.id && gesture.original) {
      const id = gesture.id;
      const original = gesture.original;
      setState((prev) => ({ ...prev, positions: { ...prev.positions, [id]: original } }));
    }
    gestureRef.current = null;
    setDraggingId(null);
    const points = [...pointersRef.current.values()];
    const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    pinchRef.current = { startDistance: Math.max(distance, 1), startScale: cameraRef.current.scale };
  }

  function onCanvasPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    const joiningPinch = pointersRef.current.size > 0;
    if (!joiningPinch && (target.closest('button') || target.closest('.empty-canvas'))) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size >= 2) {
      beginPinch();
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    const node = target.closest<HTMLElement>('[data-node-id]');
    gestureRef.current = {
      type: node ? 'node' : 'pan',
      id: node?.dataset.nodeId,
      sx: event.clientX,
      sy: event.clientY,
      moved: false,
      pointerId: event.pointerId,
      original: node?.dataset.nodeId ? { ...state.positions[node.dataset.nodeId] } : undefined,
      cam: { ...camera },
    };
    if (node) node.focus({ preventScroll: true });
    else canvasRef.current?.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onCatalogPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;
    const row = target.closest<HTMLElement>('[data-catalog-id]');
    const id = row?.dataset.catalogId;
    if (!id || state.ids.includes(id)) return;
    gestureRef.current = {
      type: 'catalog',
      id,
      sx: event.clientX,
      sy: event.clientY,
      moved: false,
      pointerId: event.pointerId,
      cam: { ...camera },
    };
  }

  function onCanvasKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;
    const id = target.closest<HTMLElement>('[data-node-id]')?.dataset.nodeId;
    if (event.key === 'Escape') {
      select(null);
      return;
    }
    if (id && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      select(state.selected === id ? null : id);
      return;
    }
    if (id && (event.key === 'Delete' || event.key === 'Backspace')) {
      event.preventDefault();
      remove(id);
      return;
    }
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const [dx, dy] = direction;
    const step = event.shiftKey ? 40 : 10;
    if (id) {
      setState((prev) => {
        const point = prev.positions[id];
        if (!point) return prev;
        return {
          ...prev,
          example: false,
          positions: { ...prev.positions, [id]: { x: point.x + dx * step, y: point.y + dy * step } },
        };
      });
    } else {
      setCamera((prev) => ({ ...prev, x: prev.x + dx * step, y: prev.y + dy * step }));
    }
  }

  const related = new Set<string>();
  if (state.selected) {
    related.add(state.selected);
    links.forEach((link) => {
      if (link.from === state.selected || link.to === state.selected) {
        related.add(link.from);
        related.add(link.to);
      }
    });
  }

  const catalogItems = ITEMS.filter((item) => (state.tab === 'card' ? item.type === 'card' : item.type !== 'card'));
  const emphasized = links
    .map((link) => ({ ...link, emphasis: emphasisFor(link, links) }))
    .filter((link) => link.emphasis === 'best' || link.emphasis === 'above')
    .sort((a, b) => b.yield - a.yield);

  return (
    <>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Pointline home">
          <span className="brand-icon">
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <path d="M10 24V8h8a6 6 0 0 1 0 12h-8" />
              <circle cx="10" cy="24" r="3" />
            </svg>
          </span>
          pointline<span className="brand-period">.</span>
        </a>
        <span className="product-label">REWARDS EXPLORER</span>
        <div className="header-right">
          <span className="region">U.S. programs</span>
          <nav className="planner-nav" aria-label="Primary">
            <a href="/" aria-current="page" className="active">Explorer</a>
            <a href="/planner">Planner</a>
          </nav>
          <button className="text-button" type="button" onClick={openGuide}>
            <span className="info-icon">i</span> How it works
          </button>
        </div>
      </header>
      <main onClick={onAction}>
        <div className="workspace-heading">
          <div>
            <div className="eyebrow">A LITTLE CONNECTION GOES A LONG WAY</div>
            <h1>Your rewards, connected.</h1>
          </div>
          <div className="heading-note">
            Build your mix.
            <br />
            See where your points can go.
          </div>
        </div>
        <section className="workspace" aria-label="Rewards explorer">
          <aside className={catalogOpen ? 'catalog open' : 'catalog'} aria-label="Cards and programs">
            <div className="catalog-heading">
              <div>
                <h2>Add to your canvas</h2>
                <p>
                  Drag an item or tap <b>+</b> to add.
                </p>
              </div>
              <button
                id="catalog-toggle"
                className="icon-button"
                type="button"
                aria-label="Toggle cards and programs"
                aria-expanded={catalogOpen}
                onClick={() => setCatalogOpen((open) => !open)}
              >
                <Glyph name="chevron" />
              </button>
            </div>
            <div id="catalog-body">
              <div className="catalog-tabs" role="tablist" aria-label="Catalog type" onKeyDown={onTabsKeyDown}>
                <button role="tab" aria-selected={state.tab === 'card'} id="cards-tab" aria-controls="catalog-items" data-tab="card" tabIndex={state.tab === 'card' ? 0 : -1} type="button">
                  Cards <span>{cardCount}</span>
                </button>
                <button role="tab" aria-selected={state.tab === 'program'} id="programs-tab" aria-controls="catalog-items" data-tab="program" tabIndex={state.tab === 'program' ? 0 : -1} type="button">
                  Programs <span>{programCount}</span>
                </button>
              </div>
              <div
                className="catalog-items"
                id="catalog-items"
                role="tabpanel"
                aria-labelledby={state.tab === 'card' ? 'cards-tab' : 'programs-tab'}
                onPointerDown={onCatalogPointerDown}
              >
                <div className="catalog-label">{state.tab === 'card' ? 'Transferable rewards' : 'Airlines, hotels & rail'}</div>
                {catalogItems.map((item) => {
                  const added = state.ids.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className={added ? 'catalog-item on-canvas' : 'catalog-item'}
                      data-catalog-id={item.id}
                      title={added ? undefined : `Drag ${item.name} onto the canvas`}
                    >
                      <Mark item={item} program={item.type !== 'card'} />
                      <div className="catalog-item-text">
                        <strong>{displayName(item)}</strong>
                        <small>{item.type === 'card' ? item.currency : item.issuer}</small>
                      </div>
                      <button className="item-add" type="button" data-add={item.id} aria-label={`${added ? 'Select' : 'Add'} ${item.name}${added ? ' on canvas' : ''}`} title={added ? 'On canvas — select' : 'Add to canvas'}>
                        <Icon name={added ? 'check' : 'plus'} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="catalog-foot">
                <Glyph name="move" />
                <p>Mix and match. Stronger transfer ratios light up as you go.</p>
              </div>
            </div>
          </aside>
          <section className="map-section" aria-label="Partnership canvas">
            <div className="map-toolbar">
              <div className="canvas-name">
                <Glyph name="network" />
                <strong id="canvas-name">{state.example ? 'Example canvas' : 'Your canvas'}</strong>
                <span className="count-pill" id="node-count">{state.ids.length}</span>
              </div>
              <div className="canvas-actions">
                <button className="icon-button" id="example-btn" type="button" title="Load example canvas" aria-label="Load example canvas" onClick={resetExample}>
                  <Glyph name="reset" />
                </button>
                <button className="icon-button" id="clear-btn" type="button" title="Clear canvas" aria-label="Clear canvas" onClick={clearCanvas}>
                  <Glyph name="trash" />
                </button>
              </div>
            </div>
            <div
              className="canvas"
              id="canvas"
              ref={canvasRef}
              tabIndex={0}
              aria-label="Interactive rewards map. Green lines are the stronger transfer ratios. Drag items to move them, drag the background to pan, or scroll and pinch to zoom toward the pointer."
              onPointerDown={onCanvasPointerDown}
              onKeyDown={onCanvasKeyDown}
            >
              <div className="canvas-top-note">
                <span className="small-line best-line" />
                Higher transfer ratios
              </div>
              <div className="scene" id="scene" style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})` }}>
                <Edges links={links} positions={state.positions} ids={state.ids} selected={state.selected} />
                <div id="nodes">
                  {state.ids.map((id) => {
                    const item = byId(id);
                    const point = state.positions[id];
                    if (!item || !point) return null;
                    const card = item.type === 'card';
                    return (
                      <div
                        key={id}
                        className={`node ${card ? `card-node ${item.theme ?? ''}` : 'program-node'}${state.selected === id ? ' selected' : ''}${state.selected && !related.has(id) ? ' muted' : ''}${draggingId === id ? ' dragging' : ''}`}
                        data-node-id={id}
                        style={{ left: point.x, top: point.y }}
                        tabIndex={0}
                        role="group"
                        aria-label={`${item.name}, ${card ? 'credit card' : `${item.type} loyalty program`}. Enter to explore. Arrow keys to move. Delete to remove.`}
                      >
                        {card ? (
                          <>
                            <span className="card-issuer">{item.issuer}</span>
                            <div className="card-name">{displayName(item)}</div>
                            <div className="card-currency">
                              <Icon name="wallet" /> {item.currency}
                            </div>
                          </>
                        ) : (
                          <>
                            <Mark item={item} program />
                            <div>
                              <div className="program-name">{displayName(item)}</div>
                              <div className="program-issuer">{item.issuer}</div>
                              <div className="program-type">{programKind(item.type)}</div>
                            </div>
                          </>
                        )}
                        <button className="remove-node" type="button" data-remove={id} aria-label={`Remove ${item.name} from canvas`} title="Remove">
                          <Icon name="x" />
                        </button>
                        <span className="port" />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="empty-canvas" id="empty-canvas" hidden={state.ids.length > 0}>
                <span className="empty-mark" data-icon="network">
                  <Icon name="network" />
                </span>
                <h3>
                  Start with a card.
                  <br />
                  Follow the possibilities.
                </h3>
                <p>Add a card and a loyalty program to find their connection.</p>
                <button className="primary-button" id="empty-example" type="button" onClick={resetExample}>
                  Try an example <Glyph name="arrow" />
                </button>
              </div>
              <div className="canvas-bottom">
                <span className="canvas-hint">Drag to arrange · Scroll or pinch to zoom</span>
                <div className="zoom-controls">
                  <button className="icon-button" id="zoom-out" type="button" aria-label="Zoom out" onClick={() => zoom(1 / 1.2)}>
                    <Glyph name="minus" />
                  </button>
                  <span id="zoom-value">{Math.round(camera.scale * 100)}%</span>
                  <button className="icon-button" id="zoom-in" type="button" aria-label="Zoom in" onClick={() => zoom(1.2)}>
                    <Glyph name="plus" />
                  </button>
                  <span className="control-divider" />
                  <button className="icon-button" id="fit-btn" type="button" aria-label="Fit all items in view" title="Fit to view" onClick={() => fit()}>
                    <Glyph name="fit" />
                  </button>
                </div>
              </div>
            </div>
            <div className="map-footer">
              <div className="legend">
                <span><i className="legend-dot cards-dot" />Credit card</span>
                <span><i className="legend-dot airline-dot" />Airline</span>
                <span><i className="legend-dot hotel-dot" />Hotel</span>
                <span><i className="legend-dot rail-dot" />Rail</span>
              </div>
              <div className="ratio-key">
                <span><i className="ratio-swatch best" />Best ratio</span>
                <span><i className="ratio-swatch above" />Above 1:1</span>
                <span><i className="ratio-swatch par" />1:1</span>
                <span><i className="ratio-swatch below" />Below 1:1</span>
              </div>
            </div>
          </section>
          <aside className="insights" aria-label="Connection results">
            <div className="insights-heading">
              <Glyph name="sparkles" />
              <h2>Your connections</h2>
              <span className="live-label">LIVE</span>
            </div>
            <div id="insights-content">
              {state.selected ? (
                <DetailPanel id={state.selected} links={links} onCanvas={state.ids} />
              ) : (
                <Overview ids={state.ids} links={links} analysis={analysis} emphasized={emphasized} />
              )}
            </div>
          </aside>
        </section>
        <footer className="page-footer">
          <span>More possibility in every point.</span>
          <button className="text-button" id="sources-btn" type="button" onClick={openGuide}>
            Curated U.S. transfer data · {DATA_AS_OF} <Glyph name="external" />
          </button>
        </footer>
      </main>
      <div className="toast" id="toast" role="status" hidden={!toast}>
        <span id="toast-text">{toast?.message}</span>
        <button id="undo-btn" type="button" hidden={!toast?.canUndo} onClick={undo}>
          Undo
        </button>
      </div>
      <dialog
        id="info-dialog"
        ref={dialogRef}
        aria-labelledby="dialog-title"
        onClose={() => {
          setGuideOpen(false);
          returnFocus.current?.focus();
        }}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const { clientX, clientY } = event;
          if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) setGuideOpen(false);
        }}
      >
        <div className="dialog-head">
          <span className="eyebrow">THE POINTLINE GUIDE</span>
          <button className="icon-button" id="dialog-close" type="button" aria-label="Close guide" onClick={() => setGuideOpen(false)}>
            <Glyph name="x" />
          </button>
        </div>
        <h2 id="dialog-title">A clearer path for your points.</h2>
        <div className="guide-steps">
          <div>
            <b>01</b>
            <p>
              <strong>Build your mix</strong>
              Add cards and loyalty programs with the + buttons, or drag them onto the canvas.
            </p>
          </div>
          <div>
            <b>02</b>
            <p>
              <strong>Follow the stronger ratios</strong>
              Arrows run from a card’s rewards currency to a loyalty program. Green marks the best ratio into that program, and any transfer above 1 : 1. Fainter lines return fewer points.
            </p>
          </div>
          <div>
            <b>03</b>
            <p>
              <strong>Find the overlap</strong>
              Shared partners can receive points from more than one rewards currency. Add another card to see which path pays the higher ratio.
            </p>
          </div>
        </div>
        <div className="data-notes">
          <h3>About the data</h3>
          <p>
            This is a curated snapshot of {cardCount} U.S. credit cards and {programCount} loyalty programs, reviewed {DATA_AS_OF}. It shows direct card-to-program point transfers only. Airline award-booking partnerships, status benefits, hotel-to-airline transfers and temporary bonuses are outside this map.
          </p>
          <p>
            Ratios describe point quantities, not cash value. A 1 : 2 line means 1,000 points become 2,000 in the destination program. Verify current rates, account eligibility and award availability with the provider before transferring. Transfers are generally irreversible. No accounts are connected and no transfers are made here. Your canvas resets when you reload.
          </p>
          <p>
            <strong>Sapphire Preferred → Hyatt:</strong> 4:3 for accounts opened on or after June 15, 2026. Earlier accounts retain 1:1 through September 30, 2026; 4:3 applies from October 1, 2026.
          </p>
          <p>
            <strong>Ink Business Preferred → Hyatt:</strong> 1:1 through September 30, 2026, then 4:3 from October 1, 2026. Sapphire Reserve stays 1:1.
          </p>
          <div className="source-links">
            {Object.values(SOURCES).map((source) => (
              <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
                {source.name} ↗
              </a>
            ))}
          </div>
        </div>
        <div className="keyboard-note">Keyboard: use + to add, select a canvas item and use arrow keys to move it, Delete to remove, or Escape to deselect. Tab reaches every control.</div>
      </dialog>
      <div className="sr-only" id="announcer" role="status" aria-live="polite" ref={announcerRef} />
    </>
  );
}

function Edges({ links, positions, ids, selected }: { links: Transfer[]; positions: Record<string, Point>; ids: string[]; selected: string | null }) {
  const cardOrder = ids.filter((id) => byId(id)?.type === 'card');
  return (
    <svg id="edges" aria-hidden="true">
      <defs>
        {(Object.keys(ARROW) as Emphasis[]).map((kind) => (
          <marker key={kind} id={`arrow-${kind}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={ARROW[kind]} />
          </marker>
        ))}
      </defs>
      {links.map((link) => {
        const from = positions[link.from];
        const to = positions[link.to];
        if (!from || !to) return null;
        const emphasis = emphasisFor(link, links);
        const geometry = edgeGeometry(from, to, Math.max(0, cardOrder.indexOf(link.from)));
        const active = Boolean(selected && (link.from === selected || link.to === selected));
        const width = Math.max(46, link.ratio.length * 6.4 + 16);
        return (
          <g key={`${link.from}-${link.to}`} className={`edge-group edge-${emphasis}${selected ? (active ? ' highlighted' : ' faded') : ''}`}>
            <path className="edge-path" d={geometry.d} markerEnd={`url(#arrow-${emphasis})`} />
            <g className="edge-label" transform={`translate(${geometry.lx},${geometry.ly})`}>
              <rect x={-width / 2} y={-11} width={width} height={22} rx={6} />
              <text textAnchor="middle" dominantBaseline="central">
                {link.ratio}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

function Overview({
  ids,
  links,
  analysis,
  emphasized,
}: {
  ids: string[];
  links: Transfer[];
  analysis: ReturnType<typeof analyze>;
  emphasized: Array<Transfer & { emphasis: Emphasis }>;
}) {
  const cards = ids.filter((id) => byId(id)?.type === 'card');
  const ranked = [...analysis.destinations].sort((a, b) => (bestLinkTo(b, links)?.yield ?? 0) - (bestLinkTo(a, links)?.yield ?? 0));
  const unconnected = ids.filter((id) => !links.some((link) => link.from === id || link.to === id));
  const sharedMessage = analysis.shared.length
    ? `${analysis.shared.length} shared ${analysis.shared.length === 1 ? 'partner' : 'partners'}`
    : cards.length
      ? 'Find your next connection'
      : 'Your journey starts here';
  const heading = emphasized.length
    ? `${emphasized.length} higher-ratio ${emphasized.length === 1 ? 'transfer' : 'transfers'}`
    : sharedMessage;
  const description = emphasized.length
    ? 'Green marks the strongest path into a program, and any transfer that returns more points than you send.'
    : analysis.shared.length
      ? 'More than one rewards currency can reach these programs.'
      : cards.length
        ? 'Add a loyalty program to see which cards can transfer points to it.'
        : 'Add a card to discover where its rewards can take you.';
  const suggestions = cards.length
    ? analysis.suggestions.slice(0, 3).map((entry) => {
        const item = byId(entry.id);
        return item
          ? {
              item,
              sub: entry.best && entry.best.yield > 1.001 ? `Best ratio ${entry.best.ratio}` : `${entry.currencies} rewards ${entry.currencies === 1 ? 'currency' : 'currencies'}`,
              strong: Boolean(entry.best && entry.best.yield > 1.001),
            }
          : null;
      })
    : ITEMS.filter((item) => item.type === 'card' && !ids.includes(item.id))
        .slice(0, 3)
        .map((item) => ({ item, sub: item.currency ?? '', strong: false }));

  return (
    <div className="insights-main">
      <div className="stats">
        <div className="stat">
          <strong>{links.length.toString().padStart(2, '0')}</strong>
          <span>Transfer paths</span>
        </div>
        <div className="stat">
          <strong>{analysis.destinations.length.toString().padStart(2, '0')}</strong>
          <span>Loyalty programs</span>
        </div>
      </div>
      <div className="insight-card">
        <div className="insight-kicker">
          <Icon name="sparkles" /> The sweet spot
        </div>
        <h3>{heading}</h3>
        <p>{description}</p>
        {emphasized.length ? (
          <div className="ratio-highlights">
            {emphasized.slice(0, 4).map((link) => {
              const from = byId(link.from);
              const to = byId(link.to);
              if (!from || !to) return null;
              return (
                <button key={`${link.from}-${link.to}`} type="button" data-select={link.to}>
                  <span>
                    {displayName(from)} → {displayName(to)}
                  </span>
                  <b>{link.ratio}</b>
                </button>
              );
            })}
          </div>
        ) : null}
        {!emphasized.length && analysis.shared.length ? (
          <div className="shared-partners">
            {analysis.shared.map((id) => (
              <button key={id} type="button" data-select={id}>
                {byId(id)?.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <section className="active-connections">
        <div className="panel-section-title">
          On your canvas <span>{ids.length} items</span>
        </div>
        {ranked.length ? (
          ranked.map((id) => {
            const item = byId(id);
            const best = bestLinkTo(id, links);
            if (!item || !best) return null;
            const count = links.filter((link) => link.to === id).length;
            const emphasis = emphasisFor(best, links);
            return (
              <button key={id} className="connection-row" type="button" data-select={id}>
                <Mark item={item} program />
                <span className="connection-copy">
                  <strong>{displayName(item)}</strong>
                  <small>
                    From {count} {count === 1 ? 'card' : 'cards'}
                  </small>
                </span>
                <span className={`ratio-pill ${emphasis}`}>{best.ratio}</span>
              </button>
            );
          })
        ) : (
          <p className="no-connections">
            {ids.length ? 'No direct transfers connect this mix yet. Try adding a suggested partner below.' : 'Your connections will appear here as you build your canvas.'}
          </p>
        )}
        {unconnected.map((id) => {
          const item = byId(id);
          if (!item) return null;
          return (
            <button key={id} className="connection-row" type="button" data-select={id}>
              <Mark item={item} program={item.type !== 'card'} />
              <span className="connection-copy">
                <strong>{displayName(item)}</strong>
                <small>No connection in this mix</small>
              </span>
              <Glyph name="arrow" />
            </button>
          );
        })}
      </section>
      <section className="suggestion-section">
        <div className="panel-section-title">
          {cards.length ? 'Connect more possibilities' : 'Choose your first card'} <Icon name="plus" />
        </div>
        {suggestions.map((entry) =>
          entry ? (
            <div key={entry.item.id} className={entry.strong ? 'suggestion-row strong' : 'suggestion-row'}>
              <Mark item={entry.item} program={entry.item.type !== 'card'} />
              <div className="connection-copy">
                <strong>{displayName(entry.item)}</strong>
                <small>{entry.sub}</small>
              </div>
              <button className="item-add" type="button" data-add={entry.item.id} aria-label={`Add ${entry.item.name}`}>
                <Icon name="plus" />
              </button>
            </div>
          ) : null,
        )}
        {cards.length && analysis.suggestions.length > 3 ? (
          <button className="more-suggestions" id="more-programs" type="button">
            Explore all programs <Glyph name="arrow" />
          </button>
        ) : null}
        {cards.length && !analysis.suggestions.length ? <p className="no-connections">All supported partners for these cards are on your canvas.</p> : null}
      </section>
      <p className="panel-smallprint">
        Base rates · Direct transfers only
        <br />
        The highlighted ratio is points received for each point you send. Shared partners count distinct rewards currencies, not the number of cards.
      </p>
    </div>
  );
}

function DetailPanel({ id, links, onCanvas }: { id: string; links: Transfer[]; onCanvas: string[] }) {
  const item = byId(id);
  if (!item) return null;
  const card = item.type === 'card';
  const related = links
    .filter((link) => link.from === id || link.to === id)
    .sort((a, b) => b.yield - a.yield);
  const available = ITEMS.filter((candidate) => !onCanvas.includes(candidate.id))
    .map((candidate) => ({ candidate, transfer: card ? getTransfer(id, candidate.id) : getTransfer(candidate.id, id) }))
    .filter((entry): entry is { candidate: Item; transfer: Transfer } => Boolean(entry.transfer))
    .sort((a, b) => b.transfer.yield - a.transfer.yield);

  return (
    <div className="insights-main detail-panel">
      <button className="detail-back" id="detail-back" type="button">
        <Icon name="arrow" /> All connections
      </button>
      <Mark item={item} program={!card} />
      <h3 className="detail-name">{item.name}</h3>
      <p className="detail-type">{card ? `${item.issuer} · ${item.currency}` : `${item.issuer} · ${programKind(item.type)}`}</p>
      <div className="panel-section-title">
        {card ? 'Transfers to' : 'Receives points from'}
        <span>{related.length} on canvas</span>
      </div>
      {related.length ? (
        related.map((link) => {
          const other = byId(card ? link.to : link.from);
          const source = SOURCES[link.source];
          const emphasis = emphasisFor(link, links);
          if (!other) return null;
          return (
            <div key={`${link.from}-${link.to}`} className="detail-connection">
              <div className="detail-path">
                <Mark item={other} program={card} />
                <span>{displayName(other)}</span>
                {emphasis === 'best' ? <span className="best-tag">Highest ratio</span> : null}
                {emphasis === 'above' ? <span className="best-tag">Above 1 : 1</span> : null}
              </div>
              <div className="rate-row">
                <strong className={`rate-badge ${emphasis}`}>{link.ratio}</strong>
                <span className="rate-equation">
                  1,000 {sentUnit(link.from)} → {receivedFromThousand(link.rate).toLocaleString('en-US')} {byId(link.to)?.unit}
                </span>
              </div>
              {link.note ? <p className="transfer-note">{link.note}</p> : null}
              {source ? (
                <a className="source-link" href={source.url} target="_blank" rel="noopener noreferrer">
                  Verify with {byId(link.from)?.issuer} <Icon name="external" />
                </a>
              ) : null}
            </div>
          );
        })
      ) : (
        <p className="no-connections">No matching partner is on the canvas yet. Add one below to make a connection.</p>
      )}
      {available.length ? (
        <section className="suggestion-section">
          <div className="panel-section-title">Add a matching {card ? 'program' : 'card'}</div>
          {available.slice(0, 4).map(({ candidate, transfer }) => (
            <div key={candidate.id} className={transfer.yield > 1.001 ? 'suggestion-row strong' : 'suggestion-row'}>
              <Mark item={candidate} program={candidate.type !== 'card'} />
              <span className="connection-copy">
                <strong>{displayName(candidate)}</strong>
                <small>{candidate.issuer}</small>
              </span>
              <span className={`ratio-pill ${emphasisFor(transfer, [...links, transfer])}`}>{transfer.ratio}</span>
              <button className="item-add" type="button" data-add={candidate.id} aria-label={`Add ${candidate.name}`}>
                <Icon name="plus" />
              </button>
            </div>
          ))}
        </section>
      ) : null}
      <p className="panel-smallprint">Rates show point quantities, not redemption value. Check eligibility, transfer increments, current rates and award availability before transferring.</p>
      <button className="remove-detail" type="button" data-remove={id}>
        Remove from canvas
      </button>
    </div>
  );
}
