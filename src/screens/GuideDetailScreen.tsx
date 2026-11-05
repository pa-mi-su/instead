import { useRecipeVisibility } from '../hooks/useRecipeVisibility';
import { BlockRecipeButton } from '../components/HiddenRecipes';
import { useRecipeConcerns } from '../hooks/useRecipeConcerns';
import {
  getCommunityRevision,
  notifyCommunityChanged,
  useCommunityRevision,
} from '../lib/communityUpdates';
import { ArrowLeft, Bookmark } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';
import { useScrollDestination } from '../hooks/useScrollDestination';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatedPressable as Pressable } from '../components/AnimatedPressable';
import { BrandLogo } from '../components/BrandLogo';
import { useRecipes } from '../hooks/useRecipes';
import { RecipeContent } from '../components/ProductRecipes';
import { ProductCommunity } from '../components/ProductCommunity';
import { DetailSection } from '../components/DetailSection';
import { COLORS, styles } from '../styles';
import type { Guide } from '../types';
import { ExpandableSafety } from '../components/ExpandableSafety';
import { ReportRecipeButton } from '../components/ReportRecipeButton';
import { RecipeVoteButtons } from '../components/RecipeVoteButtons';
import { RecipePhotoGallery } from '../components/RecipePhotoGallery';
import { useCommunity } from '../hooks/useCommunity';
import { supabase } from '../lib/supabase';
import { rankRecipes } from '../lib/recipeRanking';
import { applyRecipeVote } from '../lib/recipeRating';
import { savedRecipeKey } from '../lib/savedRecipes';

type RecipeRating = {
  score: number;
  upvotes: number;
  downvotes: number;
  my_vote: number;
};

const emptyRating: RecipeRating = {
  score: 0,
  upvotes: 0,
  downvotes: 0,
  my_vote: 0,
};
const noRecipes: NonNullable<Guide['recipes']> = [];

function RecipeSaveButton({
  saved,
  onPress,
  title,
}: {
  saved: boolean;
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.recipeSaveButton,
        saved && styles.recipeSaveButtonActive,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${saved ? 'Remove saved' : 'Save'} recipe ${title}`}
      accessibilityState={{ selected: saved }}
      hitSlop={8}
    >
      <Bookmark
        size={17}
        color={COLORS.ink}
        fill={saved ? COLORS.ink : 'transparent'}
      />
      <Text style={styles.recipeSaveText}>{saved ? 'SAVED' : 'SAVE'}</Text>
    </Pressable>
  );
}

export function GuideDetailScreen({
  guide,
  initialRecipeId,
  isSaved,
  savedRecipeIds,
  onBack,
  onSave,
  onSaveRecipe,
  onOpenProfile,
  bottomInset,
}: {
  guide: Guide;
  initialRecipeId?: string;
  isSaved: boolean;
  savedRecipeIds: string[];
  onBack: () => void;
  onSave: () => void;
  onSaveRecipe: (recipeId: string, title: string) => void;
  onOpenProfile: (username: string) => void;
  bottomInset: number;
}) {
  const visibility = useRecipeVisibility();
  const targetHidden = Boolean(
    initialRecipeId && visibility?.isHidden(guide.id, initialRecipeId),
  );
  const ratingScope = useRef(0);
  const communityY = useRef(0);
  const [recipeRatings, setRecipeRatings] = useState<
    Record<string, RecipeRating>
  >({});
  const [rankingRatings, setRankingRatings] = useState<
    Record<string, RecipeRating>
  >({});
  const [ratingsError, setRatingsError] = useState(false);
  const [ratingsReady, setRatingsReady] = useState(false);
  const recipes = guide.recipes ?? noRecipes;
  const revision = useCommunityRevision();
  const community = useCommunity(
    supabase,
    guide.id,
    undefined,
    'helpful',
    false,
  );

  const reports = useRecipeConcerns(supabase, community.session?.user.id);
  const published = useRecipes(supabase, guide.id, community.session?.user.id);
  useEffect(() => {
    const scope = ratingScope;
    scope.current++;
    setRecipeRatings({});
    setRankingRatings({});
    return () => {
      scope.current++;
    };
  }, [guide.id, community.session?.user.id]);
  useEffect(() => {
    let active = true;
    setRatingsError(false);
    setRatingsReady(false);
    const client = supabase;
    if (!client) {
      setRatingsError(true);
      setRatingsReady(true);
      return;
    }
    Promise.all(
      recipes.map(async recipe => {
        const { data, error } = await client.rpc('builtin_recipe_rating', {
          p_recipe: recipe.id,
          p_product: guide.id,
        });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        return [
          recipe.id,
          row
            ? {
                score: Number(row.score) || 0,
                upvotes: Number(row.upvotes) || 0,
                downvotes: Number(row.downvotes) || 0,
                my_vote: Number(row.my_vote) || 0,
              }
            : emptyRating,
        ] as const;
      }),
    )
      .then(entries => {
        if (active) {
          const ratings = Object.fromEntries(entries);
          setRecipeRatings(ratings);
          setRankingRatings(ratings);
          setRatingsReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setRecipeRatings({});
          setRatingsError(true);
          setRatingsReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [guide.id, recipes, community.session?.user.id, revision]);
  const rankedRecipes = useMemo(
    () => rankRecipes(recipes, rankingRatings),
    [recipes, rankingRatings],
  );
  const catalogueTarget = recipes.some(recipe => recipe.id === initialRecipeId);
  const destination = useScrollDestination(
    initialRecipeId,
    catalogueTarget ? ratingsReady : published.ready,
  );
  const { scrollRef } = destination;
  const requestedPages = useRef(new Set<number>());
  useEffect(() => {
    // A saved community recipe may live beyond the first published page.
    if (
      !initialRecipeId ||
      catalogueTarget ||
      targetHidden ||
      initialRecipeId.startsWith('builtin:') ||
      initialRecipeId.startsWith('admin:') ||
      !published.ready ||
      !published.more ||
      published.busy ||
      published.error ||
      published.recipes.some(recipe => recipe.id === initialRecipeId)
    )
      return;
    const offset = published.recipes.length;
    if (requestedPages.current.has(offset)) return;
    requestedPages.current.add(offset);
    published.loadMore();
  }, [initialRecipeId, catalogueTarget, published, targetHidden]);
  async function voteRecipe(recipeId: string, value: -1 | 1) {
    const client = supabase;
    if (!client) throw new Error('Voting is unavailable right now.');
    const startedAt = getCommunityRevision();
    const scope = ratingScope.current;
    const current = recipeRatings[recipeId] ?? emptyRating;
    const nextVote = current.my_vote === value ? 0 : value;
    const { error } = await client.rpc('builtin_recipe_vote', {
      p_recipe: recipeId,
      p_product: guide.id,
      p_value: nextVote,
    });
    if (error) throw error;
    if (startedAt !== getCommunityRevision() || scope !== ratingScope.current)
      return;
    // Patch the confirmed vote only. Re-ranking/refetching here moves cards
    // under the user's finger and remounts controls during a single tap.
    setRecipeRatings(previous => ({
      ...previous,
      [recipeId]: applyRecipeVote(current, value),
    }));
  }
  const verified = Boolean(
    community.session?.user.email_confirmed_at &&
      !community.session.user.is_anonymous,
  );
  const requestSignIn = () =>
    scrollRef.current?.scrollTo({ y: communityY.current, animated: true });
  return (
    <View style={styles.detailShell}>
      {targetHidden && (
        <Text style={styles.optionDetail}>
          This recipe is hidden from your account. You can restore it in My
          INSTEAD.
        </Text>
      )}
      <View style={styles.detailTopBar}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to guides"
        >
          <ArrowLeft size={22} color={COLORS.ink} />
        </Pressable>
        <View style={styles.detailWordmarkWrap}>
          <BrandLogo />
        </View>
        <View style={styles.detailHeaderSpacer} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.detailContent,
          { paddingBottom: Math.max(bottomInset + 34, 50) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        onContentSizeChange={destination.onLayout}
        onScrollBeginDrag={destination.cancel}
        onTouchStart={destination.cancel}
      >
        <View
          ref={destination.contentRef}
          collapsable={false}
          onLayout={destination.onLayout}
        >
          <View style={styles.detailHero}>
            <Text style={styles.detailCategory}>
              {guide.category.toUpperCase()}
            </Text>
            <Text style={styles.detailTitle}>{guide.title}</Text>
            <Text style={styles.detailPrompt}>{guide.prompt}</Text>
            <Pressable
              onPress={onSave}
              accessibilityRole="button"
              accessibilityLabel={
                isSaved ? 'Remove saved guide' : 'Save this guide'
              }
              accessibilityState={{ selected: isSaved }}
              style={({ pressed }) => [
                styles.actionButton,
                styles.guideSaveButton,
                isSaved && styles.iconButtonSaved,
                pressed && styles.pressed,
              ]}
            >
              <Bookmark
                size={20}
                color={COLORS.ink}
                fill={isSaved ? COLORS.ink : 'transparent'}
              />
              <Text style={styles.actionButtonText}>
                {isSaved ? 'Guide saved' : 'Save guide'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.answerCard}>
            <View style={styles.answerTopRow}>
              <Text style={styles.answerLabel}>NATURAL ALTERNATIVES</Text>
              <Text style={styles.answerIcon}>{guide.icon}</Text>
            </View>
            <Text style={styles.answerText}>{guide.answer}</Text>
          </View>

          <ExpandableSafety key={guide.id} guide={guide} />
          {guide.recipes?.length ||
          published.recipes.length ||
          !published.ready ? (
            <DetailSection number="01" title="RECIPES">
              <View style={styles.optionList}>
                {rankedRecipes.map(recipe => (
                  <View
                    key={recipe.id}
                    style={styles.optionCard}
                    ref={
                      recipe.id === initialRecipeId
                        ? destination.targetRef
                        : undefined
                    }
                    collapsable={false}
                    onLayout={destination.onLayout}
                  >
                    <View style={styles.recipeCardHeader}>
                      <Text style={[styles.optionName, styles.recipeCardTitle]}>
                        {recipe.name}
                      </Text>
                      <RecipeSaveButton
                        saved={savedRecipeIds.includes(
                          savedRecipeKey(guide.id, recipe.id),
                        )}
                        onPress={() => onSaveRecipe(recipe.id, recipe.name)}
                        title={recipe.name}
                      />
                    </View>
                    {recipe.photos?.length ? (
                      <RecipePhotoGallery
                        photos={recipe.photos}
                        title={recipe.name}
                      />
                    ) : null}
                    <Text style={[styles.optionLabel, styles.recipeHeading]}>
                      INGREDIENTS
                    </Text>
                    {recipe.ingredients.map(item => (
                      <Text key={item} style={styles.optionDetail}>
                        • {item}
                      </Text>
                    ))}
                    <Text style={[styles.optionLabel, styles.recipeHeading]}>
                      EQUIPMENT
                    </Text>
                    {recipe.equipment.map(item => (
                      <Text key={item} style={styles.optionDetail}>
                        • {item}
                      </Text>
                    ))}
                    <Text style={[styles.optionLabel, styles.recipeHeading]}>
                      INSTRUCTIONS
                    </Text>
                    {recipe.instructions.map((step, index) => (
                      <Text key={step} style={styles.optionDetail}>
                        {index + 1}. {step}
                      </Text>
                    ))}
                    <Text style={[styles.optionLabel, styles.recipeHeading]}>
                      STORAGE
                    </Text>
                    <Text style={styles.optionDetail}>{recipe.storage}</Text>
                    <Text style={[styles.optionLabel, styles.recipeHeading]}>
                      CAUTIONS
                    </Text>
                    <Text style={styles.optionDetail}>{recipe.cautions}</Text>
                    <ReportRecipeButton
                      key={community.session?.user.id ?? 'guest'}
                      productId={guide.id}
                      recipeId={recipe.id}
                      title={recipe.name}
                      signedIn={verified}
                      reported={reports.concerns.some(
                        item =>
                          item.product_id === guide.id &&
                          item.recipe_id === recipe.id,
                      )}
                      onSignIn={requestSignIn}
                    />
                    <BlockRecipeButton
                      productId={guide.id}
                      recipeId={recipe.id}
                      signedIn={verified}
                      title={recipe.name}
                    />
                    {recipeRatings[recipe.id] ? (
                      <RecipeVoteButtons
                        productId={guide.id}
                        recipeId={recipe.id}
                        title={recipe.name}
                        signedIn={verified}
                        canVote={community.canContribute}
                        onSignIn={requestSignIn}
                        onVote={value => voteRecipe(recipe.id, value)}
                        rating={recipeRatings[recipe.id] ?? emptyRating}
                      />
                    ) : (
                      <View style={styles.optionList}>
                        <Text
                          style={styles.optionDetail}
                          accessibilityRole={ratingsError ? 'alert' : undefined}
                        >
                          {ratingsError
                            ? 'Could not refresh votes. Check your connection and try again.'
                            : 'Refreshing votes…'}
                        </Text>
                        {ratingsError && (
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => notifyCommunityChanged()}
                            style={styles.actionButton}
                          >
                            <Text style={styles.actionButtonText}>
                              Retry votes
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>
                ))}
                <RecipeContent
                  targetRecipeId={initialRecipeId}
                  targetRef={destination.targetRef}
                  onRecipeLayout={destination.onLayout}
                  controller={published}
                  concerns={reports.concerns}
                  mode="published"
                  productId={guide.id}
                  userId={community.session?.user.id}
                  canContribute={community.canContribute}
                  canManage={community.canManage}
                  onBlock={id => community.block('recipe', id)}
                  onSignInRequest={requestSignIn}
                  onOpenProfile={onOpenProfile}
                  savedRecipeIds={savedRecipeIds}
                  onSaveRecipe={onSaveRecipe}
                />
              </View>
            </DetailSection>
          ) : null}

          <DetailSection
            onLayout={event => {
              communityY.current = event.nativeEvent.layout.y;
            }}
            number={
              recipes.length || published.recipes.length || !published.ready
                ? '02'
                : '01'
            }
            title="SUBMIT A RECIPE"
          >
            <ProductCommunity
              key={guide.id}
              recipeController={published}
              productId={guide.id}
              community={community}
              onSignInRequest={requestSignIn}
              onOpenProfile={onOpenProfile}
              savedRecipeIds={savedRecipeIds}
              onSaveRecipe={onSaveRecipe}
            />
          </DetailSection>
          <Text style={styles.disclaimer}>
            Educational information only. Use qualified professional help when a
            task is hazardous, regulated, destructive, or beyond your
            experience.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
