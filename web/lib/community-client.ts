import { notifyCommunityChanged } from '../../src/lib/communityUpdates';
import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const communityClient = url && key ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
}) : null;

if (communityClient) {
  let previousUser: string | undefined;
  communityClient.auth.onAuthStateChange((event, session) => {
    const user = session?.user.id;
    if (user !== previousUser || event === 'USER_UPDATED') {
      previousUser = user;
      setTimeout(() => notifyCommunityChanged(), 0);
    }
  });
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') notifyCommunityChanged({ type: 'foreground' });
  });
}
