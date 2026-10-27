export type CommunitySession = {
  user: {
    id: string;
    email?: string;
    email_confirmed_at?: string;
    is_anonymous?: boolean;
  };
};
export type CommunityClient = {
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        body: ArrayBuffer,
        options: { contentType: string; upsert: boolean },
      ) => Promise<{ error: unknown }>;
      remove: (paths: string[]) => Promise<{ error: unknown }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
      createSignedUrl: (
        path: string,
        expiresIn: number,
      ) => Promise<{ data: { signedUrl: string } | null; error: unknown }>;
    };
  };
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
    signInWithOtp: (args: {
      email: string;
      options?: { shouldCreateUser?: boolean };
    }) => Promise<{ error: unknown }>;
    signInWithPassword: (args: {
      email: string;
      password: string;
    }) => Promise<{ error: unknown }>;
    signUp: (args: { email: string; password: string }) => Promise<{
      data?: {
        session: CommunitySession | null;
        user?: { identities?: unknown[] } | null;
      };
      error: unknown;
    }>;
    verifyOtp: (args: {
      email: string;
      token: string;
      type: 'email' | 'signup';
    }) => Promise<{ error: unknown }>;
    updateUser: (args: { password: string }) => Promise<{ error: unknown }>;
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
export type CommunityProfile = {
  username: string;
  bio: string;
  avatar_path?: string | null;
};
export type AvatarUpload = {
  bytes: ArrayBuffer;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
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
  const code = value?.code?.toLowerCase() ?? '';
  const message = value?.message?.toLowerCase() ?? '';
  const localMessages = [
    'enter a valid email address.',
    'enter your password.',
    'choose a username with 3–20 letters, numbers, or underscores.',
    'use a password with at least 10 characters.',
    'the passwords do not match.',
    'bio must be 280 characters or fewer.',
    'enter the code from your email.',
    'complete account setup before editing your profile.',
    'verify your email before updating your profile.',
    'profile photos are not configured yet.',
  ];
  if (localMessages.includes(message)) return value.message!;
  if (value?.code === '23505')
    return 'That username is already taken. Choose another.';
  if (
    code === 'invalid_credentials' ||
    code === 'invalid_grant' ||
    message === 'invalid login credentials'
  )
    return 'Email or password is incorrect. Check your details or choose “Forgot or set password”.';
  if (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    message.includes('user already registered') ||
    message.includes('already registered')
  )
    return 'This email already has an account. Sign in or choose “Forgot or set password”.';
  if (code === 'email_not_confirmed' || message.includes('email not confirmed'))
    return 'Confirm your email first. Check your inbox, or choose “Forgot or set password” to request a code.';
  if (
    code === 'weak_password' ||
    message.includes('password should be at least')
  )
    return 'Choose a password with at least 10 characters.';
  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    value?.status === 429
  )
    return 'Too many attempts. Wait a few minutes, then try again.';
  if (
    message.includes('failed to fetch') ||
    message.includes('network request failed') ||
    message.includes('network error')
  )
    return 'INSTEAD could not reach the sign-in service. Check your connection and try again.';
  if (value?.code === 'PGRST202' || value?.code === '42P01')
    return 'Community setup is not complete yet. Please try again later.';
  if (value?.code === 'P0001')
    return value.message ?? 'This action is unavailable.';
  return 'We could not complete that request. Please try again.';
}
export function profileError(error: unknown) {
  const value = error as {
    code?: string;
    message?: string;
    status?: number;
    statusCode?: string | number;
  };
  const message = value?.message?.toLowerCase() ?? '';
  if (
    value?.code === 'NoSuchBucket' ||
    message.includes('bucket not found') ||
    (value?.code === 'PGRST202' && message.includes('avatar'))
  )
    return 'Profile photos are temporarily unavailable. You can update your profile without a photo, or try again later.';
  if (value?.status === 413 || Number(value?.statusCode) === 413)
    return 'Choose a profile photo smaller than 2 MB.';
  if (message.includes('network') || message.includes('failed to fetch'))
    return 'Your profile could not be saved. Check your connection and try again.';
  const mapped = communityError(error);
  return mapped === 'We could not complete that request. Please try again.'
    ? 'Your profile could not be saved. Please try again.'
    : mapped;
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
