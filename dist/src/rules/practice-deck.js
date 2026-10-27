import { GEM_COLORS as COLORS } from './config.js';
import { shuffle } from '../game/random.js';
export function makeDeck(level, random = Math.random) {
  const patterns =
    level === 1
      ? [
          [0, [0, 1, 1, 1, 1]],
          [0, [0, 2, 0, 1, 0]],
          [0, [0, 0, 2, 0, 2]],
          [0, [0, 1, 2, 1, 1]],
          [0, [0, 0, 0, 3, 0]],
          [0, [0, 2, 2, 0, 1]],
          [0, [1, 0, 1, 2, 1]],
          [1, [0, 0, 0, 0, 4]],
        ]
      : level === 2
        ? [
            [1, [0, 2, 2, 3, 0]],
            [1, [2, 0, 3, 0, 3]],
            [2, [0, 0, 0, 5, 0]],
            [2, [0, 0, 3, 0, 5]],
            [2, [0, 1, 4, 2, 0]],
            [3, [0, 0, 0, 0, 6]],
          ]
        : [
            [3, [0, 3, 3, 5, 3]],
            [4, [0, 0, 0, 0, 7]],
            [4, [3, 0, 0, 3, 6]],
            [5, [3, 0, 0, 0, 7]],
          ];
  return shuffle(
    COLORS.flatMap((color, i) =>
      patterns.map(([points, p], j) => {
        const cost = Array(5).fill(0);
        p.forEach((v, k) => (cost[(i + k) % 5] = v));
        return { id: `${level}-${i}-${j}`, level, color, points, cost };
      }),
    ),
    random,
  );
}

export function createNobles(random = Math.random) {
  return shuffle(
    Array.from({ length: 10 }, (_, i) => {
      const cost = Array(5).fill(0);
      cost[i % 5] = i < 5 ? 4 : 3;
      cost[(i + 1) % 5] = i < 5 ? 4 : 3;
      if (i >= 5) cost[(i + 2) % 5] = 3;
      return { id: `n-${i}`, points: 3, cost };
    }),
    random,
  );
}
