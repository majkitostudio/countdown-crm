export function shouldBlockCallToggleForOutcome(isAwaitingOutcome: boolean, isCallActive: boolean): boolean {
  return isAwaitingOutcome && !isCallActive;
}
