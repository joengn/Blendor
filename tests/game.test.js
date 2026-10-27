import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame,
  current,
  take,
  reserve,
  buy,
  paymentFor,
  finish,
  returnTokens,
  claim,
  winners,
  ALL,
  total,
} from '../src/game/engine.js';
test('setup sizes and all 90 practice cards', () => {
  for (const n of [2, 3, 4]) {
    const g = newGame(Array.from({ length: n }, (_, i) => `P${i}`));
    assert.equal(g.bank[0], n === 2 ? 4 : n === 3 ? 5 : 7);
    assert.equal(g.bank[5], 5);
    assert.equal(g.nobles.length, n + 1);
    assert.equal(g.decks.flat().length + g.market.flat().length, 90);
  }
});
test('token actions, invalid double, turn rotation', () => {
  const g = newGame(['A', 'B']);
  take(g, [2, 0, 0, 0, 0]);
  assert.equal(g.bank[0], 2);
  finish(g);
  assert.throws(() => take(g, [2, 0, 0, 0, 0]));
  take(g, [1, 1, 1, 0, 0]);
  finish(g);
  assert.equal(g.round, 2);
  assert.equal(g.current, 0);
});
test('reserve refills market, pays gold and limits hand', () => {
  const g = newGame(['A', 'B']);
  const card = g.market[0][0];
  reserve(g, card.id);
  assert.equal(current(g).reserved[0].id, card.id);
  assert.equal(current(g).tokens[5], 1);
  assert.equal(g.market[0].length, 4);
  assert.notEqual(g.market[0][0].id, card.id);
  g.phase = 'action';
  reserve(g, null, 0);
  g.phase = 'action';
  reserve(g, null, 1);
  g.phase = 'action';
  assert.throws(() => reserve(g, null, 2));
});
test('buy applies discounts, allows gold substitution, conserves tokens', () => {
  const g = newGame(['A', 'B']);
  const p = current(g);
  const c = g.market[0][0];
  p.tokens = [7, 7, 7, 7, 7, 5];
  p.bonuses = [1, 0, 0, 0, 0];
  const before = g.bank.map((v, i) => v + p.tokens[i]);
  const pay = paymentFor(p, c);
  buy(g, c.id, pay);
  assert.equal(p.cards.length, 1);
  assert.equal(p.score, c.points);
  assert.deepEqual(
    g.bank.map((v, i) => v + p.tokens[i]),
    before,
  );
  assert.equal(total(p.bonuses), 2);
  assert.throws(() => buy(g, g.market[0][1].id, [0, 0, 0, 0, 0, 0]));
});
test('ten token limit and noble resolution block turn advance', () => {
  const g = newGame(['A', 'B']);
  const p = current(g);
  p.tokens = [4, 4, 2, 0, 0, 0];
  take(g, [0, 1, 0, 1, 1]);
  assert.throws(() => finish(g));
  returnTokens(g, [1, 1, 0, 1, 0, 0]);
  assert.equal(total(p.tokens), 10);
  p.bonuses = [10, 10, 10, 10, 10];
  assert.throws(() => finish(g));
  claim(g, g.nobles[0].id);
  assert.equal(p.score, 3);
  assert.throws(() => claim(g, g.nobles[0].id));
  finish(g);
  assert.equal(g.current, 1);
});
test('endgame gives equal turns and breaks ties by fewest cards', () => {
  const g = newGame(['A', 'B']);
  g.players[0].score = 15;
  g.phase = 'resolve';
  finish(g);
  assert.equal(g.over, false);
  assert.equal(g.final, true);
  g.players[1].score = 15;
  g.players[1].cards = [{}];
  g.phase = 'resolve';
  finish(g);
  assert.equal(g.over, true);
  assert.equal(winners(g)[0].name, 'A');
});
