// Thrown when someone breaks a game rule (wrong turn, wrong phase, bad stat).
// "code" is a short machine-readable name; "message" is safe to show to the player.
export class GameRuleError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GameRuleError';
    this.code = code;
  }
}
