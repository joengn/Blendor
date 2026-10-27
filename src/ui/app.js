import { RULES } from '../rules/config.js';
import { APP_SETTINGS } from '../settings/config.js';
import { gemConnection, validGemSelection } from './gem-flow.js';
import { placeCardActions } from './popover.js';
import { mountCanvas } from './canvas.js';
import { COLORS, ALL, total, current, affordable, eligible, winners } from '../game/engine.js';
import { COMMANDS } from '../game/commands.js';
import { PLAYER_COLORS, GEM_NAMES as names } from '../colors/palette.js';
import { svg } from '../assets/icons.js';
import { artworkUrl } from '../assets/manifest.js';
import { escapeHtml as esc } from './html.js';
import { renderRules } from '../rules/view.js';
import { renderSetup } from '../settings/view.js';
import { renderActivity } from './activity.js';

export function mountApp({ client }) {
  const app = document.querySelector('#app'),
    dialog = document.querySelector('#dialog');
  let canvasView = { scale: 1, x: 0, y: 0, autoFit: true },
    unmountCanvas = () => {};
  const gem = (c) => `--gem:var(--${c})`;
  let g = client.getSnapshot();
  let pick = Array(5).fill(0),
    selected = null,
    selectedDeck = null,
    utility = null,
    setupCount = g.players.length;
  let setupNames = g.players.map((p) => p.name);
  function notice(text) {
    document.querySelector('#notice')?.remove();
    const el = document.createElement('div');
    el.id = 'notice';
    el.role = 'status';
    el.textContent = text;
    document.body.append(el);
    setTimeout(() => el.remove(), 4500);
  }
  async function runCommand(type, payload = {}) {
    try {
      await client.dispatch(type, payload);
      g = client.getSnapshot();
      render();
      return true;
    } catch (e) {
      notice(e.message);
      render();
      return false;
    }
  }
  function card(c) {
    if (!c) return '<div class="empty-card">Deck depleted</div>';
    const image = artworkUrl('cards', c.id);
    return `<button class="card ${selected === c.id ? 'selected' : ''}" data-card="${c.id}" aria-label="Level ${c.level}, ${c.color} bonus, ${c.points} prestige, costs ${c.cost
      .map((v, i) => (v ? `${v} ${COLORS[i]}` : ''))
      .filter(Boolean)
      .join(
        ', ',
      )}"><div class="art">${image ? `<img class="artwork" src="${esc(image)}" alt="">` : svg('image')}</div><span class="frame-label">Card artwork</span><div class="card-top"><span class="points">${c.points || '·'}</span><span class="bonus" style="${gem(c.color)}"></span></div><div class="costs">${c.cost.map((v, i) => (v ? `<span class="cost" style="${gem(COLORS[i])}" title="${v} ${names[COLORS[i]]}">${v}</span>` : '')).join('')}</div></button>`;
  }
  function noble(n) {
    const image = artworkUrl('nobles', n.id);
    return `<div class="noble" aria-label="Noble: 3 prestige; ${n.cost
      .map((v, i) => (v ? `${v} ${COLORS[i]} bonuses` : ''))
      .filter(Boolean)
      .join(
        ', ',
      )}"><div class="art">${image ? `<img class="artwork" src="${esc(image)}" alt="">` : svg('image')}</div><span class="frame-label">Noble artwork</span><span class="points">3</span><div class="requirements">${n.cost.map((v, i) => (v ? `<span class="cost-chip"><i class="dot" style="${gem(COLORS[i])}"></i>${v}</span>` : '')).join('')}</div></div>`;
  }
  function selectedCard() {
    return selected
      ? [...g.market.flat(), ...current(g).reserved].find((c) => c?.id === selected)
      : null;
  }
  function iconButton(icon, label, attrs = '') {
    return `<button class="icon" aria-label="${label}" title="${label}" ${attrs}>${svg(icon)}</button>`;
  }
  function header() {
    return `<header class="app-header minimal-header"><div class="brand" aria-label="${esc(APP_SETTINGS.appName)}" title="${esc(APP_SETTINGS.appName)}">${svg('logo')}</div><span class="round-label">ROUND ${String(g.round).padStart(2, '0')}</span></header>`;
  }
  function floatingTools() {
    return `<nav class="floating-tools" aria-label="Table actions" role="toolbar" aria-orientation="vertical">${iconButton('undo', 'Undo last turn', `id="undo" ${!client.canUndo ? 'disabled' : ''}`)}${iconButton('redo', 'Redo last turn', `id="redo" ${!client.canRedo ? 'disabled' : ''}`)}${[
      ['book', 'How to play', 'rules'],
      ['settings', 'Table setup', 'setup'],
      ['activity', 'Table activity', 'activity'],
    ]
      .map(([icon, label, key]) =>
        iconButton(
          icon,
          label,
          `data-utility="${key}" aria-expanded="${utility === key}" aria-controls="utility-content"`,
        ),
      )
      .join('')}</nav>`;
  }
  function gemCounts(p) {
    return `<div class="player-gems">${ALL.map((c, i) => `<span class="cost player-gem" style="${gem(c)}" title="${names[c]} tokens: ${p.tokens[i]}" aria-label="${names[c]}: ${p.tokens[i]} gems">${p.tokens[i]}</span>`).join('')}</div>`;
  }
  function bonusStacks(p) {
    return `<div class="bonus-stacks">${COLORS.map((c, i) => {
      const cards = p.cards.filter((card) => card.color === c);
      return `<div class="bonus-stack" style="${gem(c)};--stack-depth:${Math.min(6, Math.max(0, cards.length - 1))}" title="${names[c]}: ${cards.length} permanent bonuses"><div class="card-pile ${cards.length ? 'has-cards' : ''}">${cards.length ? cards.map((card, j) => `<div class="stacked-card" style="--stack-index:${Math.min(j, 6)}"><span class="stack-points">${card.points || '·'}</span><i class="stack-gem"></i><span class="stack-art">${svg('image')}</span></div>`).join('') : '<div class="stacked-card empty-stack"><i class="stack-gem"></i></div>'}</div><span class="stack-total">${cards.length}</span><span class="stack-name">${names[c].slice(0, 3)}</span></div>`;
    }).join('')}</div>`;
  }
  function playerHeader(p, i, active) {
    return `<div class="seat-heading"><span class="avatar">${String(i + 1).padStart(2, '0')}</span><div class="seat-name"><strong>${esc(p.name)}</strong><span>${g.over ? 'Game complete' : active ? 'Your turn' : i === 0 ? 'First player' : 'Waiting'}</span></div><span class="seat-score">${p.score}<small>/${RULES.winningPrestige}</small></span></div>`;
  }
  function playerPanel(i, position) {
    const p = g.players[i],
      active = i === g.current;
    return `<section class="seat-panel seat-${position} ${active ? 'current' : ''}" aria-label="${esc(p.name)} ${active ? 'active player panel' : 'player panel'}" data-seat="${i}" style="--player-color:${PLAYER_COLORS[i]}" ${active ? 'aria-current="true"' : ''}>${playerHeader(p, i, active)}<div class="panel-collection"><div class="section-line"><h2>Collection</h2><span>${total(p.tokens)}/${RULES.tokenLimit} tokens · ${p.nobles.length} nobles</span></div>${gemCounts(p)}<div class="panel-cards"><span class="eyebrow">Cards · ${p.cards.length}</span>${bonusStacks(p)}</div><div class="panel-reserved"><span class="eyebrow">Reserved · ${p.reserved.length}/${RULES.reserveLimit}</span>${reservedSlots(p)}</div></div>${active && client.canAct && g.phase !== 'action' && !g.over ? '<button class="primary resolve-turn" id="resolve">Continue turn →</button>' : ''}</section>`;
  }
  function reservedSlots(p) {
    const active = p === current(g) && client.canAct;
    return `<div class="reserve-slots">${Array.from({ length: RULES.reserveLimit }, (_, i) => {
      const c = p.reserved[i];
      if (!c) return '<div class="reserve-slot">+</div>';
      if (!active)
        return '<div class="reserve-slot filled reserved-back" aria-label="Reserved card"><span>···</span></div>';
      return `<button class="reserve-slot filled" data-card="${c.id}" aria-label="Select reserved ${c.color} card, ${c.points} prestige"><i class="dot" style="${gem(c.color)}"></i><span>${c.points} pt · L${c.level}</span></button>`;
    }).join('')}</div>`;
  }
  function board() {
    const n = g.players.length;
    return `<main class="arena-scroll canvas-viewport" aria-label="Game table canvas" tabindex="0" aria-describedby="canvas-help"><span id="canvas-help" class="sr-only">Scroll to zoom the table around your cursor. Drag empty space to pan. Use plus and minus to zoom, zero to fit, or arrow keys to pan.</span><div class="canvas-world"><div class="table-layout players-${n}">${playerPanel(n === 2 ? 1 : 2, 'top')}${n === 4 ? playerPanel(3, 'left') : ''}${n >= 3 ? playerPanel(1, 'right') : ''}<section class="market"><div class="section-line"><h2>Nobles</h2><span>3 prestige each</span></div><div class="nobles">${g.nobles.map(noble).join('')}</div><div class="section-line"><h2>Development cards</h2><span>Buy or reserve a card</span></div><div class="market-with-supply"><div class="development-grid">${[2, 1, 0].map((l) => `<div class="market-row"><button class="deck" data-deck="${l}" aria-label="Reserve a hidden level ${l + 1} card; ${g.decks[l].length} remaining" ${!g.decks[l].length ? 'disabled' : ''}><span class="level-dots">${'●'.repeat(l + 1)}</span><b>${g.decks[l].length}</b><small>LEVEL ${l + 1}</small></button>${g.market[l].map(card).join('')}</div>`).join('')}</div><section class="supply"><div class="section-line"><h2>Gem supply</h2></div><div class="tokens">${ALL.map((c, i) => `<div class="token-wrap"><button class="token ${pick[i] ? 'picked' : ''}" style="${gem(c)}" data-token="${i}" aria-label="${names[c]}, ${g.bank[i]} available${pick[i] ? `, ${pick[i]} selected` : ''}" ${i === 5 || !g.bank[i] || g.phase !== 'action' || !client.canAct ? 'disabled' : ''}><span class="supply-gem" aria-hidden="true"></span><span class="bank-count">${g.bank[i]}</span>${pick[i] ? `<span class="picked-count">${pick[i]}</span>` : ''}</button><div class="token-name">${names[c]}</div></div>`).join('')}</div></section></div></section>${playerPanel(0, 'bottom')}</div></div><div class="canvas-controls" aria-label="Canvas zoom controls">${iconButton('minus', 'Zoom out', 'data-zoom="out"')}${iconButton('plus', 'Zoom in', 'data-zoom="in"')}${iconButton('fit', 'Fit table', 'data-zoom="fit"')}</div></main>`;
  }
  function right() {
    if (!utility) return '';
    return `<aside class="inspector right utility-open" aria-label="${utility === 'rules' ? 'How to play' : utility === 'setup' ? 'Table setup' : 'Table activity'}"><div class="sidebar-toolbar">${iconButton('close', 'Close panel', 'id="close-utility"')}</div><div id="utility-content">${utility === 'setup' ? renderSetup({ playerCount: setupCount, playerNames: setupNames, canStart: client.canStart, canSaveNames: client.canEditNames && setupCount === g.players.length }) : utility === 'activity' ? renderActivity(g) : renderRules()}</div></aside>`;
  }
  function cardPopover() {
    const c = selectedCard(),
      p = current(g);
    if (!c && selectedDeck === null) return '';
    const reserved = !!c && p.reserved.some((r) => r.id === c.id),
      canBuy = !!c && affordable(p, c) && client.canAct && g.phase === 'action',
      canReserve =
        !reserved &&
        p.reserved.length < RULES.reserveLimit &&
        client.canAct &&
        g.phase === 'action';
    return `${connectionLayer('card-connections', ['<path data-card-line="purchase"/><path data-card-line="reserve"/>'])}<section id="card-popover" class="card-popover compact-actions connected-actions" popover="auto" role="dialog" aria-label="Card actions"><div class="card-action-row"><button class="primary" id="purchase" ${canBuy ? '' : 'disabled'} title="${canBuy ? 'Buy this card using your gems and gold' : !c ? 'Select a face-up or reserved card to buy' : 'Not enough gems to buy this card'}">Buy</button><button id="${c ? 'reserve' : 'confirm-deck'}" ${canReserve ? '' : 'disabled'} title="${reserved ? 'This card is already reserved' : p.reserved.length >= RULES.reserveLimit ? 'Your three reserve slots are full' : 'Reserve this card and take gold if available'}">Reserve</button></div></section>`;
  }
  function positionPopover() {
    const popup = document.querySelector('#card-popover');
    if (!popup || !popup.matches(':popover-open')) return;
    const anchor = selected
      ? document.querySelector(`.canvas-world [data-card="${selected}"]`)
      : document.querySelector(`[data-deck="${selectedDeck}"]`);
    if (!anchor) return;
    const canvas = document.querySelector('.canvas-viewport').getBoundingClientRect(),
      a = anchor.getBoundingClientRect(),
      r = popup.getBoundingClientRect(),
      pad = 12;
    const protectedAreas = [
      ...document.querySelectorAll(
        '.canvas-world .card-top,.canvas-world .costs,.canvas-world .requirements,.canvas-world .supply,.canvas-world .seat-panel,.canvas-world .round-display,.canvas-controls',
      ),
    ].map((el) => {
      const b = el.getBoundingClientRect();
      return {
        left: b.left,
        top: b.top,
        right: b.right,
        bottom: b.bottom,
        weight: el.matches('.card-top,.costs,.requirements') ? 12 : 3,
      };
    });
    const position = placeCardActions(
      a,
      { width: r.width, height: r.height },
      {
        left: Math.max(pad, canvas.left + pad),
        top: Math.max(64, canvas.top + pad),
        right: Math.min(innerWidth - pad, canvas.right - pad),
        bottom: Math.min(innerHeight - pad, canvas.bottom - pad),
      },
      protectedAreas,
      32,
    );
    popup.style.left = `${position.x}px`;
    popup.style.top = `${position.y}px`;
    popup.dataset.side = position.side;
    popup.querySelectorAll('button').forEach((button, i) => {
      const line = document.querySelector(`[data-card-line="${i === 0 ? 'purchase' : 'reserve'}"]`);
      line.style.setProperty('--gem', 'var(--accent)');
      connectRects(line, a, button.getBoundingClientRect(), position.side);
    });
  }
  function closeCard() {
    selected = null;
    selectedDeck = null;
    render();
  }
  function showCardPopover() {
    const popup = document.querySelector('#card-popover');
    if (!popup) return;
    document.querySelector('#card-connections').showPopover();
    popup.showPopover();
    positionPopover();
    popup.addEventListener('toggle', (e) => {
      if (e.newState === 'closed') document.querySelector('#card-connections')?.hidePopover();
      if (e.newState === 'closed' && popup.isConnected) closeCard();
    });
    popup
      .querySelector('#confirm-deck')
      ?.addEventListener('click', () => transact(COMMANDS.RESERVE_CARD, { level: selectedDeck }));
  }
  function connectionLayer(id, paths) {
    return `<div id="${id}" class="action-connections" popover="manual" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">${paths.join('')}</svg></div>`;
  }
  function connectRects(line, source, target, side, offset = 0.5) {
    let start,
      end,
      orientation = 'horizontal';
    if (side === 'top' || side === 'bottom') {
      const above = side === 'top';
      start = { x: (source.left + source.right) / 2, y: above ? source.top : source.bottom };
      end = {
        x: target.left + (target.right - target.left) * offset,
        y: above ? target.bottom : target.top,
      };
      orientation = 'vertical';
    } else {
      const right = side === 'right';
      start = { x: right ? source.right : source.left, y: (source.top + source.bottom) / 2 };
      end = {
        x: right ? target.left : target.right,
        y: target.top + (target.bottom - target.top) * offset,
      };
    }
    line.setAttribute('d', gemConnection(start, end, orientation));
  }
  function gemPopover() {
    if (!total(pick) || !client.canAct || g.phase !== 'action') return '';
    return `${connectionLayer(
      'gem-connections',
      pick.map((v, i) => (v ? `<path data-line="${i}" style="${gem(COLORS[i])}"/>` : '')),
    )}<section id="gem-popover" class="gem-popover connected-actions" popover="manual" role="dialog" aria-label="Gem action"><button class="primary" id="collect" ${validGemSelection(pick, g.bank) ? '' : 'disabled'} title="Choose 3 different gems or 2 matching gems">Collect gems</button></section>`;
  }
  function positionGemPopover() {
    const popup = document.querySelector('#gem-popover');
    if (!popup || !popup.matches(':popover-open')) return;
    const supply = document.querySelector('.supply').getBoundingClientRect(),
      size = popup.getBoundingClientRect(),
      canvas = document.querySelector('.canvas-viewport').getBoundingClientRect(),
      rail = document.querySelector('.floating-tools').getBoundingClientRect();
    const protectedAreas = [
      ...document.querySelectorAll(
        '.canvas-world .card-top,.canvas-world .costs,.canvas-world .requirements,.canvas-world .noble .points,.canvas-world .seat-panel,.canvas-controls,.inspector.right',
      ),
    ].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        weight: el.matches('.card-top,.costs,.requirements,.points') ? 12 : 4,
      };
    });
    let position = placeCardActions(
      supply,
      { width: size.width, height: size.height },
      {
        left: Math.max(rail.right + 12, canvas.left + 12),
        top: 64,
        right: Math.min(innerWidth - 12, canvas.right - 12),
        bottom: Math.min(innerHeight - 12, canvas.bottom - 12),
      },
      protectedAreas,
      32,
    );
    const freeX = supply.right + 32,
      freeYs = [supply.top, ...protectedAreas.map((area) => area.top - size.height - 14)]
        .filter((y) => y >= 64 && y + size.height <= innerHeight - 12)
        .sort((a, b) => Math.abs(a - supply.top) - Math.abs(b - supply.top));
    if (freeX + size.width <= Math.min(innerWidth - 12, canvas.right - 12)) {
      const freeY = freeYs.find(
        (y) =>
          !protectedAreas.some(
            (area) =>
              freeX < area.right &&
              freeX + size.width > area.left &&
              y < area.bottom &&
              y + size.height > area.top,
          ),
      );
      if (freeY !== undefined) position = { x: freeX, y: freeY, side: 'right' };
    }
    popup.style.left = `${position.x}px`;
    popup.style.top = `${position.y}px`;
    popup.dataset.side = position.side;
    const chosen = pick.flatMap((v, i) => (v ? [i] : []));
    const target = popup.querySelector('#collect').getBoundingClientRect();
    chosen.forEach((i, index) => {
      const token = document.querySelector(`[data-token="${i}"]`).getBoundingClientRect();
      connectRects(
        document.querySelector(`[data-line="${i}"]`),
        token,
        target,
        position.side,
        (index + 1) / (chosen.length + 1),
      );
    });
  }

  function showGemPopover() {
    const popup = document.querySelector('#gem-popover');
    if (!popup) return;
    document.querySelector('#gem-connections').showPopover();
    popup.showPopover();
    positionGemPopover();
  }
  function render() {
    unmountCanvas();
    app.innerHTML = `<div class="table-app" style="--accent:${PLAYER_COLORS[g.current]}">${header()}${floatingTools()}<div class="workspace">${board()}${right()}${cardPopover()}${gemPopover()}</div></div>`;
    bind();
    unmountCanvas = mountCanvas(
      document.querySelector('.canvas-viewport'),
      document.querySelector('.canvas-world'),
      document.querySelector('.canvas-controls'),
      canvasView,
      (next) => {
        canvasView = next;
        positionPopover();
        positionGemPopover();
      },
    );
    showCardPopover();
    showGemPopover();
  }
  function openModal(html) {
    dialog.innerHTML = html;
    dialog.showModal();
  }
  async function transact(type, payload) {
    pick = Array(5).fill(0);
    selected = null;
    selectedDeck = null;
    if (await runCommand(type, payload)) {
      if (g.phase === 'resolve') await resolveTurn();
    }
  }
  async function resolveTurn() {
    if (g.over) return;
    const p = current(g);
    if (total(p.tokens) > RULES.tokenLimit) {
      let returns = Array(6).fill(0);
      const draw = () => {
        dialog.innerHTML = `<h2>Return excess tokens</h2><p>You have ${total(p.tokens)} tokens. Return ${total(p.tokens) - RULES.tokenLimit} to finish your turn.</p>${ALL.map((c, i) => `<div class="return-row"><span><i class="dot" style="${gem(c)}"></i> ${names[c]} (${p.tokens[i]})</span><div><button data-return="${i}" data-delta="-1" aria-label="Return fewer ${c}">−</button> <span>${returns[i]}</span> <button data-return="${i}" data-delta="1" aria-label="Return one ${c}">+</button></div></div>`).join('')}<button class="primary wide" id="confirm-return" ${total(returns) !== total(p.tokens) - RULES.tokenLimit ? 'disabled' : ''}>Return ${total(returns)} tokens</button>`;
        dialog.querySelectorAll('[data-return]').forEach(
          (b) =>
            (b.onclick = () => {
              const i = +b.dataset.return;
              returns[i] = Math.max(0, Math.min(p.tokens[i], returns[i] + +b.dataset.delta));
              draw();
            }),
        );
        dialog.querySelector('#confirm-return').onclick = async () => {
          if (await runCommand(COMMANDS.RETURN_TOKENS, { tokens: returns })) {
            dialog.close();
            await resolveTurn();
          }
        };
      };
      dialog.showModal();
      draw();
      return;
    }
    const candidates = g.phase === 'claimed' ? [] : eligible(g);
    if (candidates.length) {
      openModal(
        `<h2>A noble is visiting</h2><p>Choose one noble to join your collection for 3 prestige.</p>${candidates
          .map(
            (n) =>
              `<button class="noble-choice" data-noble="${n.id}">+3 prestige · ${n.cost
                .map((v, i) => (v ? `${v} ${names[COLORS[i]]}` : ''))
                .filter(Boolean)
                .join(' / ')}</button>`,
          )
          .join('')}`,
      );
      dialog.querySelectorAll('[data-noble]').forEach(
        (b) =>
          (b.onclick = async () => {
            if (await runCommand(COMMANDS.CLAIM_NOBLE, { nobleId: b.dataset.noble })) {
              dialog.close();
              await resolveTurn();
            }
          }),
      );
      return;
    }
    if (!(await runCommand(COMMANDS.END_TURN))) return;
    if (g.over) {
      openModal(
        `<h2>${winners(g).length > 1 ? 'A shared victory' : esc(winners(g)[0].name) + ' wins'}</h2><p>${winners(
          g,
        )
          .map((p) => esc(p.name))
          .join(
            ' & ',
          )} finished with ${winners(g)[0].score} prestige.</p>${g.players.map((p) => `<div class="control"><span>${esc(p.name)}</span><b>${p.score} pt · ${p.cards.length} cards</b></div>`).join('')}<button class="primary wide" id="close-results">View the table</button>`,
      );
      dialog.querySelector('#close-results').onclick = () => dialog.close();
    } else {
      notice(`${current(g).name}’s turn${g.final ? ' · Final round' : ''}`);
    }
  }
  function purchase() {
    const c = selectedCard();
    if (!c || !affordable(current(g), c)) return;
    transact(COMMANDS.BUY_CARD, { cardId: c.id });
  }
  function bind() {
    document.querySelectorAll('[data-utility]').forEach(
      (b) =>
        (b.onclick = () => {
          const next = utility === b.dataset.utility ? null : b.dataset.utility;
          utility = next;
          pick = Array(5).fill(0);
          selected = null;
          selectedDeck = null;
          if (location.hash === '#rules' && next !== 'rules') historyReplace();
          render();
        }),
    );
    document.querySelector('#close-utility')?.addEventListener('click', closeUtility);
    document.querySelector('#back-table')?.addEventListener('click', closeUtility);
    document.querySelector('#players')?.addEventListener('change', (e) => {
      document
        .querySelectorAll('[data-name]')
        .forEach((el) => (setupNames[+el.dataset.name] = el.value));
      setupCount = +e.target.value;
      render();
    });
    document
      .querySelectorAll('[data-name]')
      .forEach((el) => (el.oninput = () => (setupNames[+el.dataset.name] = el.value)));
    document.querySelector('#save-names')?.addEventListener('click', async () => {
      try {
        await client.updateNames(setupNames.slice(0, setupCount));
        g = client.getSnapshot();
        setupNames = g.players.map((p) => p.name);
        render();
        notice('Player names saved.');
      } catch (error) {
        notice(error.message);
      }
    });
    document.querySelector('#new-game')?.addEventListener('click', () => {
      openModal(
        `<h2>Start a new table?</h2><p>Start a fresh game for ${setupCount} players. This replaces the current saved game.</p><div class="button-row"><button id="cancel-new">Keep playing</button><button class="primary" id="confirm-new">Start ${setupCount}-player game</button></div>`,
      );
      dialog.querySelector('#cancel-new').onclick = () => dialog.close();
      dialog.querySelector('#confirm-new').onclick = async () => {
        canvasView = { scale: 1, x: 0, y: 0, autoFit: true };
        try {
          await client.start(
            Array.from(
              { length: setupCount },
              (_, i) => setupNames[i]?.trim() || `Player ${i + 1}`,
            ),
          );
        } catch (e) {
          notice(e.message);
          return;
        }
        g = client.getSnapshot();
        pick = Array(5).fill(0);
        selected = null;
        selectedDeck = null;
        utility = null;
        dialog.close();
        historyReplace();
        render();
        notice('New table ready. Seat 1 starts.');
      };
    });
    document.querySelectorAll('[data-card]').forEach(
      (b) =>
        (b.onclick = () => {
          if (!client.canAct || g.phase !== 'action') return;
          selected = selected === b.dataset.card ? null : b.dataset.card;
          selectedDeck = null;
          utility = null;
          pick = Array(5).fill(0);
          render();
        }),
    );
    document.querySelectorAll('[data-token]').forEach(
      (b) =>
        (b.onclick = () => {
          const i = +b.dataset.token;
          pick[i] = (pick[i] + 1) % 3;
          utility = null;
          selected = null;
          selectedDeck = null;
          render();
        }),
    );
    document
      .querySelector('#collect')
      ?.addEventListener('click', () => transact(COMMANDS.TAKE_GEMS, { tokens: pick }));
    document.querySelector('#clear')?.addEventListener('click', () => {
      pick = Array(5).fill(0);
      selected = null;
      selectedDeck = null;
      render();
    });
    document.querySelector('#purchase')?.addEventListener('click', purchase);
    document
      .querySelector('#reserve')
      ?.addEventListener('click', () => transact(COMMANDS.RESERVE_CARD, { cardId: selected }));
    document.querySelectorAll('[data-deck]').forEach(
      (b) =>
        (b.onclick = () => {
          if (!client.canAct || g.phase !== 'action') return;
          pick = Array(5).fill(0);
          selected = null;
          selectedDeck = +b.dataset.deck;
          utility = null;
          render();
        }),
    );
    document.querySelector('#resolve')?.addEventListener('click', resolveTurn);
    for (const action of ['undo', 'redo']) {
      document.querySelector(`#${action}`).onclick = async () => {
        if (!(action === 'undo' ? client.canUndo : client.canRedo)) return;
        try {
          await client[action]();
          g = client.getSnapshot();
          pick = Array(5).fill(0);
          selected = null;
          selectedDeck = null;
          dialog.close();
          render();
          notice(action === 'undo' ? 'Last action undone.' : 'Last action restored.');
        } catch (e) {
          notice(e.message);
        }
      };
    }
  }

  function historyReplace() {
    window.history.replaceState(null, '', location.pathname + location.search + '#table');
  }
  function closeUtility() {
    utility = null;
    historyReplace();
    render();
  }
  const onDocumentClick = (e) => {
    if (total(pick) && !e.target.closest('#gem-popover,[data-token],[data-zoom]')) {
      pick = Array(5).fill(0);
      render();
    }
  };
  const onHashChange = () => {
    utility = location.hash === '#rules' ? 'rules' : null;
    render();
  };
  const onKeyDown = (e) => {
    if (e.key === 'Escape' && !dialog.open) {
      if (selected || selectedDeck !== null) {
        e.preventDefault();
        closeCard();
      } else if (total(pick)) {
        e.preventDefault();
        pick = Array(5).fill(0);
        render();
      } else if (utility) closeUtility();
    }
  };
  const onStorageError = () => notice('Your browser could not save this game.');
  document.addEventListener('blendor:storage-error', onStorageError);
  document.addEventListener('click', onDocumentClick);
  window.addEventListener('hashchange', onHashChange);
  window.addEventListener('keydown', onKeyDown);
  const unsubscribe = client.subscribe((snapshot) => {
    g = snapshot;
    render();
  });
  if (location.hash === '#rules') utility = 'rules';
  render();
  return {
    dispose() {
      unsubscribe();
      unmountCanvas();
      client.dispose();
      document.removeEventListener('blendor:storage-error', onStorageError);
      document.removeEventListener('click', onDocumentClick);
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('keydown', onKeyDown);
    },
  };
}
