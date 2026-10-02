import { describe, it, expect } from 'vitest';
import { isBetter, findRoundWinnerId, findGameWinnerIds } from './rulesService.js';

function play(playerId, stats) {
  return { playerId, card: { stats } };
}

describe('isBetter', () => {
  it('higher is better for normal stats', () => {
    expect(isBetter('hp', 100, 50)).toBe(true);
    expect(isBetter('hp', 50, 100)).toBe(false);
  });

  it('lower is better for rank', () => {
    expect(isBetter('rank', 3, 25)).toBe(true);
    expect(isBetter('rank', 25, 3)).toBe(false);
  });
});

describe('findRoundWinnerId', () => {
  it('picks the highest value', () => {
    const plays = [
      play('p1', { attack: 80 }),
      play('p2', { attack: 120 }),
      play('p3', { attack: 95 }),
    ];
    expect(findRoundWinnerId('attack', plays)).toBe('p2');
  });

  it('picks the lowest value for rank', () => {
    const plays = [play('p1', { rank: 25 }), play('p2', { rank: 3 }), play('p3', { rank: 150 })];
    expect(findRoundWinnerId('rank', plays)).toBe('p2');
  });

  it('returns null when the top value is shared', () => {
    const plays = [
      play('p1', { speed: 100 }),
      play('p2', { speed: 100 }),
      play('p3', { speed: 40 }),
    ];
    expect(findRoundWinnerId('speed', plays)).toBeNull();
  });

  it('still has a winner when only lower values are shared', () => {
    const plays = [
      play('p1', { speed: 150 }),
      play('p2', { speed: 40 }),
      play('p3', { speed: 40 }),
    ];
    expect(findRoundWinnerId('speed', plays)).toBe('p1');
  });

  it('is a tie when two players have the same rank', () => {
    // Mega Venusaur and Venusaur share rank 3
    const plays = [play('p1', { rank: 3 }), play('p2', { rank: 3 })];
    expect(findRoundWinnerId('rank', plays)).toBeNull();
  });
});

describe('findGameWinnerIds', () => {
  it('returns the single player with the most wins', () => {
    const players = [
      { id: 'p1', roundWins: 12 },
      { id: 'p2', roundWins: 6 },
      { id: 'p3', roundWins: 2 },
    ];
    expect(findGameWinnerIds(players)).toEqual(['p1']);
  });

  it('shares the win between players on the top score', () => {
    const players = [
      { id: 'p1', roundWins: 9 },
      { id: 'p2', roundWins: 9 },
      { id: 'p3', roundWins: 2 },
    ];
    expect(findGameWinnerIds(players)).toEqual(['p1', 'p2']);
  });

  it('shares the win between everyone when no round was ever won', () => {
    const players = [
      { id: 'p1', roundWins: 0 },
      { id: 'p2', roundWins: 0 },
    ];
    expect(findGameWinnerIds(players)).toEqual(['p1', 'p2']);
  });
});
