export type CommunitySession = {
  user: { id: string; email_confirmed_at?: string; is_anonymous?: boolean };
};
export type CommunityClient = {
  functions?: {
    invoke: (name: string) => Promise<{ data: unknown; error: unknown }>;
  };
  auth: {
    getSession: () => Promise<{
      data: { session: CommunitySession | null };
      error: unknown;
    }>;
    onAuthStateChange: (
      callback: (event: string, session: CommunitySession | null) => void,
    ) => { data: { subscription: { unsubscribe: () => void } } };
    signInWithOtp: (args: { email: string }) => Promise<{ error: unknown }>;
    verifyOtp: (args: {
      email: string;
      token: string;
      type: 'email';
    }) => Promise<{ error: unknown }>;
    signOut: (args: { scope: 'local' }) => Promise<{ error: unknown }>;
  };
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
};
export const COMMENT_LIMIT = 1000;
export type CommunityComment = {
  public_count?: number;
  id: string;
  nickname: string;
  body: string;
  created_at: string;
  votes: number;
  upvoted: boolean;
  mine: boolean;
  reported: boolean;
  moderation_status?: 'pending' | 'approved' | 'rejected';
};
export type ReportReason = 'Unsafe advice' | 'Spam or abuse' | 'Other';
export const reportReasons: ReportReason[] = [
  'Unsafe advice',
  'Spam or abuse',
  'Other',
];
export function communityError(error: unknown) {
  const value = error as { code?: string; message?: string; status?: number };
  if (value?.code === 'PGRST202' || value?.code === '42P01')
    return 'Community setup is not complete yet. Please try again later.';
  if (value?.code === 'P0001')
    return value.message ?? 'This action is unavailable.';
  if (value?.status === 429)
    return 'Too many requests. Please wait before trying again.';
  return 'Could not complete that request. Check your connection and try again.';
}
export async function communityRpc<T>(
  client: CommunityClient | null,
  name: string,
  args = {},
): Promise<T> {
  if (!client) throw new Error('Community is not configured.');
  const { data, error } = await client.rpc(name, args);
  if (error) throw error;
  return data as T;
}

export type CommunityAccountState = {
  policy_accepted: boolean;
  suspended: boolean;
  deletion_requested_at: string | null;
};
export type BlockedContributor = {
  id: string;
  label: string;
  created_at: string;
};
