import { RULES } from './config.js';
export function validGemSelection(pick, bank) {
  if (!Array.isArray(pick) || pick.length !== 5 || !Array.isArray(bank) || bank.length < 5)
    return false;
  if (pick.some((v, i) => !Number.isInteger(v) || v < 0 || v > bank[i])) return false;
  const count = pick.reduce((a, b) => a + b, 0);
  if (!count) return false;
  const different =
    pick.every((v) => v === 0 || v === 1) &&
    count === Math.min(RULES.distinctGemTake, bank.slice(0, 5).filter((v) => v > 0).length);
  const matching =
    count === RULES.matchingGemTake &&
    pick.filter((v) => v === RULES.matchingGemTake).length === 1 &&
    bank[pick.indexOf(RULES.matchingGemTake)] >= RULES.minimumSupplyForMatching;
  return different || matching;
}
