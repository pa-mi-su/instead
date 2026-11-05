import { RecipeConcernHistory } from '../components/RecipeConcernHistory';
import {
  AccountSection,
  accountStyles as a,
} from '../components/AccountSection';
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
        a.page,
        { paddingBottom: Math.max(bottomInset + 30, 46) },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
    >
      <View style={[styles.savedHero, a.hero]}>
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
              key={`${userId}:blocks`}
              community={community}
              section="blocks"
            />
            <RecipeConcernHistory
              key={`${userId}:concerns`}
              reports={reports}
              guides={guides}
            />
          </>
        )}
      <View style={styles.optionList}>
        {userId &&
          !community.deletionInProgress &&
          !community.finishingSignup &&
          !community.accountLoading && (
            <>
              <AccountSection
                title="My recipe submissions"
                summary="Track review status or remove a recipe you submitted."
              >
                {loading && <Text>Loading your recipes…</Text>}
                {!loading && recipes.length === 0 && (
                  <Text style={styles.optionDetail}>
                    You have no submissions yet.
                  </Text>
                )}
                {recipes.map(recipe => (
                  <View key={recipe.id} style={a.entry}>
                    <Text style={styles.optionLabel}>
                      {recipe.status === 'pending'
                        ? 'AWAITING REVIEW'
                        : recipe.status === 'approved'
                        ? 'PUBLISHED'
                        : 'NOT PUBLISHED'}
                    </Text>
                    <Text style={a.entryTitle}>{recipe.title}</Text>
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
                        a.button,
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
                  style={({ pressed }) => [a.button, pressed && styles.pressed]}
                >
                  <Text style={a.buttonText}>Refresh submissions</Text>
                </Pressable>
              </AccountSection>
            </>
          )}
        {!!error && !community.deletionInProgress && (
          <Text accessibilityRole="alert">{error}</Text>
        )}
      </View>
      {!!userId &&
        !community.deletionInProgress &&
        !community.finishingSignup &&
        !community.accountLoading && (
          <CommunityAccountManagement
            key={`${userId}:deletion`}
            community={community}
            section="deletion"
          />
        )}
    </ScrollView>
  );
}
