import { useEffect, useState } from 'react';
import { Bot, CircleHelp, Clock3, Hand } from 'lucide-react';
import { useBlackjackGame } from './hooks/useBlackjackGame';
import type { Card } from './lib/game-logic';

const buttonBase =
  'inline-flex min-h-[46px] items-center justify-center gap-[0.55rem] rounded-xl border border-white/10 px-5 py-3 font-sans font-semibold leading-normal text-[#f5f7fa] transition duration-[180ms] ease-out hover:-translate-y-0.5 hover:border-[#f4d58d]/65 hover:bg-white/10 active:translate-y-0 focus-visible:outline-3 focus-visible:outline-[#39c98a]/45 focus-visible:outline-offset-3';
const primaryButton = `${buttonBase} border-transparent bg-[linear-gradient(135deg,#f4d58d,#d6a84f)] text-[#171208] shadow-[0_8px_20px_rgba(214,168,79,0.18)] hover:border-transparent hover:bg-[linear-gradient(135deg,#ffe8ad,#f4d58d)] hover:shadow-[0_10px_25px_rgba(214,168,79,0.3)]`;

function formatScore(hand: { cards: Card[]; score: number }): number | string {
  if (hand.cards.length === 0) return 0;
  if (hand.cards.length === 1 && hand.cards[0]?.label === 'A') return '1/11';
  return hand.score;
}

function PlayingCard({ card }: { card: Card }) {
  const [rotation] = useState(() => (Math.random() * 6 - 3).toFixed(2));
  const cardColor = card.color === 'red' ? 'text-[#c53d50]' : 'text-[#17202c]';

  return (
    <div
      className={`relative flex h-[116px] w-[78px] shrink-0 flex-col justify-between rounded-[10px] border border-white/80 bg-[linear-gradient(145deg,#fff,#e9edf0)] p-2 font-extrabold text-[#1a1a1a] shadow-[0_8px_18px_rgba(0,0,0,0.35)] [animation:dealCard_0.5s_cubic-bezier(0.23,1,0.32,1)_forwards] [transform:rotate(var(--rotation))] hover:z-10 hover:-translate-y-[10px] hover:scale-[1.08] hover:shadow-[0_16px_25px_rgba(0,0,0,0.5)] ${cardColor}`}
      style={{ '--rotation': `${rotation}deg` } as React.CSSProperties}
    >
      <div className="absolute left-2 top-2 flex flex-col items-start leading-none">
        <div className="text-[1.2rem]">{card.label}</div>
        <div className="text-xs">{card.symbol}</div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center text-[2rem]">
        {card.symbol}
      </div>
      <div className="absolute bottom-2 right-2 flex rotate-180 flex-col items-end leading-none">
        <div className="text-[1.2rem]">{card.label}</div>
        <div className="text-xs">{card.symbol}</div>
      </div>
    </div>
  );
}

function RulesModal({ onClose }: { onClose: () => void }) {
  const rules = [
    ['Goal', 'Get as close to 21 as possible without going over.'],
    ['Cards', 'Number cards are worth their number; J, Q and K are worth 10.'],
    ['Ace', 'An Ace is worth 11 or 1, whichever is better for your score.'],
    ['Round', 'The highest valid score wins. Going over 21 is a bust and loses the round.'],
    ['Controls', 'Use the card buttons or keys 1 and 2. Press R to reset the scores.'],
    ['BOT', 'Turn on the BOT to play against an automatic opponent.'],
  ];

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-[rgba(3,7,13,0.8)] p-4 backdrop-blur-xl"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="max-h-[min(680px,calc(100vh-2rem))] w-full max-w-[520px] overflow-y-auto rounded-[22px] border border-white/15 bg-[linear-gradient(145deg,#182438,#0e1725)] p-[clamp(1.25rem,4vw,2rem)] shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rulesTitle"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <span className="font-display text-[0.68rem] font-bold tracking-[0.16em] text-[#d6a84f]">
              BLACKJACK
            </span>
            <h2
              id="rulesTitle"
              className="mt-1.5 font-display text-[clamp(1.6rem,5vw,2.2rem)] tracking-[-0.05em] text-[#f5f7fa]"
            >
              Game rules
            </h2>
          </div>
        </div>
        <div className="grid gap-3">
          {rules.map(([title, description]) => (
            <p key={title} className="grid gap-1 border-b border-white/10 pb-3">
              <strong className="text-[0.82rem] text-[#f4d58d]">{title}</strong>
              <span className="text-[0.82rem] leading-[1.45] text-[#91a0b5]">{description}</span>
            </p>
          ))}
        </div>
        <button type="button" className={`${primaryButton} mt-5 w-full`} onClick={onClose}>
          Got it
        </button>
      </section>
    </div>
  );
}

function App() {
  const { state, drawCard, toggleNpc, resetScores } = useBlackjackGame();
  const [rulesOpen, setRulesOpen] = useState(false);
  const opponentName = state.npcActive ? 'BOT' : 'P2';
  const opponentLabel = state.npcActive ? 'BOT' : 'Player 2';
  const activeScoreboard = state.scoreboards[state.npcActive ? 'npc' : 'local'];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '1') drawCard('p1');
      if (event.key === '2' && !state.npcActive) drawCard('p2');
      if (event.key.toLowerCase() === 'r') resetScores();
      if (event.key === 'Escape') setRulesOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [drawCard, resetScores, state.npcActive]);

  return (
    <main className="relative w-full max-w-[1040px] rounded-[28px] border border-[rgba(214,168,79,0.18)] bg-[linear-gradient(145deg,rgba(24,36,56,0.9),rgba(9,15,25,0.94))] p-[clamp(1.25rem,3vw,2.5rem)] shadow-[0_24px_70px_rgba(0,0,0,0.45),inset_0_1px_rgba(255,255,255,0.05)] backdrop-blur-[18px]">
      <header className="mb-8 flex items-center justify-between gap-4 border-b border-white/10 pb-6 max-[640px]:flex-wrap">
        <div className="flex items-center gap-3">
          <img
            className="h-[clamp(42px,6vw,58px)] w-[clamp(42px,6vw,58px)] object-contain"
            src="/blackjack-icon.webp"
            alt=""
          />
          <h1 className="font-display text-[clamp(2rem,5vw,3.2rem)] font-extrabold leading-none tracking-[-0.07em] text-[#f5f7fa]">
            Blackjack
          </h1>
        </div>
        <div
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-[rgba(8,13,22,0.45)] px-3 py-2"
          aria-label="Win score"
        >
          <div className="flex min-w-10 items-center justify-center gap-1.5">
            <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[#91a0b5]">P1</span>
            <strong className="text-[1.15rem] leading-none text-[#f4d58d]">
              {activeScoreboard.p1}
            </strong>
          </div>
          <span className="font-bold text-white/25">:</span>
          <div className="flex min-w-10 items-center justify-center gap-1.5">
            <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[#91a0b5]">
              {opponentName}
            </span>
            <strong className="text-[1.15rem] leading-none text-[#8bf0bd]">
              {state.npcActive ? state.scoreboards.npc.bot : state.scoreboards.local.p2}
            </strong>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <button
            type="button"
            className={`${buttonBase} h-[42px] w-[42px] !min-h-[42px] !p-0 text-white hover:!border-white/30`}
            aria-label="View game rules"
            title="Game rules"
            onClick={() => setRulesOpen(true)}
          >
            <CircleHelp aria-hidden="true" />
          </button>
          <div className="flex min-w-[76px] items-center justify-center gap-2 rounded-[14px] border border-[rgba(244,213,141,0.25)] bg-[rgba(8,13,22,0.6)] px-3.5 py-2.5">
            <span className="text-white" aria-hidden="true">
              <Clock3 aria-hidden="true" />
            </span>
            <div
              id="timer"
              role="timer"
              aria-label={`Time remaining: ${state.timer} seconds`}
              className="font-mono text-[1.35rem] font-bold text-white"
            >
              {state.timer}
            </div>
          </div>
        </div>
      </header>

      {state.notice && (
        <div
          className={`pointer-events-none absolute left-1/2 top-[52%] z-10 min-w-[min(260px,calc(100%-2rem))] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-[14px] border px-6 py-3 text-center text-[0.95rem] font-bold leading-[1.3] opacity-100 shadow-[0_12px_32px_rgba(0,0,0,0.4)] transition duration-200 ${state.notice.winner === 'p1' ? 'border-[#f4d58d]/65 text-[#f4d58d] shadow-[0_0_28px_rgba(214,168,79,0.2)]' : state.notice.winner === 'p2' ? 'border-[#39c98a]/65 text-[#8bf0bd] shadow-[0_0_28px_rgba(57,201,138,0.18)]' : 'border-[#91a0b5]/45 text-[#91a0b5]'} bg-[rgba(8,13,22,0.94)]`}
          role="status"
          aria-live="polite"
        >
          {state.notice.message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-5 max-[640px]:grid-cols-1">
        <section
          className="relative flex min-h-[330px] flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025))] p-6 text-center shadow-[inset_0_1px_rgba(255,255,255,0.04)] transition duration-[220ms] hover:-translate-y-1 hover:border-[#d6a84f]/55 hover:shadow-[0_16px_32px_rgba(214,168,79,0.12)] before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[#d6a84f] before:opacity-85"
          id="sectionP1"
        >
          <div className="mb-1.5 text-[0.78rem] font-bold leading-normal uppercase tracking-[0.16em] text-[#91a0b5]">
            Player 1
          </div>
          <div
            id="idDoElemento"
            className="mt-1 text-[clamp(3.5rem,8vw,5rem)] font-extrabold leading-none tracking-[-0.08em] text-[#f4d58d] [text-shadow:0_0_24px_rgba(214,168,79,0.25)]"
          >
            {formatScore(state.p1)}
          </div>
          <div
            id="cardsP1"
            className={`mb-2 mt-5 flex min-h-[132px] items-center justify-center gap-0 [perspective:1000px] ${state.p1.cards.length === 0 ? 'empty-card' : ''}`}
          >
            {state.p1.cards.map((card, index) => (
              <PlayingCard key={`${card.label}-${card.symbol}-${index}`} card={card} />
            ))}
          </div>
          <div className="mt-auto flex flex-wrap justify-center gap-3">
            <button
              type="button"
              id="hitP1"
              className={`${primaryButton} h-[52px] w-[52px] rounded-full !p-0`}
              aria-label="Draw a card for Player 1"
              title="Draw a card (1)"
              onClick={() => drawCard('p1')}
            >
              <Hand aria-hidden="true" />
            </button>
          </div>
        </section>
        <section
          className="relative flex min-h-[330px] flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025))] p-6 text-center shadow-[inset_0_1px_rgba(255,255,255,0.04)] transition duration-[220ms] hover:-translate-y-1 hover:border-[#39c98a]/55 hover:shadow-[0_16px_32px_rgba(57,201,138,0.12)] before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[#39c98a] before:opacity-85"
          id="sectionP2"
        >
          <div className="mb-1.5 text-[0.78rem] font-bold leading-normal uppercase tracking-[0.16em] text-[#91a0b5]">
            {opponentLabel}
          </div>
          <div
            id="idDoElemento2"
            className="mt-1 text-[clamp(3.5rem,8vw,5rem)] font-extrabold leading-none tracking-[-0.08em] text-[#8bf0bd] [text-shadow:0_0_24px_rgba(57,201,138,0.25)]"
          >
            {formatScore(state.p2)}
          </div>
          <div
            id="cardsP2"
            className={`mb-2 mt-5 flex min-h-[132px] items-center justify-center gap-0 [perspective:1000px] ${state.p2.cards.length === 0 ? 'empty-card empty-card-green' : ''}`}
          >
            {state.p2.cards.map((card, index) => (
              <PlayingCard key={`${card.label}-${card.symbol}-${index}`} card={card} />
            ))}
          </div>
          <div className="mt-auto flex flex-wrap justify-center gap-3">
            <button
              type="button"
              id="cartaP2"
              className={`${state.npcActive ? 'hidden' : 'inline-flex'} h-[52px] w-[52px] items-center justify-center gap-[0.55rem] rounded-full border-transparent bg-[linear-gradient(135deg,#63e0aa,#39c98a)] !p-0 text-[#07150f] transition duration-[180ms] ease-out hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-3 focus-visible:outline-[#39c98a]/45 focus-visible:outline-offset-3 shadow-[0_8px_20px_rgba(57,201,138,0.2)] hover:border-transparent hover:bg-[linear-gradient(135deg,#9af0c8,#63e0aa)] hover:shadow-[0_10px_25px_rgba(57,201,138,0.32)]`}
              aria-label="Draw a card for Player 2"
              title="Draw a card (2)"
              onClick={() => drawCard('p2')}
            >
              <Hand aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          id="TrocarNPC"
          className={`${buttonBase} border-white/10 bg-[rgba(8,13,22,0.6)] text-white ${state.npcActive ? 'border-[#39c98a]/55 bg-[rgba(57,201,138,0.22)] shadow-[0_8px_20px_rgba(57,201,138,0.12)] hover:border-[#63e0aa]/80 hover:bg-[rgba(57,201,138,0.32)]' : 'hover:!border-white/30'}`}
          aria-label={`Toggle BOT ${state.npcActive ? 'ON' : 'OFF'}`}
          title="Toggle BOT"
          aria-pressed={state.npcActive}
          onClick={toggleNpc}
        >
          <Bot aria-hidden="true" />
          <span>{state.npcActive ? 'ON' : 'OFF'}</span>
        </button>
      </div>
      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
    </main>
  );
}

export default App;
