import { Text, View } from 'react-native';
import { styles } from '../styles';

export function BrandLogo() {
  return (
    <View style={styles.brandLogo}>
      <View style={styles.brandMark}>
        <View style={styles.brandStem} />
        <View style={styles.brandLeafLeft} />
        <View style={styles.brandLeafRight} />
      </View>
      <Text style={styles.wordmark}>INSTEAD</Text>
    </View>
  );
}
