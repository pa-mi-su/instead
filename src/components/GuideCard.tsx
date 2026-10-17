import { ArrowRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { COLORS, styles } from '../styles';
import type { Guide } from '../types';

export function GuideCard({
  guide,
  index,
  onPress,
}: {
  guide: Guide;
  index: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.guideCard, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Open guide: ${guide.title}. ${guide.prompt}`}
    >
      <View style={styles.cardNumberWrap}>
        <Text style={styles.cardNumber}>{String(index).padStart(2, '0')}</Text>
      </View>
      <View style={styles.cardMain}>
        <Text style={styles.cardCategory}>{guide.category.toUpperCase()}</Text>
        <Text style={styles.cardTitle}>{guide.title}</Text>
        <Text style={styles.cardPrompt}>{guide.prompt}</Text>
      </View>
      <View style={styles.cardArrow}>
        <ArrowRight size={21} color={COLORS.ink} />
      </View>
    </Pressable>
  );
}
