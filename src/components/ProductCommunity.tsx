import { ProductCommunityAccess } from './ProductCommunityAccess';
import { RecipeContent } from './ProductRecipes';
import type { useRecipes } from '../hooks/useRecipes';
import type { useCommunity } from '../hooks/useCommunity';
export function ProductCommunity({
  recipeController,
  productId,
  community,
  onSignInRequest,
  onOpenProfile,
  savedRecipeIds,
  onSaveRecipe,
}: {
  recipeController: ReturnType<typeof useRecipes>;
  productId: string;
  community: ReturnType<typeof useCommunity>;
  onSignInRequest: () => void;
  onOpenProfile: (username: string) => void;
  savedRecipeIds: string[];
  onSaveRecipe: (recipeId: string, title: string) => void;
}) {
  return (
    <ProductCommunityAccess
      community={community}
      onSignInRequest={onSignInRequest}
      renderRecipes={(c, signIn) => (
        <RecipeContent
          controller={recipeController}
          mode="submissions"
          key={`${productId}:${c.session?.user.id ?? 'guest'}:${c.blocks
            .map(b => b.id)
            .join(',')}`}
          productId={productId}
          userId={c.session?.user.id}
          canContribute={c.canContribute}
          canManage={c.canManage}
          onBlock={id => c.block('recipe', id)}
          onSignInRequest={signIn}
          onOpenProfile={onOpenProfile}
          savedRecipeIds={savedRecipeIds}
          onSaveRecipe={onSaveRecipe}
        />
      )}
    />
  );
}
