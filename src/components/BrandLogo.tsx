import { Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { styles } from '../styles';

export function BrandLogo() {
  return (
    <View style={styles.brandLogo}>
      <Svg style={styles.brandMark} viewBox="0 0 1024 1024">
        <Rect x="0" y="0" width="1024" height="1024" rx="180" fill="#FFD95B" />
        <Circle cx="512" cy="512" r="352" fill="#FFFDF7" />
        <Circle cx="512" cy="512" r="302" fill="#183B32" />
        <Path
          d="M499 722c-4-173 26-307 108-418"
          fill="none"
          stroke="#FFFDF7"
          strokeWidth="35"
          strokeLinecap="round"
        />
        <Path
          d="M491 570c-138-10-221-105-218-239 139 6 238 88 218 239Z"
          fill="#E6F66A"
        />
        <Path
          d="M545 458c16-125 101-207 225-211-4 128-83 216-225 211Z"
          fill="#FF7043"
        />
        <Path
          d="M319 344c65 48 115 105 156 176M735 294c-76 48-130 103-184 170"
          fill="none"
          stroke="#183B32"
          strokeWidth="17"
          strokeLinecap="round"
        />
        <Circle cx="734" cy="696" r="25" fill="#FF7043" />
      </Svg>
      <Text style={styles.wordmark}>INSTEAD</Text>
    </View>
  );
}
