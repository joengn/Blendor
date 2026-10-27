import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zoomAt, fitView, MIN_ZOOM, MAX_ZOOM } from '../src/ui/canvas.js';
test('zoom preserves the world point beneath the mouse cursor', () => {
  const start = { scale: 0.7, x: 42, y: -12 },
    anchor = { x: 234, y: 187 };
  const result = zoomAt(start, 1.4, anchor.x, anchor.y);
  assert.equal((anchor.x - result.x) / result.scale, (anchor.x - start.x) / start.scale);
  assert.equal((anchor.y - result.y) / result.scale, (anchor.y - start.y) / start.scale);
  assert.equal(result.autoFit, false);
});
test('zoom remains within limits while preserving its anchor', () => {
  const start = { scale: 1, x: 0, y: 0 };
  assert.equal(zoomAt(start, 100, 200, 150).scale, MAX_ZOOM);
  assert.equal(zoomAt(start, 0.001, 200, 150).scale, MIN_ZOOM);
});
test('fit includes the whole table and leaves room for canvas controls', () => {
  for (const [w, h] of [
    [1180, 844],
    [794, 712],
    [390, 792],
  ]) {
    const v = fitView(w, h, 1100, 900);
    assert.ok(v.x >= 0);
    assert.ok(v.y >= 0);
    assert.ok(v.x + 1100 * v.scale <= w);
    assert.ok(v.y + 900 * v.scale <= h - 48);
    assert.equal(v.autoFit, true);
  }
});
