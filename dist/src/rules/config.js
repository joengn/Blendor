export const GEM_COLORS = Object.freeze(['white', 'blue', 'green', 'red', 'black']);
export const TOKEN_COLORS = Object.freeze([...GEM_COLORS, 'gold']);
export const RULES = Object.freeze({
  minPlayers: 2,
  maxPlayers: 4,
  winningPrestige: 15,
  tokenLimit: 10,
  reserveLimit: 3,
  marketSize: 4,
  goldSupply: 5,
  distinctGemTake: 3,
  matchingGemTake: 2,
  minimumSupplyForMatching: 4,
  supplyByPlayerCount: Object.freeze({ 2: 4, 3: 5, 4: 7 }),
});
