import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { AnimatedPressable as Pressable } from '../components/AnimatedPressable';
import { ProductCommunityAccess } from '../components/ProductCommunityAccess';
import { GuideCard } from '../components/GuideCard';
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
  savedGuideIds,
  syncStatus,
  onOpenGuide,
  bottomInset,
}: {
  community: ReturnType<typeof useCommunity>;
  guides: Guide[];
  savedGuideIds: string[];
  syncStatus: 'local' | 'syncing' | 'synced' | 'error';
  onOpenGuide: (id: string) => void;
  bottomInset: number;
}) {
  const [recipes, setRecipes] = useState<AccountRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const userId = community.session?.user.id;
  const refresh = useCallback(async () => {
    if (!userId || !supabase) {
      setRecipes([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const rows = await communityRpc<AccountRecipe[]>(
        supabase,
        'community_my_recipes',
      );
      setRecipes(rows);
    } catch (issue) {
      setError(communityError(issue));
    } finally {
      setLoading(false);
    }
  }, [userId]);
  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);
  const savedGuides = guides.filter(guide => savedGuideIds.includes(guide.id));
  async function withdraw(recipe: AccountRecipe) {
    if (!supabase) return;
    setRemoving(recipe.id);
    setError('');
    try {
      const paths = await communityRpc<string[]>(supabase, 'recipe_withdraw', {
        p_recipe: recipe.id,
      });
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
          Keep your saved guides in sync and manage the recipes you share. Your
          email stays private.
        </Text>
      </View>
      <ProductCommunityAccess
        community={community}
        purpose="account"
        onSignInRequest={() => undefined}
      />
      <View style={styles.optionList}>
        <Text style={styles.optionName}>Saved guides</Text>
        <Text style={styles.optionDetail}>
          {userId
            ? syncStatus === 'syncing'
              ? 'Syncing your saved guides…'
              : syncStatus === 'error'
              ? 'Cloud sync is unavailable. Your device copy is still available.'
              : 'Saved guides sync across your signed-in devices. Device-local saves remain available offline.'
            : 'Saved guides are available on this device. Sign in to sync them across devices.'}
        </Text>
        {savedGuides.length ? (
          <View style={styles.guideList}>
            {savedGuides.map((guide, index) => (
              <GuideCard
                key={guide.id}
                guide={guide}
                index={index + 1}
                onPress={() => onOpenGuide(guide.id)}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.optionDetail}>No saved guides yet.</Text>
        )}
        {userId && (
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
                    styles.chip,
                    removing === recipe.id && { opacity: 0.5 },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.chipText}>
                    {removing === recipe.id ? 'Removing…' : 'Remove my recipe'}
                  </Text>
                </Pressable>
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={() => refresh()}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
            >
              <Text style={styles.chipText}>Refresh submissions</Text>
            </Pressable>
          </>
        )}
        {!!error && <Text accessibilityRole="alert">{error}</Text>}
      </View>
    </ScrollView>
  );
}
