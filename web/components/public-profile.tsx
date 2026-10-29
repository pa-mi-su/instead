'use client';

import Link from 'next/link';
import { useCommunityRevision } from '../../src/lib/communityUpdates';
import { useEffect, useState } from 'react';
import { communityClient } from '../lib/community-client';
import type { PublicProfile as Profile } from '../../src/lib/recipes';

export function PublicProfile({ username }: { username: string }) {
  const revision = useCommunityRevision();
  const key = `${username}:${revision}`;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadedUsername, setLoadedUsername] = useState('');
  const loading = Boolean(communityClient) && loadedUsername !== key;

  useEffect(() => {
    let active = true;
    if (!communityClient) return;
    Promise.resolve(
      communityClient.rpc('community_profile_public', { p_username: username }),
    )
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && Array.isArray(data) && data[0]) {
          const row = data[0] as Profile;
          setProfile(row);
        } else setProfile(null);
        setLoadedUsername(key);
      })
      .catch(() => {
        if (active) {
          setProfile(null);
          setLoadedUsername(key);
        }
      });
    return () => {
      active = false;
    };
  }, [username, key]);

  return (
    <main className="page-shell profile-page">
      <header className="site-header">
        <Link className="saved-button" href="/">← INSTEAD</Link>
      </header>
      {loading ? <p role="status">Loading profile…</p> : !profile ? (
        <p role="status">This profile is unavailable.</p>
      ) : (
        <>
          <section className="saved-intro">
            <p>COMMUNITY PROFILE</p>
            {profile.avatar_path && communityClient && <span className="public-profile-avatar" role="img" aria-label={`Avatar for ${profile.username}`} style={{ backgroundImage: `url("${communityClient.storage.from('profile-avatars').getPublicUrl(profile.avatar_path).data.publicUrl}")` }} />}
            <h1>@{profile.username}</h1>
            {profile.bio && <span>{profile.bio}</span>}
          </section>
          <section className="account-section">
            <h2>Published recipes</h2>
            {profile.recipes.length ? profile.recipes.map(recipe => (
              <article className="account-recipe" key={recipe.id}>
                <h3>{recipe.title}</h3>
                <p>{recipe.product_id}</p>
              </article>
            )) : <p>No published recipes yet.</p>}
          </section>
        </>
      )}
    </main>
  );
}
