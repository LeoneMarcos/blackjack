import { describe, expect, it } from 'vitest';
import {
    calculateHandValue,
    createScoreboards,
    determineWinner,
    isBust,
    resetScoreboards,
    shouldBotHit,
    type Card,
    type Winner
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
        [22, 23, 'tie']
    ])('determines %s vs %s as %s', (p1, p2, winner) => {
        expect(determineWinner(p1, p2)).toBe(winner);
    });

    it('honors an immediate winner supplied by a 21 or bust event', () => {
        expect(determineWinner(21, 10, 'p1')).toBe('p1');
        expect(determineWinner(22, 10, 'p2')).toBe('p2');
        expect(determineWinner(18, 18, 'p1')).toBe('p1');
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

describe('scoreboard reset and independence', () => {
    it('creates independent local and BOT scoreboards', () => {
        const scoreboards = createScoreboards();
        scoreboards.local.p1 = 2;
        scoreboards.npc.bot = 1;

        expect(resetScoreboards()).toEqual({
            local: { p1: 0, p2: 0 },
            npc: { p1: 0, bot: 0 }
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
