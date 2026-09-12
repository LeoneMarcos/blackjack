import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  Bot,
  Check,
  CircleHelp,
  Copy,
  Globe,
  Hand,
  LogOut,
  RotateCcw,
  Users,
  X,
} from 'lucide-react';
import { useBlackjackGame } from './hooks/useBlackjackGame';
import { useOnlineBlackjack } from './hooks/useOnlineBlackjack';
import {
  calculateVisibleHandValue,
  getStationOutcomes,
  isBlackjack,
  type Card,
  type StationOutcome,
} from './lib/game-logic';

function formatScore(
  hand: { cards: Card[]; score: number },
  hiddenIndex?: number,
): number | string {
  if (hand.cards.length === 0) return 0;
  if (hiddenIndex !== undefined && hiddenIndex >= 0 && hiddenIndex < hand.cards.length) {
    const visibleCards = hand.cards.filter((_, idx) => idx !== hiddenIndex);
    if (visibleCards.length === 1 && visibleCards[0]?.label === 'A') {
      return '1/11 + ?';
    }
    const visibleScore = calculateVisibleHandValue(hand.cards, [hiddenIndex]);
    return `${visibleScore} + ?`;
  }
  if (hand.cards.length === 1 && hand.cards[0]?.label === 'A') return '1/11';
  return hand.score;
}

function getHandStatus(score: number, cardCount: number): string {
  if (score > 21) return 'Busted hand';
  if (score === 21 && cardCount === 2) return 'Blackjack!';
  if (score === 21) return '21 points';
  return `${cardCount} ${cardCount === 1 ? 'card' : 'cards'}`;
}

function PlayingCard({
  card,
  isFaceDown,
  dealDelay = 0,
}: {
  card?: Card;
  isFaceDown?: boolean;
  dealDelay?: number;
}) {
  const [rotation] = useState(() => (Math.random() * 6 - 3).toFixed(2));

  if (isFaceDown) {
    return (
      <li
        className="playing-card playing-card--face-down"
        style={
          {
            '--rotation': `${rotation}deg`,
            '--deal-delay': `${dealDelay}ms`,
          } as CSSProperties
        }
        aria-label="Face-down card"
      >
        <div className="card-back-pattern" aria-hidden="true">
          <span className="card-back-symbol">♠</span>
        </div>
      </li>
    );
  }

  if (!card) return null;

  const cardColor = card.color === 'red' ? 'card--red' : 'card--black';
  const cardTitle = card.name ? `${card.label} of ${card.name}` : `${card.label} of Cards`;

  return (
    <li
      className={`playing-card ${cardColor}`}
      style={
        {
          '--rotation': `${rotation}deg`,
          '--deal-delay': `${dealDelay}ms`,
        } as CSSProperties
      }
      aria-label={cardTitle}
    >
      <div className="playing-card__corner" aria-hidden="true">
        <span>{card.label}</span>
        <span>{card.symbol}</span>
      </div>
      <span className="playing-card__symbol" aria-hidden="true">
        {card.symbol}
      </span>
      <div className="playing-card__corner playing-card__corner--bottom" aria-hidden="true">
        <span>{card.label}</span>
        <span>{card.symbol}</span>
      </div>
    </li>
  );
}

function RulesModal({ onClose }: { onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const rules = [
    ['Objective', 'Beat the Dealer by getting closer to 21 without going over.'],
    ['Deal', 'Each round begins with 2 cards. The Dealer keeps one card hidden (hole card).'],
    ['Blackjack', 'An initial two-card 21 (Ace + 10/J/Q/K) is a natural Blackjack!'],
    ['Hit', 'Draw another card to increase your hand value. Going over 21 is a bust.'],
    ['Stand', 'Keep your current score and pass the turn.'],
    [
      'Dealer Rules',
      'The Dealer reveals the hidden card and must hit until reaching 17 or higher.',
    ],
    ['Outcome', 'Closest score to 21 wins. Equal scores result in a Push (tie).'],
    [
      'Two Players Scoring',
      'Players earn 1 pt for beating the Dealer (0 on tie or loss). The Dealer earns 1 pt only if beating both players.',
    ],
    [
      'Online P2P',
      'Host as Player 1 with authoritative state & dealer autoplay. Guest acts as Player 2 via encrypted WebRTC.',
    ],
    ['Controls', 'H or 1 to Hit, S or Space to Stand, Space or D to Deal again, R to Reset.'],
  ];

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      previousFocus?.focus();
    };
  }, []);

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled])'),
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        className="rules-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rulesTitle"
        aria-describedby="rulesDescription"
        onKeyDown={handleDialogKeyDown}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">Casino rules</span>
            <h2 id="rulesTitle">Game rules</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-button"
            aria-label="Close game rules"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <p id="rulesDescription" className="sr-only">
          Classic casino Blackjack rules and keyboard controls.
        </p>
        <div className="rules-list">
          {rules.map(([title, description]) => (
            <p key={title} className="rule-item">
              <strong>{title}</strong>
              <span>{description}</span>
            </p>
          ))}
        </div>
        <button type="button" className="button button--primary button--wide" onClick={onClose}>
          Continue playing
        </button>
      </section>
    </div>
  );
}

interface DealerStationProps {
  cards: Card[];
  score: number;
  hiddenCardIndex?: number;
  statusText: string;
  isBotMode: boolean;
  outcome?: StationOutcome;
}

function DealerStation({
  cards,
  score,
  hiddenCardIndex,
  statusText,
  isBotMode,
  outcome = 'none',
}: DealerStationProps) {
  const status = getHandStatus(score, cards.length);
  const formattedScore = formatScore({ cards, score }, hiddenCardIndex);
  const label = isBotMode ? 'Dealer (BOT)' : 'Dealer';
  const listLabel = isBotMode ? 'BOT cards' : 'Dealer cards';
  const scoreLabel = isBotMode ? 'BOT score' : 'Dealer score';

  const outcomeClass =
    outcome === 'win'
      ? 'station--win'
      : outcome === 'lose'
        ? 'station--lose'
        : outcome === 'tie'
          ? 'station--tie'
          : '';

  return (
    <section className={`dealer-station ${outcomeClass}`} aria-labelledby="dealer-title">
      <div className="dealer-station__header">
        <div className="dealer-station__info">
          <span className="eyebrow">The House</span>
          <h2 id="dealer-title">{label}</h2>
        </div>
        <div className="dealer-station__score-group">
          {outcome !== 'none' && (
            <span className={`outcome-badge outcome-badge--${outcome}`}>
              {outcome === 'win'
                ? 'Winner (+1 pt)'
                : outcome === 'lose'
                  ? score > 21
                    ? 'Busted (0 pts)'
                    : 'Lost (0 pts)'
                  : 'Push (0 pts)'}
            </span>
          )}
          <div className="score" aria-label={scoreLabel}>
            {formattedScore}
            <small>/ 21</small>
          </div>
        </div>
      </div>
      <span className="hand-status">{statusText || status}</span>
      {cards.length > 0 ? (
        <ol className="cards" aria-label={listLabel}>
          {cards.map((card, index) => {
            let delay = 0;
            if (cards.length === 2) {
              delay = index === 0 ? 200 : 520;
            } else if (index === cards.length - 1) {
              delay = 30;
            }
            return (
              <PlayingCard
                key={`dealer-card-slot-${index}`}
                card={card}
                isFaceDown={hiddenCardIndex === index}
                dealDelay={delay}
              />
            );
          })}
        </ol>
      ) : (
        <div className="empty-hand" aria-label="Dealer has no cards yet">
          <span className="empty-cards" aria-hidden="true">
            ♠
          </span>
          <span>Awaiting deal</span>
        </div>
      )}
      <div className="dealer-station__footer">
        <span className="dealer-status-badge">Dealer stands on 17 · Draws to 16</span>
      </div>
    </section>
  );
}

interface PlayerPanelProps {
  accent: 'first' | 'second';
  seatLabel: string;
  cards: Card[];
  label: string;
  score: number;
  canDraw: boolean;
  canStand?: boolean;
  isStandDisabled?: boolean;
  actionLabel: string;
  keyboardHint: string;
  standKeyboardHint?: string;
  onDraw: () => void;
  onStand?: () => void;
  statusBadge?: string;
  hiddenCardIndex?: number;
  outcome?: StationOutcome;
}

function PlayerPanel({
  accent,
  seatLabel,
  cards,
  label,
  score,
  canDraw,
  canStand,
  isStandDisabled = false,
  actionLabel,
  keyboardHint,
  standKeyboardHint = 'S',
  onDraw,
  onStand,
  statusBadge,
  hiddenCardIndex,
  outcome = 'none',
}: PlayerPanelProps) {
  const status = getHandStatus(score, cards.length);
  const formattedScore = formatScore({ cards, score }, hiddenCardIndex);
  const isBust = score > 21;

  const outcomeClass =
    outcome === 'win'
      ? 'station--win'
      : outcome === 'lose'
        ? 'station--lose'
        : outcome === 'tie'
          ? 'station--tie'
          : isBust
            ? 'player-panel--bust'
            : '';

  return (
    <section
      className={`player-panel player-panel--${accent} ${outcomeClass}`}
      aria-labelledby={`${accent}-player-title`}
    >
      <div className="player-panel__heading">
        <div>
          <span className="eyebrow">{seatLabel}</span>
          <h2 id={`${accent}-player-title`}>{label}</h2>
        </div>
        <div className="player-panel__score-group">
          {outcome !== 'none' && (
            <span className={`outcome-badge outcome-badge--${outcome}`}>
              {outcome === 'win'
                ? 'Winner (+1 pt)'
                : outcome === 'lose'
                  ? isBust
                    ? 'Busted (0 pts)'
                    : 'Lost (0 pts)'
                  : 'Push (0 pts)'}
            </span>
          )}
          <div className="score" aria-label={`${label} score`}>
            {formattedScore}
            <small>/ 21</small>
          </div>
        </div>
      </div>
      <span className="hand-status">{status}</span>
      {cards.length > 0 ? (
        <ol className="cards" aria-label={`${label} cards`}>
          {cards.map((card, index) => {
            let delay = 0;
            if (cards.length === 2) {
              delay = accent === 'first' ? (index === 0 ? 50 : 360) : index === 0 ? 150 : 440;
            } else if (index === cards.length - 1) {
              delay = 30;
            }
            return (
              <PlayingCard
                key={`${accent}-card-slot-${index}`}
                card={card}
                isFaceDown={hiddenCardIndex === index}
                dealDelay={delay}
              />
            );
          })}
        </ol>
      ) : (
        <div className="empty-hand" aria-label={`${label} has no cards yet`}>
          <span className="empty-cards" aria-hidden="true">
            ♠
          </span>
          <span>Ready to deal</span>
        </div>
      )}
      {statusBadge && (
        <div className="player-status-badge">
          <span>{statusBadge}</span>
        </div>
      )}
      <div className="player-actions">
        <button
          type="button"
          className="button button--primary draw-button"
          disabled={!canDraw}
          aria-label={`${actionLabel} for ${label}`}
          onClick={onDraw}
        >
          {actionLabel.includes('Deal') ? (
            <RotateCcw aria-hidden="true" />
          ) : (
            <Hand aria-hidden="true" />
          )}
          <span>
            {actionLabel === 'Draw card' ? (cards.length === 0 ? 'Deal hand' : 'Hit') : actionLabel}
          </span>
          {canDraw && <kbd>{keyboardHint}</kbd>}
        </button>
        {canStand && onStand && (
          <button
            type="button"
            className="button button--secondary"
            disabled={isStandDisabled}
            aria-label={`Stand for ${label}`}
            onClick={onStand}
          >
            <span>Stand</span>
            <kbd>{standKeyboardHint}</kbd>
          </button>
        )}
      </div>
    </section>
  );
}

function App() {
  const { state, hit, stand, dealRound, drawCard, toggleNpc, resetScores } = useBlackjackGame();
  const [mode, setMode] = useState<'bot' | 'local' | 'online'>('bot');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const online = useOnlineBlackjack();

  const activeMode = mode === 'online' ? 'online' : state.npcActive ? 'bot' : 'local';

  const copyRoomCode = () => {
    if (online.roomId) {
      void navigator.clipboard?.writeText(online.roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isDealerHidden =
    state.phase !== 'dealer-turn' && !state.gameOver && state.dealer.cards.length >= 2;
  const dealerHiddenIndex = isDealerHidden ? 1 : undefined;

  const stationOutcomes = getStationOutcomes(
    state.p1,
    state.p2,
    state.dealer,
    state.gameOver,
    state.npcActive,
  );

  const prevNpcActiveRef = useRef(state.npcActive);
  const prevScoresRef = useRef({
    npc: { ...state.scoreboards.npc },
    local: { ...state.scoreboards.local },
  });

  const [scoreGains, setScoreGains] = useState<{ p1?: boolean; p2?: boolean; dealer?: boolean }>(
    {},
  );

  useEffect(() => {
    // If the game mode changed, update refs silently without triggering score animations
    if (prevNpcActiveRef.current !== state.npcActive) {
      prevNpcActiveRef.current = state.npcActive;
      prevScoresRef.current = {
        npc: { ...state.scoreboards.npc },
        local: { ...state.scoreboards.local },
      };
      setScoreGains({});
      return;
    }

    const gains: { p1?: boolean; p2?: boolean; dealer?: boolean } = {};

    if (state.npcActive) {
      const current = state.scoreboards.npc;
      const prev = prevScoresRef.current.npc;
      if (current.p1 > prev.p1) gains.p1 = true;
      if (current.dealer > prev.dealer) gains.dealer = true;
    } else {
      const current = state.scoreboards.local;
      const prev = prevScoresRef.current.local;
      if (current.p1 > prev.p1) gains.p1 = true;
      if (current.p2 > prev.p2) gains.p2 = true;
      if (current.dealer > prev.dealer) gains.dealer = true;
    }

    prevScoresRef.current = {
      npc: { ...state.scoreboards.npc },
      local: { ...state.scoreboards.local },
    };

    if (gains.p1 || gains.p2 || gains.dealer) {
      const gainTimer = setTimeout(() => setScoreGains(gains), 0);
      const resetTimer = setTimeout(() => setScoreGains({}), 1500);
      return () => {
        clearTimeout(gainTimer);
        clearTimeout(resetTimer);
      };
    }
  }, [state.scoreboards, state.npcActive]);

  const roundEndedBeforeDealerTurn =
    state.gameOver &&
    !!state.notice &&
    (/Blackjack/i.test(state.notice.message) ||
      /^Player 1 busted/i.test(state.notice.message) ||
      /^Both players busted/i.test(state.notice.message));

  let dealerStatusText = 'Dealer stands on 17 · Draws to 16';
  if (state.phase === 'dealer-turn') {
    dealerStatusText = 'Dealer is drawing (stands on 17)...';
  } else if (state.gameOver && isBlackjack(state.dealer.cards)) {
    dealerStatusText = 'Dealer has Blackjack';
  } else if (roundEndedBeforeDealerTurn) {
    dealerStatusText = 'Round ended before Dealer turn';
  } else if (state.gameOver) {
    dealerStatusText =
      state.dealer.score > 21
        ? `Dealer busted with ${state.dealer.score}`
        : `Dealer stands on ${state.dealer.score}`;
  } else if (state.phase === 'idle') {
    dealerStatusText = 'Ready to deal';
  }

  let onlineDealerStatusText = 'Dealer stands on 17 · Draws to 16';
  if (online.publicState) {
    if (online.publicState.phase === 'dealer-turn') {
      onlineDealerStatusText = 'Dealer is drawing (stands on 17)...';
    } else if (
      online.publicState.gameOver &&
      isBlackjack(online.publicState.dealer.cards as Card[])
    ) {
      onlineDealerStatusText = 'Dealer has Blackjack';
    } else if (online.publicState.gameOver) {
      const dScore = Number(online.publicState.dealer.score);
      onlineDealerStatusText =
        dScore > 21 ? `Dealer busted with ${dScore}` : `Dealer stands on ${dScore}`;
    } else if (online.publicState.phase === 'idle') {
      onlineDealerStatusText = 'Ready to deal';
    }
  }

  const onlineStationOutcomes = online.publicState
    ? getStationOutcomes(
        online.publicState.p1,
        online.publicState.p2,
        {
          score:
            typeof online.publicState.dealer.score === 'number'
              ? online.publicState.dealer.score
              : 0,
          cards: online.publicState.dealer.cards as Card[],
        },
        online.publicState.gameOver,
        false,
      )
    : {
        p1: 'none' as StationOutcome,
        p2: 'none' as StationOutcome,
        dealer: 'none' as StationOutcome,
      };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setRulesOpen(false);
        return;
      }
      if (rulesOpen) return;

      const target = event.target;
      const isInteractiveTarget =
        target instanceof HTMLElement &&
        !!target.closest(
          'button, a, input, textarea, select, [contenteditable="true"], [role="button"]',
        );
      const isNativeActivationKey = event.key === 'Enter' || event.code === 'Space';
      if (isInteractiveTarget && isNativeActivationKey) return;

      const key = event.key.toLowerCase();

      if (activeMode === 'online') {
        if (online.connectionState === 'connected' && online.publicState) {
          if (key === 'r' && online.role === 'host') {
            online.resetScores();
            return;
          }
          const phase = online.publicState.phase;
          if (online.role === 'host') {
            if (phase === 'idle') {
              if (key === '1' || key === 'd' || event.code === 'Space' || event.key === 'Enter') {
                event.preventDefault();
                if (!online.publicState.hostReady || !online.publicState.guestReady) {
                  online.toggleReady();
                } else {
                  online.deal();
                }
              }
            } else if (phase === 'round-ended') {
              if (
                key === '1' ||
                key === 'd' ||
                key === 'r' ||
                event.code === 'Space' ||
                event.key === 'Enter'
              ) {
                event.preventDefault();
                online.requestRematch();
              }
            } else if (phase === 'player-turn') {
              if (key === 'h' || key === '1') online.hit();
              if (key === 's' || event.code === 'Space') {
                event.preventDefault();
                online.stand();
              }
            }
          } else if (online.role === 'guest') {
            if (phase === 'p2-turn') {
              if (key === 'h' || key === '2') online.hit();
              if (key === 's' || event.code === 'Space') {
                event.preventDefault();
                online.stand();
              }
            } else if (phase === 'idle') {
              if (key === '2' || event.code === 'Space' || event.key === 'Enter') {
                event.preventDefault();
                online.toggleReady();
              }
            } else if (phase === 'round-ended') {
              if (key === 'r' || event.code === 'Space' || event.key === 'Enter') {
                event.preventDefault();
                online.requestRematch();
              }
            }
          }
        }
        return;
      }

      if (key === 'r') {
        resetScores();
        return;
      }

      if (state.phase === 'idle' || state.phase === 'round-ended') {
        if (key === '1' || key === 'd' || event.code === 'Space' || event.key === 'Enter') {
          event.preventDefault();
          dealRound();
        }
      } else if (state.phase === 'player-turn') {
        if (key === 'h' || key === '1') hit('p1');
        if (key === 's' || event.code === 'Space') {
          event.preventDefault();
          stand('p1');
        }
      } else if (state.phase === 'p2-turn') {
        if (key === 'h' || key === '2') hit('p2');
        if (key === 's' || event.code === 'Space') {
          event.preventDefault();
          stand('p2');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hit, stand, dealRound, resetScores, state.phase, rulesOpen, activeMode, online]);

  let statusMessage = state.notice?.message;
  if (activeMode === 'online' && online.publicState) {
    if (online.publicState.notice) {
      statusMessage = online.publicState.notice.message;
    } else if (online.publicState.phase === 'player-turn') {
      statusMessage =
        online.role === 'host'
          ? "Player 1's turn (You) — Hit to draw or Stand to hold"
          : "Player 1's turn (Host) — Waiting for Player 1";
    } else if (online.publicState.phase === 'p2-turn') {
      statusMessage =
        online.role === 'guest'
          ? "Player 2's turn (You) — Hit to draw or Stand to hold"
          : "Player 2's turn (Guest) — Waiting for Player 2";
    } else if (online.publicState.phase === 'dealer-turn') {
      statusMessage = 'Dealer is playing — dealer must draw to 16, stand on 17';
    } else if (online.publicState.phase === 'idle') {
      if (!online.publicState.hostReady && !online.publicState.guestReady) {
        statusMessage = 'Both players must click Ready to start';
      } else if (online.publicState.hostReady && !online.publicState.guestReady) {
        statusMessage = 'Player 1 ready — waiting for Player 2';
      } else if (!online.publicState.hostReady && online.publicState.guestReady) {
        statusMessage = 'Player 2 ready — waiting for Player 1';
      } else {
        statusMessage = 'Both players ready — Host may deal hand';
      }
    } else {
      statusMessage = 'Round complete — deal again or request rematch';
    }
  } else if (!statusMessage) {
    if (state.phase === 'player-turn') {
      statusMessage = "Player 1's turn — Hit to draw or Stand to hold";
    } else if (state.phase === 'p2-turn') {
      statusMessage = "Player 2's turn — Hit to draw or Stand to hold";
    } else if (state.phase === 'dealer-turn') {
      statusMessage = 'Dealer is playing — dealer must draw to 16, stand on 17';
    } else if (state.phase === 'idle') {
      statusMessage = 'Table ready — deal to play';
    } else {
      statusMessage = 'Round complete — deal again to play';
    }
  }

  const isRoundOver = state.gameOver || state.phase === 'idle';
  const actionLabel = state.gameOver ? 'Deal again' : 'Draw card';

  // Player 1 draw & stand conditions:
  const canP1Draw = isRoundOver || (state.phase === 'player-turn' && state.p1.score < 21);
  const canP1Stand = !isRoundOver && state.p1.cards.length > 0;
  const isP1StandDisabled = state.phase !== 'player-turn' || state.p1.score >= 21;
  const p1StatusBadge =
    !isRoundOver && state.phase !== 'player-turn'
      ? state.p1.score > 21
        ? `Busted with ${state.p1.score}`
        : `Standing on ${state.p1.score}`
      : undefined;

  // Player 2 draw & stand conditions (symmetrical with Player 1):
  const canP2Draw = isRoundOver || (state.phase === 'p2-turn' && state.p2.score < 21);
  const canP2Stand = !isRoundOver && state.p2.cards.length > 0;
  const isP2StandDisabled = state.phase !== 'p2-turn' || state.p2.score >= 21;
  const p2StatusBadge = !isRoundOver
    ? state.phase === 'player-turn'
      ? 'Waiting for Player 1...'
      : state.phase === 'dealer-turn'
        ? state.p2.score > 21
          ? `Busted with ${state.p2.score}`
          : `Standing on ${state.p2.score}`
        : undefined
    : undefined;

  // Online Player 1 conditions:
  const isOnlineRoundOver =
    !online.publicState || online.publicState.gameOver || online.publicState.phase === 'idle';
  const canOnlineP1Draw =
    online.role === 'host' &&
    (isOnlineRoundOver ||
      (online.publicState?.phase === 'player-turn' && online.publicState.p1.score < 21));
  const canOnlineP1Stand =
    online.role === 'host' && !isOnlineRoundOver && (online.publicState?.p1.cards.length ?? 0) > 0;
  const isOnlineP1StandDisabled =
    online.publicState?.phase !== 'player-turn' || (online.publicState?.p1.score ?? 0) >= 21;
  const onlineP1ActionLabel =
    online.role === 'host'
      ? online.publicState?.gameOver
        ? online.publicState.rematchRequested.host
          ? 'Rematch requested'
          : 'Deal again'
        : online.publicState?.phase === 'idle'
          ? !online.publicState.hostReady
            ? 'Click Ready'
            : !online.publicState.guestReady
              ? 'Waiting for Guest'
              : 'Deal hand'
          : 'Hit'
      : online.publicState?.phase === 'player-turn'
        ? "Player 1's turn"
        : 'Waiting';
  const onlineP1OnDraw =
    online.publicState?.phase === 'idle'
      ? !online.publicState.hostReady || !online.publicState.guestReady
        ? online.toggleReady
        : online.deal
      : online.publicState?.gameOver
        ? online.requestRematch
        : online.hit;
  const onlineP1StatusBadge =
    online.publicState?.phase === 'idle'
      ? online.publicState.hostReady
        ? 'Ready'
        : 'Not ready'
      : online.publicState && !isOnlineRoundOver && online.publicState.phase !== 'player-turn'
        ? online.publicState.p1.score > 21
          ? `Busted with ${online.publicState.p1.score}`
          : `Standing on ${online.publicState.p1.score}`
        : online.publicState?.gameOver && online.publicState.rematchRequested.host
          ? 'Wants Rematch'
          : undefined;

  // Online Player 2 conditions:
  const canOnlineP2Draw =
    online.role === 'guest' &&
    (isOnlineRoundOver ||
      (online.publicState?.phase === 'p2-turn' && online.publicState.p2.score < 21));
  const canOnlineP2Stand =
    online.role === 'guest' && !isOnlineRoundOver && (online.publicState?.p2.cards.length ?? 0) > 0;
  const isOnlineP2StandDisabled =
    online.publicState?.phase !== 'p2-turn' || (online.publicState?.p2.score ?? 0) >= 21;
  const onlineP2ActionLabel =
    online.role === 'guest'
      ? online.publicState?.phase === 'idle'
        ? online.publicState.guestReady
          ? 'Ready'
          : 'Click Ready'
        : online.publicState?.gameOver
          ? online.publicState.rematchRequested.guest
            ? 'Rematch requested'
            : 'Request Rematch'
          : 'Hit'
      : online.publicState?.phase === 'p2-turn'
        ? "Player 2's turn"
        : online.publicState?.gameOver && online.publicState.rematchRequested.guest
          ? 'Guest wants Rematch'
          : 'Waiting';
  const onlineP2OnDraw =
    online.publicState?.phase === 'idle'
      ? online.toggleReady
      : online.publicState?.gameOver
        ? online.requestRematch
        : online.hit;
  const onlineP2StatusBadge =
    online.publicState?.phase === 'idle'
      ? online.publicState.guestReady
        ? 'Ready'
        : 'Not ready'
      : online.publicState && !isOnlineRoundOver
        ? online.publicState.phase === 'player-turn'
          ? 'Waiting for Player 1...'
          : online.publicState.phase === 'dealer-turn'
            ? online.publicState.p2.score > 21
              ? `Busted with ${online.publicState.p2.score}`
              : `Standing on ${online.publicState.p2.score}`
            : undefined
        : online.publicState?.gameOver && online.publicState.rematchRequested.guest
          ? 'Wants Rematch'
          : undefined;

  return (
    <main className="app-shell" aria-labelledby="app-title">
      <header className="app-header">
        <div className="brand-lockup">
          <img className="brand-mark" src="/blackjack-neutral.webp" alt="" width="44" height="44" />
          <div>
            <span className="eyebrow">The card room</span>
            <h1 id="app-title">Blackjack</h1>
          </div>
        </div>

        <div className="mode-selector" role="group" aria-label="Game mode">
          <button
            type="button"
            className={`mode-toggle ${activeMode === 'bot' ? 'mode-toggle--active' : ''}`}
            aria-pressed={activeMode === 'bot'}
            onClick={() => {
              setMode('bot');
              if (!state.npcActive) toggleNpc();
            }}
          >
            <Bot aria-hidden="true" />
            <span>Play against BOT</span>
          </button>
          <button
            type="button"
            className={`mode-toggle ${activeMode === 'local' ? 'mode-toggle--active' : ''}`}
            aria-pressed={activeMode === 'local'}
            onClick={() => {
              setMode('local');
              if (state.npcActive) toggleNpc();
            }}
          >
            <Users aria-hidden="true" />
            <span>Two players</span>
          </button>
          <button
            type="button"
            className={`mode-toggle ${activeMode === 'online' ? 'mode-toggle--active' : ''}`}
            aria-pressed={activeMode === 'online'}
            onClick={() => {
              setMode('online');
            }}
          >
            <Globe aria-hidden="true" />
            <span>Online P2P</span>
          </button>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="icon-button"
            aria-label="View game rules"
            title="Game rules"
            onClick={() => setRulesOpen(true)}
          >
            <CircleHelp aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Reset scores"
            title="Reset scores"
            onClick={() => {
              if (activeMode === 'online') {
                online.resetScores();
              } else {
                resetScores();
              }
            }}
          >
            <RotateCcw aria-hidden="true" />
          </button>
        </div>
      </header>

      {activeMode === 'online' ? (
        <div className="table-surface">
          {online.connectionState === 'idle' && (
            <div className="online-lobby">
              <div>
                <h2>Online Multiplayer</h2>
                <p>Peer-to-peer Blackjack with host authority & WebRTC DataChannels</p>
              </div>
              <div className="online-cards-grid">
                <div className="online-card">
                  <div>
                    <h3>Host a Table</h3>
                    <p>Create a private room and share the short code with Player 2.</p>
                  </div>
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={() => online.createRoom()}
                  >
                    <Hand aria-hidden="true" />
                    <span>Create Room</span>
                  </button>
                </div>
                <div className="online-card">
                  <div>
                    <h3>Join a Table</h3>
                    <p>Enter the code from the host to join the table as Player 2.</p>
                  </div>
                  <div className="online-input-row">
                    <input
                      type="text"
                      className="text-input"
                      placeholder="CODE"
                      maxLength={6}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      aria-label="Room code"
                    />
                    <button
                      type="button"
                      className="button button--primary"
                      disabled={joinCode.trim().length < 3}
                      onClick={() => {
                        if (joinCode.trim().length >= 3) {
                          online.joinRoom(joinCode.trim());
                        }
                      }}
                    >
                      <span>Join</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(online.connectionState === 'creating' || online.connectionState === 'waiting') && (
            <div className="online-waiting-box">
              <span className="eyebrow">Table Room Code</span>
              <div className="room-code-badge">
                <span>{online.roomId}</span>
                <button
                  type="button"
                  className="icon-button"
                  onClick={copyRoomCode}
                  aria-label="Copy room code"
                  title="Copy room code"
                >
                  {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                </button>
              </div>
              <span className="status-pill status-pill--waiting">
                <span className="status-pill__dot" aria-hidden="true" />
                Waiting for Player 2 to join...
              </span>
              <p className="hand-status">
                Share this code with your opponent. The game will connect automatically when they
                join.
              </p>
              <button type="button" className="button button--secondary" onClick={online.leaveRoom}>
                <LogOut aria-hidden="true" />
                <span>Cancel Table</span>
              </button>
            </div>
          )}

          {online.connectionState === 'connecting' && (
            <div className="online-waiting-box">
              <span className="eyebrow">Connecting</span>
              <span className="status-pill status-pill--connecting">
                <span className="status-pill__dot" aria-hidden="true" />
                Connecting via WebRTC...
              </span>
              <p className="hand-status">Establishing encrypted RTCDataChannel between peers...</p>
              <button type="button" className="button button--secondary" onClick={online.leaveRoom}>
                <span>Cancel</span>
              </button>
            </div>
          )}

          {(online.connectionState === 'error' || online.connectionState === 'disconnected') && (
            <div className="online-waiting-box">
              <span className="eyebrow">Connection alert</span>
              <span className="status-pill status-pill--disconnected">
                <span className="status-pill__dot" aria-hidden="true" />
                {online.connectionState === 'error' ? 'Connection Error' : 'Disconnected'}
              </span>
              <p className="hand-status">{online.error || 'Connection was lost or failed.'}</p>
              <div className="player-actions">
                <button type="button" className="button button--primary" onClick={online.retry}>
                  <RotateCcw aria-hidden="true" />
                  <span>Retry</span>
                </button>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={online.leaveRoom}
                >
                  <span>Back to Lobby</span>
                </button>
              </div>
            </div>
          )}

          {online.connectionState === 'connected' && online.publicState && (
            <>
              <div className="online-top-bar">
                <div
                  className="scoreboard"
                  aria-label={`Score: Player 1 ${online.publicState.scoreboards.local.p1}, Player 2 ${online.publicState.scoreboards.local.p2}, Dealer ${online.publicState.scoreboards.local.dealer}`}
                >
                  <span className="scoreboard__label">Score</span>
                  <span className="scoreboard__player">
                    P1 ({online.role === 'host' ? 'You' : 'Host'})
                    <strong>{online.publicState.scoreboards.local.p1}</strong>
                  </span>
                  <span className="scoreboard__divider" aria-hidden="true">
                    ·
                  </span>
                  <span className="scoreboard__player">
                    P2 ({online.role === 'guest' ? 'You' : 'Guest'})
                    <strong>{online.publicState.scoreboards.local.p2}</strong>
                  </span>
                  <span className="scoreboard__divider" aria-hidden="true">
                    —
                  </span>
                  <span className="scoreboard__player">
                    Dealer
                    <strong>{online.publicState.scoreboards.local.dealer}</strong>
                  </span>
                </div>

                <div className="online-meta-group">
                  <span
                    className="room-code-badge"
                    style={{ fontSize: '13px', padding: '4px 10px', letterSpacing: '0.1em' }}
                  >
                    Room {online.roomId}
                  </span>
                  <span className="status-pill status-pill--connected">
                    <span className="status-pill__dot" aria-hidden="true" />
                    Connected
                  </span>
                  <span className="role-pill">
                    {online.role === 'host' ? 'Host (Authority)' : 'Guest (Player 2)'}
                  </span>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Leave table"
                    title="Leave table"
                    onClick={online.leaveRoom}
                  >
                    <LogOut aria-hidden="true" />
                  </button>
                </div>
              </div>

              <DealerStation
                cards={online.publicState.dealer.cards as Card[]}
                score={
                  typeof online.publicState.dealer.score === 'number'
                    ? online.publicState.dealer.score
                    : 0
                }
                hiddenCardIndex={online.publicState.dealer.hasHiddenCard ? 1 : undefined}
                statusText={onlineDealerStatusText}
                isBotMode={false}
                outcome={onlineStationOutcomes.dealer}
              />

              <div className="table-divider" aria-hidden="true" />

              <div className="table-grid table-grid--two-players">
                <PlayerPanel
                  accent="first"
                  seatLabel="Seat 01"
                  cards={online.publicState.p1.cards}
                  label={`Player 1 ${online.role === 'host' ? '(You)' : ''}`}
                  score={online.publicState.p1.score}
                  canDraw={canOnlineP1Draw}
                  canStand={canOnlineP1Stand}
                  isStandDisabled={isOnlineP1StandDisabled}
                  actionLabel={onlineP1ActionLabel}
                  keyboardHint={online.publicState.phase === 'player-turn' ? '1 / H' : '1'}
                  standKeyboardHint="S"
                  onDraw={onlineP1OnDraw}
                  onStand={online.role === 'host' ? online.stand : undefined}
                  statusBadge={onlineP1StatusBadge}
                  outcome={onlineStationOutcomes.p1}
                />

                <PlayerPanel
                  accent="second"
                  seatLabel="Seat 02"
                  cards={online.publicState.p2.cards}
                  label={`Player 2 ${online.role === 'guest' ? '(You)' : ''}`}
                  score={online.publicState.p2.score}
                  canDraw={canOnlineP2Draw}
                  canStand={canOnlineP2Stand}
                  isStandDisabled={isOnlineP2StandDisabled}
                  actionLabel={onlineP2ActionLabel}
                  keyboardHint={online.publicState.phase === 'p2-turn' ? '2 / H' : '2'}
                  standKeyboardHint="S"
                  onDraw={onlineP2OnDraw}
                  onStand={online.role === 'guest' ? online.stand : undefined}
                  statusBadge={onlineP2StatusBadge}
                  outcome={onlineStationOutcomes.p2}
                />
              </div>
            </>
          )}

          <div className="sr-only" role="status" aria-live="polite">
            {statusMessage}
          </div>
        </div>
      ) : (
        <div className="table-surface">
          <div className="table-top-bar">
            {state.npcActive ? (
              <div
                className="scoreboard"
                aria-label={`Score: Player 1 ${state.scoreboards.npc.p1}, Dealer ${state.scoreboards.npc.dealer}`}
              >
                <span className="scoreboard__label">Score</span>
                <span
                  className={`scoreboard__player ${scoreGains.p1 ? 'scoreboard__player--bump' : ''}`}
                >
                  P1
                  <span className="scoreboard__value-wrap">
                    <strong>{state.scoreboards.npc.p1}</strong>
                    {scoreGains.p1 && <span className="score-pop-badge">+1</span>}
                  </span>
                </span>
                <span className="scoreboard__divider" aria-hidden="true">
                  —
                </span>
                <span
                  className={`scoreboard__player ${scoreGains.dealer ? 'scoreboard__player--bump' : ''}`}
                >
                  Dealer
                  <span className="scoreboard__value-wrap">
                    <strong>{state.scoreboards.npc.dealer}</strong>
                    {scoreGains.dealer && <span className="score-pop-badge">+1</span>}
                  </span>
                </span>
              </div>
            ) : (
              <div
                className="scoreboard"
                aria-label={`Score: Player 1 ${state.scoreboards.local.p1}, Player 2 ${state.scoreboards.local.p2}, Dealer ${state.scoreboards.local.dealer}`}
              >
                <span className="scoreboard__label">Score</span>
                <span
                  className={`scoreboard__player ${scoreGains.p1 ? 'scoreboard__player--bump' : ''}`}
                >
                  P1
                  <span className="scoreboard__value-wrap">
                    <strong>{state.scoreboards.local.p1}</strong>
                    {scoreGains.p1 && <span className="score-pop-badge">+1</span>}
                  </span>
                </span>
                <span className="scoreboard__divider" aria-hidden="true">
                  ·
                </span>
                <span
                  className={`scoreboard__player ${scoreGains.p2 ? 'scoreboard__player--bump' : ''}`}
                >
                  P2
                  <span className="scoreboard__value-wrap">
                    <strong>{state.scoreboards.local.p2}</strong>
                    {scoreGains.p2 && <span className="score-pop-badge">+1</span>}
                  </span>
                </span>
                <span className="scoreboard__divider" aria-hidden="true">
                  —
                </span>
                <span
                  className={`scoreboard__player ${scoreGains.dealer ? 'scoreboard__player--bump' : ''}`}
                >
                  Dealer
                  <span className="scoreboard__value-wrap">
                    <strong>{state.scoreboards.local.dealer}</strong>
                    {scoreGains.dealer && <span className="score-pop-badge">+1</span>}
                  </span>
                </span>
              </div>
            )}

            <div className="sr-only" role="status" aria-live="polite">
              {statusMessage}
            </div>
          </div>

          <DealerStation
            cards={state.dealer.cards}
            score={state.dealer.score}
            hiddenCardIndex={dealerHiddenIndex}
            statusText={dealerStatusText}
            isBotMode={state.npcActive}
            outcome={stationOutcomes.dealer}
          />

          <div className="table-divider" aria-hidden="true" />

          <div
            className={`table-grid ${state.npcActive ? 'table-grid--single' : 'table-grid--two-players'}`}
          >
            <PlayerPanel
              accent="first"
              seatLabel="Seat 01"
              cards={state.p1.cards}
              label="Player 1"
              score={state.p1.score}
              canDraw={canP1Draw}
              canStand={canP1Stand}
              isStandDisabled={isP1StandDisabled}
              actionLabel={actionLabel}
              keyboardHint={state.phase === 'player-turn' ? '1 / H' : '1'}
              standKeyboardHint="S"
              onDraw={() => drawCard('p1')}
              onStand={() => stand('p1')}
              statusBadge={p1StatusBadge}
              outcome={stationOutcomes.p1}
            />

            {!state.npcActive && (
              <PlayerPanel
                accent="second"
                seatLabel="Seat 02"
                cards={state.p2.cards}
                label="Player 2"
                score={state.p2.score}
                canDraw={canP2Draw}
                canStand={canP2Stand}
                isStandDisabled={isP2StandDisabled}
                actionLabel={actionLabel}
                keyboardHint={state.phase === 'p2-turn' ? '2 / H' : '2'}
                standKeyboardHint="S"
                onDraw={() => drawCard('p2')}
                onStand={() => stand('p2')}
                statusBadge={p2StatusBadge}
                outcome={stationOutcomes.p2}
              />
            )}
          </div>
        </div>
      )}

      <footer className="app-footer">
        <span>
          {activeMode === 'online' ? (
            online.connectionState === 'connected' ? (
              online.role === 'host' ? (
                <>
                  <kbd>1</kbd> or <kbd>H</kbd> Hit · <kbd>S</kbd> or <kbd>Space</kbd> Stand ·{' '}
                  <kbd>Space</kbd> Deal
                </>
              ) : (
                <>
                  <kbd>2</kbd> or <kbd>H</kbd> Hit · <kbd>S</kbd> or <kbd>Space</kbd> Stand ·{' '}
                  <kbd>Space</kbd> Ready/Rematch
                </>
              )
            ) : (
              <>Room {online.roomId || '—'} · WebRTC P2P DataChannel</>
            )
          ) : state.npcActive ? (
            <>
              <kbd>1</kbd> or <kbd>H</kbd> Hit · <kbd>S</kbd> or <kbd>Space</kbd> Stand ·{' '}
              <kbd>Space</kbd> Deal · <kbd>R</kbd> Reset
            </>
          ) : (
            <>
              <kbd>1</kbd>/<kbd>2</kbd> Hit · <kbd>S</kbd> Stand · <kbd>Space</kbd> Deal ·{' '}
              <kbd>R</kbd> Reset
            </>
          )}
        </span>
        <span className="footer-note">Classic Casino Rules · Dealer stands on 17</span>
      </footer>

      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
    </main>
  );
}

export default App;
