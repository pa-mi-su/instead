import { Text, View } from 'react-native';
import { accountStyles as a } from './AccountSection';
import { AnimatedPressable as Pressable } from './AnimatedPressable';
import { useRecipeVisibility } from '../hooks/useRecipeVisibility';

export function BlockRecipeButton({
  productId,
  recipeId,
  signedIn,
  title,
  authorUsername,
  communityRecipe = false,
}: {
  productId: string;
  recipeId: string;
  signedIn: boolean;
  title: string;
  authorUsername?: string;
  communityRecipe?: boolean;
}) {
  const visibility = useRecipeVisibility();
  if (!signedIn || !visibility) return null;
  return (
    <View style={a.content}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Permanently block ${
          communityRecipe ? 'contributor' : 'recipe'
        } for ${title}`}
        disabled={visibility.busy}
        style={a.button}
        onPress={() =>
          visibility.blockRecipe(productId, recipeId, authorUsername)
        }
      >
        <Text style={a.buttonText}>
          {communityRecipe ? 'Block contributor' : 'Block recipe'}
        </Text>
      </Pressable>
      {!!visibility.error && (
        <Text accessibilityRole="alert">{visibility.error}</Text>
      )}
    </View>
  );
}
