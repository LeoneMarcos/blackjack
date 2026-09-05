import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Bot, CircleHelp, Clock3, Hand, RotateCcw, Users, X } from 'lucide-react';
import { useBlackjackGame } from './hooks/useBlackjackGame';
import { shouldBotHit, type Card } from './lib/game-logic';

function formatScore(hand: { cards: Card[]; score: number }): number | string {
  if (hand.cards.length === 0) return 0;
  if (hand.cards.length === 1 && hand.cards[0]?.label === 'A') return '1/11';
  return hand.score;
}

function getHandStatus(score: number, cardCount: number): string {
  if (score > 21) return 'Bust';
  if (score === 21) return 'Blackjack';
  if (cardCount === 0) return 'Waiting for the first card';
  return `${cardCount} ${cardCount === 1 ? 'card' : 'cards'}`;
}

function PlayingCard({ card }: { card: Card }) {
  const [rotation] = useState(() => (Math.random() * 6 - 3).toFixed(2));
  const cardColor = card.color === 'red' ? 'card--red' : 'card--black';

  return (
    <li
      className={`playing-card ${cardColor}`}
      style={{ '--rotation': `${rotation}deg` } as CSSProperties}
      aria-label={`${card.label} of ${card.name}`}
    >
      <div className="playing-card__corner">
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
    ['Goal', 'Get as close to 21 as possible without going over.'],
    ['Cards', 'Number cards keep their value; J, Q and K are worth 10.'],
    ['Ace', 'An Ace is worth 11 or 1, whichever gives the better score.'],
    ['Round', 'The highest valid score wins. Going over 21 is a bust.'],
    ['Controls', 'Use the buttons or press 1 for Player 1 and 2 for Player 2.'],
    ['BOT', 'Turn on the BOT to play against an automatic opponent.'],
  ];

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    return () => previousFocus?.focus();
  }, []);

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
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
            <span className="eyebrow">How to play</span>
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
          Rules and keyboard controls for the current Blackjack match.
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

interface PlayerPanelProps {
  accent: 'first' | 'second';
  cards: Card[];
  label: string;
  score: number;
  canDraw: boolean;
  actionLabel: string;
  keyboardHint: string;
  onDraw: () => void;
}

function PlayerPanel({
  accent,
  cards,
  label,
  score,
  canDraw,
  actionLabel,
  keyboardHint,
  onDraw,
}: PlayerPanelProps) {
  const status = getHandStatus(score, cards.length);

  return (
    <section
      className={`player-panel player-panel--${accent} ${score > 21 ? 'player-panel--bust' : ''}`}
      aria-labelledby={`${accent}-player-title`}
    >
      <div className="player-panel__heading">
        <div>
          <span className="eyebrow">{accent === 'first' ? 'Seat 01' : 'Seat 02'}</span>
          <h2 id={`${accent}-player-title`}>{label}</h2>
        </div>
        <div className="score" aria-label={`${label} score`}>
          {formatScore({ cards, score })}
          <small>/ 21</small>
        </div>
      </div>
      <span className="hand-status">{status}</span>
      {cards.length > 0 ? (
        <ol className="cards" aria-label={`${label} cards`}>
          {cards.map((card, index) => (
            <PlayingCard key={`${card.label}-${card.symbol}-${index}`} card={card} />
          ))}
        </ol>
      ) : (
        <div className="empty-hand" aria-label={`${label} has no cards yet`}>
          <span className="empty-cards" aria-hidden="true">
            ♠
          </span>
          <span>Ready to deal</span>
        </div>
      )}
      <button
        type="button"
        className="button button--primary draw-button"
        disabled={!canDraw}
        aria-label={`${actionLabel} for ${label}`}
        onClick={onDraw}
      >
        <Hand aria-hidden="true" />
        <span>{actionLabel}</span>
        {canDraw && <kbd>{keyboardHint}</kbd>}
      </button>
    </section>
  );
}

function App() {
  const { state, drawCard, toggleNpc, resetScores } = useBlackjackGame();
  const [rulesOpen, setRulesOpen] = useState(false);
  const opponentName = state.npcActive ? 'BOT' : 'Player 2';
  const activeScoreboard = state.scoreboards[state.npcActive ? 'npc' : 'local'];
  const opponentWins = state.npcActive ? state.scoreboards.npc.bot : state.scoreboards.local.p2;
  const actionLabel = state.gameOver ? 'Deal again' : 'Draw card';
  const botThinking =
    state.npcActive &&
    !state.gameOver &&
    state.p1.cards.length > 0 &&
    shouldBotHit(state.p1.score, state.p2.score);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return;
      if (event.key === 'Escape') setRulesOpen(false);
      if (rulesOpen) return;
      if (event.key === '1') drawCard('p1');
      if (event.key === '2' && !state.npcActive) drawCard('p2');
      if (event.key.toLowerCase() === 'r') resetScores();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [drawCard, resetScores, state.npcActive, rulesOpen]);

  return (
    <main className="app-shell" aria-labelledby="app-title">
      <header className="app-header">
        <div className="brand-lockup">
          <img className="brand-mark" src="/blackjack-neutral.webp" alt="" width="56" height="56" />
          <div>
            <span className="eyebrow">The card room</span>
            <h1 id="app-title">Blackjack</h1>
          </div>
        </div>
        <div className="header-tools">
          <div
            className="scoreboard"
            aria-label={`Score: Player 1 ${activeScoreboard.p1}, ${opponentName} ${opponentWins}`}
          >
            <span className="scoreboard__label">Score</span>
            <span className="scoreboard__player">
              P1 <strong>{activeScoreboard.p1}</strong>
            </span>
            <span className="scoreboard__divider" aria-hidden="true">
              —
            </span>
            <span className="scoreboard__player">
              {state.npcActive ? 'BOT' : 'P2'} <strong>{opponentWins}</strong>
            </span>
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
            <div
              className={`timer-chip ${state.timer <= 10 ? 'timer-chip--urgent' : ''}`}
              role="timer"
              aria-label={`${state.timer} seconds remaining`}
            >
              <Clock3 aria-hidden="true" />
              <span>{String(state.timer).padStart(2, '0')}</span>
              <small>sec</small>
            </div>
          </div>
        </div>
      </header>

      <div className="match-bar">
        <div>
          <span className="eyebrow">Match mode</span>
          <strong>
            Player 1 <span aria-hidden="true">vs</span> {opponentName}
          </strong>
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
      </div>

      <div className="table-surface">
        <div className="table-inscription" aria-hidden="true">
          <span>21</span>
          <small>
            Closest wins
            <br />
            Never over
          </small>
        </div>
        <div className="game-status" role="status" aria-live="polite">
          <span
            className={`status-dot ${state.gameOver ? 'status-dot--complete' : ''}`}
            aria-hidden="true"
          />
          {state.notice?.message ??
            (state.gameOver
              ? 'Round complete — deal again to play'
              : 'Choose a hand to draw a card')}
        </div>

        <div className="table-grid">
          <PlayerPanel
            accent="first"
            cards={state.p1.cards}
            label="Player 1"
            score={state.p1.score}
            canDraw
            actionLabel={actionLabel}
            keyboardHint="1"
            onDraw={() => drawCard('p1')}
          />
          <PlayerPanel
            accent="second"
            cards={state.p2.cards}
            label={opponentName}
            score={state.p2.score}
            canDraw={!state.npcActive}
            actionLabel={
              state.npcActive ? (botThinking ? 'BOT is thinking' : 'Auto play') : actionLabel
            }
            keyboardHint="2"
            onDraw={() => drawCard('p2')}
          />
        </div>
      </div>
      <footer className="app-footer">
        <span>
          Press <kbd>R</kbd> to reset scores
        </span>
        <span className="footer-note">
          <Clock3 aria-hidden="true" />
          30-second rounds · Closest to 21 wins
        </span>
      </footer>

      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
    </main>
  );
}

export default App;
