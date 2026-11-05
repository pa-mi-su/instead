import { Text, View } from 'react-native';
import { AccountSection, accountStyles as a } from './AccountSection';
import { AnimatedPressable as Pressable } from './AnimatedPressable';
import { useRecipeVisibility } from '../hooks/useRecipeVisibility';

export function HiddenRecipes() {
  const visibility = useRecipeVisibility();
  if (!visibility) return null;
  return (
    <AccountSection
      title="Hidden recipes"
      count={visibility.rows.length}
      collapsible
      summary="Recipes you reported or blocked are hidden only from your account. Reviewing a report does not show it again."
    >
      {visibility.loading && (
        <Text style={a.body}>Loading hidden recipes…</Text>
      )}
      {!!visibility.error && (
        <Text accessibilityRole="alert">{visibility.error}</Text>
      )}
      {!visibility.loading && !visibility.rows.length && (
        <Text style={a.body}>You have no hidden recipes.</Text>
      )}
      {visibility.rows.map(row => (
        <View key={`${row.product_id}:${row.recipe_id}`} style={a.entry}>
          <Text style={a.entryTitle}>{row.title}</Text>
          <Text style={a.metadata}>
            {row.reason === 'reported'
              ? 'Hidden after your report'
              : 'Blocked for your account'}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={visibility.busy}
            style={a.button}
            onPress={() =>
              visibility.setHidden(row.product_id, row.recipe_id, false)
            }
          >
            <Text style={a.buttonText}>Show recipe again</Text>
          </Pressable>
        </View>
      ))}
    </AccountSection>
  );
}
export function BlockRecipeButton({
  productId,
  recipeId,
  signedIn,
  title,
}: {
  productId: string;
  recipeId: string;
  signedIn: boolean;
  title: string;
}) {
  const visibility = useRecipeVisibility();
  if (!signedIn || !visibility) return null;
  return (
    <View style={a.content}>
      <Pressable
        accessibilityRole="button"
        disabled={visibility.busy}
        style={a.button}
        onPress={() => visibility.setHidden(productId, recipeId, true, title)}
      >
        <Text style={a.buttonText}>Block recipe</Text>
      </Pressable>
      {!!visibility.error && (
        <Text accessibilityRole="alert">{visibility.error}</Text>
      )}
    </View>
  );
}
