export const MIN_ZOOM = 0.2,
  MAX_ZOOM = 2.5;
export function zoomAt(view, scale, x, y) {
  const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale)),
    ratio = next / view.scale;
  return { scale: next, x: x - (x - view.x) * ratio, y: y - (y - view.y) * ratio, autoFit: false };
}
export function fitView(width, height, worldWidth, worldHeight) {
  const scale = Math.max(
    MIN_ZOOM,
    Math.min(1, (width - 32) / worldWidth, (height - 72) / worldHeight),
  );
  return {
    scale,
    x: (width - worldWidth * scale) / 2,
    y: (height - 48 - worldHeight * scale) / 2,
    autoFit: true,
  };
}
// A DOM canvas keeps every card and control accessible while moving the table as one surface.
export function mountCanvas(host, world, controls, view, onChange) {
  let state = view,
    drag = null,
    pointers = new Map(),
    pinch = null,
    suppressClick = false;
  const dimensions = () => ({
    width: host.clientWidth,
    height: host.clientHeight,
    worldWidth: world.offsetWidth,
    worldHeight: world.offsetHeight,
  });
  const paint = () => {
    world.style.transform = `translate(${state.x}px,${state.y}px) scale(${state.scale})`;
    controls.setAttribute(
      'aria-label',
      `Canvas zoom controls, ${Math.round(state.scale * 100)} percent`,
    );
    host.dataset.zoom = Math.round(state.scale * 100);
    controls.querySelector('[data-zoom="out"]').disabled = state.scale <= MIN_ZOOM;
    controls.querySelector('[data-zoom="in"]').disabled = state.scale >= MAX_ZOOM;
    onChange({ ...state });
  };
  const fit = () => {
    const d = dimensions();
    state = fitView(d.width, d.height, d.worldWidth, d.worldHeight);
    paint();
  };
  const zoom = (scale, x = host.clientWidth / 2, y = host.clientHeight / 2) => {
    state = zoomAt(state, scale, x, y);
    paint();
  };
  const local = (e) => {
    const rect = host.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  host.addEventListener(
    'wheel',
    (e) => {
      if (e.target.closest('.canvas-controls,input,select')) return;
      e.preventDefault();
      const p = local(e),
        pixels = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? host.clientHeight : 1);
      zoom(state.scale * Math.exp(-Math.max(-180, Math.min(180, pixels)) * 0.0025), p.x, p.y);
    },
    { passive: false },
  );
  host.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button,input,select,a,summary,.canvas-controls'))
      return;
    const p = local(e);
    pointers.set(e.pointerId, p);
    host.setPointerCapture(e.pointerId);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        state: { ...state },
        center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
      drag = null;
    } else {
      drag = { id: e.pointerId, start: p, x: state.x, y: state.y };
      suppressClick = false;
    }
    host.classList.add('is-panning');
  });
  host.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    const p = local(e);
    pointers.set(e.pointerId, p);
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()],
        center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      state = zoomAt(
        pinch.state,
        (pinch.state.scale * Math.hypot(a.x - b.x, a.y - b.y)) / Math.max(1, pinch.distance),
        pinch.center.x,
        pinch.center.y,
      );
      state.x += center.x - pinch.center.x;
      state.y += center.y - pinch.center.y;
      suppressClick = true;
      paint();
    } else if (drag) {
      const dx = p.x - drag.start.x,
        dy = p.y - drag.start.y;
      if (Math.hypot(dx, dy) > 3) suppressClick = true;
      state = { ...state, x: drag.x + dx, y: drag.y + dy, autoFit: false };
      paint();
    }
  });
  const release = (e) => {
    pointers.delete(e.pointerId);
    if (host.hasPointerCapture(e.pointerId)) host.releasePointerCapture(e.pointerId);
    pinch = null;
    drag = null;
    host.classList.remove('is-panning');
  };
  host.addEventListener('pointerup', release);
  host.addEventListener('pointercancel', release);
  host.addEventListener('lostpointercapture', () => {
    drag = null;
    pinch = null;
    pointers.clear();
    host.classList.remove('is-panning');
  });
  host.addEventListener(
    'click',
    (e) => {
      if (suppressClick) {
        e.preventDefault();
        e.stopImmediatePropagation();
        suppressClick = false;
      }
    },
    true,
  );
  controls.querySelectorAll('[data-zoom]').forEach(
    (button) =>
      (button.onclick = () => {
        if (button.dataset.zoom === 'fit') fit();
        else zoom(state.scale * (button.dataset.zoom === 'in' ? 1.15 : 1 / 1.15));
      }),
  );

  host.addEventListener('keydown', (e) => {
    if (e.target !== host) return;
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      zoom(state.scale * 1.15);
    } else if (e.key === '-') {
      e.preventDefault();
      zoom(state.scale / 1.15);
    } else if (e.key === '0') {
      e.preventDefault();
      fit();
    } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      state = {
        ...state,
        autoFit: false,
        x: state.x + (e.key === 'ArrowLeft' ? 40 : e.key === 'ArrowRight' ? -40 : 0),
        y: state.y + (e.key === 'ArrowUp' ? 40 : e.key === 'ArrowDown' ? -40 : 0),
      };
      paint();
    }
  });
  const observer = new ResizeObserver(() => (state.autoFit ? fit() : paint()));
  observer.observe(host);
  observer.observe(world);
  if (!state || state.autoFit) fit();
  else paint();
  return () => observer.disconnect();
}
