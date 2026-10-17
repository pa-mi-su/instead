import { CommunityAccountControls } from './CommunityAccountControls';
import { communityRules } from '../disclaimer';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Linking, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedPressable as Pressable } from './AnimatedPressable';
import { useCommunity } from '../hooks/useCommunity';
import { COMMENT_LIMIT, reportReasons } from '../lib/community';
import { supabase } from '../lib/supabase';
import { COLORS, styles } from '../styles';

export function ProductComments({
  productId,
  recipeId,
  renderRecipes,
}: {
  productId: string;
  recipeId?: string;
  renderRecipes?: (community: ReturnType<typeof useCommunity>) => ReactNode;
}) {
  const [sort, setSort] = useState<'helpful' | 'newest'>('helpful');
  const c = useCommunity(supabase, productId, recipeId, sort);
  const emailInput = useRef<TextInput>(null);
  const codeInput = useRef<TextInput>(null);
  const [focusedField, setFocusedField] = useState<'email' | 'code' | null>(
    null,
  );
  const [reportId, setReportId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const button = (
    label: string,
    action: () => unknown,
    disabled = c.busy,
    selected?: boolean,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={action}
      style={({ pressed }) => [
        styles.chip,
        disabled && commentStyles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={styles.optionList}>
      {!recipeId && renderRecipes?.(c)}
      <Text style={styles.optionDetail}>{communityRules}</Text>
      {!c.configured && <Text>Community comments are not configured yet.</Text>}
      {!!c.error && <Text accessibilityRole="alert">{c.error}</Text>}
      {!!c.notice && <Text accessibilityLiveRegion="polite">{c.notice}</Text>}
      {!!c.error && button('Retry loading', c.retry)}
      {c.configured && c.authReady && !c.session && (
        <View style={styles.optionCard}>
          <Text style={styles.optionName}>Sign in to comment or vote</Text>
          <Text style={styles.optionDetail}>
            No password needed. Your email stays private. Your comments and
            approved recipes are public. No profile is required. By continuing,
            you agree to our Terms and Privacy Policy.
          </Text>
          {button(
            'Terms',
            () =>
              Linking.openURL('https://insteadtry.com/terms').catch(
                () => undefined,
              ),
            false,
          )}
          {button(
            'Privacy Policy',
            () =>
              Linking.openURL('https://insteadtry.com/privacy').catch(
                () => undefined,
              ),
            false,
          )}
          {!c.sentEmail ? (
            <>
              <Text style={commentStyles.fieldLabel}>Email address</Text>
              <TextInput
                ref={emailInput}
                accessibilityLabel="Email address"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                maxLength={254}
                value={c.email}
                onChangeText={c.setEmail}
                autoCorrect={false}
                placeholderTextColor={COLORS.muted}
                selectionColor={COLORS.orange}
                returnKeyType="send"
                editable={!c.busy}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                onSubmitEditing={() => {
                  if (c.email.trim() && !c.busy) c.sendCode();
                }}
                style={[
                  commentStyles.authInput,
                  focusedField === 'email' && commentStyles.authInputFocused,
                ]}
              />
              <Text style={commentStyles.fieldHelp}>
                Type your email in the box above, then request a code.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send sign-in code"
                disabled={c.busy || !c.email.trim()}
                accessibilityState={{ disabled: c.busy || !c.email.trim() }}
                onPress={c.sendCode}
                style={({ pressed }) => [
                  commentStyles.authAction,
                  (c.busy || !c.email.trim()) &&
                    commentStyles.authActionDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={commentStyles.authActionText}>
                  {c.busy ? 'Sending…' : 'Send sign-in code'}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text>Enter the code sent to {c.sentEmail}.</Text>
              <Text style={commentStyles.fieldLabel}>Sign-in code</Text>
              <TextInput
                ref={codeInput}
                autoFocus
                accessibilityLabel="Email code"
                placeholder="8-digit code"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={10}
                value={c.code}
                onChangeText={value => c.setCode(value.replace(/\D/g, ''))}
                placeholderTextColor={COLORS.muted}
                selectionColor={COLORS.orange}
                returnKeyType="done"
                editable={!c.busy}
                onFocus={() => setFocusedField('code')}
                onBlur={() => setFocusedField(null)}
                onSubmitEditing={() => {
                  if (c.code.trim() && !c.busy) c.verifyCode();
                }}
                style={[
                  commentStyles.authInput,
                  focusedField === 'code' && commentStyles.authInputFocused,
                ]}
              />
              <Text style={commentStyles.fieldHelp}>
                Type the code from your email in the box above.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Verify code"
                disabled={c.busy || !c.code.trim()}
                accessibilityState={{ disabled: c.busy || !c.code.trim() }}
                onPress={c.verifyCode}
                style={({ pressed }) => [
                  commentStyles.authAction,
                  (c.busy || !c.code.trim()) &&
                    commentStyles.authActionDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={commentStyles.authActionText}>
                  {c.busy ? 'Verifying…' : 'Verify code'}
                </Text>
              </Pressable>
              {button(
                c.resendSeconds
                  ? `Resend in ${c.resendSeconds}s`
                  : 'Resend code',
                c.sendCode,
                c.busy || c.resendSeconds > 0,
              )}
              {button('Use a different email', c.changeEmail)}
            </>
          )}
        </View>
      )}
      {!!c.session && (
        <View style={styles.optionCard}>
          <Text>Signed in · Your email is private.</Text>
          {button('Sign out', c.signOut)}
          <CommunityAccountControls community={c} />
          {!c.canContribute && (
            <Text>
              A verified, active account and current community agreement are
              required to contribute.
            </Text>
          )}
          {c.canContribute && recipeId && (
            <>
              <TextInput
                accessibilityLabel="Your comment or ingredient swap"
                multiline
                maxLength={COMMENT_LIMIT}
                placeholder="I use this ingredient instead of…"
                value={c.draft}
                onChangeText={c.setDraft}
                style={[styles.searchInput, commentStyles.input]}
              />
              <Text>
                {c.draft.length}/{COMMENT_LIMIT}
              </Text>
              {button('Post comment', c.post, c.busy || !c.draft.trim())}
            </>
          )}
        </View>
      )}
      {!!recipeId && (
        <>
          <Text style={styles.optionName}>Recipe comments</Text>
          {button(
            'Most helpful',
            () => setSort('helpful'),
            false,
            sort === 'helpful',
          )}
          {button('Newest', () => setSort('newest'), false, sort === 'newest')}
          {button(
            'Refresh comments',
            c.retry,
            !c.configured || c.busy || c.loading,
          )}
          {c.loading && <Text>Loading comments…</Text>}
          {c.loaded && !c.comments.length && (
            <Text>No comments yet. Share the first suggestion.</Text>
          )}
          {c.comments.map(comment => (
            <View key={comment.id} style={styles.optionCard}>
              <Text style={styles.optionLabel}>
                Community member ·{' '}
                {comment.moderation_status === 'pending'
                  ? 'AWAITING REVIEW · ONLY YOU'
                  : comment.moderation_status === 'rejected'
                  ? 'NOT PUBLISHED · ONLY YOU'
                  : 'MODERATED · NOT VERIFIED SAFE'}
                {comment.mine ? ' · YOU' : ''}
              </Text>
              <Text style={styles.optionDetail}>{comment.body}</Text>
              {comment.mine ? (
                <Text style={styles.optionDetail}>
                  {comment.votes} {comment.votes === 1 ? 'vote' : 'votes'} ·
                  Your comment
                </Text>
              ) : (
                button(
                  `${comment.upvoted ? '▲ Upvoted' : '△ Upvote'} · ${
                    comment.votes
                  }`,
                  () => c.vote(comment),
                  c.busy || !c.canContribute,
                  comment.upvoted,
                )
              )}
              {c.canManage &&
                comment.moderation_status === 'approved' &&
                button(
                  comment.reported ? 'Reported' : 'Report',
                  () =>
                    setReportId(reportId === comment.id ? null : comment.id),
                  c.busy || comment.reported,
                )}
              {reportId === comment.id && !comment.reported && (
                <View>
                  {reportReasons.map(reason => (
                    <View key={reason}>
                      {button(reason, () => c.report(comment, reason))}
                    </View>
                  ))}
                  {button('Cancel report', () => setReportId(null))}
                </View>
              )}
              {!comment.mine &&
                c.canManage &&
                button('Block contributor', () =>
                  c.block('comment', comment.id),
                )}
              {comment.mine &&
                button('Delete my comment', () => setDeleteId(comment.id))}
              {deleteId === comment.id && (
                <View>
                  <Text>Delete this comment and its votes?</Text>
                  {button('Confirm delete', () => c.remove(comment))}
                  {button('Cancel', () => setDeleteId(null))}
                </View>
              )}
            </View>
          ))}
          {c.hasMore && button('Load more comments', c.loadMore)}
        </>
      )}
    </View>
  );
}
const commentStyles = StyleSheet.create({
  authInput: {
    width: '100%',
    minHeight: 54,
    borderWidth: 2,
    borderColor: COLORS.ink,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    color: COLORS.ink,
  },
  authInputFocused: { borderColor: COLORS.orange },
  fieldLabel: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 8,
  },
  fieldHelp: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 12,
  },
  authAction: {
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: COLORS.orange,
    borderWidth: 1.5,
    borderColor: COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
  authActionDisabled: { backgroundColor: '#C5C1B7' },
  authActionText: { color: COLORS.ink, fontWeight: '800', fontSize: 15 },
  input: { minHeight: 100 },
  disabled: { opacity: 0.5 },
});
