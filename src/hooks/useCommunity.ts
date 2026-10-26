import { useCallback, useEffect, useRef, useState } from 'react';
import { POLICY_VERSION } from '../policies';
import { communityError, communityRpc } from '../lib/community';
import type {
  CommunityClient,
  CommunitySession,
  CommunityComment,
  ReportReason,
  CommunityAccountState,
  BlockedContributor,
  CommunityProfile,
  AvatarUpload,
} from '../lib/community';

export function useCommunity(
  client: CommunityClient | null,
  productId: string,
  recipeId?: string,
  sort: 'helpful' | 'newest' = 'helpful',
  includeComments = true,
) {
  const [session, setSession] = useState<CommunitySession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [account, setAccount] = useState<CommunityAccountState | null>(null);
  const [accountUserId, setAccountUserId] = useState<string>();
  const [accountLoadStatus, setAccountLoadStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [accountLoadError, setAccountLoadError] = useState('');
  const [blocks, setBlocks] = useState<BlockedContributor[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [profileLoadError, setProfileLoadError] = useState('');
  const [authMode, setAuthModeState] = useState<
    'signin' | 'signup' | 'recovery'
  >('signin');
  const [pendingAuth, setPendingAuth] = useState<'signup' | 'recovery' | null>(
    null,
  );
  const [passwordSetupReady, setPasswordSetupReady] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [code, setCode] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [errorSource, setErrorSource] = useState<
    'auth' | 'other' | 'validation'
  >('other');
  const [notice, setNotice] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const lock = useRef(false);
  const generation = useRef(0);
  const userId = session?.user.id;
  const accountGeneration = useRef(0);
  const loadAccount = useCallback(async () => {
    const version = ++accountGeneration.current;
    if (!userId) {
      setAccountLoadStatus('idle');
      setAccountLoadError('');
      setAccountUserId(undefined);
      return true;
    }
    setAccountLoadStatus('loading');
    setAccountLoadError('');
    setProfileLoadError('');
    const [stateResult, blocksResult, profileResult] = await Promise.allSettled(
      [
        communityRpc<CommunityAccountState[]>(
          client,
          'community_account_state',
        ),
        communityRpc<BlockedContributor[]>(client, 'community_blocks_list'),
        communityRpc<CommunityProfile[]>(client, 'community_profile_me'),
      ],
    );
    if (version !== accountGeneration.current) return false;

    if (stateResult.status === 'fulfilled' && stateResult.value[0]) {
      setAccount(stateResult.value[0]);
      setAccountUserId(userId);
      setAccountLoadStatus('ready');
    } else {
      const issue =
        stateResult.status === 'rejected'
          ? stateResult.reason
          : new Error('Account safeguards are unavailable.');
      setAccount(null);
      setAccountUserId(userId);
      setAccountLoadStatus('error');
      setAccountLoadError(communityError(issue));
    }

    if (blocksResult.status === 'fulfilled') setBlocks(blocksResult.value);
    else setBlocks([]);

    if (profileResult.status === 'fulfilled') {
      const nextProfile = profileResult.value[0] ?? null;
      setProfile(nextProfile);
      setUsername(nextProfile?.username ?? '');
      setBio(nextProfile?.bio ?? '');
    } else {
      setProfileLoadError(communityError(profileResult.reason));
    }
    return stateResult.status === 'fulfilled' && Boolean(stateResult.value[0]);
  }, [client, userId]);
  const refresh = useCallback(async () => {
    const version = ++generation.current;
    if (!includeComments) {
      setComments([]);
      setHasMore(false);
      setLoaded(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await communityRpc<CommunityComment[]>(
        client,
        recipeId ? 'recipe_comments_list' : 'community_list',
        recipeId
          ? {
              p_product: productId,
              p_recipe: recipeId,
              p_offset: 0,
              p_sort: sort,
            }
          : { p_product: productId, p_offset: 0 },
      );
      if (version === generation.current) {
        setComments(rows);
        setHasMore(rows.length === 50);
        setLoaded(true);
      }
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, [client, includeComments, productId, recipeId, sort]);
  useEffect(() => {
    if (!client) {
      setAuthReady(true);
      setLoading(false);
      return;
    }
    let active = true;
    let receivedAuthEvent = false;
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      if (active) {
        receivedAuthEvent = true;
        setSession(next);
        setAuthReady(true);
      }
    });
    client.auth
      .getSession()
      .then(({ data: auth, error: issue }) => {
        if (active) {
          if (issue) {
            setError(communityError(issue));
            setErrorSource('auth');
          }
          if (!receivedAuthEvent) setSession(auth.session);
          setAuthReady(true);
        }
      })
      .catch(issue => {
        if (active) {
          setError(communityError(issue));
          setErrorSource('auth');
          setAuthReady(true);
        }
      });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client]);
  useEffect(() => {
    if (!authReady || !client) return;
    let active = true;
    const pending = generation;
    const pendingAccount = accountGeneration;
    setComments([]);
    setLoaded(false);
    refresh().catch(issue => {
      if (active) {
        setError(communityError(issue));
        setErrorSource('other');
      }
    });
    setAccount(null);
    setAccountUserId(undefined);
    setAccountLoadStatus(userId ? 'loading' : 'idle');
    setAccountLoadError('');
    setProfile(null);
    setProfileLoadError('');
    setBlocks([]);
    if (userId)
      loadAccount().catch(issue => {
        if (active) {
          setAccountLoadStatus('error');
          setAccountLoadError(communityError(issue));
        }
      });
    return () => {
      active = false;
      pending.current++;
      pendingAccount.current++;
    };
  }, [authReady, client, refresh, userId, loadAccount]);
  useEffect(() => {
    if (!sentEmail) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sentEmail]);
  async function run(
    task: () => Promise<void>,
    source: 'auth' | 'other' = 'other',
  ): Promise<boolean> {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await task();
      return true;
    } catch (issue) {
      setError(communityError(issue));
      setErrorSource(source);
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function changeAuthMode(mode: 'signin' | 'signup' | 'recovery') {
    setAuthModeState(mode);
    setError('');
    setNotice('');
  }
  const verified = Boolean(
    userId && session?.user.email_confirmed_at && !session.user.is_anonymous,
  );
  const canManage = Boolean(
    verified &&
      accountUserId === userId &&
      accountLoadStatus === 'ready' &&
      account &&
      !account.suspended &&
      !account.deletion_requested_at,
  );
  const canEditProfile = Boolean(verified && !account?.deletion_requested_at);
  const canContribute = Boolean(canManage && account?.policy_accepted);
  function acceptPolicy() {
    return run(async () => {
      if (!canManage) return;
      await communityRpc(client, 'community_accept_policy', {
        p_version: POLICY_VERSION,
      });
      await loadAccount();
      setNotice('Community terms accepted for this account.');
    });
  }
  function block(kind: 'comment' | 'recipe', id: string) {
    return run(async () => {
      await communityRpc(client, 'community_block', {
        p_kind: kind,
        p_content: id,
      });
      await Promise.all([loadAccount(), refresh()]);
      setNotice(
        'Contributor blocked. Their recipes are hidden for your account.',
      );
    });
  }
  function unblock(id: string) {
    return run(async () => {
      await communityRpc(client, 'community_unblock', { p_block: id });
      await Promise.all([loadAccount(), refresh()]);
      setNotice('Contributor unblocked.');
    });
  }
  function requestDeletion() {
    return run(async () => {
      await communityRpc(client, 'community_request_deletion');
      await Promise.all([loadAccount(), refresh()]);
      if (client?.functions) {
        const result = await client.functions.invoke('delete-account');
        if (!result.error) {
          await client.auth.signOut({ scope: 'local' });
          setSession(null);
          setDraft('');
          setNotice('Your account and community data have been deleted.');
          return;
        }
      }
      setNotice(
        'Deletion requested. Public contributions are hidden. Automatic deletion could not finish; use Retry account deletion or contact info@insteadtry.com.',
      );
    });
  }
  function sendCode() {
    return run(async () => {
      const address = (sentEmail || email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
        setError('Enter a valid email address.');
        setErrorSource('auth');
        return;
      }
      if (!client || Date.now() < resendAt) return;
      const { error: issue } = await client.auth.signInWithOtp({
        email: address,
        options: { shouldCreateUser: false },
      });
      if (issue) throw issue;
      setSentEmail(address);
      setPendingAuth('recovery');
      setCode('');
      setResendAt(Date.now() + 60000);
      setNow(Date.now());
      setNotice('Check your email for a password setup code.');
    }, 'auth');
  }
  function signIn() {
    return run(async () => {
      const address = email.trim().toLowerCase();
      if (!client || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))
        throw new Error('Enter a valid email address.');
      if (!password) throw new Error('Enter your password.');
      const { error: issue } = await client.auth.signInWithPassword({
        email: address,
        password,
      });
      if (issue) throw issue;
      setPassword('');
      setNotice('You are signed in.');
    }, 'auth');
  }
  function signUp() {
    const address = email.trim().toLowerCase();
    const validationError =
      !client || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)
        ? 'Enter a valid email address.'
        : !/^[A-Za-z0-9_]{3,20}$/.test(username.trim())
        ? 'Choose a username with 3–20 letters, numbers, or underscores.'
        : password.length < 10
        ? 'Use a password with at least 10 characters.'
        : password !== passwordConfirmation
        ? 'The passwords do not match.'
        : bio.length > 280
        ? 'Bio must be 280 characters or fewer.'
        : '';
    if (validationError) {
      setError(validationError);
      setErrorSource('validation');
      setNotice('');
      return Promise.resolve(false);
    }
    return run(async () => {
      if (!client) throw new Error('Account service is not available.');
      const { data, error: issue } = await client.auth.signUp({
        email: address,
        password,
      });
      if (issue) throw issue;
      if (
        !data?.session &&
        Array.isArray(data?.user?.identities) &&
        data.user.identities.length === 0
      ) {
        setAuthModeState('signin');
        setPendingAuth(null);
        setSentEmail('');
        setPassword('');
        setPasswordConfirmation('');
        setNotice(
          'No confirmation code was sent. Try signing in, or use “Forgot or set password” to set a password for an earlier email-code account.',
        );
        return;
      }
      if (data?.session) {
        await communityRpc(client, 'community_profile_set', {
          p_username: username.trim(),
          p_bio: bio.trim(),
        });
        setNotice('Account created. Your email stays private.');
        setProfile({ username: username.trim(), bio: bio.trim() });
        setPassword('');
        setPasswordConfirmation('');
      } else {
        setPendingAuth('signup');
        setSentEmail(address);
        setCode('');
        setNotice('Enter the confirmation code sent to your email.');
      }
    }, 'auth');
  }
  function saveProfile(avatar?: AvatarUpload, removeAvatar = false) {
    return run(async () => {
      if (!client || !userId || !canEditProfile)
        throw new Error('Verify your email before updating your profile.');
      const handle = username.trim();
      const about = bio.trim();
      if (!/^[A-Za-z0-9_]{3,20}$/.test(handle))
        throw new Error(
          'Choose a username with 3–20 letters, numbers, or underscores.',
        );
      if (about.length > 280)
        throw new Error('Bio must be 280 characters or fewer.');

      const previousPath = profile?.avatar_path ?? null;
      let nextPath = previousPath;
      let storage = client.storage?.from('profile-avatars');
      if ((avatar || removeAvatar) && !storage)
        throw new Error('Profile photos are not configured yet.');
      if (avatar) {
        const extension = avatar.contentType.split('/')[1];
        nextPath = `${userId}/avatar.${extension}`;
        const { error: uploadError } = await storage!.upload(
          nextPath,
          avatar.bytes,
          { contentType: avatar.contentType, upsert: true },
        );
        if (uploadError) throw uploadError;
      } else if (removeAvatar) {
        nextPath = null;
      }

      try {
        await communityRpc(client, 'community_profile_set', {
          p_username: handle,
          p_bio: about,
        });
        if (avatar || removeAvatar)
          await communityRpc(client, 'community_profile_avatar_set', {
            p_avatar_path: nextPath,
          });
      } catch (issue) {
        if (avatar && nextPath && nextPath !== previousPath)
          await storage?.remove([nextPath]).catch(() => undefined);
        throw issue;
      }

      if (previousPath && nextPath !== previousPath)
        await storage?.remove([previousPath]).catch(() => undefined);
      setProfile({ username: handle, bio: about, avatar_path: nextPath });
      setNotice('Profile updated.');
    });
  }
  function verifyCode() {
    return run(async () => {
      if (!client || !/^\d{6,10}$/.test(code.trim())) {
        setError('Enter the code from your email.');
        setErrorSource('auth');
        return;
      }
      const { error: issue } = await client.auth.verifyOtp({
        email: sentEmail,
        token: code.trim(),
        type: pendingAuth === 'signup' ? 'signup' : 'email',
      });
      if (issue) {
        setError(
          'That code is invalid or expired. Try again or request a new code.',
        );
        setErrorSource('auth');
        return;
      }
      setCode('');
      setSentEmail('');
      if (pendingAuth === 'signup') {
        await communityRpc(client, 'community_profile_set', {
          p_username: username.trim(),
          p_bio: bio.trim(),
        });
        await loadAccount();
        setPendingAuth(null);
        setEmail('');
        setNotice('Email verified. Your account is ready.');
      } else if (pendingAuth === 'recovery') {
        setPasswordSetupReady(true);
        setNotice('Email verified. Choose a new password.');
      }
    }, 'auth');
  }
  function setNewPassword() {
    const validationError =
      password.length < 10
        ? 'Use a password with at least 10 characters.'
        : password !== passwordConfirmation
        ? 'The passwords do not match.'
        : '';
    if (validationError) {
      setError(validationError);
      setErrorSource('validation');
      setNotice('');
      return Promise.resolve(false);
    }
    return run(async () => {
      if (!client || !passwordSetupReady) return;
      const { error: issue } = await client.auth.updateUser({ password });
      if (issue) throw issue;
      setPassword('');
      setPasswordConfirmation('');
      setPasswordSetupReady(false);
      setPendingAuth(null);
      setEmail('');
      setNotice('Password saved. You are signed in.');
    }, 'auth');
  }
  function post() {
    return run(async () => {
      if (!canContribute || !draft.trim()) return;
      await communityRpc(
        client,
        recipeId ? 'recipe_comment_post' : 'community_post',
        {
          p_product: productId,
          p_body: draft.trim(),
          ...(recipeId ? { p_recipe: recipeId } : {}),
        },
      );
      setDraft('');
      setNotice(
        'Comment submitted for review. Only you can see it until approval.',
      );
      await refresh();
    });
  }
  function vote(comment: CommunityComment) {
    return run(async () => {
      if (comment.mine) {
        setNotice('You cannot upvote your own comment.');
        return;
      }
      if (!canContribute) {
        setNotice('Sign in to vote.');
        return;
      }
      await communityRpc(client, 'community_vote', {
        p_comment: comment.id,
        p_upvoted: !comment.upvoted,
      });
      await refresh();
    });
  }
  function report(comment: CommunityComment, reason: ReportReason) {
    return run(async () => {
      await communityRpc(client, 'community_report', {
        p_comment: comment.id,
        p_reason: reason,
      });
      setNotice('Report received for review.');
      await refresh();
    });
  }
  function remove(comment: CommunityComment) {
    return run(async () => {
      await communityRpc(client, 'community_delete', { p_comment: comment.id });
      await refresh();
    });
  }
  function signOut() {
    return run(async () => {
      if (!client) return;
      const { error: issue } = await client.auth.signOut({ scope: 'local' });
      if (issue) throw issue;
      setSession(null);
      setDraft('');
      setNotice('Signed out.');
    });
  }
  function loadMore() {
    return run(async () => {
      const rows = await communityRpc<CommunityComment[]>(
        client,
        recipeId ? 'recipe_comments_list' : 'community_list',
        recipeId
          ? {
              p_product: productId,
              p_recipe: recipeId,
              p_offset: comments.length,
              p_sort: sort,
            }
          : { p_product: productId, p_offset: comments.length },
      );
      setComments(current => [
        ...current,
        ...rows.filter(row => !current.some(item => item.id === row.id)),
      ]);
      setHasMore(rows.length === 50);
    });
  }
  const avatarUrl = profile?.avatar_path
    ? client?.storage?.from('profile-avatars').getPublicUrl(profile.avatar_path)
        .data.publicUrl
    : null;
  return {
    configured: Boolean(client),
    session,
    authReady,
    comments,
    publicCount: comments[0]?.public_count ?? 0,
    account: accountUserId === userId ? account : null,
    accountReady:
      accountUserId === userId && accountLoadStatus === 'ready' && !!account,
    accountLoading: accountUserId !== userId || accountLoadStatus === 'loading',
    accountLoadError,
    retryAccount: loadAccount,
    canManage,
    blocks: accountUserId === userId ? blocks : [],
    acceptPolicy,
    block,
    unblock,
    requestDeletion,
    email,
    setEmail,
    password,
    setPassword,
    passwordConfirmation,
    setPasswordConfirmation,
    username,
    setUsername,
    bio,
    setBio,
    profile,
    avatarUrl,
    profileLoadError,
    canEditProfile,
    authMode,
    setAuthMode: changeAuthMode,
    pendingAuth,
    passwordSetupReady,
    sentEmail,
    code,
    setCode,
    draft,
    setDraft,
    busy,
    loading,
    loaded,
    error,
    errorSource,
    notice,
    canContribute,
    resendSeconds: Math.max(0, Math.ceil((resendAt - now) / 1000)),
    hasMore,
    sendCode,
    verifyCode,
    signIn,
    signUp,
    saveProfile,
    setNewPassword,
    post,
    vote,
    report,
    remove,
    signOut,
    loadMore,
    changeEmail: () => {
      setSentEmail('');
      setCode('');
      setPendingAuth(null);
      setPasswordSetupReady(false);
      setNotice('');
    },
    retry: () =>
      run(async () => {
        await refresh();
        if (userId) await loadAccount();
      }),
  };
}
