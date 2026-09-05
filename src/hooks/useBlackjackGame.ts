import { useEffect, useReducer } from 'react';
import {
  calculateHandValue,
  createScoreboards,
  determineWinner,
  isBust,
  shouldBotHit,
  type Card,
  type Scoreboards,
  type Winner,
} from '../lib/game-logic';
import { createDeck } from '../lib/deck';

type PlayerId = 'p1' | 'p2';

interface Hand {
  cards: Card[];
  score: number;
}

export interface RoundNotice {
  winner: Winner;
  message: string;
}

export interface GameState {
  p1: Hand;
  p2: Hand;
  deck: Card[];
  timer: number;
  npcActive: boolean;
  scoreboards: Scoreboards;
  gameOver: boolean;
  notice: RoundNotice | null;
}

type Action =
  | { type: 'draw'; player: PlayerId }
  | { type: 'tick' }
  | { type: 'toggle-npc' }
  | { type: 'reset-scores' }
  | { type: 'dismiss-notice' };

function createRound(scoreboards: Scoreboards, npcActive: boolean): GameState {
  return {
    p1: { cards: [], score: 0 },
    p2: { cards: [], score: 0 },
    deck: createDeck(),
    timer: 30,
    npcActive,
    scoreboards,
    gameOver: false,
    notice: null,
  };
}

function createInitialState(): GameState {
  return createRound(createScoreboards(), true);
}

function createNotice(
  winner: Winner,
  p1Score: number,
  p2Score: number,
  npcActive: boolean,
): RoundNotice {
  const winnerName = winner === 'p1' ? 'P1' : winner === 'p2' ? (npcActive ? 'BOT' : 'P2') : 'Tie';
  let message = winner === 'tie' ? 'Round tied' : `${winnerName} won the round`;

  if (winner !== 'tie') {
    const loserBusted = winner === 'p1' ? p2Score > 21 : p1Score > 21;
    if (loserBusted) message += ` — ${winner === 'p1' ? (npcActive ? 'BOT' : 'P2') : 'P1'} busted`;
  }

  return { winner, message };
}

function finishRound(state: GameState, manualWinner?: Winner): GameState {
  const winner = determineWinner(state.p1.score, state.p2.score, manualWinner);
  const scoreboards = {
    local: { ...state.scoreboards.local },
    npc: { ...state.scoreboards.npc },
  };

  if (winner === 'p1') scoreboards[state.npcActive ? 'npc' : 'local'].p1 += 1;
  if (winner === 'p2') {
    if (state.npcActive) scoreboards.npc.bot += 1;
    else scoreboards.local.p2 += 1;
  }

  return {
    ...state,
    scoreboards,
    gameOver: true,
    notice: createNotice(winner, state.p1.score, state.p2.score, state.npcActive),
  };
}

function draw(state: GameState, player: PlayerId): GameState {
  const workingState = state.gameOver ? createRound(state.scoreboards, state.npcActive) : state;
  const deck = workingState.deck.length > 0 ? workingState.deck : createDeck();
  const card = deck[deck.length - 1];
  if (!card) return workingState;

  const cards = [...workingState[player].cards, card];
  const score = calculateHandValue(cards);
  const nextState: GameState = {
    ...workingState,
    deck: deck.slice(0, -1),
    [player]: { cards, score },
    notice: null,
  };

  if (score === 21) return finishRound(nextState, player === 'p1' ? 'p1' : 'p2');
  if (isBust(score)) return finishRound(nextState, player === 'p1' ? 'p2' : 'p1');
  return nextState;
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'draw':
      return draw(state, action.player);
    case 'tick': {
      if (state.gameOver) return state;
      if (state.timer <= 1) return finishRound({ ...state, timer: 0 });
      return { ...state, timer: state.timer - 1 };
    }
    case 'toggle-npc':
      return createRound(state.scoreboards, !state.npcActive);
    case 'reset-scores':
      return createRound(createScoreboards(), state.npcActive);
    case 'dismiss-notice':
      return { ...state, notice: null };
    default:
      return state;
  }
}

export function useBlackjackGame() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  useEffect(() => {
    const interval = window.setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (
      !state.npcActive ||
      state.gameOver ||
      state.p1.cards.length === 0 ||
      !shouldBotHit(state.p1.score, state.p2.score)
    )
      return;
    const timeout = window.setTimeout(() => dispatch({ type: 'draw', player: 'p2' }), 600);
    return () => window.clearTimeout(timeout);
  }, [state.npcActive, state.gameOver, state.p1.cards.length, state.p1.score, state.p2.score]);

  useEffect(() => {
    if (!state.notice) return;
    const timeout = window.setTimeout(() => dispatch({ type: 'dismiss-notice' }), 2800);
    return () => window.clearTimeout(timeout);
  }, [state.notice]);

  return {
    state,
    drawCard: (player: PlayerId) => dispatch({ type: 'draw', player }),
    toggleNpc: () => dispatch({ type: 'toggle-npc' }),
    resetScores: () => dispatch({ type: 'reset-scores' }),
  };
}
