import { ProductCommunityAccess } from './ProductCommunityAccess';
import { ProductRecipes } from './ProductRecipes';
export function ProductCommunity({
  productId,
  onSignInRequest,
}: {
  productId: string;
  onSignInRequest: () => void;
}) {
  return (
    <ProductCommunityAccess
      productId={productId}
      onSignInRequest={onSignInRequest}
      renderRecipes={(c, signIn) => (
        <ProductRecipes
          key={`${productId}:${c.session?.user.id ?? 'guest'}:${c.blocks
            .map(b => b.id)
            .join(',')}`}
          productId={productId}
          userId={c.session?.user.id}
          canContribute={c.canContribute}
          canManage={c.canManage}
          onBlock={id => c.block('recipe', id)}
          onSignInRequest={signIn}
        />
      )}
    />
  );
}
