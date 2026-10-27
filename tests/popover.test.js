import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeCardActions } from '../src/ui/popover.js';
const anchor = { left: 220, top: 200, right: 280, bottom: 280 },
  size = { width: 160, height: 42 },
  bounds = { left: 12, top: 64, right: 488, bottom: 488 };
const top = { left: 0, top: 0, right: 500, bottom: 200, weight: 10 },
  bottom = { left: 0, top: 280, right: 500, bottom: 500, weight: 10 },
  right = { left: 280, top: 0, right: 500, bottom: 500, weight: 10 };
test('chooses all four sides to protect nearby content', () => {
  assert.equal(placeCardActions(anchor, size, bounds).side, 'top');
  assert.equal(placeCardActions(anchor, size, bounds, [top]).side, 'bottom');
  assert.equal(placeCardActions(anchor, size, bounds, [top, bottom]).side, 'right');
  assert.equal(placeCardActions(anchor, size, bounds, [top, bottom, right]).side, 'left');
});
test('keeps popover on screen near all viewport corners', () => {
  for (const a of [
    { left: 10, top: 65, right: 65, bottom: 140 },
    { left: 440, top: 65, right: 490, bottom: 140 },
    { left: 10, top: 410, right: 65, bottom: 480 },
    { left: 440, top: 410, right: 490, bottom: 480 },
  ]) {
    const p = placeCardActions(a, size, bounds);
    assert.ok(p.x >= bounds.left && p.y >= bounds.top);
    assert.ok(p.x + size.width <= bounds.right && p.y + size.height <= bounds.bottom);
  }
});
test('does not cover the selected card when adjacent space is available', () => {
  const p = placeCardActions(anchor, size, bounds, [top, bottom, right]);
  assert.ok(
    p.x + size.width <= anchor.left ||
      p.x >= anchor.right ||
      p.y + size.height <= anchor.top ||
      p.y >= anchor.bottom,
  );
});
