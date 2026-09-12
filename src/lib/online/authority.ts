import {
  createIdleState,
  reducer,
  type Action,
  type GameState,
} from '../../hooks/useBlackjackGame';
import { createScoreboards, type Scoreboards } from '../game-logic';
import { serializeCanonicalToPublic } from './serializer';
import { isGuestIntentMessage, type GuestMessage, type PublicGameState } from './types';

export class HostAuthorityManager {
  private canonicalState: GameState;
  private hostReady = false;
  private guestReady = false;
  private rematchRequested = { host: false, guest: false };
  private dealerTimer: ReturnType<typeof setTimeout> | null = null;
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private broadcastPublicState: (state: PublicGameState) => void,
    private sendActionRejected?: (reason: string) => void,
    initialScores?: Scoreboards,
  ) {
    this.canonicalState = createIdleState(initialScores ?? createScoreboards(), false);
  }

  getCanonicalState(): GameState {
    return this.canonicalState;
  }

  getPublicState(): PublicGameState {
    return serializeCanonicalToPublic(
      this.canonicalState,
      this.hostReady,
      this.guestReady,
      this.rematchRequested,
    );
  }

  isHostReady(): boolean {
    return this.hostReady;
  }

  isGuestReady(): boolean {
    return this.guestReady;
  }

  hostToggleReady(): void {
    if (this.canonicalState.phase !== 'idle') {
      return;
    }
    this.hostReady = !this.hostReady;
    this.sync();
  }

  hostDeal(): boolean {
    if (this.canonicalState.phase !== 'idle' && this.canonicalState.phase !== 'round-ended') {
      return false;
    }

    if (!this.hostReady || !this.guestReady) {
      this.sendActionRejected?.('Both players must be ready before dealing.');
      return false;
    }

    this.hostReady = false;
    this.guestReady = false;
    this.rematchRequested = { host: false, guest: false };
    this.dispatch({ type: 'deal' });
    return true;
  }

  hostHit(): boolean {
    if (this.canonicalState.gameOver || this.canonicalState.phase !== 'player-turn') {
      return false;
    }
    if (this.canonicalState.p1.score >= 21) {
      return false;
    }

    this.dispatch({ type: 'hit', player: 'p1' });
    return true;
  }

  hostStand(): boolean {
    if (this.canonicalState.gameOver || this.canonicalState.phase !== 'player-turn') {
      return false;
    }

    this.dispatch({ type: 'stand', player: 'p1' });
    return true;
  }

  hostRequestRematch(): void {
    if (!this.canonicalState.gameOver && this.canonicalState.phase !== 'round-ended') {
      return;
    }

    this.rematchRequested.host = true;
    if (this.rematchRequested.guest) {
      this.hostReady = true;
      this.guestReady = true;
      this.hostDeal();
      return;
    }
    this.sync();
  }

  hostResetScores(): void {
    this.dispatch({ type: 'reset-scores' });
  }

  handleGuestMessage(rawMsg: unknown): boolean {
    if (!isGuestIntentMessage(rawMsg)) {
      this.sendActionRejected?.('Malformed or unauthorized guest intent payload.');
      return false;
    }

    const msg: GuestMessage = rawMsg;

    switch (msg.action) {
      case 'ready': {
        if (this.canonicalState.phase !== 'idle') {
          this.sendActionRejected?.('Ready is only permitted before the first round.');
          return false;
        }
        this.guestReady = msg.value !== undefined ? msg.value : !this.guestReady;
        this.sync();
        return true;
      }

      case 'rematch': {
        if (!this.canonicalState.gameOver && this.canonicalState.phase !== 'round-ended') {
          this.sendActionRejected?.('Rematch only permitted after round completion.');
          return false;
        }

        this.rematchRequested.guest = true;
        if (this.rematchRequested.host) {
          this.hostReady = true;
          this.guestReady = true;
          this.hostDeal();
          return true;
        }
        this.sync();
        return true;
      }

      case 'hit': {
        if (this.canonicalState.gameOver) {
          this.sendActionRejected?.('Round is already over.');
          return false;
        }
        if (this.canonicalState.phase !== 'p2-turn') {
          this.sendActionRejected?.('Guest action rejected: It is not Player 2 turn.');
          return false;
        }
        if (this.canonicalState.p2.score >= 21) {
          this.sendActionRejected?.(
            'Guest action rejected: Player 2 hand has reached 21 or busted.',
          );
          return false;
        }

        this.dispatch({ type: 'hit', player: 'p2' });
        return true;
      }

      case 'stand': {
        if (this.canonicalState.gameOver) {
          this.sendActionRejected?.('Round is already over.');
          return false;
        }
        if (this.canonicalState.phase !== 'p2-turn') {
          this.sendActionRejected?.('Guest action rejected: It is not Player 2 turn.');
          return false;
        }

        this.dispatch({ type: 'stand', player: 'p2' });
        return true;
      }

      default:
        this.sendActionRejected?.('Unknown guest action.');
        return false;
    }
  }

  private dispatch(action: Action): void {
    this.canonicalState = reducer(this.canonicalState, action);
    this.sync();

    if (this.canonicalState.phase === 'dealer-turn' && !this.canonicalState.gameOver) {
      this.scheduleDealerStep();
    } else {
      this.clearDealerTimer();
    }

    if (this.canonicalState.notice) {
      this.scheduleNoticeDismissal();
    }
  }

  private scheduleDealerStep(): void {
    this.clearDealerTimer();
    this.dealerTimer = setTimeout(() => {
      if (this.canonicalState.phase === 'dealer-turn' && !this.canonicalState.gameOver) {
        this.dispatch({ type: 'dealer-step' });
      }
    }, 650);
  }

  private clearDealerTimer(): void {
    if (this.dealerTimer) {
      clearTimeout(this.dealerTimer);
      this.dealerTimer = null;
    }
  }

  private scheduleNoticeDismissal(): void {
    this.clearNoticeTimer();
    this.noticeTimer = setTimeout(() => {
      if (this.canonicalState.notice) {
        this.canonicalState = reducer(this.canonicalState, { type: 'dismiss-notice' });
        this.sync();
      }
    }, 3500);
  }

  private clearNoticeTimer(): void {
    if (this.noticeTimer) {
      clearTimeout(this.noticeTimer);
      this.noticeTimer = null;
    }
  }

  private sync(): void {
    const publicState = this.getPublicState();
    this.broadcastPublicState(publicState);
  }

  destroy(): void {
    this.clearDealerTimer();
    this.clearNoticeTimer();
  }
}
