import { ArrowLeft, Bookmark } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ProductComments } from '../components/ProductComments';
import { DetailSection } from '../components/DetailSection';
import { COLORS, styles } from '../styles';
import type { Guide } from '../types';
import { universalSafetyNotices } from '../safetyNotices';

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
  return (
    <View style={styles.detailShell}>
      <View style={styles.detailTopBar}>
        <Pressable
          onPress={onBack}
          style={styles.iconButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to guides"
        >
          <ArrowLeft size={22} color={COLORS.ink} />
        </Pressable>
        <Text style={styles.detailWordmark}>INSTEAD</Text>
        <Pressable
          onPress={onSave}
          style={[styles.iconButton, isSaved && styles.iconButtonSaved]}
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
        contentContainerStyle={[
          styles.detailContent,
          { paddingBottom: Math.max(bottomInset + 34, 50) },
        ]}
        showsVerticalScrollIndicator={false}
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

        <View style={styles.safetyCard}>
          <Text style={styles.safetyLabel}>UNIVERSAL SAFETY</Text>
          {universalSafetyNotices.map(notice => (
            <View key={notice.title} style={styles.safetyNotice}>
              <Text style={styles.optionName}>{notice.title}</Text>
              <Text style={styles.safetyText}>{notice.body}</Text>
            </View>
          ))}
        </View>

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
                </View>
              ))}
            </View>
          </DetailSection>
        ) : null}

        <DetailSection
          number={guide.recipes?.length ? '02' : '01'}
          title="BEFORE YOU TRY ANYTHING"
        >
          <View style={styles.safetyCard}>
            <Text style={styles.safetyLabel}>USE AT YOUR OWN RISK</Text>
            <Text style={styles.safetyText}>{guide.safetyNote}</Text>
            <Text style={styles.evidenceNote}>{guide.evidenceNote}</Text>
          </View>
        </DetailSection>

        <DetailSection
          number={guide.recipes?.length ? '03' : '02'}
          title="COMMUNITY SUGGESTIONS"
        >
          <ProductComments key={guide.id} productId={guide.id} />
        </DetailSection>
        <Text style={styles.disclaimer}>
          Educational information only. Use qualified professional help when a
          task is hazardous, regulated, destructive, or beyond your experience.
        </Text>
      </ScrollView>
    </View>
  );
}
