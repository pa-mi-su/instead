import { ProductComments } from './ProductComments';
import { ProductRecipes } from './ProductRecipes';
export function ProductCommunity({ productId }: { productId: string }) {
  return (
    <ProductComments
      productId={productId}
      renderRecipes={c => (
        <ProductRecipes
          key={`${productId}:${c.session?.user.id ?? 'guest'}:${c.blocks
            .map(b => b.id)
            .join(',')}`}
          productId={productId}
          userId={c.session?.user.id}
          canContribute={c.canContribute}
          canManage={c.canManage}
          onBlock={id => c.block('recipe', id)}
        />
      )}
    />
  );
}
