/**
 * Module-level offline flag so the API layer (non-React) can reject write operations
 * when the app is offline. Updated by ConnectionProvider.
 */
let isOffline = false;

export function getIsOffline(): boolean {
  return isOffline;
}

export function setOffline(offline: boolean): void {
  isOffline = offline;
}
