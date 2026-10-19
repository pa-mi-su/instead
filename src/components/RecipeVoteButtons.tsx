import { ThumbsDown, ThumbsUp } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable as Pressable } from './AnimatedPressable';
import { supabase } from '../lib/supabase';
import { COLORS } from '../styles';

type Rating = {
  score: number;
  upvotes: number;
  downvotes: number;
  my_vote: number;
};

export function RecipeVoteButtons({
  recipeId,
  productId,
  title,
  signedIn: signedInProp,
  canVote: canVoteProp,
  onSignIn,
  onVote,
  rating: externalRating,
}: {
  recipeId: string;
  productId: string;
  title: string;
  signedIn?: boolean;
  canVote?: boolean;
  onSignIn: () => void;
  onVote?: (value: -1 | 1) => Promise<void> | void;
  rating?: Rating;
}) {
  const [rating, setRating] = useState<Rating>({
    score: 0,
    upvotes: 0,
    downvotes: 0,
    my_vote: 0,
  });
  const [promptOpen, setPromptOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [builtInAccess, setBuiltInAccess] = useState({
    signedIn: false,
    canVote: false,
  });
  const activeRating = externalRating ?? rating;
  const signedIn = signedInProp ?? builtInAccess.signedIn;
  const canVote = canVoteProp ?? builtInAccess.canVote;

  useEffect(() => {
    const client = supabase;
    if (signedInProp !== undefined || !client) return;
    let active = true;
    const update = async (
      session: {
        user: { email_confirmed_at?: string; is_anonymous?: boolean };
      } | null,
    ) => {
      const verified = Boolean(
        session?.user.email_confirmed_at && !session.user.is_anonymous,
      );
      if (!active) return;
      setBuiltInAccess({ signedIn: verified, canVote: false });
      if (!verified) return;
      const { data, error: issue } = await client.rpc(
        'community_account_state',
      );
      if (issue || !active) return;
      const row = Array.isArray(data) ? data[0] : data;
      setBuiltInAccess({
        signedIn: verified,
        canVote: Boolean(
          row?.policy_accepted &&
            !row?.suspended &&
            !row?.deletion_requested_at,
        ),
      });
    };
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      update(session).catch(() => undefined);
    });
    client.auth
      .getSession()
      .then(({ data: auth }) => update(auth.session))
      .catch(() => undefined);
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [signedInProp]);

  useEffect(() => {
    const client = supabase;
    if (externalRating || !client || !recipeId.startsWith('builtin:')) return;
    let active = true;
    Promise.resolve(
      client.rpc('builtin_recipe_rating', {
        p_recipe: recipeId,
        p_product: productId,
      }),
    )
      .then(({ data, error: issue }) => {
        if (issue) throw issue;
        const row = Array.isArray(data) ? data[0] : data;
        if (active && row)
          setRating({
            score: Number(row.score) || 0,
            upvotes: Number(row.upvotes) || 0,
            downvotes: Number(row.downvotes) || 0,
            my_vote: Number(row.my_vote) || 0,
          });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [externalRating, productId, recipeId]);

  async function cast(value: -1 | 1) {
    if (!signedIn || !canVote) {
      setPromptOpen(true);
      return;
    }
    if (busy) return;
    setBusy(true);
    setError('');
    const nextVote = activeRating.my_vote === value ? 0 : value;
    try {
      if (onVote) {
        await onVote(value);
      } else {
        if (!supabase) throw new Error('Voting is unavailable right now.');
        const { error: issue } = await supabase.rpc('builtin_recipe_vote', {
          p_recipe: recipeId,
          p_product: productId,
          p_value: nextVote,
        });
        if (issue) throw issue;
        setRating(current => {
          const upvotes =
            current.upvotes -
            (current.my_vote === 1 ? 1 : 0) +
            (nextVote === 1 ? 1 : 0);
          const downvotes =
            current.downvotes -
            (current.my_vote === -1 ? 1 : 0) +
            (nextVote === -1 ? 1 : 0);
          return {
            upvotes,
            downvotes,
            score: upvotes - downvotes,
            my_vote: nextVote,
          };
        });
      }
    } catch (issue) {
      const message =
        issue &&
        typeof issue === 'object' &&
        'message' in issue &&
        typeof issue.message === 'string'
          ? issue.message
          : 'Could not save your vote.';
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={local.wrap}>
      <View style={local.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Vote this recipe down${
            activeRating.my_vote === -1 ? ', selected' : ''
          }`}
          accessibilityState={{
            selected: activeRating.my_vote === -1,
            disabled: busy,
          }}
          disabled={busy}
          onPress={() => cast(-1)}
          style={({ pressed }) => [
            local.voteButton,
            local.downButton,
            activeRating.my_vote === -1 && local.downSelected,
            pressed && local.pressed,
          ]}
        >
          <ThumbsDown
            size={19}
            color={local.downInk.color}
            fill={
              activeRating.my_vote === -1 ? local.downInk.color : 'transparent'
            }
          />
          <Text style={[local.voteLabel, local.downInk]}>Down</Text>
          <Text style={[local.count, local.downInk]}>
            {activeRating.downvotes}
          </Text>
        </Pressable>
        <View style={local.scorePill} accessibilityLiveRegion="polite">
          <Text style={local.score}>
            {activeRating.score > 0 ? '+' : ''}
            {activeRating.score}
          </Text>
          <Text style={local.scoreCaption}>community score</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Vote this recipe up${
            activeRating.my_vote === 1 ? ', selected' : ''
          }`}
          accessibilityState={{
            selected: activeRating.my_vote === 1,
            disabled: busy,
          }}
          disabled={busy}
          onPress={() => cast(1)}
          style={({ pressed }) => [
            local.voteButton,
            local.upButton,
            activeRating.my_vote === 1 && local.upSelected,
            pressed && local.pressed,
          ]}
        >
          <ThumbsUp
            size={19}
            color={local.upInk.color}
            fill={
              activeRating.my_vote === 1 ? local.upInk.color : 'transparent'
            }
          />
          <Text style={[local.voteLabel, local.upInk]}>Up</Text>
          <Text style={[local.count, local.upInk]}>{activeRating.upvotes}</Text>
        </Pressable>
      </View>
      <Text style={local.helper}>
        Vote up or down to help rank recipes. Votes are personal preferences,
        not safety ratings.
      </Text>
      {!!error && (
        <Text accessibilityRole="alert" style={local.error}>
          {error}
        </Text>
      )}
      <Modal
        visible={promptOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPromptOpen(false)}
      >
        <View style={local.scrim}>
          <View style={local.dialog}>
            <Text style={local.eyebrow}>HELP THE COMMUNITY</Text>
            <Text style={local.dialogTitle}>
              {signedIn ? 'One more step to vote' : 'Sign in to vote'}
            </Text>
            <Text style={local.dialogBody}>
              {signedIn
                ? 'Your account is signed in. Review the community agreement and account status below before voting.'
                : `Your up or down vote helps people compare ${title}. Votes are personal ratings; they do not show that a recipe is safe or effective.`}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setPromptOpen(false);
                onSignIn();
              }}
              style={({ pressed }) => [local.primary, pressed && local.pressed]}
            >
              <Text style={local.primaryText}>
                {signedIn ? 'Review account setup' : 'Continue to sign in'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setPromptOpen(false)}
              style={({ pressed }) => [local.dismiss, pressed && local.pressed]}
            >
              <Text style={local.dismissText}>Maybe later</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const local = StyleSheet.create({
  wrap: { marginTop: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  voteButton: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 8,
  },
  downButton: { backgroundColor: '#FFF0ED', borderColor: '#E7B9B0' },
  downSelected: { backgroundColor: '#F4D3CD', borderColor: '#C4574D' },
  upButton: { backgroundColor: '#E8F3E9', borderColor: '#B5D5B9' },
  upSelected: { backgroundColor: '#CEE6D0', borderColor: '#3C8559' },
  downInk: { color: '#B5463C' },
  upInk: { color: '#34734C' },
  voteLabel: { fontSize: 13, fontWeight: '800' },
  count: { fontSize: 12, fontWeight: '700' },
  scorePill: { alignItems: 'center', minWidth: 86 },
  score: { color: COLORS.ink, fontSize: 20, fontWeight: '900' },
  scoreCaption: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  helper: {
    marginTop: 7,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  error: { marginTop: 8, color: '#A63E36', fontSize: 13 },
  scrim: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(24,59,50,0.42)',
  },
  dialog: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: COLORS.ink,
    padding: 24,
    gap: 14,
  },
  eyebrow: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  dialogTitle: { color: COLORS.ink, fontSize: 24, fontWeight: '900' },
  dialogBody: { color: COLORS.muted, fontSize: 16, lineHeight: 23 },
  primary: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: COLORS.sage,
    borderWidth: 1.5,
    borderColor: COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  primaryText: { color: COLORS.ink, fontSize: 15, fontWeight: '900' },
  dismiss: {
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: COLORS.paper,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  dismissText: { color: COLORS.muted, fontSize: 14, fontWeight: '800' },
});
