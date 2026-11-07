import {
  clearInvalidSession,
  sameSession,
  readStoredSession,
  validateSession,
} from '../lib/sessionValidation';
import {
  notifyCommunityChanged,
  subscribeCommunityUpdates,
} from '../lib/communityUpdates';
import { useCallback, useEffect, useRef, useState } from 'react';
import { POLICY_VERSION } from '../policies';
import {
  accountRpc,
  communityError,
  communityRpc,
  profileError,
} from '../lib/community';
import type {
  CommunityClient,
  CommunitySession,
  CommunityComment,
  ReportReason,
  CommunityAccountState,
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
  const [sessionValidated, setSessionValidated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [authRechecking, setAuthRechecking] = useState(false);
  const [authCheckError, setAuthCheckError] = useState('');
  const checkSessionRef = useRef<() => void>(() => undefined);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [account, setAccount] = useState<CommunityAccountState | null>(null);
  const [accountUserId, setAccountUserId] = useState<string>();
  const [accountLoadStatus, setAccountLoadStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [accountLoadError, setAccountLoadError] = useState('');
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
    'auth' | 'other' | 'validation' | 'profile'
  >('other');
  const [notice, setNotice] = useState('');
  const [deletionComplete, setDeletionComplete] = useState(false);
  const [deletionInProgress, setDeletionInProgress] = useState(false);
  const deletionActive = useRef(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [finishingSignup, setFinishingSignup] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const signupDraft = useRef<{ username: string; bio: string } | null>(null);
  const passwordVerifiedAt = useRef(0);
  const lock = useRef(false);
  const generation = useRef(0);
  const userId = session?.user.id;
  const accountGeneration = useRef(0);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const resetAuthForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setPasswordConfirmation('');
    setUsername('');
    setBio('');
    setCode('');
    setSentEmail('');
    setPendingAuth(null);
    signupDraft.current = null;
    setPasswordSetupReady(false);
    passwordVerifiedAt.current = 0;
    setResendAt(0);
    setAuthModeState('signin');
  }, []);
  const loadAccount = useCallback(
    async (targetUserId = userId) => {
      if (deletionActive.current) return false;
      const version = ++accountGeneration.current;
      const previousProfile = profileRef.current;
      if (!targetUserId) {
        setAccountLoadStatus('idle');
        setAccountLoadError('');
        setAccountUserId(undefined);
        return true;
      }
      setAccountLoadStatus('loading');
      setAccountLoadError('');
      setProfileLoadError('');
      setProfileLoading(true);
      // Profile reads must never hold the account terms gate.
      accountRpc<CommunityProfile[]>(client, 'community_profile_me')
        .then(rows => {
          if (version !== accountGeneration.current) return;
          const nextProfile = rows[0] ?? null;
          setProfile(nextProfile);
          setUsername(current =>
            current === (previousProfile?.username ?? '')
              ? nextProfile?.username ?? ''
              : current,
          );
          setBio(current =>
            current === (previousProfile?.bio ?? '')
              ? nextProfile?.bio ?? ''
              : current,
          );
        })
        .catch(issue => {
          if (version === accountGeneration.current)
            setProfileLoadError(communityError(issue));
        })
        .finally(() => {
          if (version === accountGeneration.current) setProfileLoading(false);
        });
      // Both background requests handle their own errors.
      const stateResult = await accountRpc<CommunityAccountState[]>(
        client,
        'community_account_state',
      ).then(
        value => ({ status: 'fulfilled' as const, value }),
        reason => ({ status: 'rejected' as const, reason }),
      );
      if (version !== accountGeneration.current) return false;

      if (stateResult.status === 'fulfilled' && stateResult.value[0]) {
        setAccount(stateResult.value[0]);
        setAccountUserId(targetUserId);
        setAccountLoadStatus('ready');
      } else {
        const issue =
          stateResult.status === 'rejected'
            ? stateResult.reason
            : new Error('Account safeguards are unavailable.');
        setAccount(null);
        setAccountUserId(targetUserId);
        setAccountLoadStatus('error');
        setAccountLoadError(communityError(issue));
        if (stateResult.status === 'fulfilled' && !stateResult.value[0])
          checkSessionRef.current();
      }

      return (
        stateResult.status === 'fulfilled' && Boolean(stateResult.value[0])
      );
    },
    [client, userId],
  );
  const refresh = useCallback(async () => {
    if (deletionActive.current) return;
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
      setAuthChecking(false);
      setLoading(false);
      return;
    }
    let active = true;
    let version = 0;
    let receivedAuthEvent = false;
    let latest: CommunitySession | null = null;
    let validated: CommunitySession | null = null;
    let checkedGuest = false;
    function endSession(showNotice: boolean) {
      checkedGuest = true;
      validated = null;
      setAuthRechecking(false);
      generation.current++;
      accountGeneration.current++;
      setSessionValidated(false);
      setSession(null);
      setAccount(null);
      setProfile(null);
      setComments([]);
      setDraft('');
      resetAuthForm();
      setError('');
      setProfileLoadError('');
      setAuthCheckError('');
      setAuthChecking(false);
      setAuthReady(true);
      if (showNotice)
        setNotice('Your session has ended. Please sign in again.');
    }
    async function inspect(
      candidate: CommunitySession | null,
      current: number,
    ) {
      if (!active || current !== version) return;
      if (!candidate) {
        checkedGuest = true;
        validated = null;
        setAuthRechecking(false);
        setSession(null);
        setSessionValidated(false);
        setAuthChecking(false);
        setAuthReady(true);
        return;
      }
      const result = await validateSession(client!, candidate);
      if (!active || current !== version || !sameSession(latest, candidate))
        return;
      if (result.status === 'valid') {
        validated = candidate;
        setAuthRechecking(false);
        setSession(result.session);
        setSessionValidated(true);
        setAuthChecking(false);
        setAuthCheckError('');
        setAuthReady(true);
      } else if (result.status === 'invalid') {
        endSession(true);
        // getSession/signOut run outside the Auth callback lock. A fresh login
        // is compared before any local stored credential is removed.
        await clearInvalidSession(client!, candidate).catch(() => undefined);
      } else {
        validated = null;
        setAuthRechecking(false);
        setSessionValidated(false);
        setAuthChecking(false);
        setAuthReady(true);
        setAuthCheckError(
          'Could not verify your session. Check your connection and try again.',
        );
      }
    }
    function schedule(candidate: CommunitySession | null) {
      if (candidate) checkedGuest = false;
      if (!sameSession(validated, candidate)) validated = null;
      setAuthRechecking(Boolean(validated && candidate));
      latest = candidate;
      const current = ++version;
      setSessionValidated(false);
      setAuthChecking(Boolean(candidate));
      setAuthCheckError('');
      // Supabase Auth callbacks must not await other Auth methods.
      void Promise.resolve().then(() => inspect(candidate, current));
    }
    const { data } = client.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      receivedAuthEvent = true;
      if (
        event === 'SIGNED_OUT' ||
        event === 'SIGNED_IN' ||
        event === 'PASSWORD_RECOVERY'
      ) {
        passwordVerifiedAt.current = 0;
        setPasswordSetupReady(false);
      }
      if (event === 'SIGNED_OUT') {
        latest = null;
        version++;
        endSession(false);
      } else schedule(next);
    });
    function restore() {
      setAuthRechecking(Boolean(validated) || checkedGuest);
      const requested = ++version;
      setSessionValidated(false);
      setAuthChecking(true);
      setAuthCheckError('');
      readStoredSession(client!)
        .then(({ data: auth, error: issue }) => {
          if (!active || requested !== version) return;
          if (issue) throw issue;
          schedule(auth.session);
        })
        .catch(() => {
          if (!active || requested !== version) return;
          validated = null;
          setAuthRechecking(false);
          setAuthChecking(false);
          setAuthReady(true);
          setAuthCheckError(
            'Could not verify your session. Check your connection and try again.',
          );
        });
    }
    checkSessionRef.current = restore;
    // Subscribe first so an auth event wins over an older stored-session read.
    const initial = version;
    readStoredSession(client)
      .then(({ data: auth, error: issue }) => {
        if (!active || receivedAuthEvent || initial !== version) return;
        if (issue) throw issue;
        schedule(auth.session);
      })
      .catch(() => {
        if (!active || receivedAuthEvent || initial !== version) return;
        setAuthChecking(false);
        setAuthReady(true);
        setAuthCheckError(
          'Could not verify your session. Check your connection and try again.',
        );
      });
    const unsubscribe = subscribeCommunityUpdates(update => {
      if (update.type === 'foreground') restore();
    });
    return () => {
      active = false;
      version++;
      unsubscribe();
      data.subscription.unsubscribe();
      checkSessionRef.current = () => undefined;
    };
  }, [client, resetAuthForm]);
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
    profileRef.current = null;
    setUsername(userId ? signupDraft.current?.username ?? '' : '');
    setBio(userId ? signupDraft.current?.bio ?? '' : '');
    setProfileLoadError('');
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
    const reload = () => {
      refresh().catch(() => undefined);
      if (userId) loadAccount().catch(() => undefined);
    };
    const unsubscribe = subscribeCommunityUpdates(update => {
      if (update.type === 'account-deleted') {
        // Clear drafts even in guest forms that never observed the deleted session.
        if (userId && update.userId !== userId) return;
        resetAuthForm();
        generation.current++;
        accountGeneration.current++;
        setSession(null);
        setAccount(null);
        setProfile(null);
        setComments([]);
        setDraft('');
        setSessionValidated(false);
        return;
      }
      reload();
    });
    return () => {
      unsubscribe();
    };
  }, [refresh, loadAccount, userId, resetAuthForm]);
  useEffect(() => {
    if (!sentEmail) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sentEmail]);
  async function run(
    task: () => Promise<void>,
    source: 'auth' | 'other' | 'profile' = 'other',
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
      setError(
        source === 'profile' ? profileError(issue) : communityError(issue),
      );
      setErrorSource(source);
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function changeAuthMode(mode: 'signin' | 'signup' | 'recovery') {
    if (mode === authMode) return;
    // A new auth flow must never inherit credentials or verification drafts.
    resetAuthForm();
    setAuthModeState(mode);
    setError('');
    setNotice('');
  }
  const verified = Boolean(
    sessionValidated &&
      userId &&
      session?.user.email_confirmed_at &&
      !session.user.is_anonymous,
  );
  const canManage = Boolean(
    verified &&
      !deletionInProgress &&
      accountUserId === userId &&
      accountLoadStatus === 'ready' &&
      account &&
      !account.suspended &&
      !account.deletion_requested_at,
  );
  const canEditProfile = Boolean(
    verified && !deletionInProgress && !account?.deletion_requested_at,
  );
  const canContribute = Boolean(canManage && account?.policy_accepted);
  function acceptPolicy() {
    return run(async () => {
      if (!canManage) return;
      await communityRpc(client, 'community_accept_policy', {
        p_version: POLICY_VERSION,
      });
      await loadAccount();
      setNotice('Community terms accepted for this account.');
      notifyCommunityChanged();
    });
  }
  function block(kind: 'comment' | 'recipe', id: string) {
    return run(async () => {
      await communityRpc(client, 'community_block', {
        p_kind: kind,
        p_content: id,
      });
      notifyCommunityChanged();
      await Promise.all([loadAccount(), refresh()]);
      setNotice(
        'Contributor blocked. You will no longer see them or their recipes.',
      );
    });
  }
  function requestDeletion() {
    return run(async () => {
      deletionActive.current = true;
      setDeletionInProgress(true);
      setProfileLoadError('');
      // Ignore reads that started before deletion removed their records.
      accountGeneration.current++;
      generation.current++;
      try {
        await communityRpc(client, 'community_request_deletion');
        let completed = false;
        try {
          if (client?.functions) {
            const result = await client.functions.invoke('delete-account');
            completed = !result.error;
          }
        } catch {
          // A network failure leaves the request pending and retryable.
        }
        if (completed && client) {
          await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
          resetAuthForm();
          setSession(null);
          setProfile(null);
          setAccount(null);
          setDraft('');
          setNotice('');
          notifyCommunityChanged({ type: 'account-deleted', userId: userId! });
          setDeletionComplete(true);
          return;
        }
        // Refresh pending status only after the actual deletion attempt ends.
        notifyCommunityChanged();
        deletionActive.current = false;
        await loadAccount();
        setNotice(
          'Deletion requested. Public contributions are hidden. Automatic deletion could not finish; use Retry account deletion or contact info@insteadtry.com.',
        );
      } finally {
        deletionActive.current = false;
        setDeletionInProgress(false);
      }
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
      const { error: issue } = await client.auth.resetPasswordForEmail(address);
      if (issue) throw issue;
      setSentEmail(address);
      setPendingAuth('recovery');
      setCode('');
      setResendAt(Date.now() + 60000);
      setNow(Date.now());
      setNotice('Check your email for a password setup code.');
    }, 'auth');
  }
  function resendSignupCode() {
    return run(async () => {
      if (
        !client ||
        pendingAuth !== 'signup' ||
        !sentEmail ||
        Date.now() < resendAt
      )
        return;
      const { error: issue } = await client.auth.resend({
        type: 'signup',
        email: sentEmail,
      });
      if (issue) throw issue;
      setCode('');
      setResendAt(Date.now() + 60000);
      setNow(Date.now());
      setNotice(
        'A new confirmation code was requested. Check your inbox and junk folder. Codes expire after five minutes.',
      );
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
      const handle = username.trim();
      const about = bio.trim();
      const available = await accountRpc<boolean>(
        client,
        'community_username_available',
        { p_username: handle },
      );
      if (!available) throw { code: '23505' };
      signupDraft.current = { username: handle, bio: about };
      const { data, error: issue } = await client.auth.signUp({
        email: address,
        password,
      });
      if (issue) throw issue;
      setPassword('');
      setPasswordConfirmation('');
      if (
        !data?.session &&
        Array.isArray(data?.user?.identities) &&
        data.user.identities.length === 0
      ) {
        setAuthModeState('signin');
        signupDraft.current = null;
        setPendingAuth(null);
        setSentEmail('');
        setPassword('');
        setPasswordConfirmation('');
        setNotice(
          'No confirmation code was sent. Try signing in, or choose “Forgot password?” to reset your password.',
        );
        return;
      }
      if (data?.session) {
        await communityRpc(client, 'community_profile_set', {
          p_username: handle,
          p_bio: about,
        });
        signupDraft.current = null;
        setNotice('Account created.');
        setProfile({ username: handle, bio: about });
        setPassword('');
        setPasswordConfirmation('');
      } else {
        setResendAt(Date.now() + 60000);
        setNow(Date.now());
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
      notifyCommunityChanged();
    }, 'profile');
  }
  function verifyCode() {
    return run(async () => {
      if (!client || !/^\d{6,10}$/.test(code.trim())) {
        setError('Enter the code from your email.');
        setErrorSource('auth');
        return;
      }
      const isSignup = pendingAuth === 'signup';
      const draftProfile = signupDraft.current ?? {
        username: username.trim(),
        bio: bio.trim(),
      };
      let signupVerified = false;
      if (isSignup) setFinishingSignup(true);
      try {
        const { error: issue } = await client.auth.verifyOtp({
          email: sentEmail,
          token: code.trim(),
          type: pendingAuth === 'signup' ? 'signup' : 'recovery',
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
          const { data: verifiedAuth, error: sessionError } =
            await readStoredSession(client);
          if (sessionError) throw sessionError;
          if (
            !verifiedAuth.session ||
            !verifiedAuth.session.user.email_confirmed_at ||
            verifiedAuth.session.user.is_anonymous ||
            verifiedAuth.session.user.email?.toLowerCase() !==
              sentEmail.toLowerCase()
          )
            throw new Error('Verify your email before updating your profile.');
          signupVerified = true;
          setSession(verifiedAuth.session);
          await accountRpc(client, 'community_profile_set', {
            p_username: draftProfile.username,
            p_bio: draftProfile.bio,
          });
          const ready = await loadAccount(verifiedAuth.session.user.id);
          signupDraft.current = null;
          setProfile(draftProfile);
          setPendingAuth(null);
          setEmail('');
          setNotice(
            ready
              ? 'Email verified. Review the community terms to finish setup.'
              : 'Email verified. Retry the account check to finish setup.',
          );
        } else if (pendingAuth === 'recovery') {
          passwordVerifiedAt.current = Date.now();
          setPasswordSetupReady(true);
          setNotice('Email verified. Choose a new password.');
        }
      } catch (issue) {
        if (isSignup && signupVerified) {
          setPendingAuth(null);
          setUsername(draftProfile.username);
          setBio(draftProfile.bio);
          setNotice(
            (issue as { code?: string })?.code === '23505'
              ? 'Email verified. Choose an available username to finish your profile.'
              : 'Email verified. Retry profile setup to finish your account.',
          );
        }
        throw issue;
      } finally {
        if (isSignup) setFinishingSignup(false);
      }
    }, 'auth');
  }
  function finishProfileSetup() {
    return run(async () => {
      if (!client || !verified || !userId)
        throw new Error('Verify your email before updating your profile.');
      const handle = username.trim();
      const about = bio.trim();
      if (!/^[A-Za-z0-9_]{3,20}$/.test(handle))
        throw new Error(
          'Choose a username with 3–20 letters, numbers, or underscores.',
        );
      if (about.length > 280)
        throw new Error('Bio must be 280 characters or fewer.');
      setFinishingSignup(true);
      try {
        await accountRpc(client, 'community_profile_set', {
          p_username: handle,
          p_bio: about,
        });
        await loadAccount(userId);
        setProfile({ username: handle, bio: about });
        signupDraft.current = null;
        setPendingAuth(null);
        setNotice(
          'Profile created. Review the community terms to finish setup.',
        );
      } finally {
        setFinishingSignup(false);
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
      if (
        Date.now() - passwordVerifiedAt.current >= 5 * 60 * 1000 ||
        Date.now() < passwordVerifiedAt.current
      ) {
        passwordVerifiedAt.current = 0;
        setPasswordSetupReady(false);
        setPassword('');
        setPasswordConfirmation('');
        setNotice('Verification expired. Request a new password reset code.');
        return;
      }
      const { error: issue } = await client.auth.updateUser({ password });
      if (issue) throw issue;
      setPassword('');
      setPasswordConfirmation('');
      passwordVerifiedAt.current = 0;
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
      notifyCommunityChanged();
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
      notifyCommunityChanged();
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
      notifyCommunityChanged();
      await refresh();
    });
  }
  function remove(comment: CommunityComment) {
    return run(async () => {
      await communityRpc(client, 'community_delete', { p_comment: comment.id });
      notifyCommunityChanged();
      await refresh();
    });
  }
  function signOut() {
    return run(async () => {
      if (!client) return;
      const { error: issue } = await client.auth.signOut({ scope: 'local' });
      if (issue) throw issue;
      resetAuthForm();
      setSession(null);
      setDraft('');
      setNotice('Signed out.');
      notifyCommunityChanged();
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
    session: sessionValidated ? session : null,
    authReady: authReady && !authChecking && !authCheckError,
    authChecking,
    authRechecking,
    // Read-only recipe caches keep their owner during same-session validation.
    recipeUserId: sessionValidated || authRechecking ? userId : undefined,
    authCheckError,
    retrySession: () => checkSessionRef.current(),
    comments: sessionValidated
      ? comments
      : comments.filter(comment => comment.moderation_status === 'approved'),
    publicCount: comments[0]?.public_count ?? 0,
    account: sessionValidated && accountUserId === userId ? account : null,
    finishingSignup,
    profileLoading,
    accountReady:
      sessionValidated &&
      accountUserId === userId &&
      accountLoadStatus === 'ready' &&
      !!account,
    accountLoading: accountUserId !== userId || accountLoadStatus === 'loading',
    accountLoadError,
    retryAccount: () => loadAccount(),
    canManage,
    acceptPolicy,
    block,
    requestDeletion,
    deletionComplete,
    deletionInProgress,
    dismissDeletionConfirmation: () => setDeletionComplete(false),
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
    profile: sessionValidated ? profile : null,
    avatarUrl: sessionValidated ? avatarUrl : undefined,
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
    resendSignupCode,
    verifyCode,
    signIn,
    signUp,
    finishProfileSetup,
    saveProfile,
    clearProfileError: () => {
      if (errorSource === 'profile') setError('');
    },
    setNewPassword,
    post,
    vote,
    report,
    remove,
    signOut,
    loadMore,
    changeEmail: () => {
      signupDraft.current = null;
      passwordVerifiedAt.current = 0;
      setSentEmail('');
      setCode('');
      setPendingAuth(null);
      setPasswordSetupReady(false);
      setNotice('');
    },
    retry: () =>
      run(async () => {
        notifyCommunityChanged();
        await refresh();
        if (userId) await loadAccount();
      }),
  };
}
