import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Bot, CircleHelp, Hand, RotateCcw, Users, X } from 'lucide-react';
import { useBlackjackGame } from './hooks/useBlackjackGame';
import {
  calculateVisibleHandValue,
  getStationOutcomes,
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
          <span>Dealer stands on 17</span>
        </div>
      )}
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
  const [rulesOpen, setRulesOpen] = useState(false);

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

  const prevScoresRef = useRef({
    p1: state.npcActive ? state.scoreboards.npc.p1 : state.scoreboards.local.p1,
    p2: state.scoreboards.local.p2,
    dealer: state.npcActive ? state.scoreboards.npc.dealer : state.scoreboards.local.dealer,
  });

  const [scoreGains, setScoreGains] = useState<{ p1?: boolean; p2?: boolean; dealer?: boolean }>(
    {},
  );

  useEffect(() => {
    const currentP1 = state.npcActive ? state.scoreboards.npc.p1 : state.scoreboards.local.p1;
    const currentP2 = state.scoreboards.local.p2;
    const currentDealer = state.npcActive
      ? state.scoreboards.npc.dealer
      : state.scoreboards.local.dealer;

    const prev = prevScoresRef.current;
    const gains: { p1?: boolean; p2?: boolean; dealer?: boolean } = {};

    if (currentP1 > prev.p1) gains.p1 = true;
    if (currentP2 > prev.p2) gains.p2 = true;
    if (currentDealer > prev.dealer) gains.dealer = true;

    prevScoresRef.current = { p1: currentP1, p2: currentP2, dealer: currentDealer };

    if (gains.p1 || gains.p2 || gains.dealer) {
      const gainTimer = setTimeout(() => setScoreGains(gains), 0);
      const resetTimer = setTimeout(() => setScoreGains({}), 1500);
      return () => {
        clearTimeout(gainTimer);
        clearTimeout(resetTimer);
      };
    }
  }, [state.scoreboards, state.npcActive]);

  let dealerStatusText = 'Dealer stands on 17 · Draws to 16';
  if (state.phase === 'dealer-turn') {
    dealerStatusText = 'Dealer is drawing (stands on 17)...';
  } else if (state.gameOver) {
    dealerStatusText =
      state.dealer.score > 21
        ? `Dealer busted with ${state.dealer.score}`
        : `Dealer stands on ${state.dealer.score}`;
  } else if (state.phase === 'idle') {
    dealerStatusText = 'Ready to deal';
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return;
      if (event.key === 'Escape') setRulesOpen(false);
      if (rulesOpen) return;

      const key = event.key.toLowerCase();
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
  }, [hit, stand, dealRound, resetScores, state.phase, rulesOpen]);

  let statusMessage = state.notice?.message;
  if (!statusMessage) {
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

  return (
    <main className="app-shell" aria-labelledby="app-title">
      <header className="app-header">
        <div className="brand-lockup">
          <img className="brand-mark" src="/blackjack-neutral.webp" alt="" width="38" height="38" />
          <div>
            <span className="eyebrow">The card room</span>
            <h1 id="app-title">Blackjack</h1>
          </div>
        </div>

        <div className="mode-selector" role="group" aria-label="Game mode">
          <button
            type="button"
            className={`mode-toggle ${state.npcActive ? 'mode-toggle--active' : ''}`}
            aria-pressed={state.npcActive}
            onClick={() => {
              if (!state.npcActive) toggleNpc();
            }}
          >
            <Bot aria-hidden="true" />
            <span>Play against BOT</span>
          </button>
          <button
            type="button"
            className={`mode-toggle ${!state.npcActive ? 'mode-toggle--active' : ''}`}
            aria-pressed={!state.npcActive}
            onClick={() => {
              if (state.npcActive) toggleNpc();
            }}
          >
            <Users aria-hidden="true" />
            <span>Two players</span>
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
            onClick={resetScores}
          >
            <RotateCcw aria-hidden="true" />
          </button>
        </div>
      </header>

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

          <div
            className={`game-status ${
              state.p1.score > 21 || state.p2.score > 21 || state.dealer.score > 21
                ? 'game-status--bust'
                : ''
            }`}
            role="status"
            aria-live="polite"
          >
            <span
              className={`status-dot ${state.gameOver ? 'status-dot--complete' : ''}`}
              aria-hidden="true"
            />
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

      <footer className="app-footer">
        <span>
          {state.npcActive ? (
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
