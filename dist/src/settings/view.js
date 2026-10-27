import { RULES } from '../rules/config.js';
import { PLAYER_COLORS } from '../colors/palette.js';
import { escapeHtml as esc } from '../ui/html.js';
export function renderSetup({
  playerCount: setupCount,
  playerNames: setupNames,
  canStart = true,
  canSaveNames = true,
}) {
  return `<div class="inspector-heading"><h2>Table setup</h2><p>A shared device. Two to four players.</p></div><div class="control"><label for="players">Players</label><select id="players">${Array.from(
    { length: RULES.maxPlayers - RULES.minPlayers + 1 },
    (_, i) => i + RULES.minPlayers,
  )
    .map((n) => `<option ${setupCount === n ? 'selected' : ''} value="${n}">${n} players</option>`)
    .join(
      '',
    )}</select></div>${Array.from({ length: setupCount }, (_, i) => `<div class="control"><label for="name-${i}"><i class="dot" style="--gem:${PLAYER_COLORS[i]}"></i> Seat ${String(i + 1).padStart(2, '0')}</label><input id="name-${i}" data-name="${i}" maxlength="40" value="${esc(setupNames[i] || `Player ${i + 1}`)}" aria-label="Player ${i + 1} name"></div>`).join('')}<button class="primary wide" id="save-names" ${canSaveNames ? '' : 'disabled'}>Save player names</button><button class="wide new-table-action" id="new-game" ${canStart ? '' : 'disabled'}>Start new table ↗</button><p class="help">Starting a new table replaces your saved game.<br>Your game saves automatically in this browser.</p>`;
}
