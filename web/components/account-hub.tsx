'use client';
import { useCallback, useEffect, useState } from 'react';
import type { useCommunity } from '../../src/hooks/useCommunity';
import { communityError, communityRpc } from '../../src/lib/community';
import type { Guide } from '../../src/types';
import { communityClient } from '../lib/community-client';
import { CommunityAccess } from './community-access';

type AccountRecipe = {
  id: string;
  product_id: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  moderation_note: string;
};

export function AccountHub({
  community,
  guides,
  savedGuides,
  savedRecipes,
  syncStatus,
  onOpenGuide,
  onOpenRecipe,
}: {
  community: ReturnType<typeof useCommunity>;
  guides: Guide[];
  savedGuides: Guide[];
  savedRecipes: {
    key: string;
    productId: string;
    recipeId: string;
    title: string;
  }[];
  syncStatus: 'local' | 'syncing' | 'synced' | 'error';
  onOpenGuide: (id: string) => void;
  onOpenRecipe: (productId: string, recipeId: string) => void;
}) {
  const [recipes, setRecipes] = useState<AccountRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const userId = community.session?.user.id;
  const refresh = useCallback(async () => {
    if (!userId || !communityClient) {
      setRecipes([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setRecipes(
        await communityRpc<AccountRecipe[]>(
          communityClient,
          'community_my_recipes',
        ),
      );
    } catch (issue) {
      setError(communityError(issue));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const task = Promise.resolve().then(() => refresh());
    task.catch(() => undefined);
  }, [refresh]);

  async function withdraw(recipe: AccountRecipe) {
    if (!communityClient) return;
    setRemoving(recipe.id);
    setError('');
    try {
      const paths = await communityRpc<string[]>(
        communityClient,
        'recipe_withdraw',
        { p_recipe: recipe.id },
      );
      if (paths.length) {
        const result = await communityClient.storage
          .from('recipe-photos')
          .remove(paths);
        if (result.error)
          setError('Recipe removed. Photo cleanup needs a retry.');
      }
      await refresh();
    } catch (issue) {
      setError(communityError(issue));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="page-shell account-page">
      <section className="saved-intro">
        <p>YOUR INSTEAD</p>
        <h1>My account.</h1>
        <span>Keep saved guides in sync and manage the recipes you share.</span>
      </section>
      <CommunityAccess community={community} purpose="account" />
      <section className="account-section">
        <h2>Saved guides</h2>
        <p>
          {userId
            ? syncStatus === 'syncing'
              ? 'Syncing your saved guides…'
              : syncStatus === 'error'
              ? 'Cloud sync is unavailable. Your browser copy is still available.'
              : 'Your saved guides sync across signed-in devices. Browser-local saves remain available offline.'
            : 'Saved guides stay in this browser. Sign in to sync them across devices.'}
        </p>
        {savedGuides.length ? (
          <div className="guide-list">
            {savedGuides.map((guide, index) => (
              <button
                className="guide-card"
                type="button"
                key={guide.id}
                onClick={() => onOpenGuide(guide.id)}
              >
                <span className="guide-number">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="guide-copy">
                  <small>{guide.category.toUpperCase()}</small>
                  <strong>{guide.title}</strong>
                  <span>{guide.prompt}</span>
                </span>
                <span aria-hidden="true" className="guide-arrow">
                  →
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p>No saved guides yet.</p>
        )}
        {!!savedRecipes.length && (
          <div className="saved-recipes">
            <h3>Saved recipes</h3>
            {savedRecipes.map(recipe => (
              <button
                type="button"
                className="account-recipe account-saved-recipe"
                key={recipe.key}
                onClick={() => onOpenRecipe(recipe.productId, recipe.recipeId)}
              >
                <h4>{recipe.title}</h4>
                <p>
                  {guides.find(guide => guide.id === recipe.productId)?.title ??
                    recipe.productId}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
      {userId && (
        <section className="account-section">
          <h2>My recipe submissions</h2>
          <p>Check review status or remove a recipe you submitted.</p>
          {loading && <p role="status">Loading your recipes…</p>}
          {!loading && recipes.length === 0 && (
            <p>You have no submissions yet.</p>
          )}
          {recipes.map(recipe => (
            <article className="account-recipe" key={recipe.id}>
              <small>
                {recipe.status === 'pending'
                  ? 'AWAITING REVIEW'
                  : recipe.status === 'approved'
                  ? 'PUBLISHED'
                  : 'NOT PUBLISHED'}
              </small>
              <h3>{recipe.title}</h3>
              <p>
                {guides.find(guide => guide.id === recipe.product_id)?.title ??
                  recipe.product_id}
              </p>
              {recipe.moderation_note && <p>{recipe.moderation_note}</p>}
              <button
                type="button"
                disabled={removing === recipe.id}
                onClick={() => {
                  if (
                    window.confirm(
                      'Remove this recipe from the public list? You can submit it again later.',
                    )
                  )
                    withdraw(recipe);
                }}
              >
                {removing === recipe.id ? 'Removing…' : 'Remove my recipe'}
              </button>
            </article>
          ))}
          <button type="button" disabled={loading} onClick={() => refresh()}>
            {loading ? 'Refreshing…' : 'Refresh submissions'}
          </button>
        </section>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
