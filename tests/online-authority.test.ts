import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as deckModule from '../src/lib/deck';
import type { Card } from '../src/lib/game-logic';
import { HostAuthorityManager } from '../src/lib/online/authority';
import {
  isGuestIntentMessage,
  isHostMessage,
  isPublicGameState,
  type PublicGameState,
} from '../src/lib/online/types';

describe('HostAuthorityManager & negative authority validation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('gates hostDeal on both players being ready', () => {
    const deterministicDeck: Card[] = [
      { label: '8', value: 8, name: 'Dealer hole', symbol: '♦', color: 'red' },
      { label: '9', value: 9, name: 'Dealer upcard', symbol: '♠', color: 'black' },
      { label: '7', value: 7, name: 'P2 second', symbol: '♥', color: 'red' },
      { label: '8', value: 8, name: 'P2 first', symbol: '♣', color: 'black' },
      { label: '7', value: 7, name: 'P1 second', symbol: '♦', color: 'red' },
      { label: '8', value: 8, name: 'P1 first', symbol: '♠', color: 'black' },
    ];
    vi.spyOn(deckModule, 'createDeck').mockReturnValue(deterministicDeck);

    let lastRejectionReason = '';
    const host = new HostAuthorityManager(
      () => {},
      (reason) => {
        lastRejectionReason = reason;
      },
    );

    // Initial state: neither is ready
    expect(host.isHostReady()).toBe(false);
    expect(host.isGuestReady()).toBe(false);
    expect(host.hostDeal()).toBe(false);
    expect(lastRejectionReason).toContain('Both players must be ready');

    // Only host ready
    host.hostToggleReady();
    expect(host.isHostReady()).toBe(true);
    expect(host.isGuestReady()).toBe(false);
    expect(host.hostDeal()).toBe(false);

    // Only guest ready
    host.hostToggleReady(); // host now unready
    host.handleGuestMessage({ type: 'guest_intent', version: 1, action: 'ready', value: true });
    expect(host.isHostReady()).toBe(false);
    expect(host.isGuestReady()).toBe(true);
    expect(host.hostDeal()).toBe(false);

    // Both ready -> deal succeeds
    host.hostToggleReady();
    expect(host.isHostReady()).toBe(true);
    expect(host.isGuestReady()).toBe(true);
    expect(host.hostDeal()).toBe(true);
    expect(host.getCanonicalState().phase).toBe('player-turn');

    host.destroy();
  });

  it('rejects guest hit and stand during Player 1 turn and when round is idle/over', () => {
    const nonBuringDeck: Card[] = [
      { label: '8', value: 8, name: 'D2', symbol: '♦', color: 'red' },
      { label: '9', value: 9, name: 'D1', symbol: '♠', color: 'black' },
      { label: '5', value: 5, name: 'P2b', symbol: '♥', color: 'red' },
      { label: '6', value: 6, name: 'P2a', symbol: '♣', color: 'black' },
      { label: '7', value: 7, name: 'P1b', symbol: '♦', color: 'red' },
      { label: '8', value: 8, name: 'P1a', symbol: '♠', color: 'black' },
    ];
    vi.spyOn(deckModule, 'createDeck').mockReturnValue(nonBuringDeck);

    let lastSync: PublicGameState | null = null;
    let lastRejectionReason = '';

    const host = new HostAuthorityManager(
      (state) => {
        lastSync = state;
      },
      (reason) => {
        lastRejectionReason = reason;
      },
    );

    // Initial state is idle
    expect(host.getCanonicalState().phase).toBe('idle');

    // 1. Guest attempts hit while idle
    const idleHitSuccess = host.handleGuestMessage({
      type: 'guest_intent',
      version: 1,
      action: 'hit',
    });
    expect(idleHitSuccess).toBe(false);
    expect(lastRejectionReason.toLowerCase()).toContain('player 2 turn');

    // 2. Ready up and deal
    host.hostToggleReady();
    host.handleGuestMessage({ type: 'guest_intent', version: 1, action: 'ready', value: true });
    expect(host.hostDeal()).toBe(true);
    expect(host.getCanonicalState().phase).toBe('player-turn');
    expect(lastSync?.phase).toBe('player-turn');

    const inRoundReadySuccess = host.handleGuestMessage({
      type: 'guest_intent',
      version: 1,
      action: 'ready',
      value: true,
    });
    expect(inRoundReadySuccess).toBe(false);
    expect(lastRejectionReason).toContain('before the first round');

    // 3. Guest attempts hit during Player 1 turn
    const p1TurnHitSuccess = host.handleGuestMessage({
      type: 'guest_intent',
      version: 1,
      action: 'hit',
    });
    expect(p1TurnHitSuccess).toBe(false);
    expect(lastRejectionReason.toLowerCase()).toContain('player 2 turn');

    // 4. Guest attempts stand during Player 1 turn
    const p1TurnStandSuccess = host.handleGuestMessage({
      type: 'guest_intent',
      version: 1,
      action: 'stand',
    });
    expect(p1TurnStandSuccess).toBe(false);
    expect(lastRejectionReason.toLowerCase()).toContain('player 2 turn');

    // 5. Guest attempts arbitrary/unauthorized action
    const unauthorizedSuccess = host.handleGuestMessage({
      type: 'guest_intent',
      version: 1,
      action: 'hack_deal',
    });
    expect(unauthorizedSuccess).toBe(false);
    expect(lastRejectionReason).toContain('unauthorized guest intent');

    // 6. Guest attempts arbitrary object without type
    const garbageSuccess = host.handleGuestMessage({ foo: 'bar' });
    expect(garbageSuccess).toBe(false);

    // 7. Guest attempts message with extra incompatible fields
    const extraFieldSuccess = host.handleGuestMessage({
      type: 'guest_intent',
      version: 1,
      action: 'hit',
      extraField: 'exploit',
    });
    expect(extraFieldSuccess).toBe(false);

    // 8. Guest attempts message with wrong protocol version
    const wrongVersionSuccess = host.handleGuestMessage({
      type: 'guest_intent',
      version: 999,
      action: 'hit',
    });
    expect(wrongVersionSuccess).toBe(false);

    host.destroy();
  });

  it('allows guest hit and stand during Player 2 turn, and advances to dealer turn', () => {
    const deck: Card[] = [
      { label: '9', value: 9, name: 'Clubs', symbol: '♣', color: 'black' },
      { label: '8', value: 8, name: 'DealerCard2', symbol: '♦', color: 'red' },
      { label: '10', value: 10, name: 'DealerCard1', symbol: '♠', color: 'black' },
      { label: '5', value: 5, name: 'P2Card2', symbol: '♥', color: 'red' },
      { label: '6', value: 6, name: 'P2Card1', symbol: '♣', color: 'black' },
      { label: '7', value: 7, name: 'P1Card2', symbol: '♦', color: 'red' },
      { label: '8', value: 8, name: 'P1Card1', symbol: '♠', color: 'black' },
    ];
    vi.spyOn(deckModule, 'createDeck').mockReturnValue(deck);

    let lastSync: PublicGameState | null = null;
    let lastRejectionReason = '';

    const host = new HostAuthorityManager(
      (state) => {
        lastSync = state;
      },
      (reason) => {
        lastRejectionReason = reason;
      },
    );

    host.hostToggleReady();
    host.handleGuestMessage({ type: 'guest_intent', version: 1, action: 'ready', value: true });
    host.hostDeal();
    expect(host.getCanonicalState().phase).toBe('player-turn');
    expect(host.getCanonicalState().p1.score).toBe(15);
    expect(host.getCanonicalState().p2.score).toBe(11);

    // Host stands -> transitions to Player 2's turn
    host.hostStand();
    expect(host.getCanonicalState().phase).toBe('p2-turn');
    expect(lastSync?.phase).toBe('p2-turn');

    // Guest hits
    const hitSuccess = host.handleGuestMessage({
      type: 'guest_intent',
      version: 1,
      action: 'hit',
    });
    expect(hitSuccess).toBe(true);
    expect(host.getCanonicalState().p2.score).toBe(20);
    expect(host.getCanonicalState().phase).toBe('p2-turn');

    // Guest stands
    const standSuccess = host.handleGuestMessage({
      type: 'guest_intent',
      version: 1,
      action: 'stand',
    });
    expect(standSuccess).toBe(true);
    expect(host.getCanonicalState().phase).toBe('dealer-turn');

    // Advance timers for dealer autoplay (dealer has 18, so stands immediately on step)
    vi.advanceTimersByTime(650);

    expect(host.getCanonicalState().phase).toBe('round-ended');
    expect(host.getCanonicalState().gameOver).toBe(true);

    // P1 (15 vs 18) lost (0 pts), P2 (20 vs 18) won (1 pt), Dealer (18) beat P1 but lost to P2 (0 pts)
    expect(host.getCanonicalState().scoreboards.local.p2).toBe(1);
    expect(host.getCanonicalState().scoreboards.local.p1).toBe(0);
    expect(host.getCanonicalState().scoreboards.local.dealer).toBe(0);

    // After round over, guest hit is rejected
    const gameOverHitSuccess = host.handleGuestMessage({
      type: 'guest_intent',
      version: 1,
      action: 'hit',
    });
    expect(gameOverHitSuccess).toBe(false);
    expect(lastRejectionReason).toContain('already over');

    host.destroy();
  });

  it('manages rematch synchronization between host and guest', () => {
    const deterministicDeck: Card[] = [
      { label: '7', value: 7, name: 'Dealer hole', symbol: '♦', color: 'red' },
      { label: '10', value: 10, name: 'Dealer upcard', symbol: '♣', color: 'black' },
      { label: '9', value: 9, name: 'P2 second', symbol: '♠', color: 'black' },
      { label: '8', value: 8, name: 'P2 first', symbol: '♥', color: 'red' },
      { label: '9', value: 9, name: 'P1 second', symbol: '♥', color: 'red' },
      { label: '10', value: 10, name: 'P1 first', symbol: '♣', color: 'black' },
    ];
    vi.spyOn(deckModule, 'createDeck').mockImplementation(() => [...deterministicDeck]);

    let lastSync: PublicGameState | null = null;
    const host = new HostAuthorityManager((state) => {
      lastSync = state;
    });

    host.hostToggleReady();
    host.handleGuestMessage({ type: 'guest_intent', version: 1, action: 'ready', value: true });
    host.hostDeal();
    host.hostStand(); // to p2
    host.handleGuestMessage({ type: 'guest_intent', version: 1, action: 'stand' }); // to dealer
    // Advance timers across multiple potential dealer steps
    vi.advanceTimersByTime(5000);
    expect(host.getCanonicalState().gameOver).toBe(true);

    // Guest requests rematch
    host.handleGuestMessage({ type: 'guest_intent', version: 1, action: 'rematch' });
    expect(lastSync?.rematchRequested.guest).toBe(true);
    expect(lastSync?.rematchRequested.host).toBe(false);
    expect(host.getCanonicalState().gameOver).toBe(true); // Still round-ended

    // Host requests rematch -> both requested, new round automatically dealt!
    host.hostRequestRematch();
    expect(host.getCanonicalState().phase).toBe('player-turn');
    expect(host.getCanonicalState().gameOver).toBe(false);
    expect(lastSync?.rematchRequested.guest).toBe(false);
    expect(lastSync?.rematchRequested.host).toBe(false);

    host.destroy();
  });

  it('strictly validates guest intents, host messages, and public game state', () => {
    // Guest intent validator:
    expect(isGuestIntentMessage({ type: 'guest_intent', version: 1, action: 'hit' })).toBe(true);
    expect(
      isGuestIntentMessage({ type: 'guest_intent', version: 1, action: 'ready', value: true }),
    ).toBe(true);
    // Missing version
    expect(isGuestIntentMessage({ type: 'guest_intent', action: 'hit' })).toBe(false);
    // Unknown action
    expect(isGuestIntentMessage({ type: 'guest_intent', version: 1, action: 'surrender' })).toBe(
      false,
    );
    // Extra fields
    expect(
      isGuestIntentMessage({ type: 'guest_intent', version: 1, action: 'hit', cheat: true }),
    ).toBe(false);
    // Non-boolean value
    expect(
      isGuestIntentMessage({ type: 'guest_intent', version: 1, action: 'ready', value: 'yes' }),
    ).toBe(false);
    expect(
      isGuestIntentMessage({ type: 'guest_intent', version: 1, action: 'hit', value: true }),
    ).toBe(false);

    // Host message validator:
    expect(isHostMessage({ type: 'action_rejected', version: 1, reason: 'Invalid turn' })).toBe(
      true,
    );
    // Extra keys on action_rejected
    expect(
      isHostMessage({
        type: 'action_rejected',
        version: 1,
        reason: 'Invalid',
        unauthorizedField: 1,
      }),
    ).toBe(false);

    // Deep PublicGameState validator:
    const validPublicState: PublicGameState = {
      version: 1,
      phase: 'player-turn',
      p1: {
        score: 18,
        cards: [{ label: '10', value: 10, name: 'T', symbol: '♠', color: 'black' }],
      },
      p2: { score: 15, cards: [{ label: '7', value: 7, name: 'S', symbol: '♥', color: 'red' }] },
      dealer: {
        score: 10,
        hasHiddenCard: true,
        cards: [
          { label: '10', value: 10, name: 'D', symbol: '♣', color: 'black' },
          { label: '?', value: 0, isHidden: true },
        ],
      },
      scoreboards: {
        npc: { p1: 0, bot: 0, dealer: 0, ties: 0 },
        local: { p1: 0, p2: 0, dealer: 0, ties: 0 },
      },
      gameOver: false,
      notice: null,
      hostReady: true,
      guestReady: true,
      rematchRequested: { host: false, guest: false },
    };

    expect(isPublicGameState(validPublicState)).toBe(true);
    expect(isHostMessage({ type: 'sync_state', version: 1, state: validPublicState })).toBe(true);

    // Leak attempt: internal deck present
    expect(isPublicGameState({ ...validPublicState, deck: [] })).toBe(false);
    expect(
      isPublicGameState({
        ...validPublicState,
        scoreboards: {
          ...validPublicState.scoreboards,
          local: { p1: 0, p2: 0, dealer: 0 },
        },
      }),
    ).toBe(false);

    // Malformed phase
    expect(isPublicGameState({ ...validPublicState, phase: 'unknown-phase' as unknown })).toBe(
      false,
    );

    // Extra unknown field
    expect(isPublicGameState({ ...validPublicState, cheatMetadata: 'secret' } as unknown)).toBe(
      false,
    );
  });
});
