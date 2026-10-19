import { ProductCommunityAccess } from './ProductCommunityAccess';
import { ProductRecipes } from './ProductRecipes';
import type { useCommunity } from '../hooks/useCommunity';
export function ProductCommunity({
  productId,
  community,
  onSignInRequest,
}: {
  productId: string;
  community: ReturnType<typeof useCommunity>;
  onSignInRequest: () => void;
}) {
  return (
    <ProductCommunityAccess
      community={community}
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
