import { useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS } from '../styles';

export function RecipePhotoGallery({
  photos,
  title,
}: {
  photos: Array<string | ImageSourcePropType>;
  title: string;
}) {
  const [selected, setSelected] = useState<string | ImageSourcePropType | null>(
    null,
  );
  if (!photos.length) return null;

  const imageSource = (photo: string | ImageSourcePropType) =>
    typeof photo === 'string' ? { uri: photo } : photo;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={local.gallery}
        accessibilityLabel={`${title} photos`}
      >
        {photos.map((uri, index) => (
          <Pressable
            key={`${typeof uri === 'string' ? uri : 'bundled'}-${index}`}
            accessibilityRole="button"
            accessibilityLabel={`Expand ${title} photo ${index + 1}`}
            onPress={() => setSelected(uri)}
            style={({ pressed }) => [
              local.thumbButton,
              pressed && local.pressed,
            ]}
          >
            <Image
              source={imageSource(uri)}
              style={local.thumbnail}
              accessibilityLabel={`${title}, photo ${index + 1}`}
            />
          </Pressable>
        ))}
      </ScrollView>
      <Modal
        visible={selected !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
        statusBarTranslucent
      >
        <View style={local.viewer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close enlarged photo"
            onPress={() => setSelected(null)}
            style={({ pressed }) => [
              local.closeButton,
              pressed && local.pressed,
            ]}
          >
            <Text style={local.closeText}>Close</Text>
          </Pressable>
          {selected ? (
            <Image
              source={imageSource(selected)}
              style={local.fullImage}
              resizeMode="contain"
              accessibilityLabel={`${title}, enlarged photo`}
            />
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const local = StyleSheet.create({
  gallery: { gap: 10, paddingVertical: 12 },
  thumbButton: {
    width: 92,
    height: 92,
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card,
  },
  thumbnail: { width: '100%', height: '100%' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.97 }] },
  viewer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(14, 29, 25, 0.96)',
  },
  fullImage: { width: '100%', height: '82%' },
  closeButton: {
    position: 'absolute',
    top: 54,
    right: 20,
    zIndex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: COLORS.card,
  },
  closeText: { color: COLORS.ink, fontSize: 15, fontWeight: '800' },
});
