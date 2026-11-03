import { ArrowRight, Bookmark } from 'lucide-react-native';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { AnimatedPressable as Pressable } from '../components/AnimatedPressable';
import { GuideCard } from '../components/GuideCard';
import { COLORS, styles } from '../styles';
import type { Guide } from '../types';
import { useScrollRestoration } from '../hooks/useScrollRestoration';
import type { SavedRecipeReference } from '../lib/savedRecipes';

export function SavedScreen({
  signedIn,
  authReady,
  syncStatus,
  onRetry,
  onSignIn,
  onRegister,
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
  signedIn: boolean;
  authReady: boolean;
  syncStatus: 'local' | 'syncing' | 'synced' | 'error';
  onRetry: () => void;
  onSignIn: () => void;
  onRegister: () => void;
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
          Save guides and recipes to your account and find them here across your
          devices.
        </Text>
      </View>

      {!authReady ? (
        <ActivityIndicator accessibilityLabel="Checking sign-in" />
      ) : !signedIn ? (
        <View style={styles.savedEmpty}>
          <Text style={styles.emptyTitle}>
            Sign in to save guides and recipes.
          </Text>
          <Text style={styles.emptyBody}>
            Saving is available to registered users. Create an account or sign
            in to see your saved guides and recipes.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRegister}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Create account</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onSignIn}
            style={styles.actionButton}
          >
            <Text style={styles.actionButtonText}>Sign in</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {syncStatus === 'syncing' && (
            <ActivityIndicator accessibilityLabel="Syncing saved items" />
          )}
          {syncStatus === 'error' && (
            <View>
              <Text accessibilityRole="alert">
                Could not sync your saved items. Please retry.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={onRetry}
                style={styles.actionButton}
              >
                <Text style={styles.actionButtonText}>Retry saved items</Text>
              </Pressable>
            </View>
          )}
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
          ) : savedRecipes.length === 0 && syncStatus === 'synced' ? (
            <View style={styles.savedEmpty}>
              <View style={styles.savedEmptyIcon}>
                <Bookmark size={30} color={COLORS.ink} />
              </View>
              <Text style={styles.emptyTitle}>
                {savedRecipes.length
                  ? 'No saved guides.'
                  : 'Nothing saved yet.'}
              </Text>
              <Text style={styles.emptyBody}>
                Use Save guide on a topic page or Save on an individual recipe
                to find it here.
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
                const guide = catalog.find(
                  item => item.id === recipe.productId,
                );
                return (
                  <Pressable
                    key={recipe.key}
                    onPress={() =>
                      onOpenRecipe(recipe.productId, recipe.recipeId)
                    }
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
        </>
      )}
    </ScrollView>
  );
}
