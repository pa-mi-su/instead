import { ArrowLeft, Bookmark } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';
import { useRef } from 'react';
import { AnimatedPressable as Pressable } from '../components/AnimatedPressable';
import { BrandLogo } from '../components/BrandLogo';
import { ProductCommunity } from '../components/ProductCommunity';
import { DetailSection } from '../components/DetailSection';
import { COLORS, styles } from '../styles';
import type { Guide } from '../types';
import { ExpandableSafety } from '../components/ExpandableSafety';
import { RecipeVoteButtons } from '../components/RecipeVoteButtons';

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
              {guide.recipes.map(recipe => (
                <View key={recipe.name} style={styles.optionCard}>
                  <Text style={styles.optionName}>{recipe.name}</Text>
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
                    onSignIn={requestSignIn}
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
