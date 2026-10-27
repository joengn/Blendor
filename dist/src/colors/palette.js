export const PLAYER_COLORS = Object.freeze(['#9bd5ad', '#87b9ef', '#edaa82', '#c3a1eb']);
export const GEM_PALETTE = Object.freeze({
  white: '#c9cbd0',
  blue: '#789bbb',
  green: '#7da18b',
  red: '#bd8183',
  black: '#8a839c',
  gold: '#baa16b',
});
export const GEM_NAMES = Object.freeze({
  white: 'Diamond',
  blue: 'Sapphire',
  green: 'Emerald',
  red: 'Ruby',
  black: 'Onyx',
  gold: 'Gold',
});
export function applyPalette(element) {
  for (const [name, color] of Object.entries(GEM_PALETTE))
    element.style.setProperty(`--${name}`, color);
}
