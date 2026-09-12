import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as deckModule from '../src/lib/deck';
import type { Card } from '../src/lib/game-logic';
import { HostAuthorityManager } from '../src/lib/online/authority';
import type { GuestMessage, HostMessage, PublicGameState } from '../src/lib/online/types';

class MockDataChannelBridge {
  private hostListener: ((msg: unknown) => void) | null = null;
  private guestListener: ((msg: unknown) => void) | null = null;

  setHostListener(fn: (msg: unknown) => void) {
    this.hostListener = fn;
  }

  setGuestListener(fn: (msg: unknown) => void) {
    this.guestListener = fn;
  }

  sendToGuest(msg: unknown) {
    // Simulate JSON transmission
    const serialized = JSON.parse(JSON.stringify(msg));
    this.guestListener?.(serialized);
  }

  sendToHost(msg: unknown) {
    const serialized = JSON.parse(JSON.stringify(msg));
    this.hostListener?.(serialized);
  }
}

describe('Online P2P full synchronization & lifecycle integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('synchronizes a full Blackjack round between Host and Guest with information hiding and scores', () => {
    // Controlled deck pops in order:
    // 1st pop -> P1 card 1 (10)
    // 2nd pop -> P1 card 2 (9) -> P1 score: 19
    // 3rd pop -> P2 card 1 (8)
    // 4th pop -> P2 card 2 (7) -> P2 score: 15
    // 5th pop -> Dealer card 1 (10, upcard)
    // 6th pop -> Dealer card 2 (6, hole card) -> Dealer score: 16
    // 7th pop -> P2 hit card (5) -> P2 score: 20
    // 8th pop -> Dealer draw card (2) -> Dealer score: 18 (stands on 17+)
    const deck: Card[] = [
      { label: '2', value: 2, name: 'DealerHitCard', symbol: '♠', color: 'black' },
      { label: '5', value: 5, name: 'P2HitCard', symbol: '♥', color: 'red' },
      { label: '6', value: 6, name: 'DealerSecretHoleCard', symbol: '♦', color: 'red' },
      { label: '10', value: 10, name: 'DealerUpcard', symbol: '♣', color: 'black' },
      { label: '7', value: 7, name: 'P2Card2', symbol: '♠', color: 'black' },
      { label: '8', value: 8, name: 'P2Card1', symbol: '♦', color: 'red' },
      { label: '9', value: 9, name: 'P1Card2', symbol: '♥', color: 'red' },
      { label: '10', value: 10, name: 'P1Card1', symbol: '♣', color: 'black' },
    ];
    vi.spyOn(deckModule, 'createDeck').mockReturnValue(deck);

    const bridge = new MockDataChannelBridge();
    let guestReceivedState: PublicGameState | null = null;
    let guestReceivedRejection: string | null = null;

    bridge.setGuestListener((rawMsg) => {
      const msg = rawMsg as HostMessage;
      if (msg.type === 'sync_state') {
        guestReceivedState = msg.state;
      } else if (msg.type === 'action_rejected') {
        guestReceivedRejection = msg.reason;
      }
    });

    const host = new HostAuthorityManager(
      (publicState) => {
        bridge.sendToGuest({ type: 'sync_state', version: 1, state: publicState });
      },
      (reason) => {
        bridge.sendToGuest({ type: 'action_rejected', reason });
      },
    );

    bridge.setHostListener((rawMsg) => {
      host.handleGuestMessage(rawMsg as GuestMessage);
    });

    // 1. Initial State Sync
    expect(host.getCanonicalState().phase).toBe('idle');

    // 2. Both indicate Ready
    host.hostToggleReady();
    bridge.sendToHost({ type: 'guest_intent', version: 1, action: 'ready', value: true });

    expect(guestReceivedState?.hostReady).toBe(true);
    expect(guestReceivedState?.guestReady).toBe(true);

    // 3. Host Deals Round
    host.hostDeal();

    expect(guestReceivedState).not.toBeNull();
    expect(guestReceivedState!.phase).toBe('player-turn');
    expect(guestReceivedState!.p1.score).toBe(19);
    expect(guestReceivedState!.p2.score).toBe(15);
    // Crucial check: Dealer hole card is masked!
    expect(guestReceivedState!.dealer.hasHiddenCard).toBe(true);
    expect(guestReceivedState!.dealer.cards[1].label).toBe('?');
    expect(guestReceivedState!.dealer.score).toBe(10); // only upcard visible

    // Verify Guest trying to hit out-of-turn is rejected
    bridge.sendToHost({ type: 'guest_intent', version: 1, action: 'hit' });
    expect(guestReceivedRejection).toContain('Player 2 turn');

    // 4. Host stands on 19
    host.hostStand();

    expect(guestReceivedState!.phase).toBe('p2-turn');

    // 5. Guest hits (draws 5, total becomes 20)
    bridge.sendToHost({ type: 'guest_intent', version: 1, action: 'hit' });

    expect(guestReceivedState!.p2.score).toBe(20);
    expect(guestReceivedState!.phase).toBe('p2-turn');

    // 6. Guest stands on 20
    bridge.sendToHost({ type: 'guest_intent', version: 1, action: 'stand' });

    expect(guestReceivedState!.phase).toBe('dealer-turn');

    // 7. Dealer plays via Host autoplay timer
    // First step: dealer draws 2 -> score becomes 18 (10 + 6 + 2)
    vi.advanceTimersByTime(650);
    // Second step: dealer evaluates 18 >= 17 -> dealer stands and resolves round
    vi.advanceTimersByTime(650);

    expect(guestReceivedState!.phase).toBe('round-ended');
    expect(guestReceivedState!.gameOver).toBe(true);
    // Hole card revealed!
    expect(guestReceivedState!.dealer.hasHiddenCard).toBe(false);
    expect(guestReceivedState!.dealer.score).toBe(18);
    expect(guestReceivedState!.dealer.cards.length).toBe(3);

    // Scoring verification:
    // P1 (19 vs 18) wins (+1 pt P1)
    // P2 (20 vs 18) wins (+1 pt P2)
    // Dealer (18 vs 19, 20) loses to both (0 pts)
    expect(guestReceivedState!.scoreboards.local.p1).toBe(1);
    expect(guestReceivedState!.scoreboards.local.p2).toBe(1);
    expect(guestReceivedState!.scoreboards.local.dealer).toBe(0);

    host.destroy();
  });
});
