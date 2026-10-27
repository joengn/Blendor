const overlap = (a, b) =>
  Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
  Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
const rect = (x, y, width, height) => ({ left: x, top: y, right: x + width, bottom: y + height });
export function placeCardActions(anchor, size, bounds, protectedAreas = [], gap = 8) {
  const candidates = [];
  for (const x of [
    (anchor.left + anchor.right - size.width) / 2,
    anchor.left,
    anchor.right - size.width,
  ]) {
    candidates.push(
      { side: 'top', x, y: anchor.top - size.height - gap },
      { side: 'bottom', x, y: anchor.bottom + gap },
    );
  }
  for (const y of [
    (anchor.top + anchor.bottom - size.height) / 2,
    anchor.top,
    anchor.bottom - size.height,
  ]) {
    candidates.push(
      { side: 'right', x: anchor.right + gap, y },
      { side: 'left', x: anchor.left - size.width - gap, y },
    );
  }
  let best;
  for (const candidate of candidates) {
    const raw = rect(candidate.x, candidate.y, size.width, size.height);
    const x = Math.max(bounds.left, Math.min(candidate.x, bounds.right - size.width));
    const y = Math.max(bounds.top, Math.min(candidate.y, bounds.bottom - size.height));
    const positioned = rect(x, y, size.width, size.height);
    const overflow = size.width * size.height - overlap(raw, bounds);
    const obscured = protectedAreas.reduce(
      (sum, area) => sum + overlap(positioned, area) * (area.weight ?? 1),
      0,
    );
    const score =
      overlap(positioned, anchor) * 1000 +
      overflow * 20 +
      obscured +
      Math.abs(x - candidate.x) +
      Math.abs(y - candidate.y);
    if (!best || score < best.score) best = { side: candidate.side, x, y, score };
  }
  return best;
}
