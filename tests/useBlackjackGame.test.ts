// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBlackjackGame } from '../src/hooks/useBlackjackGame';
import * as deckModule from '../src/lib/deck';
import type { Card } from '../src/lib/game-logic';

describe('useBlackjackGame dealer autoplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('continues dealer auto-play when drawing a card leaves score unchanged (soft Ace adjustment)', () => {
    // Controlled deck array (pops from end to beginning):
    // 1st pop -> P1 card 1 (10)
    // 2nd pop -> P1 card 2 (8) -> P1 score: 18
    // 3rd pop -> Dealer card 1 (Ace = 11)
    // 4th pop -> Dealer card 2 (5) -> Dealer score: 16
    // Next dealer step draw:
    // 5th pop -> 10 -> Dealer hand [Ace, 5, 10] evaluates to 16 (score unchanged!)
    // Next dealer step draw:
    // 6th pop -> 3 -> Dealer hand [Ace, 5, 10, 3] evaluates to 19 (dealer stands on 17+)
    const customDeck: Card[] = [
      { label: '3', value: 3, name: 'Hearts', symbol: '♥', color: 'red' },
      { label: '10', value: 10, name: 'Clubs', symbol: '♣', color: 'black' },
      { label: '5', value: 5, name: 'Diamonds', symbol: '♦', color: 'red' },
      { label: 'A', value: 11, name: 'Spades', symbol: '♠', color: 'black' },
      { label: '8', value: 8, name: 'Hearts', symbol: '♥', color: 'red' },
      { label: '10', value: 10, name: 'Spades', symbol: '♠', color: 'black' },
    ];

    vi.spyOn(deckModule, 'createDeck').mockReturnValue(customDeck);

    const { result } = renderHook(() => useBlackjackGame());

    // Deal the round
    act(() => {
      result.current.dealRound();
    });

    expect(result.current.state.phase).toBe('player-turn');
    expect(result.current.state.p1.score).toBe(18);
    expect(result.current.state.dealer.score).toBe(16);

    // Player 1 stands -> moves to dealer-turn
    act(() => {
      result.current.stand('p1');
    });

    expect(result.current.state.phase).toBe('dealer-turn');

    // First dealer step (650ms timeout)
    act(() => {
      vi.advanceTimersByTime(650);
    });

    // Dealer drew 10: hand has 3 cards, score is STILL 16 (Ace downgraded from 11 to 1)
    expect(result.current.state.dealer.cards.length).toBe(3);
    expect(result.current.state.dealer.score).toBe(16);
    expect(result.current.state.phase).toBe('dealer-turn');
    expect(result.current.state.gameOver).toBe(false);

    // Advance timers again by 650ms for the second dealer step (draws 3)
    act(() => {
      vi.advanceTimersByTime(650);
    });

    // Dealer drew 3: hand has 4 cards, score is 19.
    expect(result.current.state.dealer.cards.length).toBe(4);
    expect(result.current.state.dealer.score).toBe(19);

    // Advance timers by 650ms for the third dealer step (dealer stands on 17+ and resolves round)
    act(() => {
      vi.advanceTimersByTime(650);
    });

    expect(result.current.state.phase).toBe('round-ended');
    expect(result.current.state.gameOver).toBe(true);
  });
});
