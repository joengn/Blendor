import { escapeHtml as esc } from './html.js';
export function renderActivity(g) {
  return `<div class="inspector-heading"><h2>Table activity</h2><p>Round ${g.round} · ${g.turn - 1} completed turns</p></div><ul class="log">${g.log.map((l) => `<li>${esc(l.text)}<time>${l.turn ? `Turn ${String(l.turn).padStart(2, '0')}` : 'Start of game'}</time></li>`).join('')}</ul>`;
}
