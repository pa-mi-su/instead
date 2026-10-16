import { useCallback, useEffect, useRef, useState } from 'react';
import { communityError, communityRpc } from '../lib/community';
import type {
  CommunityClient,
  CommunitySession,
  CommunityComment,
  ReportReason,
} from '../lib/community';

export function useCommunity(
  client: CommunityClient | null,
  productId: string,
) {
  const [session, setSession] = useState<CommunitySession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [nickname, setNickname] = useState('');
  const [profileReady, setProfileReady] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [email, setEmail] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [code, setCode] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const lock = useRef(false);
  const generation = useRef(0);
  const userId = session?.user.id;
  const refresh = useCallback(async () => {
    const version = ++generation.current;
    setLoading(true);
    try {
      const rows = await communityRpc<CommunityComment[]>(
        client,
        'community_list',
        { p_product: productId, p_offset: 0 },
      );
      if (version === generation.current) {
        setComments(rows);
        setHasMore(rows.length === 50);
        setLoaded(true);
      }
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, [client, productId]);
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
          if (issue) setError(communityError(issue));
          if (!receivedAuthEvent) setSession(auth.session);
          setAuthReady(true);
        }
      })
      .catch(issue => {
        if (active) {
          setError(communityError(issue));
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
    setComments([]);
    setLoaded(false);
    refresh().catch(issue => {
      if (active) setError(communityError(issue));
    });
    setProfileReady(false);
    setHasProfile(false);
    setNickname('');
    if (userId)
      communityRpc<string | null>(client, 'community_profile')
        .then(name => {
          if (active) {
            setNickname(name ?? '');
            setHasProfile(Boolean(name));
            setProfileReady(true);
          }
        })
        .catch(issue => {
          if (active) setError(communityError(issue));
        });
    return () => {
      active = false;
      pending.current++;
    };
  }, [authReady, client, refresh, userId]);
  useEffect(() => {
    if (!sentEmail) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sentEmail]);
  async function run(task: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await task();
    } catch (issue) {
      setError(communityError(issue));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const canContribute = Boolean(
    userId && session?.user.email_confirmed_at && !session.user.is_anonymous,
  );
  function sendCode() {
    return run(async () => {
      const address = (sentEmail || email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
        setError('Enter a valid email address.');
        return;
      }
      if (!client || Date.now() < resendAt) return;
      const { error: issue } = await client.auth.signInWithOtp({
        email: address,
      });
      if (issue) throw issue;
      setSentEmail(address);
      setCode('');
      setResendAt(Date.now() + 60000);
      setNow(Date.now());
      setNotice('Check your email for a sign-in code.');
    });
  }
  function verifyCode() {
    return run(async () => {
      if (!client || !/^\d{6,10}$/.test(code.trim())) {
        setError('Enter the code from your email.');
        return;
      }
      const { error: issue } = await client.auth.verifyOtp({
        email: sentEmail,
        token: code.trim(),
        type: 'email',
      });
      if (issue) {
        setError(
          'That code is invalid or expired. Try again or request a new code.',
        );
        return;
      }
      setCode('');
      setSentEmail('');
      setEmail('');
      setNotice('You are signed in.');
    });
  }
  function saveProfile() {
    return run(async () => {
      await communityRpc(client, 'community_set_profile', {
        p_nickname: nickname.trim(),
      });
      setNickname(nickname.trim());
      setHasProfile(true);
      setProfileReady(true);
      setNotice('Public nickname saved.');
      await refresh();
    });
  }
  function post() {
    return run(async () => {
      if (!canContribute || !draft.trim()) return;
      await communityRpc(client, 'community_post', {
        p_product: productId,
        p_body: draft.trim(),
      });
      setDraft('');
      setNotice('Comment posted.');
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
        setNotice('Sign in with an email code to vote.');
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
        'community_list',
        { p_product: productId, p_offset: comments.length },
      );
      setComments(current => [
        ...current,
        ...rows.filter(row => !current.some(item => item.id === row.id)),
      ]);
      setHasMore(rows.length === 50);
    });
  }
  return {
    configured: Boolean(client),
    session,
    authReady,
    comments,
    nickname,
    setNickname,
    hasProfile,
    profileReady,
    email,
    setEmail,
    sentEmail,
    code,
    setCode,
    draft,
    setDraft,
    busy,
    loading,
    loaded,
    error,
    notice,
    canContribute,
    resendSeconds: Math.max(0, Math.ceil((resendAt - now) / 1000)),
    hasMore,
    sendCode,
    verifyCode,
    saveProfile,
    post,
    vote,
    report,
    remove,
    signOut,
    loadMore,
    changeEmail: () => {
      setSentEmail('');
      setCode('');
      setNotice('');
    },
    retry: () =>
      run(async () => {
        await refresh();
        if (userId) {
          const name = await communityRpc<string | null>(
            client,
            'community_profile',
          );
          setNickname(name ?? '');
          setHasProfile(Boolean(name));
          setProfileReady(true);
        }
      }),
  };
}
