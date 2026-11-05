import { useState } from 'react';
import { Alert, ActivityIndicator, Text, View } from 'react-native';
import { AnimatedPressable as Pressable } from './AnimatedPressable';
import { AccountSection, accountStyles as a } from './AccountSection';
import type {
  RecipeConcern,
  useRecipeConcerns,
} from '../hooks/useRecipeConcerns';
import type { Guide } from '../types';

// Legacy repeated reports share one personal-history entry per actual recipe ID.
export function groupRecipeConcerns(rows: RecipeConcern[]) {
  const grouped = new Map<string, RecipeConcern>();
  for (const row of rows) {
    const key = JSON.stringify([row.product_id, row.recipe_id]);
    const previous = grouped.get(key);
    if (!previous) grouped.set(key, { ...row });
    else
      grouped.set(key, {
        ...previous,
        reviewed_at:
          previous.reviewed_at && row.reviewed_at ? previous.reviewed_at : null,
        hidden_at:
          previous.hidden_at && row.hidden_at ? previous.hidden_at : null,
      });
  }
  return [...grouped.values()];
}
export function RecipeConcernHistory({
  reports,
  guides,
}: {
  reports: ReturnType<typeof useRecipeConcerns>;
  guides: Guide[];
}) {
  const [showCleared, setShowCleared] = useState(false);
  const [limit, setLimit] = useState(10);
  const grouped = groupRecipeConcerns(reports.concerns);
  const current = grouped.filter(row => !row.hidden_at);
  const cleared = grouped.filter(row => row.hidden_at);
  const reviewed = current.filter(row => row.reviewed_at);
  const visible = showCleared ? cleared : current;
  const button = (
    label: string,
    action: () => unknown,
    disabled = reports.saving,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={action}
      style={[a.button, disabled && a.disabled]}
    >
      <Text style={a.buttonText}>{label}</Text>
    </Pressable>
  );
  function clear(rows: RecipeConcern[], onlyReviewed = false) {
    Alert.alert(
      onlyReviewed ? 'Clear reviewed concerns?' : 'Clear this concern?',
      'Remove from your personal history? Your report stays submitted, and you cannot report the same recipe again. You can restore it from Cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear from history',
          onPress: () => {
            reports
              .setHidden(
                rows.map(row => row.recipe_id),
                true,
                onlyReviewed,
              )
              .catch(() => undefined);
          },
        },
      ],
    );
  }
  return (
    <AccountSection
      title="Recipe concerns"
      summary="Your private report history. Clearing an entry does not cancel its report."
      count={!reports.loading && !reports.error ? visible.length : undefined}
      collapsible
    >
      <Text style={a.metadata}>
        {showCleared ? 'Cleared history' : 'Current history'}
      </Text>
      <View style={a.actions}>
        {button(
          showCleared ? 'Show current' : `Show cleared (${cleared.length})`,
          () => {
            setLimit(10);
            setShowCleared(!showCleared);
          },
        )}
        {button('Refresh', reports.refresh, reports.loading || reports.saving)}
        {!showCleared &&
          reviewed.length > 0 &&
          button('Clear reviewed', () => clear(reviewed, true))}
      </View>
      {(reports.loading || reports.saving) && (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={
            reports.saving ? 'Updating concern history' : 'Loading concerns'
          }
        >
          <ActivityIndicator />
        </View>
      )}
      {!!reports.error && (
        <Text accessibilityRole="alert" style={[a.body, a.dangerText]}>
          {reports.error}
        </Text>
      )}
      {!reports.loading && !reports.error && !visible.length && (
        <Text style={a.body}>
          {showCleared
            ? 'No cleared concerns.'
            : 'No concerns in your history.'}
        </Text>
      )}
      {visible.slice(0, limit).map(row => (
        <View
          key={JSON.stringify([row.product_id, row.recipe_id])}
          style={a.entry}
        >
          <Text style={a.entryTitle}>{row.title}</Text>
          <Text style={a.badge}>
            {row.reviewed_at ? 'Reviewed' : 'Awaiting review'}
          </Text>
          <Text style={a.metadata}>
            {row.reason} ·{' '}
            {guides.find(guide => guide.id === row.product_id)?.title ??
              row.product_id}
          </Text>
          <View style={a.actions}>
            {showCleared
              ? button('Restore to history', () =>
                  reports.setHidden([row.recipe_id], false),
                )
              : button('Clear from history', () => clear([row]))}
          </View>
        </View>
      ))}
      {visible.length > limit && (
        <View style={a.content}>
          <Text style={a.metadata}>
            Showing {limit} of {visible.length} concerns
          </Text>
          {button('Show more concerns', () =>
            setLimit(currentLimit => currentLimit + 10),
          )}
        </View>
      )}
    </AccountSection>
  );
}
