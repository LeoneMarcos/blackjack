// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import type { Card } from '../src/lib/game-logic';

vi.mock('../src/lib/deck', () => ({
  createDeck: (): Card[] => [
    { label: 'K', value: 10, name: 'Spades', symbol: '♠', color: 'black' },
    { label: '5', value: 5, name: 'Hearts', symbol: '♥', color: 'red' },
    { label: '6', value: 6, name: 'Clubs', symbol: '♣', color: 'black' },
    { label: '7', value: 7, name: 'Diamonds', symbol: '♦', color: 'red' },
    { label: '2', value: 2, name: 'Spades', symbol: '♠', color: 'black' },
    { label: '3', value: 3, name: 'Hearts', symbol: '♥', color: 'red' },
    { label: '4', value: 4, name: 'Clubs', symbol: '♣', color: 'black' },
  ],
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Blackjack app shell', () => {
  it('renders the game and exposes the rules dialog flow', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Blackjack', level: 1 })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'View game rules' }));
    expect(screen.getByRole('dialog', { name: 'Game rules' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Close game rules' }));
    expect(screen.queryByRole('dialog', { name: 'Game rules' })).toBeNull();
  });

  it('renders Classic mode by default for BOT and hides the second BOT card during active round', () => {
    vi.useFakeTimers();
    render(<App />);

    const botModeButton = screen.getByRole('button', { name: 'Play against BOT' });
    expect(botModeButton.getAttribute('aria-pressed')).toBe('true');

    const p1DrawButton = screen.getByRole('button', { name: 'Draw card for Player 1' });

    // P1 draws two cards so P1 score is higher, forcing BOT to draw at least two cards
    fireEvent.click(p1DrawButton);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    fireEvent.click(p1DrawButton);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    act(() => {
      vi.advanceTimersByTime(700);
    });

    const botCardList = screen.getByRole('list', { name: 'BOT cards' });
    expect(botCardList.children.length).toBeGreaterThanOrEqual(2);

    // Second BOT card should be face-down and contain generic label without revealing rank/suit
    const hiddenCard = screen.getByLabelText('Face-down card');
    expect(hiddenCard).toBeTruthy();
    expect(hiddenCard.textContent).not.toMatch(/10|Jack|Queen|King|Ace|[♥♦]/);

    // BOT score display should show subtotal + ?
    const botScoreContainer = screen.getByLabelText('BOT score');
    expect(botScoreContainer.textContent).toContain('+ ?');
  });

  it('reveals hidden card and full score when round ends', () => {
    vi.useFakeTimers();
    render(<App />);

    const p1DrawButton = screen.getByRole('button', { name: 'Draw card for Player 1' });

    // Draw repeatedly until game over
    for (let i = 0; i < 10; i++) {
      fireEvent.click(p1DrawButton);
      act(() => {
        vi.advanceTimersByTime(700);
      });
      if (screen.queryByRole('button', { name: 'Deal again for Player 1' })) {
        break;
      }
    }

    // Round complete - no face-down card should remain
    expect(screen.queryByLabelText('Face-down card')).toBeNull();
    const botScoreContainer = screen.getByLabelText('BOT score');
    expect(botScoreContainer.textContent).not.toContain('?');
  });

  it('supports toggling to Two players mode with both players facing the Dealer', () => {
    render(<App />);

    const botButton = screen.getByRole('button', { name: 'Play against BOT' });
    expect(botButton.getAttribute('aria-pressed')).toBe('true');

    const twoPlayersButton = screen.getByRole('button', { name: 'Two players' });
    expect(twoPlayersButton).not.toHaveProperty('disabled', true);

    fireEvent.click(twoPlayersButton);
    expect(twoPlayersButton.getAttribute('aria-pressed')).toBe('true');
    expect(botButton.getAttribute('aria-pressed')).toBe('false');

    // Both Player 1 and Player 2 should be rendered alongside Dealer
    expect(screen.getByRole('heading', { name: 'Player 1' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Player 2' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Dealer' })).toBeTruthy();
  });

  it('does not trigger score pop badge or bump animation when toggling game modes', () => {
    render(<App />);

    const twoPlayersButton = screen.getByRole('button', { name: 'Two players' });
    const botButton = screen.getByRole('button', { name: 'Play against BOT' });

    // Toggle back and forth between modes
    fireEvent.click(twoPlayersButton);
    expect(document.querySelector('.score-pop-badge')).toBeNull();
    expect(document.querySelector('.scoreboard__player--bump')).toBeNull();

    fireEvent.click(botButton);
    expect(document.querySelector('.score-pop-badge')).toBeNull();
    expect(document.querySelector('.scoreboard__player--bump')).toBeNull();
  });
});
