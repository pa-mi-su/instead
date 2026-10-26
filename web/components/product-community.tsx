"use client";

import { useCommunity } from "../../src/hooks/useCommunity";
import { communityClient } from "../lib/community-client";
import { CommunityAccess } from "./community-access";
import { ProductRecipes } from "./product-recipes";

export function ProductCommunity({ productId }: { productId: string }) {
  const community = useCommunity(
    communityClient,
    productId,
    undefined,
    "helpful",
    false,
  );

  return (
    <>
      <CommunityAccess community={community} purpose="community" />
      <ProductRecipes
        key={`${productId}:${community.session?.user.id ?? "guest"}:${community.blocks.map((block) => block.id).join(",")}`}
        productId={productId}
        userId={community.session?.user.id}
        canContribute={community.canContribute}
        canManage={community.canManage}
        onBlock={(id) => community.block("recipe", id)}
      />
    </>
  );
}
