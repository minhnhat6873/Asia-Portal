type NavigationAction = () => void;
let guard: ((action: NavigationAction) => void) | null = null;

export function registerUnsavedChangesGuard(handler: (action: NavigationAction) => void): () => void {
  guard = handler;
  return () => { if (guard === handler) guard = null; };
}

export function navigateWithUnsavedChangesGuard(action: NavigationAction): void {
  if (guard) guard(action);
  else action();
}
