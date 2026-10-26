import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { AnimatedPressable as Pressable } from '../components/AnimatedPressable';
import { communityError, communityRpc } from '../lib/community';
import type { PublicProfile } from '../lib/recipes';
import { supabase } from '../lib/supabase';
import { styles } from '../styles';
import type { Guide } from '../types';

export function ProfileScreen({
  username,
  guides,
  onBack,
  bottomInset,
}: {
  username: string;
  guides: Guide[];
  onBack: () => void;
  bottomInset: number;
}) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    communityRpc<PublicProfile[]>(supabase, 'community_profile_public', {
      p_username: username,
    })
      .then(rows => {
        if (active) setProfile(rows[0] ?? null);
      })
      .catch(issue => {
        if (active) setError(communityError(issue));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [username]);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: Math.max(bottomInset + 30, 46) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
      >
        <Text style={styles.chipText}>← Back</Text>
      </Pressable>
      {loading ? (
        <Text style={styles.optionDetail}>Loading profile…</Text>
      ) : error ? (
        <Text accessibilityRole="alert">{error}</Text>
      ) : !profile ? (
        <Text style={styles.optionDetail}>This profile is unavailable.</Text>
      ) : (
        <>
          <View style={styles.savedHero}>
            <Text style={styles.pageEyebrow}>COMMUNITY PROFILE</Text>
            <Text style={styles.pageTitle}>@{profile.username}</Text>
            {!!profile.bio && (
              <Text style={styles.pageBody}>{profile.bio}</Text>
            )}
          </View>
          <View style={styles.optionList}>
            <Text style={styles.optionName}>Published recipes</Text>
            {profile.recipes.length ? (
              profile.recipes.map(recipe => (
                <View key={recipe.id} style={styles.optionCard}>
                  <Text style={styles.optionName}>{recipe.title}</Text>
                  <Text style={styles.optionDetail}>
                    {guides.find(guide => guide.id === recipe.product_id)
                      ?.title ?? recipe.product_id}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.optionDetail}>No published recipes yet.</Text>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}
