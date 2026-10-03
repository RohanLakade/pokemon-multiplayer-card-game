import { describe, it, expect } from 'vitest';
import { getTurnMessage } from './turnMessage.js';

const base = {
  phase: 'choosing-stat',
  canChooseStat: false,
  canPlayCard: false,
  leaderName: 'Ash',
  statLabel: '',
  playedCount: 0,
  playerCount: 3,
};

describe('getTurnMessage', () => {
  it('tells the leader to choose a stat', () => {
    expect(getTurnMessage({ ...base, canChooseStat: true })).toBe(
      'You lead this round. Choose a stat on your card.',
    );
  });

  it('tells the others to wait for the leader', () => {
    expect(getTurnMessage(base)).toBe('Waiting for Ash to choose a stat…');
  });

  it('tells a player to play once the stat is chosen', () => {
    const message = getTurnMessage({
      ...base,
      phase: 'playing-cards',
      canPlayCard: true,
      statLabel: 'Attack',
    });
    expect(message).toBe('Ash chose Attack. Play your card.');
  });

  it('shows how many players have played while waiting', () => {
    const message = getTurnMessage({ ...base, phase: 'playing-cards', playedCount: 2 });
    expect(message).toBe('Waiting for the other players (2 of 3 have played)…');
  });

  it('says when the game is over', () => {
    expect(getTurnMessage({ ...base, phase: 'finished' })).toBe('The game is over');
  });
});
