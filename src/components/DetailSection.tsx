import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { styles } from '../styles';

export function GuideFact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.factCard}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

export function DetailSection({
  number,
  title,
  children,
  onLayout,
}: {
  number: string;
  title: string;
  children: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  return (
    <View style={styles.detailSection} onLayout={onLayout}>
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionNumber}>{number}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
