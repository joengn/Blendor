// A smooth horizontal connection that leaves each endpoint toward the other.
export function gemConnection(start, end, orientation = 'horizontal') {
  if (orientation === 'vertical') {
    const direction = end.y >= start.y ? 1 : -1,
      bend = Math.max(28, Math.abs(end.y - start.y) * 0.55);
    return `M ${start.x} ${start.y} C ${start.x} ${start.y + direction * bend}, ${end.x} ${end.y - direction * bend}, ${end.x} ${end.y}`;
  }
  const direction = end.x >= start.x ? 1 : -1,
    bend = Math.max(28, Math.abs(end.x - start.x) * 0.55);
  return `M ${start.x} ${start.y} C ${start.x + direction * bend} ${start.y}, ${end.x - direction * bend} ${end.y}, ${end.x} ${end.y}`;
}
export { validGemSelection } from '../rules/selection.js';
