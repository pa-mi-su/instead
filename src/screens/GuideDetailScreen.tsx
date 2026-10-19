import { ArrowLeft, Bookmark } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatedPressable as Pressable } from '../components/AnimatedPressable';
import { BrandLogo } from '../components/BrandLogo';
import { ProductCommunity } from '../components/ProductCommunity';
import { DetailSection } from '../components/DetailSection';
import { COLORS, styles } from '../styles';
import type { Guide } from '../types';
import { ExpandableSafety } from '../components/ExpandableSafety';
import { RecipeVoteButtons } from '../components/RecipeVoteButtons';
import { RecipePhotoGallery } from '../components/RecipePhotoGallery';
import { useCommunity } from '../hooks/useCommunity';
import { supabase } from '../lib/supabase';
import { rankRecipes } from '../lib/recipeRanking';

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

export function GuideDetailScreen({
  guide,
  isSaved,
  onBack,
  onSave,
  bottomInset,
}: {
  guide: Guide;
  isSaved: boolean;
  onBack: () => void;
  onSave: () => void;
  bottomInset: number;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const communityY = useRef(0);
  const [recipeRatings, setRecipeRatings] = useState<
    Record<string, RecipeRating>
  >({});
  const recipes = guide.recipes ?? noRecipes;
  useEffect(() => {
    let active = true;
    setRecipeRatings({});
    const client = supabase;
    if (!client) return;
    Promise.all(
      recipes.map(async recipe => {
        const { data, error } = await client.rpc('builtin_recipe_rating', {
          p_recipe: recipe.id,
          p_product: guide.id,
        });
        if (error) return [recipe.id, emptyRating] as const;
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
    ).then(entries => {
      if (active) setRecipeRatings(Object.fromEntries(entries));
    });
    return () => {
      active = false;
    };
  }, [guide.id, recipes]);
  const rankedRecipes = useMemo(
    () => rankRecipes(recipes, recipeRatings),
    [recipes, recipeRatings],
  );
  async function voteRecipe(recipeId: string, value: -1 | 1) {
    const client = supabase;
    if (!client) throw new Error('Voting is unavailable right now.');
    const current = recipeRatings[recipeId] ?? emptyRating;
    const nextVote = current.my_vote === value ? 0 : value;
    const { error } = await client.rpc('builtin_recipe_vote', {
      p_recipe: recipeId,
      p_product: guide.id,
      p_value: nextVote,
    });
    if (error) throw error;
    const upvotes =
      current.upvotes -
      (current.my_vote === 1 ? 1 : 0) +
      (nextVote === 1 ? 1 : 0);
    const downvotes =
      current.downvotes -
      (current.my_vote === -1 ? 1 : 0) +
      (nextVote === -1 ? 1 : 0);
    setRecipeRatings(previous => ({
      ...previous,
      [recipeId]: {
        upvotes,
        downvotes,
        score: upvotes - downvotes,
        my_vote: nextVote,
      },
    }));
  }
  const community = useCommunity(
    supabase,
    guide.id,
    undefined,
    'helpful',
    false,
  );
  const verified = Boolean(
    community.session?.user.email_confirmed_at &&
      !community.session.user.is_anonymous,
  );
  const requestSignIn = () =>
    scrollRef.current?.scrollTo({ y: communityY.current, animated: true });
  return (
    <View style={styles.detailShell}>
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
        <Pressable
          onPress={onSave}
          style={({ pressed }) => [
            styles.iconButton,
            isSaved && styles.iconButtonSaved,
            pressed && styles.pressed,
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={
            isSaved ? 'Remove from saved guides' : 'Save this guide'
          }
          accessibilityState={{ selected: isSaved }}
        >
          <Bookmark
            size={21}
            color={COLORS.ink}
            fill={isSaved ? COLORS.ink : 'transparent'}
          />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.detailContent,
          { paddingBottom: Math.max(bottomInset + 34, 50) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        <View style={styles.detailHero}>
          <Text style={styles.detailCategory}>
            {guide.category.toUpperCase()}
          </Text>
          <Text style={styles.detailTitle}>{guide.title}</Text>
          <Text style={styles.detailPrompt}>{guide.prompt}</Text>
        </View>

        <View style={styles.answerCard}>
          <View style={styles.answerTopRow}>
            <Text style={styles.answerLabel}>NATURAL ALTERNATIVES</Text>
            <Text style={styles.answerIcon}>{guide.icon}</Text>
          </View>
          <Text style={styles.answerText}>{guide.answer}</Text>
        </View>

        <ExpandableSafety key={guide.id} guide={guide} />
        {guide.recipes?.length ? (
          <DetailSection number="01" title="RECIPES">
            <View style={styles.optionList}>
              {rankedRecipes.map(recipe => (
                <View key={recipe.name} style={styles.optionCard}>
                  <Text style={styles.optionName}>{recipe.name}</Text>
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
                </View>
              ))}
            </View>
          </DetailSection>
        ) : null}

        <DetailSection
          onLayout={event => {
            communityY.current = event.nativeEvent.layout.y;
          }}
          number={guide.recipes?.length ? '02' : '01'}
          title="COMMUNITY RECIPES & ACCOUNT"
        >
          <ProductCommunity
            key={guide.id}
            productId={guide.id}
            community={community}
            onSignInRequest={requestSignIn}
          />
        </DetailSection>
        <Text style={styles.disclaimer}>
          Educational information only. Use qualified professional help when a
          task is hazardous, regulated, destructive, or beyond your experience.
        </Text>
      </ScrollView>
    </View>
  );
}
