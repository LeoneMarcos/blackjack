import { describe, expect, it } from 'vitest';
import {
  calculateHandValue,
  calculateTwoPlayerRoundPoints,
  calculateVisibleHandValue,
  compareAgainstDealer,
  createScoreboards,
  dealerMustHit,
  determineWinner,
  evaluateHandVsDealer,
  getStationOutcomes,
  isBlackjack,
  isBust,
  nextPhaseAfterPlayerOne,
  resetScoreboards,
  shouldBotHit,
  type Card,
  type Winner,
} from '../src/lib/game-logic';

const card = (label: string, value: number = Number(label)): Card => ({ label, value });

describe('hand scoring', () => {
  it('calculates a regular hand value', () => {
    expect(calculateHandValue([card('10'), card('7')])).toBe(17);
  });

  it('counts an ace as 11 when it does not bust', () => {
    expect(calculateHandValue([card('A', 11), card('6')])).toBe(17);
  });

  it('downgrades an ace to 1 when the hand would bust', () => {
    expect(calculateHandValue([card('A', 11), card('9'), card('5')])).toBe(15);
  });

  it('handles multiple aces correctly', () => {
    expect(calculateHandValue([card('A', 11), card('A', 11), card('9')])).toBe(21);
  });

  it('handles hand with multiple aces reducing until valid', () => {
    expect(calculateHandValue([card('A', 11), card('A', 11), card('A', 11), card('9')])).toBe(12);
  });

  it('calculates visible hand value ignoring hidden indices', () => {
    const hand = [card('K', 10), card('7', 7), card('5', 5)];
    expect(calculateVisibleHandValue(hand, [1])).toBe(15);
    expect(calculateVisibleHandValue(hand, [])).toBe(22);
  });

  it('identifies bust hands', () => {
    expect(isBust(calculateHandValue([card('K', 10), card('8'), card('5')]))).toBe(true);
    expect(isBust(21)).toBe(false);
    expect(isBust(20)).toBe(false);
  });
});

describe('round outcomes', () => {
  it.each<[number, number, Winner]>([
    [20, 18, 'p1'],
    [18, 20, 'p2'],
    [21, 21, 'tie'],
    [22, 20, 'p2'],
    [20, 22, 'p1'],
    [22, 23, 'tie'],
  ])('determines %s vs %s as %s', (p1, p2, winner) => {
    expect(determineWinner(p1, p2)).toBe(winner);
  });

  it('honors an immediate winner supplied by a 21 or bust event', () => {
    expect(determineWinner(21, 10, 'p1')).toBe('p1');
    expect(determineWinner(22, 10, 'p2')).toBe('p2');
    expect(determineWinner(18, 18, 'p1')).toBe('p1');
  });
});

describe('blackjack and dealer rules', () => {
  it('detects a natural blackjack with exactly 2 cards', () => {
    expect(isBlackjack([card('A', 11), card('K', 10)])).toBe(true);
    expect(isBlackjack([card('A', 11), card('10', 10)])).toBe(true);
    expect(isBlackjack([card('A', 11), card('9', 9)])).toBe(false);
    expect(isBlackjack([card('7', 7), card('7', 7), card('7', 7)])).toBe(false);
  });

  it('enforces casino dealer rules: hit below 17, stand on 17+', () => {
    expect(dealerMustHit(16)).toBe(true);
    expect(dealerMustHit(15)).toBe(true);
    expect(dealerMustHit(17)).toBe(false);
    expect(dealerMustHit(18)).toBe(false);
    expect(dealerMustHit(21)).toBe(false);
  });
});

describe('two-player turn sequencing', () => {
  it('skips Player 2 action phase when Player 2 was dealt a natural Blackjack', () => {
    expect(nextPhaseAfterPlayerOne([card('A', 11), card('K', 10)])).toBe('dealer-turn');
  });

  it('hands control to Player 2 when their initial hand is still playable', () => {
    expect(nextPhaseAfterPlayerOne([card('10', 10), card('9', 9)])).toBe('p2-turn');
  });
});

describe('bot decisions', () => {
  it('hits when it is behind', () => {
    expect(shouldBotHit(18, 16)).toBe(true);
  });

  it('hits on a tie below 17', () => {
    expect(shouldBotHit(15, 15)).toBe(true);
    expect(shouldBotHit(16, 16)).toBe(true);
  });

  it('stays on tie at or above 17', () => {
    expect(shouldBotHit(17, 17)).toBe(false);
    expect(shouldBotHit(18, 18)).toBe(false);
  });

  it('stays when it is ahead, when the player busts, or at 21', () => {
    expect(shouldBotHit(16, 18)).toBe(false);
    expect(shouldBotHit(22, 16)).toBe(false);
    expect(shouldBotHit(18, 21)).toBe(false);
    expect(shouldBotHit(18, 22)).toBe(false);
  });
});

describe('compare against dealer', () => {
  it('identifies dealer win when player busts', () => {
    expect(compareAgainstDealer(22, 18)).toBe('dealer');
  });

  it('identifies player win when dealer busts', () => {
    expect(compareAgainstDealer(18, 23)).toBe('player');
  });

  it('identifies push when scores are equal', () => {
    expect(compareAgainstDealer(20, 20)).toBe('tie');
  });

  it('identifies player win with higher score', () => {
    expect(compareAgainstDealer(20, 19)).toBe('player');
  });

  it('identifies dealer win with higher score', () => {
    expect(compareAgainstDealer(17, 19)).toBe('dealer');
  });
});

describe('scoreboard reset and independence', () => {
  it('creates independent local and BOT scoreboards', () => {
    const scoreboards = createScoreboards();
    scoreboards.local.p1 = 2;
    scoreboards.npc.bot = 1;

    expect(resetScoreboards()).toEqual({
      local: { p1: 0, p2: 0, dealer: 0, ties: 0 },
      npc: { p1: 0, bot: 0, dealer: 0, ties: 0 },
    });
    expect(scoreboards.local).not.toBe(scoreboards.npc);
  });

  it('creates fresh instances on each createScoreboards call', () => {
    const sb1 = createScoreboards();
    const sb2 = createScoreboards();
    expect(sb1).toEqual(sb2);
    expect(sb1).not.toBe(sb2);
    expect(sb1.local).not.toBe(sb2.local);
    expect(sb1.npc).not.toBe(sb2.npc);
  });
});

describe('evaluate hand vs dealer', () => {
  it('identifies loss if player busts regardless of dealer', () => {
    expect(evaluateHandVsDealer({ score: 22 }, { score: 18 })).toBe('lose');
    expect(evaluateHandVsDealer({ score: 22 }, { score: 23 })).toBe('lose');
  });

  it('identifies win if dealer busts and player does not', () => {
    expect(evaluateHandVsDealer({ score: 18 }, { score: 22 })).toBe('win');
  });

  it('identifies natural blackjack superiority over regular 21', () => {
    const bjHand = { score: 21, cards: [card('A', 11), card('K', 10)] };
    const normal21 = { score: 21, cards: [card('7', 7), card('7', 7), card('7', 7)] };
    expect(evaluateHandVsDealer(bjHand, normal21)).toBe('win');
    expect(evaluateHandVsDealer(normal21, bjHand)).toBe('lose');
  });

  it('identifies push when both have natural blackjack', () => {
    const bjHand1 = { score: 21, cards: [card('A', 11), card('K', 10)] };
    const bjHand2 = { score: 21, cards: [card('A', 11), card('Q', 10)] };
    expect(evaluateHandVsDealer(bjHand1, bjHand2)).toBe('tie');
  });

  it('identifies win/lose/tie based on score comparison', () => {
    expect(evaluateHandVsDealer({ score: 20 }, { score: 19 })).toBe('win');
    expect(evaluateHandVsDealer({ score: 18 }, { score: 19 })).toBe('lose');
    expect(evaluateHandVsDealer({ score: 19 }, { score: 19 })).toBe('tie');
  });
});

describe('calculateTwoPlayerRoundPoints (binary scoring system)', () => {
  it('gives 1 point to player 1 only if they beat the dealer, 0 on tie or loss', () => {
    expect(calculateTwoPlayerRoundPoints('win', 'lose').p1).toBe(1);
    expect(calculateTwoPlayerRoundPoints('tie', 'lose').p1).toBe(0);
    expect(calculateTwoPlayerRoundPoints('lose', 'lose').p1).toBe(0);
  });

  it('gives 1 point to player 2 only if they beat the dealer, 0 on tie or loss', () => {
    expect(calculateTwoPlayerRoundPoints('lose', 'win').p2).toBe(1);
    expect(calculateTwoPlayerRoundPoints('lose', 'tie').p2).toBe(0);
    expect(calculateTwoPlayerRoundPoints('lose', 'lose').p2).toBe(0);
  });

  it('gives 1 point to dealer ONLY when beating BOTH players', () => {
    expect(calculateTwoPlayerRoundPoints('lose', 'lose')).toEqual({
      p1: 0,
      p2: 0,
      dealer: 1,
    });
  });

  it('gives 0 points to dealer if dealer loses or ties with either player', () => {
    expect(calculateTwoPlayerRoundPoints('win', 'lose').dealer).toBe(0);
    expect(calculateTwoPlayerRoundPoints('lose', 'win').dealer).toBe(0);
    expect(calculateTwoPlayerRoundPoints('win', 'win').dealer).toBe(0);
    expect(calculateTwoPlayerRoundPoints('tie', 'tie').dealer).toBe(0);
    expect(calculateTwoPlayerRoundPoints('tie', 'lose').dealer).toBe(0);
    expect(calculateTwoPlayerRoundPoints('lose', 'tie').dealer).toBe(0);
    expect(calculateTwoPlayerRoundPoints('win', 'tie').dealer).toBe(0);
    expect(calculateTwoPlayerRoundPoints('tie', 'win').dealer).toBe(0);
  });
});

describe('getStationOutcomes (visual indicator helper)', () => {
  it('returns none for all when round is not over', () => {
    const outcomes = getStationOutcomes(
      { score: 20, cards: [] },
      { score: 18, cards: [] },
      { score: 17, cards: [] },
      false,
      false,
    );
    expect(outcomes).toEqual({ p1: 'none', p2: 'none', dealer: 'none' });
  });

  it('computes outcomes for BOT mode correctly', () => {
    // P1 wins
    expect(
      getStationOutcomes(
        { score: 20, cards: [] },
        { score: 0, cards: [] },
        { score: 18, cards: [] },
        true,
        true,
      ),
    ).toEqual({ p1: 'win', p2: 'none', dealer: 'lose' });

    // Dealer wins
    expect(
      getStationOutcomes(
        { score: 17, cards: [] },
        { score: 0, cards: [] },
        { score: 19, cards: [] },
        true,
        true,
      ),
    ).toEqual({ p1: 'lose', p2: 'none', dealer: 'win' });

    // Tie
    expect(
      getStationOutcomes(
        { score: 19, cards: [] },
        { score: 0, cards: [] },
        { score: 19, cards: [] },
        true,
        true,
      ),
    ).toEqual({ p1: 'tie', p2: 'none', dealer: 'tie' });
  });

  it('computes outcomes for Two Players mode correctly', () => {
    // Both beat dealer
    expect(
      getStationOutcomes(
        { score: 20, cards: [] },
        { score: 19, cards: [] },
        { score: 18, cards: [] },
        true,
        false,
      ),
    ).toEqual({ p1: 'win', p2: 'win', dealer: 'lose' });

    // Dealer beats both
    expect(
      getStationOutcomes(
        { score: 17, cards: [] },
        { score: 18, cards: [] },
        { score: 20, cards: [] },
        true,
        false,
      ),
    ).toEqual({ p1: 'lose', p2: 'lose', dealer: 'win' });

    // P1 wins, P2 loses -> Dealer loses (did not beat both)
    expect(
      getStationOutcomes(
        { score: 21, cards: [] },
        { score: 17, cards: [] },
        { score: 18, cards: [] },
        true,
        false,
      ),
    ).toEqual({ p1: 'win', p2: 'lose', dealer: 'lose' });

    // P1 ties, P2 loses -> Dealer ties (did not beat both, did not lose)
    expect(
      getStationOutcomes(
        { score: 18, cards: [] },
        { score: 17, cards: [] },
        { score: 18, cards: [] },
        true,
        false,
      ),
    ).toEqual({ p1: 'tie', p2: 'lose', dealer: 'tie' });
  });
});
