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
} from '../lib/community';

export function useCommunity(
  client: CommunityClient | null,
  productId: string,
) {
  const [session, setSession] = useState<CommunitySession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [account, setAccount] = useState<CommunityAccountState | null>(null);
  const [accountUserId, setAccountUserId] = useState<string>();
  const [blocks, setBlocks] = useState<BlockedContributor[]>([]);
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
  const accountGeneration = useRef(0);
  const loadAccount = useCallback(async () => {
    const version = ++accountGeneration.current;
    if (!userId) return;
    const [rows, blocked] = await Promise.all([
      communityRpc<CommunityAccountState[]>(client, 'community_account_state'),
      communityRpc<BlockedContributor[]>(client, 'community_blocks_list'),
    ]);
    if (version === accountGeneration.current) {
      setAccount(rows[0] ?? null);
      setBlocks(blocked);
      setAccountUserId(userId);
    }
  }, [client, userId]);
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
    const pendingAccount = accountGeneration;
    setComments([]);
    setLoaded(false);
    refresh().catch(issue => {
      if (active) setError(communityError(issue));
    });
    setAccount(null);
    setAccountUserId(undefined);
    setBlocks([]);
    if (userId)
      loadAccount().catch(issue => {
        if (active) setError(communityError(issue));
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
  const verified = Boolean(
    userId && session?.user.email_confirmed_at && !session.user.is_anonymous,
  );
  const canManage = Boolean(
    verified &&
      accountUserId === userId &&
      account &&
      !account.suspended &&
      !account.deletion_requested_at,
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
        'Contributor blocked. Their comments and recipes are hidden for your account.',
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
  function post() {
    return run(async () => {
      if (!canContribute || !draft.trim()) return;
      await communityRpc(client, 'community_post', {
        p_product: productId,
        p_body: draft.trim(),
      });
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
    account: accountUserId === userId ? account : null,
    accountReady: accountUserId === userId && !!account,
    canManage,
    blocks: accountUserId === userId ? blocks : [],
    acceptPolicy,
    block,
    unblock,
    requestDeletion,
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
        if (userId) await loadAccount();
      }),
  };
}
