import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gemConnection, validGemSelection } from '../src/ui/gem-flow.js';
test('collection enables only a legal distinct or double take', () => {
  const bank = [4, 4, 4, 4, 4, 5];
  assert.equal(validGemSelection([0, 0, 0, 0, 0], bank), false);
  assert.equal(validGemSelection([1, 1, 0, 0, 0], bank), false);
  assert.equal(validGemSelection([1, 1, 1, 0, 0], bank), true);
  assert.equal(validGemSelection([2, 0, 0, 0, 0], bank), true);
  assert.equal(validGemSelection([2, 0, 0, 0, 0], [3, 4, 4, 4, 4, 5]), false);
  assert.equal(validGemSelection([1, 0, 1, 0, 0], [1, 0, 2, 0, 0, 5]), true);
});
test('curves start and finish at their anchors in either direction', () => {
  assert.equal(
    gemConnection({ x: 20, y: 30 }, { x: 120, y: 80 }),
    'M 20 30 C 75 30, 65 80, 120 80',
  );
  assert.equal(
    gemConnection({ x: 120, y: 80 }, { x: 20, y: 30 }),
    'M 120 80 C 65 80, 75 30, 20 30',
  );
});

test('vertical curves leave and enter the facing edges', () => {
  assert.equal(
    gemConnection({ x: 20, y: 30 }, { x: 120, y: 130 }, 'vertical'),
    'M 20 30 C 20 85, 120 75, 120 130',
  );
});
