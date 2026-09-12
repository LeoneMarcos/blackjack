import type { Card, GamePhase, Scoreboards } from '../game-logic';
import type { Hand, RoundNotice } from '../../hooks/useBlackjackGame';

export const PROTOCOL_VERSION = 1;

export type OnlineRole = 'host' | 'guest';

export type OnlineConnectionState =
  'idle' | 'creating' | 'waiting' | 'connecting' | 'connected' | 'disconnected' | 'error';

export type OnlineErrorCode =
  | 'room_full'
  | 'invalid_room'
  | 'signaling_closed'
  | 'connection_failed'
  | 'peer_left'
  | 'protocol_error';

export interface MaskedCard {
  label: '?';
  value: 0;
  isHidden: true;
}

export type VisibleCard = Card | MaskedCard;

export interface PublicDealerHand {
  cards: VisibleCard[];
  score: number | string;
  hasHiddenCard: boolean;
}

export interface PublicGameState {
  version: 1;
  phase: GamePhase;
  p1: Hand;
  p2: Hand;
  dealer: PublicDealerHand;
  scoreboards: Scoreboards;
  gameOver: boolean;
  notice: RoundNotice | null;
  hostReady: boolean;
  guestReady: boolean;
  rematchRequested: {
    host: boolean;
    guest: boolean;
  };
}

export type HostMessage =
  | { type: 'sync_state'; version: 1; state: PublicGameState }
  | { type: 'action_rejected'; version: 1; reason: string };

export type GuestAction = 'hit' | 'stand' | 'ready' | 'rematch';

export interface GuestIntentMessage {
  type: 'guest_intent';
  version: 1;
  action: GuestAction;
  value?: boolean;
}

export type GuestMessage = GuestIntentMessage;

export type GameplayMessage = HostMessage | GuestMessage;

function isValidCard(card: unknown): card is Card {
  if (!card || typeof card !== 'object' || Array.isArray(card)) return false;
  const c = card as Record<string, unknown>;
  return (
    typeof c.label === 'string' &&
    typeof c.value === 'number' &&
    typeof c.name === 'string' &&
    typeof c.symbol === 'string' &&
    (c.color === 'red' || c.color === 'black')
  );
}

function isValidMaskedCard(card: unknown): card is MaskedCard {
  if (!card || typeof card !== 'object' || Array.isArray(card)) return false;
  const c = card as Record<string, unknown>;
  return c.label === '?' && c.value === 0 && c.isHidden === true;
}

function isValidHand(hand: unknown): hand is Hand {
  if (!hand || typeof hand !== 'object' || Array.isArray(hand)) return false;
  const h = hand as Record<string, unknown>;
  return typeof h.score === 'number' && Array.isArray(h.cards) && h.cards.every(isValidCard);
}

function isValidPublicDealerHand(dealer: unknown): dealer is PublicDealerHand {
  if (!dealer || typeof dealer !== 'object' || Array.isArray(dealer)) return false;
  const d = dealer as Record<string, unknown>;
  return (
    (typeof d.score === 'number' || typeof d.score === 'string') &&
    typeof d.hasHiddenCard === 'boolean' &&
    Array.isArray(d.cards) &&
    d.cards.every((c) => isValidCard(c) || isValidMaskedCard(c))
  );
}

function isValidScoreboards(scoreboards: unknown): scoreboards is Scoreboards {
  if (!scoreboards || typeof scoreboards !== 'object' || Array.isArray(scoreboards)) return false;
  const s = scoreboards as Record<string, unknown>;
  if (!s.npc || typeof s.npc !== 'object' || !s.local || typeof s.local !== 'object') return false;
  const npc = s.npc as Record<string, unknown>;
  const local = s.local as Record<string, unknown>;
  return (
    typeof npc.p1 === 'number' &&
    typeof npc.bot === 'number' &&
    typeof npc.dealer === 'number' &&
    typeof npc.ties === 'number' &&
    typeof local.p1 === 'number' &&
    typeof local.p2 === 'number' &&
    typeof local.dealer === 'number' &&
    typeof local.ties === 'number'
  );
}

export function isPublicGameState(state: unknown): state is PublicGameState {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return false;
  const s = state as Record<string, unknown>;

  // Strictly forbid leaking deck or RNG state
  if ('deck' in s || 'rng' in s || 'seed' in s) return false;

  const allowedPhases: GamePhase[] = [
    'idle',
    'player-turn',
    'p2-turn',
    'dealer-turn',
    'round-ended',
  ];
  if (typeof s.phase !== 'string' || !allowedPhases.includes(s.phase as GamePhase)) return false;

  if (s.version !== PROTOCOL_VERSION) return false;
  if (!isValidHand(s.p1)) return false;
  if (!isValidHand(s.p2)) return false;
  if (!isValidPublicDealerHand(s.dealer)) return false;
  if (!isValidScoreboards(s.scoreboards)) return false;
  if (typeof s.gameOver !== 'boolean') return false;
  if (typeof s.hostReady !== 'boolean') return false;
  if (typeof s.guestReady !== 'boolean') return false;

  if (
    s.notice !== null &&
    (typeof s.notice !== 'object' ||
      Array.isArray(s.notice) ||
      typeof (s.notice as Record<string, unknown>).winner !== 'string' ||
      typeof (s.notice as Record<string, unknown>).message !== 'string')
  ) {
    return false;
  }

  if (
    !s.rematchRequested ||
    typeof s.rematchRequested !== 'object' ||
    Array.isArray(s.rematchRequested) ||
    typeof (s.rematchRequested as Record<string, unknown>).host !== 'boolean' ||
    typeof (s.rematchRequested as Record<string, unknown>).guest !== 'boolean'
  ) {
    return false;
  }

  const allowedKeys = [
    'version',
    'phase',
    'p1',
    'p2',
    'dealer',
    'scoreboards',
    'gameOver',
    'notice',
    'hostReady',
    'guestReady',
    'rematchRequested',
  ];
  return Object.keys(s).every((key) => allowedKeys.includes(key));
}

export function isGuestIntentMessage(msg: unknown): msg is GuestIntentMessage {
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return false;
  const m = msg as Record<string, unknown>;
  if (m.type !== 'guest_intent') return false;
  if (m.version !== PROTOCOL_VERSION) return false;

  const allowedActions: GuestAction[] = ['hit', 'stand', 'ready', 'rematch'];
  if (typeof m.action !== 'string' || !allowedActions.includes(m.action as GuestAction)) {
    return false;
  }

  const allowedKeys = ['type', 'version', 'action', 'value'];
  if (!Object.keys(m).every((k) => allowedKeys.includes(k))) {
    return false;
  }

  if (m.value !== undefined && typeof m.value !== 'boolean') {
    return false;
  }

  if (m.action !== 'ready' && m.value !== undefined) {
    return false;
  }

  return true;
}

export function isHostMessage(msg: unknown): msg is HostMessage {
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return false;
  const m = msg as Record<string, unknown>;

  if (m.version !== PROTOCOL_VERSION) return false;

  if (m.type === 'action_rejected') {
    const allowedKeys = ['type', 'version', 'reason'];
    if (!Object.keys(m).every((k) => allowedKeys.includes(k))) return false;
    return typeof m.reason === 'string';
  }

  if (m.type === 'sync_state') {
    const allowedKeys = ['type', 'version', 'state'];
    if (!Object.keys(m).every((k) => allowedKeys.includes(k))) return false;
    return isPublicGameState(m.state);
  }

  return false;
}
