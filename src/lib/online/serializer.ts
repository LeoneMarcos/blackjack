import type { GameState } from '../../hooks/useBlackjackGame';
import { calculateVisibleHandValue, type Card } from '../game-logic';
import {
  PROTOCOL_VERSION,
  type MaskedCard,
  type PublicDealerHand,
  type PublicGameState,
  type VisibleCard,
} from './types';

function cloneCard(card: Card): Card {
  return {
    label: card.label,
    value: card.value,
    ...(card.name ? { name: card.name } : {}),
    ...(card.symbol ? { symbol: card.symbol } : {}),
    ...(card.color ? { color: card.color } : {}),
  };
}

export function isHoleCardHidden(phase: string, gameOver: boolean, cardCount: number): boolean {
  return phase !== 'dealer-turn' && !gameOver && cardCount >= 2;
}

export function serializeCanonicalToPublic(
  canonical: GameState,
  hostReady = false,
  guestReady = false,
  rematchRequested = { host: false, guest: false },
): PublicGameState {
  const hidden = isHoleCardHidden(
    canonical.phase,
    canonical.gameOver,
    canonical.dealer.cards.length,
  );

  let dealerCards: VisibleCard[];
  let dealerScore: number | string;

  if (hidden) {
    // Only reveal the upcard (index 0). Index 1 (hole card) is strictly masked.
    const upcard = canonical.dealer.cards[0]
      ? cloneCard(canonical.dealer.cards[0])
      : { label: '?', value: 0 };
    const masked: MaskedCard = {
      label: '?',
      value: 0,
      isHidden: true,
    };
    dealerCards = [upcard, masked];
    dealerScore = calculateVisibleHandValue(canonical.dealer.cards, [1]);
  } else {
    dealerCards = canonical.dealer.cards.map(cloneCard);
    dealerScore = canonical.dealer.score;
  }

  const dealerHand: PublicDealerHand = {
    cards: dealerCards,
    score: dealerScore,
    hasHiddenCard: hidden,
  };

  return {
    version: PROTOCOL_VERSION,
    phase: canonical.phase,
    p1: {
      cards: canonical.p1.cards.map(cloneCard),
      score: canonical.p1.score,
    },
    p2: {
      cards: canonical.p2.cards.map(cloneCard),
      score: canonical.p2.score,
    },
    dealer: dealerHand,
    scoreboards: {
      local: { ...canonical.scoreboards.local },
      npc: { ...canonical.scoreboards.npc },
    },
    gameOver: canonical.gameOver,
    notice: canonical.notice ? { ...canonical.notice } : null,
    hostReady,
    guestReady,
    rematchRequested: { ...rematchRequested },
  };
}
