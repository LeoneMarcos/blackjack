import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/hooks/useBlackjackGame';
import { createScoreboards, type Card } from '../src/lib/game-logic';
import { isHoleCardHidden, serializeCanonicalToPublic } from '../src/lib/online/serializer';
import { PROTOCOL_VERSION } from '../src/lib/online/types';

describe('Online canonical-to-public serializer & information hiding', () => {
  const secretHoleCard: Card = {
    label: 'K',
    value: 10,
    name: 'SecretSpades',
    symbol: '♠',
    color: 'black',
  };

  const visibleUpcard: Card = {
    label: '7',
    value: 7,
    name: 'VisibleHearts',
    symbol: '♥',
    color: 'red',
  };

  const undealtSecretDeck: Card[] = [
    { label: 'A', value: 11, name: 'SecretAce1', symbol: '♦', color: 'red' },
    { label: '9', value: 9, name: 'SecretNine2', symbol: '♣', color: 'black' },
    { label: '4', value: 4, name: 'SecretFour3', symbol: '♠', color: 'black' },
  ];

  const baseGameState: GameState = {
    dealer: {
      cards: [visibleUpcard, secretHoleCard],
      score: 17, // Full dealer score: 7 + 10 = 17
    },
    p1: {
      cards: [
        { label: '10', value: 10, name: 'Ten', symbol: '♠', color: 'black' },
        { label: '8', value: 8, name: 'Eight', symbol: '♥', color: 'red' },
      ],
      score: 18,
    },
    p2: {
      cards: [
        { label: '9', value: 9, name: 'Nine', symbol: '♦', color: 'red' },
        { label: '7', value: 7, name: 'Seven', symbol: '♣', color: 'black' },
      ],
      score: 16,
    },
    deck: undealtSecretDeck,
    phase: 'player-turn',
    npcActive: false,
    scoreboards: createScoreboards(),
    gameOver: false,
    notice: null,
  };

  it('correctly calculates hole card visibility based on phase and game status', () => {
    expect(isHoleCardHidden('player-turn', false, 2)).toBe(true);
    expect(isHoleCardHidden('p2-turn', false, 2)).toBe(true);
    expect(isHoleCardHidden('dealer-turn', false, 2)).toBe(false);
    expect(isHoleCardHidden('round-ended', true, 2)).toBe(false);
    expect(isHoleCardHidden('player-turn', true, 2)).toBe(false);
    expect(isHoleCardHidden('idle', false, 0)).toBe(false);
  });

  it('strictly conceals the deck, undealt cards, and dealer hole card during active play', () => {
    const publicState = serializeCanonicalToPublic(baseGameState, true, false, {
      host: false,
      guest: false,
    });

    // 1. Version check
    expect(publicState.version).toBe(PROTOCOL_VERSION);

    // 2. Deck field must NOT exist on publicState
    expect('deck' in publicState).toBe(false);

    // 3. Dealer hand verification
    expect(publicState.dealer.hasHiddenCard).toBe(true);
    expect(publicState.dealer.cards.length).toBe(2);
    expect(publicState.dealer.cards[0]).toEqual(visibleUpcard);
    expect(publicState.dealer.cards[1]).toEqual({
      label: '?',
      value: 0,
      isHidden: true,
    });
    // Visible score should only reflect upcard (7), not full 17!
    expect(publicState.dealer.score).toBe(7);

    // 4. JSON serialization string check:
    const serializedJson = JSON.stringify(publicState);

    // Assert that NONE of the secret hole card details leak
    expect(serializedJson).not.toContain('SecretSpades');
    expect(serializedJson).not.toContain('"score":17');

    // Assert that NONE of the undealt deck cards leak
    expect(serializedJson).not.toContain('SecretAce1');
    expect(serializedJson).not.toContain('SecretNine2');
    expect(serializedJson).not.toContain('SecretFour3');
    expect(serializedJson).not.toContain('"deck"');

    // Assert that no RNG metadata or arbitrary state leaked
    expect(serializedJson).not.toContain('random');
    expect(serializedJson).not.toContain('seed');
  });

  it('reveals the dealer hole card and actual score once dealer turn begins or round ends', () => {
    const revealedState: GameState = {
      ...baseGameState,
      phase: 'dealer-turn',
    };

    const publicState = serializeCanonicalToPublic(revealedState);
    expect(publicState.dealer.hasHiddenCard).toBe(false);
    expect(publicState.dealer.cards[1]).toEqual(secretHoleCard);
    expect(publicState.dealer.score).toBe(17);

    const serializedJson = JSON.stringify(publicState);
    expect(serializedJson).toContain('SecretSpades');
    expect(serializedJson).toContain('"score":17');
    // Deck is STILL never serialized!
    expect(serializedJson).not.toContain('SecretAce1');
    expect(serializedJson).not.toContain('"deck"');
  });
});
