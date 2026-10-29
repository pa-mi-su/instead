import { useSyncExternalStore } from 'react';

export type CommunityUpdate =
  | { type: 'changed' }
  | { type: 'foreground' }
  | { type: 'account-deleted'; userId: string };
let revision = 0;
const listeners = new Set<(update: CommunityUpdate) => void>();
export function subscribeCommunityUpdates(
  listener: (update: CommunityUpdate) => void,
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function notifyCommunityChanged(
  update: CommunityUpdate = { type: 'changed' },
) {
  revision++;
  for (const listener of [...listeners]) listener(update);
}
export const getCommunityRevision = () => revision;
export function useCommunityRevision() {
  return useSyncExternalStore(
    subscribeCommunityUpdates,
    getCommunityRevision,
    () => 0,
  );
}
