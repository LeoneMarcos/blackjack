export interface Card {
  label: string;
  value: number;
  name?: string;
  symbol?: string;
  color?: string;
}

export interface PlayerScoreboard {
  p1: number;
  p2: number;
  dealer: number;
  ties: number;
}

export interface NpcScoreboard {
  p1: number;
  bot: number;
  dealer: number;
  ties: number;
}

export interface Scoreboards {
  local: PlayerScoreboard;
  npc: NpcScoreboard;
}

export type Winner = 'p1' | 'p2' | 'dealer' | 'tie';

export type VisibilityMode = 'open' | 'classic';

export type GamePhase = 'idle' | 'player-turn' | 'p2-turn' | 'dealer-turn' | 'round-ended';

/**
 * Calculates the total value of a blackjack hand, handling Aces appropriately (11 or 1).
 */
export function calculateHandValue(cards: Card[]): number {
  let total = cards.reduce((sum, card) => sum + card.value, 0);
  let aces = cards.filter((card) => card.label === 'A').length;

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

/**
 * Calculates hand value excluding specified hidden card indices.
 */
export function calculateVisibleHandValue(cards: Card[], hiddenIndices: number[] = []): number {
  const visibleCards = cards.filter((_, idx) => !hiddenIndices.includes(idx));
  return calculateHandValue(visibleCards);
}

/**
 * Determines whether a given score exceeds 21.
 */
export function isBust(score: number): boolean {
  return score > 21;
}

/**
 * Checks whether a 2-card hand is a natural Blackjack (21 with 2 cards).
 */
export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && calculateHandValue(cards) === 21;
}

/**
 * Standard casino dealer rule: Dealer must hit on any total below 17, and stand on 17 or more.
 */
export function dealerMustHit(dealerScore: number): boolean {
  return dealerScore < 17;
}

/**
 * Compares a player's final score directly against the dealer's score.
 */
export function compareAgainstDealer(
  playerScore: number,
  dealerScore: number,
): 'player' | 'dealer' | 'tie' {
  if (isBust(playerScore) && isBust(dealerScore)) return 'tie';
  if (isBust(playerScore)) return 'dealer';
  if (isBust(dealerScore)) return 'player';
  if (playerScore === dealerScore) return 'tie';
  return playerScore > dealerScore ? 'player' : 'dealer';
}

/**
 * Determines the round winner between player 1 and player 2 / bot,
 * respecting any manual winner override (e.g. instant win on 21 or bust event).
 */
export function determineWinner(p1Score: number, p2Score: number, manualWinner?: Winner): Winner {
  if (manualWinner) return manualWinner;
  if (isBust(p1Score) && isBust(p2Score)) return 'tie';
  if (isBust(p1Score)) return 'p2';
  if (isBust(p2Score)) return 'p1';
  if (p1Score === p2Score) return 'tie';
  return p1Score > p2Score ? 'p1' : 'p2';
}

/**
 * Decision rule for the NPC bot.
 * In classic rules, bot stands on 17+, never hits if player busted or if at 21.
 */
export function shouldBotHit(p1Score: number, botScore: number): boolean {
  let shouldHit = false;

  if (p1Score > 21) {
    shouldHit = false;
  } else if (botScore < p1Score) {
    shouldHit = true;
  } else if (botScore === p1Score && botScore < 17) {
    shouldHit = true;
  }

  return shouldHit && botScore < 21;
}

/**
 * Creates fresh scoreboard objects for local 2-player and NPC modes.
 */
export function createScoreboards(): Scoreboards {
  return {
    local: { p1: 0, p2: 0, dealer: 0, ties: 0 },
    npc: { p1: 0, bot: 0, dealer: 0, ties: 0 },
  };
}

/**
 * Resets scoreboards to initial zero state.
 */
export function resetScoreboards(): Scoreboards {
  return createScoreboards();
}
