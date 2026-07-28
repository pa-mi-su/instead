import { ArrowLeft, Bookmark, CircleMinus, X } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { DetailSection, GuideFact } from '../components/DetailSection';
import { COLORS, styles } from '../styles';
import type { Guide } from '../types';

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
  const toneLabel =
    guide.answerTone === 'yes'
      ? 'YES, YOU CAN USE LESS'
      : guide.answerTone === 'no'
      ? 'DON’T SKIP THIS'
      : 'IT DEPENDS';

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
            <Text style={styles.answerLabel}>{toneLabel}</Text>
            <Text style={styles.answerIcon}>{guide.icon}</Text>
          </View>
          <Text style={styles.answerText}>{guide.answer}</Text>
          <Text style={styles.answerSummary}>{guide.summary}</Text>
        </View>

        <DetailSection number="01" title="BEFORE YOU START">
          <View style={styles.factGrid}>
            <GuideFact label="TIME" value={guide.time} />
            <GuideFact label="COST" value={guide.estimatedCost} />
            <GuideFact
              label="POSSIBLE SAVINGS"
              value={guide.estimatedSavings}
            />
            <GuideFact label="DIFFICULTY" value={guide.difficulty} />
          </View>
          <Text style={styles.supplyHeading}>WHAT YOU MAY NEED</Text>
          <Text style={styles.supplyText}>{guide.supplies.join(' · ')}</Text>
        </DetailSection>

        <DetailSection number="02" title="WHAT ACTUALLY MATTERS">
          <View style={styles.stepList}>
            {guide.essentials.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </DetailSection>

        <DetailSection number="03" title="CAN I SKIP IT?">
          <View style={styles.skipCard}>
            <CircleMinus size={24} color={COLORS.ink} />
            <Text style={styles.skipText}>{guide.skipNote}</Text>
          </View>
        </DetailSection>

        <DetailSection number="04" title="WHAT TO RECONSIDER">
          <View style={styles.avoidList}>
            {guide.avoid.map(item => (
              <View key={item.name} style={styles.avoidRow}>
                <View style={styles.avoidMark}>
                  <X size={16} color={COLORS.card} />
                </View>
                <View style={styles.avoidCopy}>
                  <Text style={styles.avoidName}>{item.name}</Text>
                  <Text style={styles.avoidReason}>{item.reason}</Text>
                </View>
              </View>
            ))}
          </View>
        </DetailSection>

        <DetailSection number="05" title="DO THIS INSTEAD">
          <View style={styles.optionList}>
            {guide.options.map(option => (
              <View key={option.name} style={styles.optionCard}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionName}>{option.name}</Text>
                <Text style={styles.optionDetail}>{option.detail}</Text>
              </View>
            ))}
          </View>
        </DetailSection>

        <DetailSection number="06" title="SAFETY BOUNDARY">
          <View style={styles.safetyCard}>
            <Text style={styles.safetyLabel}>USE CAUTION</Text>
            <Text style={styles.safetyText}>{guide.safetyNote}</Text>
            <Text style={styles.proHeading}>GET PROFESSIONAL HELP WHEN</Text>
            {guide.professionalHelp.map(item => (
              <View key={item} style={styles.proRow}>
                <Text style={styles.proBullet}>•</Text>
                <Text style={styles.proText}>{item}</Text>
              </View>
            ))}
          </View>
        </DetailSection>

        <View style={styles.evidenceCard}>
          <View style={styles.evidenceHeader}>
            <View>
              <Text style={styles.evidenceEyebrow}>EVIDENCE CHECK</Text>
              <Text style={styles.evidenceStrength}>{guide.evidence}</Text>
            </View>
            <View style={styles.evidenceBars}>
              {[0, 1, 2].map(bar => {
                const active =
                  guide.evidence === 'Strong' ||
                  (guide.evidence === 'Moderate' && bar < 2) ||
                  (guide.evidence === 'Limited' && bar < 1);
                return (
                  <View
                    key={bar}
                    style={[
                      styles.evidenceBar,
                      active && styles.evidenceBarActive,
                    ]}
                  />
                );
              })}
            </View>
          </View>
          <Text style={styles.evidenceNote}>{guide.evidenceNote}</Text>
          <Text style={styles.updated}>
            REVIEWED {guide.updatedAt.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.disclaimer}>
          Educational information only. Use qualified professional help when a
          task is hazardous, regulated, destructive, or beyond your experience.
        </Text>
      </ScrollView>
    </View>
  );
}
