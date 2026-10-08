import { describe, it, expect } from 'vitest';
import { getTurnMessage } from './turnMessage.js';

const base = {
  phase: 'choosing-stat',
  canChooseStat: false,
  canChooseCard: false,
  leaderName: 'Ash',
  statLabel: '',
  pickedCount: 0,
  playerCount: 3,
};

describe('getTurnMessage', () => {
  it('tells the leader to choose a stat', () => {
    expect(getTurnMessage({ ...base, canChooseStat: true })).toBe(
      'You lead this round. Choose a stat.',
    );
  });

  it('tells the others to wait for the leader', () => {
    expect(getTurnMessage(base)).toBe('Waiting for Ash to choose a stat…');
  });

  it('tells a player to pick a card once the stat is chosen', () => {
    const message = getTurnMessage({
      ...base,
      phase: 'choosing-cards',
      canChooseCard: true,
      statLabel: 'Attack',
    });
    expect(message).toBe('Ash chose Attack. Pick a card from your hand.');
  });

  it('shows how many players have picked while waiting', () => {
    const message = getTurnMessage({ ...base, phase: 'choosing-cards', pickedCount: 2 });
    expect(message).toBe('Waiting for the other players (2 of 3 have picked)…');
  });

  it('says when the game is over', () => {
    expect(getTurnMessage({ ...base, phase: 'finished' })).toBe('The game is over');
  });
});
