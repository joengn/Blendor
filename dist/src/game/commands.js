import { current, take, reserve, buy, paymentFor, returnTokens, claim, finish } from './engine.js';

export const COMMANDS = Object.freeze({
  TAKE_GEMS: 'TAKE_GEMS',
  BUY_CARD: 'BUY_CARD',
  RESERVE_CARD: 'RESERVE_CARD',
  RETURN_TOKENS: 'RETURN_TOKENS',
  CLAIM_NOBLE: 'CLAIM_NOBLE',
  END_TURN: 'END_TURN',
});
export const PRIMARY_ACTIONS = new Set([
  COMMANDS.TAKE_GEMS,
  COMMANDS.BUY_CARD,
  COMMANDS.RESERVE_CARD,
]);

/** Run on the authoritative state. A future server must derive authenticatedPlayerId from its session. */
export function applyCommand(state, command, { authenticatedPlayerId } = {}) {
  if (!command || typeof command.id !== 'string' || !command.id || command.id.length > 128)
    throw new Error('A valid command ID is required.');
  if (!authenticatedPlayerId || authenticatedPlayerId !== command.actorId)
    throw new Error('Player identity does not match the authenticated session.');
  const previous = state.appliedCommands?.find((entry) => entry.id === command.id);
  if (previous) {
    if (previous.actorId !== command.actorId)
      throw new Error('Command ID belongs to another player.');
    return structuredClone(state);
  }
  if (!Number.isInteger(command.expectedRevision) || command.expectedRevision !== state.revision)
    throw new Error('The game changed. Refresh the state and try again.');
  if (current(state).id !== command.actorId) throw new Error('It is not your turn.');
  const next = structuredClone(state),
    payload = command.payload ?? {};
  switch (command.type) {
    case COMMANDS.TAKE_GEMS:
      if (!Array.isArray(payload.tokens)) throw new Error('Select gem tokens.');
      take(next, payload.tokens);
      break;
    case COMMANDS.BUY_CARD: {
      const card = [...next.market.flat(), ...current(next).reserved].find(
        (c) => c?.id === payload.cardId,
      );
      if (!card) throw new Error('This card is no longer available.');
      buy(next, card.id, payload.payment ?? paymentFor(current(next), card));
      break;
    }
    case COMMANDS.RESERVE_CARD:
      if (
        payload.level !== undefined &&
        (!Number.isInteger(payload.level) || payload.level < 0 || payload.level > 2)
      )
        throw new Error('Select a valid deck.');
      reserve(next, payload.cardId, payload.level);
      break;
    case COMMANDS.RETURN_TOKENS:
      if (!Array.isArray(payload.tokens)) throw new Error('Choose tokens to return.');
      returnTokens(next, payload.tokens);
      break;
    case COMMANDS.CLAIM_NOBLE:
      claim(next, payload.nobleId);
      break;
    case COMMANDS.END_TURN:
      finish(next);
      break;
    default:
      throw new Error('Unknown game command.');
  }
  next.revision = state.revision + 1;
  next.appliedCommands = [
    ...(state.appliedCommands ?? []),
    { id: command.id, actorId: command.actorId },
  ].slice(-100);
  return next;
}
