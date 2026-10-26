import { ArrowRight, Bookmark } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';
import { AnimatedPressable as Pressable } from '../components/AnimatedPressable';
import { GuideCard } from '../components/GuideCard';
import { COLORS, styles } from '../styles';
import type { Guide } from '../types';
import { useScrollRestoration } from '../hooks/useScrollRestoration';
import type { SavedRecipeReference } from '../lib/savedRecipes';

export function SavedScreen({
  guides,
  catalog,
  savedRecipes,
  onOpen,
  onOpenRecipe,
  onExplore,
  bottomInset,
  scrollOffset,
  onScrollOffsetChange,
}: {
  guides: Guide[];
  catalog: Guide[];
  savedRecipes: (SavedRecipeReference & { key: string; title: string })[];
  onOpen: (id: string) => void;
  onOpenRecipe: (productId: string, recipeId: string) => void;
  onExplore: () => void;
  bottomInset: number;
  scrollOffset: number;
  onScrollOffsetChange: (offset: number) => void;
}) {
  const scroll = useScrollRestoration(scrollOffset, onScrollOffsetChange);
  return (
    <ScrollView
      ref={scroll.scrollRef}
      onLayout={scroll.onLayout}
      onContentSizeChange={scroll.onContentSizeChange}
      onScroll={scroll.onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: Math.max(bottomInset + 30, 46) },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
    >
      <View style={styles.savedHero}>
        <Text style={styles.pageEyebrow}>YOUR SHORTLIST</Text>
        <Text style={styles.pageTitle}>Saved for later.</Text>
        <Text style={styles.pageBody}>
          Save an individual recipe or a recipe-free guide. Signed-in saves sync
          across your devices.
        </Text>
      </View>

      {guides.length ? (
        <View style={styles.guideList}>
          {guides.map((guide, index) => (
            <GuideCard
              key={guide.id}
              guide={guide}
              index={index + 1}
              onPress={() => onOpen(guide.id)}
            />
          ))}
        </View>
      ) : savedRecipes.length === 0 ? (
        <View style={styles.savedEmpty}>
          <View style={styles.savedEmptyIcon}>
            <Bookmark size={30} color={COLORS.ink} />
          </View>
          <Text style={styles.emptyTitle}>
            {savedRecipes.length ? 'No saved guides.' : 'Nothing saved yet.'}
          </Text>
          <Text style={styles.emptyBody}>
            Save an individual recipe or a guide without recipes to find it
            quickly.
          </Text>
          <Pressable
            onPress={onExplore}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Explore guides"
          >
            <Text style={styles.primaryButtonText}>EXPLORE GUIDES</Text>
            <ArrowRight size={18} color={COLORS.ink} />
          </Pressable>
        </View>
      ) : null}
      {savedRecipes.length ? (
        <View style={styles.guideList}>
          <Text style={styles.pageEyebrow}>SAVED RECIPES</Text>
          {savedRecipes.map((recipe, index) => {
            const guide = catalog.find(item => item.id === recipe.productId);
            return (
              <Pressable
                key={recipe.key}
                onPress={() => onOpenRecipe(recipe.productId, recipe.recipeId)}
                style={({ pressed }) => [
                  styles.optionCard,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Open saved recipe ${recipe.title}`}
              >
                <Text style={styles.optionLabel}>{`RECIPE ${String(
                  index + 1,
                ).padStart(2, '0')}`}</Text>
                <Text style={styles.optionName}>{recipe.title}</Text>
                <Text style={styles.optionDetail}>
                  {guide?.title ?? recipe.productId}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}
