import { useEffect, useReducer } from 'react';
import {
  calculateHandValue,
  calculateTwoPlayerRoundPoints,
  compareAgainstDealer,
  createScoreboards,
  dealerMustHit,
  evaluateHandVsDealer,
  isBlackjack,
  isBust,
  nextPhaseAfterPlayerOne,
  type Card,
  type GamePhase,
  type HandOutcome,
  type Scoreboards,
} from '../lib/game-logic';
import { createDeck } from '../lib/deck';

export type PlayerId = 'p1' | 'p2';

export interface Hand {
  cards: Card[];
  score: number;
}

export interface RoundNotice {
  winner: string;
  message: string;
}

export interface GameState {
  dealer: Hand;
  p1: Hand;
  p2: Hand;
  deck: Card[];
  phase: GamePhase;
  npcActive: boolean;
  scoreboards: Scoreboards;
  gameOver: boolean;
  notice: RoundNotice | null;
}

export type Action =
  | { type: 'deal' }
  | { type: 'hit'; player?: PlayerId }
  | { type: 'stand'; player?: PlayerId }
  | { type: 'dealer-step' }
  | { type: 'draw'; player: PlayerId }
  | { type: 'toggle-npc' }
  | { type: 'reset-scores' }
  | { type: 'dismiss-notice' };

export function dealInitialRound(
  scoreboards: Scoreboards,
  npcActive: boolean,
  currentDeck?: Card[],
): GameState {
  const deck = currentDeck && currentDeck.length >= 15 ? [...currentDeck] : createDeck();

  const p1Cards = [deck.pop()!, deck.pop()!];
  const p2Cards = npcActive ? [] : [deck.pop()!, deck.pop()!];
  const dealerCards = [deck.pop()!, deck.pop()!];

  const p1Score = calculateHandValue(p1Cards);
  const p2Score = npcActive ? 0 : calculateHandValue(p2Cards);
  const dealerScore = calculateHandValue(dealerCards);

  const dealerBJ = isBlackjack(dealerCards);
  const p1BJ = isBlackjack(p1Cards);
  const p2BJ = !npcActive && isBlackjack(p2Cards);

  if (npcActive) {
    // 1-Player mode (Play against BOT / Dealer)
    if (dealerBJ && p1BJ) {
      return {
        dealer: { cards: dealerCards, score: dealerScore },
        p1: { cards: p1Cards, score: p1Score },
        p2: { cards: [], score: 0 },
        deck,
        phase: 'round-ended',
        npcActive,
        scoreboards,
        gameOver: true,
        notice: { winner: 'tie', message: 'Both have Blackjack! Round tied (0 pts)' },
      };
    }

    if (dealerBJ) {
      const updatedScores: Scoreboards = {
        ...scoreboards,
        npc: {
          ...scoreboards.npc,
          dealer: scoreboards.npc.dealer + 1,
          bot: scoreboards.npc.bot + 1,
        },
      };
      return {
        dealer: { cards: dealerCards, score: dealerScore },
        p1: { cards: p1Cards, score: p1Score },
        p2: { cards: [], score: 0 },
        deck,
        phase: 'round-ended',
        npcActive,
        scoreboards: updatedScores,
        gameOver: true,
        notice: { winner: 'dealer', message: 'Blackjack! Dealer won the round' },
      };
    }

    if (p1BJ) {
      const updatedScores: Scoreboards = {
        ...scoreboards,
        npc: { ...scoreboards.npc, p1: scoreboards.npc.p1 + 1 },
      };
      return {
        dealer: { cards: dealerCards, score: dealerScore },
        p1: { cards: p1Cards, score: p1Score },
        p2: { cards: [], score: 0 },
        deck,
        phase: 'round-ended',
        npcActive,
        scoreboards: updatedScores,
        gameOver: true,
        notice: { winner: 'p1', message: 'Blackjack! Player 1 won the round' },
      };
    }

    return {
      dealer: { cards: dealerCards, score: dealerScore },
      p1: { cards: p1Cards, score: p1Score },
      p2: { cards: [], score: 0 },
      deck,
      phase: 'player-turn',
      npcActive,
      scoreboards,
      gameOver: false,
      notice: null,
    };
  }

  // Two Players mode (!npcActive)
  if (dealerBJ) {
    const p1Outcome: HandOutcome = p1BJ ? 'tie' : 'lose';
    const p2Outcome: HandOutcome = p2BJ ? 'tie' : 'lose';
    const points = calculateTwoPlayerRoundPoints(p1Outcome, p2Outcome);
    const updatedScores: Scoreboards = {
      ...scoreboards,
      local: {
        ...scoreboards.local,
        p1: scoreboards.local.p1 + points.p1,
        p2: scoreboards.local.p2 + points.p2,
        dealer: scoreboards.local.dealer + points.dealer,
      },
    };

    let message = 'Blackjack! Dealer won against both players (+1 pt Dealer)';
    if (p1BJ && p2BJ) message = 'Dealer and both players have Blackjack! Round tied (0 pts)';
    else if (p1BJ)
      message = 'Dealer and Player 1 tied with Blackjack · Dealer beat Player 2 (0 pts)';
    else if (p2BJ)
      message = 'Dealer and Player 2 tied with Blackjack · Dealer beat Player 1 (0 pts)';

    return {
      dealer: { cards: dealerCards, score: dealerScore },
      p1: { cards: p1Cards, score: p1Score },
      p2: { cards: p2Cards, score: p2Score },
      deck,
      phase: 'round-ended',
      npcActive,
      scoreboards: updatedScores,
      gameOver: true,
      notice: { winner: points.dealer === 1 ? 'dealer' : 'tie', message },
    };
  }

  if (p1BJ && p2BJ) {
    const points = calculateTwoPlayerRoundPoints('win', 'win');
    const updatedScores: Scoreboards = {
      ...scoreboards,
      local: {
        ...scoreboards.local,
        p1: scoreboards.local.p1 + points.p1,
        p2: scoreboards.local.p2 + points.p2,
        dealer: scoreboards.local.dealer + points.dealer,
      },
    };
    return {
      dealer: { cards: dealerCards, score: dealerScore },
      p1: { cards: p1Cards, score: p1Score },
      p2: { cards: p2Cards, score: p2Score },
      deck,
      phase: 'round-ended',
      npcActive,
      scoreboards: updatedScores,
      gameOver: true,
      notice: { winner: 'both', message: 'Blackjack! Both Player 1 and Player 2 won (+1 pt each)' },
    };
  }

  if (p1BJ && !p2BJ) {
    return {
      dealer: { cards: dealerCards, score: dealerScore },
      p1: { cards: p1Cards, score: p1Score },
      p2: { cards: p2Cards, score: p2Score },
      deck,
      phase: 'p2-turn',
      npcActive,
      scoreboards,
      gameOver: false,
      notice: { winner: 'p1', message: "Player 1 has Blackjack (21)! Player 2's turn" },
    };
  }

  return {
    dealer: { cards: dealerCards, score: dealerScore },
    p1: { cards: p1Cards, score: p1Score },
    p2: { cards: p2Cards, score: p2Score },
    deck,
    phase: 'player-turn',
    npcActive,
    scoreboards,
    gameOver: false,
    notice: null,
  };
}

export function handleHit(state: GameState, player: PlayerId = 'p1'): GameState {
  if (state.gameOver) return state;

  if (player === 'p1' && state.phase !== 'player-turn') return state;
  if (player === 'p2' && state.phase !== 'p2-turn') return state;

  const deck = state.deck.length > 0 ? [...state.deck] : createDeck();
  const card = deck.pop();
  if (!card) return state;

  const targetHand = state[player];
  const newCards = [...targetHand.cards, card];
  const newScore = calculateHandValue(newCards);

  if (isBust(newScore)) {
    if (player === 'p1') {
      if (state.npcActive) {
        // 1-Player mode: P1 busts -> Dealer wins
        const updatedScores: Scoreboards = {
          ...state.scoreboards,
          npc: {
            ...state.scoreboards.npc,
            dealer: state.scoreboards.npc.dealer + 1,
            bot: state.scoreboards.npc.bot + 1,
          },
        };
        return {
          ...state,
          deck,
          p1: { cards: newCards, score: newScore },
          phase: 'round-ended',
          gameOver: true,
          scoreboards: updatedScores,
          notice: {
            winner: 'dealer',
            message: `Player 1 busted with ${newScore} — Dealer won the round`,
          },
        };
      }

      // Two Players mode: P1 busts -> move to P2, unless P2 already has natural Blackjack.
      const nextPhase = nextPhaseAfterPlayerOne(state.p2.cards);
      return {
        ...state,
        deck,
        p1: { cards: newCards, score: newScore },
        phase: nextPhase,
        notice: {
          winner: nextPhase === 'dealer-turn' ? 'p2' : 'dealer',
          message:
            nextPhase === 'dealer-turn'
              ? `Player 1 busted with ${newScore} — Player 2 has Blackjack · Dealer's turn`
              : `Player 1 busted with ${newScore} — Player 2's turn`,
        },
      };
    }

    if (player === 'p2') {
      // Player 2 busts
      const p1Busted = isBust(state.p1.score);
      if (p1Busted) {
        // Both players busted! Dealer wins against both.
        const points = calculateTwoPlayerRoundPoints('lose', 'lose');
        const updatedScores: Scoreboards = {
          ...state.scoreboards,
          local: {
            ...state.scoreboards.local,
            p1: state.scoreboards.local.p1 + points.p1,
            p2: state.scoreboards.local.p2 + points.p2,
            dealer: state.scoreboards.local.dealer + points.dealer,
          },
        };
        return {
          ...state,
          deck,
          p2: { cards: newCards, score: newScore },
          phase: 'round-ended',
          gameOver: true,
          scoreboards: updatedScores,
          notice: {
            winner: 'dealer',
            message: 'Both players busted — Dealer won the round (+1 pt Dealer)',
          },
        };
      }

      // P1 did not bust -> transition to dealer's turn
      return {
        ...state,
        deck,
        p2: { cards: newCards, score: newScore },
        phase: 'dealer-turn',
        notice: {
          winner: 'dealer',
          message: `Player 2 busted with ${newScore} — Dealer's turn`,
        },
      };
    }
  }

  const nextState: GameState = {
    ...state,
    deck,
    [player]: { cards: newCards, score: newScore },
  };

  if (newScore === 21) {
    return handleStand(nextState, player);
  }

  return nextState;
}

export function handleStand(state: GameState, player: PlayerId = 'p1'): GameState {
  if (state.gameOver) return state;

  if (player === 'p1') {
    if (state.phase !== 'player-turn') return state;

    if (state.npcActive) {
      return {
        ...state,
        phase: 'dealer-turn',
        notice: null,
      };
    }

    // Two players mode -> transition to Player 2, unless P2 already has natural Blackjack.
    const nextPhase = nextPhaseAfterPlayerOne(state.p2.cards);
    return {
      ...state,
      phase: nextPhase,
      notice: {
        winner: 'p1',
        message:
          nextPhase === 'dealer-turn'
            ? `Player 1 stands on ${state.p1.score} — Player 2 has Blackjack · Dealer's turn`
            : `Player 1 stands on ${state.p1.score} — Player 2's turn`,
      },
    };
  }

  if (player === 'p2') {
    if (state.phase !== 'p2-turn') return state;

    return {
      ...state,
      phase: 'dealer-turn',
      notice: {
        winner: 'p2',
        message: `Player 2 stands on ${state.p2.score} — Dealer's turn`,
      },
    };
  }

  return state;
}

export function handleDealerStep(state: GameState): GameState {
  if (state.phase !== 'dealer-turn' || state.gameOver) return state;

  const dealerScore = state.dealer.score;

  if (dealerMustHit(dealerScore)) {
    const deck = state.deck.length > 0 ? [...state.deck] : createDeck();
    const card = deck.pop();
    if (!card) return state;

    const newDealerCards = [...state.dealer.cards, card];
    const newDealerScore = calculateHandValue(newDealerCards);

    if (isBust(newDealerScore)) {
      // Dealer busts!
      if (state.npcActive) {
        const updatedScores: Scoreboards = {
          ...state.scoreboards,
          npc: { ...state.scoreboards.npc, p1: state.scoreboards.npc.p1 + 1 },
        };
        return {
          ...state,
          deck,
          dealer: { cards: newDealerCards, score: newDealerScore },
          phase: 'round-ended',
          gameOver: true,
          scoreboards: updatedScores,
          notice: {
            winner: 'p1',
            message: `Dealer busted with ${newDealerScore} — Player 1 won the round!`,
          },
        };
      }

      // Two players mode
      const p1Outcome: HandOutcome = isBust(state.p1.score) ? 'lose' : 'win';
      const p2Outcome: HandOutcome = isBust(state.p2.score) ? 'lose' : 'win';
      const points = calculateTwoPlayerRoundPoints(p1Outcome, p2Outcome);

      const updatedScores: Scoreboards = {
        ...state.scoreboards,
        local: {
          ...state.scoreboards.local,
          p1: state.scoreboards.local.p1 + points.p1,
          p2: state.scoreboards.local.p2 + points.p2,
          dealer: state.scoreboards.local.dealer + points.dealer,
        },
      };

      let message = `Dealer busted with ${newDealerScore}!`;
      if (points.p1 === 1 && points.p2 === 1) {
        message = `Dealer busted with ${newDealerScore} — Player 1 and Player 2 won (+1 pt each)!`;
      } else if (points.p1 === 1 && points.p2 === 0) {
        message = `Dealer busted with ${newDealerScore} — Player 1 won (+1 pt, Player 2 busted)`;
      } else if (points.p1 === 0 && points.p2 === 1) {
        message = `Dealer busted with ${newDealerScore} — Player 2 won (+1 pt, Player 1 busted)`;
      }

      let winner = 'tie';
      if (points.p1 === 1 && points.p2 === 1) winner = 'both';
      else if (points.p1 === 1) winner = 'p1';
      else if (points.p2 === 1) winner = 'p2';

      return {
        ...state,
        deck,
        dealer: { cards: newDealerCards, score: newDealerScore },
        phase: 'round-ended',
        gameOver: true,
        scoreboards: updatedScores,
        notice: {
          winner,
          message,
        },
      };
    }

    // Dealer drew and did not bust
    return {
      ...state,
      deck,
      dealer: { cards: newDealerCards, score: newDealerScore },
    };
  }

  // Dealer stands (17+) - Resolve round
  if (state.npcActive) {
    const outcome = compareAgainstDealer(state.p1.score, dealerScore);
    const updatedScores: Scoreboards = {
      ...state.scoreboards,
      npc: { ...state.scoreboards.npc },
    };

    let message: string;
    if (outcome === 'player') {
      updatedScores.npc.p1 += 1;
      message = `Player 1 won with ${state.p1.score} against Dealer's ${dealerScore} (+1 pt P1)`;
    } else if (outcome === 'dealer') {
      updatedScores.npc.dealer += 1;
      updatedScores.npc.bot += 1;
      message = `Dealer won with ${dealerScore} against Player 1's ${state.p1.score} (+1 pt Dealer)`;
    } else {
      message = `Round tied at ${dealerScore} (0 pts)`;
    }

    return {
      ...state,
      phase: 'round-ended',
      gameOver: true,
      scoreboards: updatedScores,
      notice: { winner: outcome, message },
    };
  }

  // Two Players mode resolution
  const p1Outcome = evaluateHandVsDealer(
    { score: state.p1.score, cards: state.p1.cards },
    { score: dealerScore, cards: state.dealer.cards },
  );
  const p2Outcome = evaluateHandVsDealer(
    { score: state.p2.score, cards: state.p2.cards },
    { score: dealerScore, cards: state.dealer.cards },
  );
  const points = calculateTwoPlayerRoundPoints(p1Outcome, p2Outcome);

  const updatedScores: Scoreboards = {
    ...state.scoreboards,
    local: {
      ...state.scoreboards.local,
      p1: state.scoreboards.local.p1 + points.p1,
      p2: state.scoreboards.local.p2 + points.p2,
      dealer: state.scoreboards.local.dealer + points.dealer,
    },
  };

  let message = '';
  if (points.p1 === 1 && points.p2 === 1) {
    message = `Both Player 1 and Player 2 won against Dealer (${dealerScore})! (+1 pt each)`;
  } else if (points.dealer === 1) {
    message = `Dealer (${dealerScore}) won against both players (+1 pt Dealer)`;
  } else if (points.p1 === 1 && p2Outcome === 'lose') {
    message = `Player 1 won (${state.p1.score} vs ${dealerScore}, +1 pt) · Dealer beat Player 2 (No dealer pt)`;
  } else if (points.p2 === 1 && p1Outcome === 'lose') {
    message = `Player 2 won (${state.p2.score} vs ${dealerScore}, +1 pt) · Dealer beat Player 1 (No dealer pt)`;
  } else if (p1Outcome === 'tie' && p2Outcome === 'tie') {
    message = `Round tied for both players at ${dealerScore} (0 pts)`;
  } else if (points.p1 === 1 && p2Outcome === 'tie') {
    message = `Player 1 won (${state.p1.score}, +1 pt) · Player 2 pushed at ${dealerScore} (0 pts)`;
  } else if (points.p2 === 1 && p1Outcome === 'tie') {
    message = `Player 2 won (${state.p2.score}, +1 pt) · Player 1 pushed at ${dealerScore} (0 pts)`;
  } else if (p1Outcome === 'tie' && p2Outcome === 'lose') {
    message = `Player 1 pushed · Dealer beat Player 2 (${dealerScore} vs ${state.p2.score}, 0 pts)`;
  } else if (p2Outcome === 'tie' && p1Outcome === 'lose') {
    message = `Player 2 pushed · Dealer beat Player 1 (${dealerScore} vs ${state.p1.score}, 0 pts)`;
  }

  let winner = 'tie';
  if (points.p1 === 1 && points.p2 === 1) winner = 'both';
  else if (points.p1 === 1) winner = 'p1';
  else if (points.p2 === 1) winner = 'p2';
  else if (points.dealer === 1) winner = 'dealer';

  return {
    ...state,
    phase: 'round-ended',
    gameOver: true,
    scoreboards: updatedScores,
    notice: { winner, message },
  };
}

function handleDrawCompat(state: GameState, player: PlayerId): GameState {
  if (state.phase === 'idle' || state.gameOver) {
    return dealInitialRound(state.scoreboards, state.npcActive, state.deck);
  }
  return handleHit(state, player);
}

export function createIdleState(scoreboards: Scoreboards, npcActive: boolean): GameState {
  return {
    dealer: { cards: [], score: 0 },
    p1: { cards: [], score: 0 },
    p2: { cards: [], score: 0 },
    deck: createDeck(),
    phase: 'idle',
    npcActive,
    scoreboards,
    gameOver: false,
    notice: null,
  };
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'deal':
      return dealInitialRound(state.scoreboards, state.npcActive, state.deck);
    case 'hit':
      return handleHit(state, action.player ?? 'p1');
    case 'stand':
      return handleStand(state, action.player ?? 'p1');
    case 'dealer-step':
      return handleDealerStep(state);
    case 'draw':
      return handleDrawCompat(state, action.player);
    case 'toggle-npc':
      return createIdleState(state.scoreboards, !state.npcActive);
    case 'reset-scores':
      return createIdleState(createScoreboards(), state.npcActive);
    case 'dismiss-notice':
      return { ...state, notice: null };
    default:
      return state;
  }
}

function createInitialState(): GameState {
  return createIdleState(createScoreboards(), true);
}

export function useBlackjackGame() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  useEffect(() => {
    if (state.phase !== 'dealer-turn' || state.gameOver) return;

    const timeout = window.setTimeout(() => {
      dispatch({ type: 'dealer-step' });
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [state.phase, state.gameOver, state.dealer.score, state.dealer.cards.length]);

  useEffect(() => {
    if (!state.notice) return;
    const timeout = window.setTimeout(() => dispatch({ type: 'dismiss-notice' }), 3500);
    return () => window.clearTimeout(timeout);
  }, [state.notice]);

  return {
    state,
    hit: (player?: PlayerId) => dispatch({ type: 'hit', player }),
    stand: (player?: PlayerId) => dispatch({ type: 'stand', player }),
    dealRound: () => dispatch({ type: 'deal' }),
    drawCard: (player: PlayerId) => dispatch({ type: 'draw', player }),
    toggleNpc: () => dispatch({ type: 'toggle-npc' }),
    resetScores: () => dispatch({ type: 'reset-scores' }),
  };
}
