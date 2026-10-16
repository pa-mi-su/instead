import { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { decode } from 'base64-arraybuffer';
import { useRecipes } from '../hooks/useRecipes';
import { PHOTO_LIMIT, recipeFields, validatePhoto } from '../lib/recipes';
import type { Recipe, RecipePhoto } from '../lib/recipes';
import { reportReasons } from '../lib/community';
import { supabase } from '../lib/supabase';
import { styles } from '../styles';

export function ProductRecipes({
  productId,
  userId,
  canContribute,
  canManage,
  onBlock,
}: {
  productId: string;
  userId?: string;
  canContribute: boolean;
  canManage: boolean;
  onBlock: (id: string) => unknown;
}) {
  const r = useRecipes(supabase, productId, userId);
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const button = (
    label: string,
    action: () => unknown,
    disabled = r.busy,
    selected?: boolean,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={action}
      style={[styles.chip, disabled && local.disabled]}
    >
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
  async function choose() {
    setSelecting(true);
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: PHOTO_LIMIT - r.photos.length,
        includeBase64: true,
        includeExtra: false,
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.8,
        assetRepresentationMode: 'compatible',
        restrictMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      });
      if (result.didCancel) return;
      if (result.errorCode)
        throw new Error(
          'Could not open your photo library. Check photo access in Settings.',
        );
      const picked: RecipePhoto[] = (result.assets ?? []).map(asset => {
        if (!asset.base64 || !asset.uri)
          throw new Error('Could not read this photo.');
        const photo: RecipePhoto = {
          uri: asset.uri,
          bytes: decode(asset.base64),
          contentType: asset.type as RecipePhoto['contentType'],
        };
        validatePhoto(photo);
        return photo;
      });
      if (r.photos.length + picked.length > PHOTO_LIMIT)
        throw new Error('Choose up to three photos.');
      r.setPhotos(current => [...current, ...picked]);
      r.setError('');
    } catch (issue) {
      r.setError(
        issue instanceof Error ? issue.message : 'Could not read photo.',
      );
    } finally {
      setSelecting(false);
    }
  }
  function card(recipe: Recipe) {
    return (
      <View key={recipe.id} style={styles.optionCard}>
        <Text style={styles.optionLabel}>
          COMMUNITY RECIPE ·{' '}
          {recipe.status === 'pending'
            ? 'AWAITING REVIEW'
            : recipe.status === 'rejected'
            ? 'NOT PUBLISHED'
            : 'COMMUNITY SUBMISSION'}
          {recipe.mine ? ' · YOUR SUBMISSION' : ''}
        </Text>
        <Text style={styles.optionName}>{recipe.title}</Text>
        {recipe.photos?.map((uri, i) => (
          <Image
            key={uri}
            source={{ uri }}
            style={local.photo}
            accessibilityLabel={`${recipe.title}, photo ${i + 1}`}
          />
        ))}
        {recipe.photoError && (
          <Text>Some photos could not load. Refresh recipes to retry.</Text>
        )}
        {[
          ['Ingredients and quantities', recipe.ingredients],
          ['Instructions', recipe.instructions],
          ['Storage and shelf life', recipe.storage_notes],
          ['Cautions', recipe.cautions],
          ...(recipe.source ? [['Source / credit', recipe.source]] : []),
        ].map(([label, value]) => (
          <View key={label}>
            <Text style={styles.optionName}>{label}</Text>
            <Text style={styles.optionDetail}>{value}</Text>
          </View>
        ))}
        {!!recipe.moderation_note && (
          <Text>Review note: {recipe.moderation_note}</Text>
        )}
        {recipe.status === 'approved' && (
          <>
            <Text>
              Score: {recipe.score} · {recipe.upvotes} upvotes ·{' '}
              {recipe.downvotes} downvotes
            </Text>
            {button(
              '▲ Upvote',
              () => r.vote(recipe, 1),
              r.busy || !canContribute || recipe.mine,
              recipe.my_vote === 1,
            )}
            {button(
              '▼ Downvote',
              () => r.vote(recipe, -1),
              r.busy || !canContribute || recipe.mine,
              recipe.my_vote === -1,
            )}
            {canManage &&
              button(
                recipe.reported ? 'Reported' : 'Report recipe',
                () => setReportId(reportId === recipe.id ? null : recipe.id),
                r.busy || recipe.reported,
              )}
            {reportId === recipe.id && !recipe.reported && (
              <View>
                {reportReasons.map(reason => (
                  <View key={reason}>
                    {button(reason, () => r.report(recipe, reason))}
                  </View>
                ))}
                {button('Cancel report', () => setReportId(null))}
              </View>
            )}
          </>
        )}
        {!recipe.mine &&
          recipe.status === 'approved' &&
          canManage &&
          button('Block contributor', () => onBlock(recipe.id))}
        {recipe.mine &&
          button('Remove my recipe', () => setRemoveId(recipe.id))}
        {removeId === recipe.id && (
          <View>
            <Text>Remove this recipe and its photos from the directory?</Text>
            {button('Confirm removal', () => r.withdraw(recipe))}
            {button('Cancel', () => setRemoveId(null))}
          </View>
        )}
      </View>
    );
  }
  return (
    <View style={styles.optionList}>
      <Text style={styles.optionName}>Community recipes</Text>
      <Text style={styles.optionDetail}>
        Share the recipe, not a profile. No bio, avatar, or public account page.
        Submissions and photos are checked before publishing; publication and
        votes do not establish safety or effectiveness.
      </Text>
      {!canContribute && (
        <Text>Use email-code sign-in below to submit a recipe or vote.</Text>
      )}
      {canContribute &&
        button(
          open ? 'Close submission form' : 'Submit a recipe',
          () => setOpen(!open),
          r.busy || selecting,
        )}
      {open && canContribute && (
        <View style={styles.optionCard}>
          {recipeFields.map(field => (
            <View key={field.key}>
              <Text>{field.label}</Text>
              <TextInput
                accessibilityLabel={field.label}
                multiline={field.key !== 'title'}
                maxLength={field.max}
                editable={!r.busy}
                value={r.draft[field.key]}
                onChangeText={value =>
                  r.setDraft(current => ({ ...current, [field.key]: value }))
                }
                style={[styles.searchInput, local.input]}
              />
            </View>
          ))}
          <Text>
            Photos are optional: up to three JPEG, PNG, or WebP photos, 5 MB
            each. Only upload photos you have permission to share. Avoid faces,
            addresses, and private information.
          </Text>
          {button(
            selecting ? 'Opening photos…' : 'Add photos',
            choose,
            r.busy || selecting || r.photos.length >= PHOTO_LIMIT,
          )}
          {r.photos.map((photo, i) => (
            <View key={photo.uri}>
              <Image
                source={{ uri: photo.uri }}
                style={local.photo}
                accessibilityLabel={`Selected recipe photo ${i + 1}`}
              />
              {button(
                `Remove photo ${i + 1}`,
                () =>
                  r.setPhotos(current =>
                    current.filter((_, index) => index !== i),
                  ),
                r.busy || selecting,
              )}
            </View>
          ))}
          {button(
            r.busy ? 'Submitting…' : 'Submit for review',
            r.submit,
            r.busy || selecting,
          )}
        </View>
      )}
      {!!r.error && <Text accessibilityRole="alert">{r.error}</Text>}
      {!!r.notice && <Text accessibilityLiveRegion="polite">{r.notice}</Text>}
      {button('Refresh recipes', r.refresh)}
      {!r.ready && !r.error && <Text>Loading recipes…</Text>}
      {r.ready && !r.recipes.length && (
        <Text>
          No published community recipes yet. Be the first to submit one.
        </Text>
      )}
      {r.recipes.map(card)}
      {r.more && button('Load more recipes', r.loadMore)}
      {!!r.mine.filter(recipe => recipe.status !== 'approved').length && (
        <View>
          <Text style={styles.optionName}>
            Your submissions · Only visible to you
          </Text>
          {r.mine.filter(recipe => recipe.status !== 'approved').map(card)}
        </View>
      )}
      {r.mineMore && button('Load more of your submissions', r.loadMoreMine)}
    </View>
  );
}
const local = StyleSheet.create({
  input: { minHeight: 80 },
  photo: {
    width: '100%',
    height: 220,
    resizeMode: 'contain',
    marginVertical: 12,
  },
  disabled: { opacity: 0.5 },
});
