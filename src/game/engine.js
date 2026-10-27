import { validGemSelection } from '../rules/selection.js';
import { GEM_COLORS as COLORS, TOKEN_COLORS as ALL, RULES } from '../rules/config.js';
import { makeDeck, createNobles } from '../rules/practice-deck.js';
export { COLORS, ALL };
export { makeDeck };
export { shuffle } from './random.js';
export const total = (a) => a.reduce((x, y) => x + y, 0);
// Provisional, rotationally balanced practice data. Replace with supplied game data.
export function newGame(names, { random = Math.random } = {}) {
  if (
    !Array.isArray(names) ||
    names.length < RULES.minPlayers ||
    names.length > RULES.maxPlayers ||
    names.some((n) => typeof n !== 'string' || !n.trim() || n.length > 40)
  )
    throw Error('Choose 2–4 players with non-empty names of at most 40 characters.');
  const decks = [1, 2, 3].map((level) => makeDeck(level, random));
  const market = decks.map((d) => d.splice(0, RULES.marketSize));
  const nobles = createNobles(random).slice(0, names.length + 1);
  return {
    version: 1,
    revision: 0,
    appliedCommands: [],
    players: names.map((name, seat) => ({
      id: `player-${seat + 1}`,
      seat,
      name,
      tokens: Array(6).fill(0),
      bonuses: Array(5).fill(0),
      cards: [],
      reserved: [],
      nobles: [],
      score: 0,
    })),
    decks,
    market,
    nobles,
    bank: [...Array(5).fill(RULES.supplyByPlayerCount[names.length]), RULES.goldSupply],
    current: 0,
    round: 1,
    turn: 1,
    phase: 'action',
    final: false,
    over: false,
    log: [{ text: 'The table is ready. Player 1 goes first.', turn: 0 }],
  };
}
export function current(g) {
  return g.players[g.current];
}
export function costFor(p, c) {
  return c.cost.map((v, i) => Math.max(0, v - p.bonuses[i]));
}
export function paymentFor(p, c) {
  const cost = costFor(p, c);
  const pay = cost.map((v, i) => Math.min(v, p.tokens[i]));
  return [...pay, total(cost.map((v, i) => v - pay[i]))];
}
export function affordable(p, c) {
  return paymentFor(p, c)[5] <= p.tokens[5];
}
export function eligible(g) {
  return g.nobles.filter((n) => n.cost.every((v, i) => current(g).bonuses[i] >= v));
}
export function addLog(g, text) {
  g.log.unshift({ text, turn: g.turn });
  g.log = g.log.slice(0, 40);
}
export function take(g, pick) {
  if (g.phase !== 'action' || g.over) throw Error('Finish the current turn first.');
  if (!validGemSelection(pick, g.bank))
    throw Error('Take 3 different colors, or 2 of a color with at least 4 available.');
  pick.forEach((v, i) => {
    g.bank[i] -= v;
    current(g).tokens[i] += v;
  });
  addLog(
    g,
    `${current(g).name} took ${pick
      .map((v, i) => (v ? `${v} ${COLORS[i]}` : ''))
      .filter(Boolean)
      .join(', ')}.`,
  );
  g.phase = 'resolve';
}
export function locate(g, id) {
  for (let l = 0; l < 3; l++) {
    const index = g.market[l].findIndex((c) => c?.id === id);
    if (index >= 0)
      return {
        card: g.market[l][index],
        remove: () => {
          g.market[l][index] = g.decks[l].shift() || null;
        },
      };
  }
  const index = current(g).reserved.findIndex((c) => c.id === id);
  if (index >= 0)
    return {
      card: current(g).reserved[index],
      reserved: true,
      remove: () => current(g).reserved.splice(index, 1),
    };
  throw Error('This card is no longer available.');
}
export function reserve(g, id, level) {
  if (g.phase !== 'action' || g.over) throw Error('Finish the current turn first.');
  const p = current(g);
  if (p.reserved.length >= RULES.reserveLimit) throw Error('You can reserve at most 3 cards.');
  let c;
  if (level !== undefined) {
    if (!g.decks[level].length) throw Error('This deck is empty.');
    c = g.decks[level].shift();
  } else {
    const loc = locate(g, id);
    if (loc.reserved) throw Error('This card is already reserved.');
    c = loc.card;
    loc.remove();
  }
  p.reserved.push(c);
  if (g.bank[5]) {
    g.bank[5]--;
    p.tokens[5]++;
  }
  addLog(g, `${p.name} reserved a level ${c.level} card.`);
  g.phase = 'resolve';
}
export function buy(g, id, pay) {
  if (g.phase !== 'action' || g.over) throw Error('Finish the current turn first.');
  const loc = locate(g, id),
    p = current(g),
    need = costFor(p, loc.card);
  if (
    pay.length !== 6 ||
    pay.some((v, i) => !Number.isInteger(v) || v < 0 || v > p.tokens[i]) ||
    need.some((v, i) => pay[i] > v) ||
    pay[5] !== total(need.map((v, i) => v - pay[i]))
  )
    throw Error('Choose enough gems and gold to cover this card.');
  pay.forEach((v, i) => {
    p.tokens[i] -= v;
    g.bank[i] += v;
  });
  p.cards.push(loc.card);
  p.bonuses[COLORS.indexOf(loc.card.color)]++;
  p.score += loc.card.points;
  loc.remove();
  addLog(
    g,
    `${p.name} purchased a ${loc.card.color} card${loc.card.points ? ` for ${loc.card.points} prestige` : ''}.`,
  );
  g.phase = 'resolve';
}
export function returnTokens(g, returns) {
  const p = current(g);
  if (
    g.phase !== 'resolve' ||
    returns.length !== 6 ||
    returns.some((v, i) => !Number.isInteger(v) || v < 0 || v > p.tokens[i]) ||
    total(p.tokens) - total(returns) !== RULES.tokenLimit
  )
    throw Error('Return exactly the excess tokens.');
  returns.forEach((v, i) => {
    p.tokens[i] -= v;
    g.bank[i] += v;
  });
}
export function claim(g, id) {
  if (g.phase !== 'resolve' || total(current(g).tokens) > RULES.tokenLimit)
    throw Error('Resolve token limit first.');
  const n = eligible(g).find((n) => n.id === id);
  if (!n) throw Error('This noble is not available.');
  current(g).nobles.push(n);
  current(g).score += n.points;
  g.nobles = g.nobles.filter((x) => x.id !== id);
  g.phase = 'claimed';
  addLog(g, `${current(g).name} welcomed a noble. +3 prestige.`);
}
export function finish(g) {
  if (
    g.over ||
    g.phase === 'action' ||
    total(current(g).tokens) > RULES.tokenLimit ||
    (g.phase !== 'claimed' && eligible(g).length)
  )
    throw Error('Resolve the action before ending the turn.');
  if (current(g).score >= RULES.winningPrestige) g.final = true;
  if (g.final && g.current === g.players.length - 1) {
    g.over = true;
    g.phase = 'over';
    addLog(g, 'The final round is complete.');
    return;
  }
  g.current = (g.current + 1) % g.players.length;
  if (g.current === 0) g.round++;
  g.turn++;
  g.phase = 'action';
}
export function winners(g) {
  const max = Math.max(...g.players.map((p) => p.score));
  const tied = g.players.filter((p) => p.score === max);
  const min = Math.min(...tied.map((p) => p.cards.length));
  return tied.filter((p) => p.cards.length === min);
}
