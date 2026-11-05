import { CommunityAccountManagement } from '../components/CommunityAccountControls';
import { useRecipeConcerns } from '../hooks/useRecipeConcerns';
import {
  notifyCommunityChanged,
  useCommunityRevision,
} from '../lib/communityUpdates';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { AnimatedPressable as Pressable } from '../components/AnimatedPressable';
import { ProductCommunityAccess } from '../components/ProductCommunityAccess';
import { communityError, communityRpc } from '../lib/community';
import type { useCommunity } from '../hooks/useCommunity';
import { supabase } from '../lib/supabase';
import { styles } from '../styles';
import type { Guide } from '../types';

type AccountRecipe = {
  id: string;
  product_id: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  moderation_note: string;
};

export function AccountScreen({
  community,
  guides,
  bottomInset,
}: {
  community: ReturnType<typeof useCommunity>;
  guides: Guide[];
  bottomInset: number;
}) {
  const [recipes, setRecipes] = useState<AccountRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const userId = community.session?.user.id;
  const revision = useCommunityRevision();
  const reports = useRecipeConcerns(supabase, userId);
  const requestVersion = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    setError('');
    if (!userId || !supabase || community.deletionInProgress) {
      setRecipes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const rows = await communityRpc<AccountRecipe[]>(
        supabase,
        'community_my_recipes',
      );
      if (version === requestVersion.current) setRecipes(rows);
    } catch (issue) {
      if (version === requestVersion.current) setError(communityError(issue));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [userId, community.deletionInProgress]);
  useEffect(() => {
    const pending = requestVersion;
    setRecipes([]);
    refresh().catch(() => undefined);
    return () => {
      pending.current++;
    };
  }, [refresh, revision]);
  async function withdraw(recipe: AccountRecipe) {
    if (!supabase) return;
    setRemoving(recipe.id);
    setError('');
    try {
      const paths = await communityRpc<string[]>(supabase, 'recipe_withdraw', {
        p_recipe: recipe.id,
      });
      notifyCommunityChanged();
      if (paths.length) {
        const removed = await supabase.storage
          .from('recipe-photos')
          .remove(paths);
        if (removed.error)
          setError('Recipe removed. Photo cleanup needs a retry.');
      }
      await refresh();
    } catch (issue) {
      setError(communityError(issue));
    } finally {
      setRemoving(null);
    }
  }
  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: Math.max(bottomInset + 30, 46) },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
    >
      <View style={styles.savedHero}>
        <Text style={styles.pageEyebrow}>YOUR INSTEAD</Text>
        <Text style={styles.pageTitle}>My account.</Text>
        <Text style={styles.pageBody}>
          Manage your profile and the recipes you share.
        </Text>
      </View>
      <ProductCommunityAccess
        community={community}
        purpose="account"
        onSignInRequest={() => undefined}
      />
      {!!userId &&
        !community.deletionInProgress &&
        !community.finishingSignup &&
        !community.accountLoading && (
          <>
            <CommunityAccountManagement
              community={community}
              section="blocks"
            />
            <View style={styles.optionCard}>
              <Text accessibilityRole="header" style={styles.optionName}>
                Submitted recipe concerns
              </Text>
              <Text style={styles.optionDetail}>
                Your reports are private. Reporting requests a review; blocking
                a contributor hides their recipes from your account.
              </Text>
              {reports.loading && <Text>Loading your concerns…</Text>}
              {!!reports.error && (
                <Text accessibilityRole="alert">
                  Could not load your concerns. Try refreshing below.
                </Text>
              )}
              {!reports.loading &&
                !reports.error &&
                !reports.concerns.length && (
                  <Text style={styles.optionDetail}>
                    You haven’t submitted any recipe concerns.
                  </Text>
                )}
              {reports.concerns.map(report => (
                <View key={report.id} style={styles.optionList}>
                  <Text style={styles.optionName}>{report.title}</Text>
                  <Text style={styles.optionDetail}>
                    {report.reviewed_at ? 'Reviewed' : 'Submitted for review'} ·{' '}
                    {report.reason}
                  </Text>
                  <Text style={styles.optionDetail}>
                    {guides.find(guide => guide.id === report.product_id)
                      ?.title ?? report.product_id}
                  </Text>
                </View>
              ))}
              <Pressable
                accessibilityRole="button"
                disabled={reports.loading}
                onPress={reports.refresh}
                style={styles.actionButton}
              >
                <Text style={styles.actionButtonText}>Refresh concerns</Text>
              </Pressable>
            </View>
            <CommunityAccountManagement
              community={community}
              section="deletion"
            />
          </>
        )}
      <View style={styles.optionList}>
        {userId &&
          !community.deletionInProgress &&
          !community.finishingSignup &&
          !community.accountLoading && (
            <>
              <Text style={styles.optionName}>My recipe submissions</Text>
              <Text style={styles.optionDetail}>
                Track review status or remove a recipe you submitted.
              </Text>
              {loading && <Text>Loading your recipes…</Text>}
              {!loading && recipes.length === 0 && (
                <Text style={styles.optionDetail}>
                  You have no submissions yet.
                </Text>
              )}
              {recipes.map(recipe => (
                <View key={recipe.id} style={styles.optionCard}>
                  <Text style={styles.optionLabel}>
                    {recipe.status === 'pending'
                      ? 'AWAITING REVIEW'
                      : recipe.status === 'approved'
                      ? 'PUBLISHED'
                      : 'NOT PUBLISHED'}
                  </Text>
                  <Text style={styles.optionName}>{recipe.title}</Text>
                  <Text style={styles.optionDetail}>
                    {guides.find(guide => guide.id === recipe.product_id)
                      ?.title ?? recipe.product_id}
                  </Text>
                  {!!recipe.moderation_note && (
                    <Text style={styles.optionDetail}>
                      {recipe.moderation_note}
                    </Text>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    disabled={removing === recipe.id}
                    onPress={() =>
                      Alert.alert(
                        'Remove this recipe?',
                        'It will disappear from the public recipe list. You can submit it again later.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Remove recipe',
                            style: 'destructive',
                            onPress: () => withdraw(recipe),
                          },
                        ],
                      )
                    }
                    style={({ pressed }) => [
                      styles.actionButton,
                      removing === recipe.id && { opacity: 0.5 },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.actionButtonText}>
                      {removing === recipe.id
                        ? 'Removing…'
                        : 'Remove my recipe'}
                    </Text>
                  </Pressable>
                </View>
              ))}
              <Pressable
                accessibilityRole="button"
                disabled={loading}
                onPress={() => refresh()}
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.actionButtonText}>Refresh submissions</Text>
              </Pressable>
            </>
          )}
        {!!error && !community.deletionInProgress && (
          <Text accessibilityRole="alert">{error}</Text>
        )}
      </View>
    </ScrollView>
  );
}
