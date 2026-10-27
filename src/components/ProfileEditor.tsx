import { imageContentType } from '../lib/imageUpload';
import { useState } from 'react';
import { Image, Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { decode } from 'base64-arraybuffer';
import { AnimatedPressable as Pressable } from './AnimatedPressable';
import type { AvatarUpload } from '../lib/community';
import type { useCommunity } from '../hooks/useCommunity';
import { COLORS, styles } from '../styles';

export function ProfileEditor({
  community: c,
  onClose,
}: {
  community: ReturnType<typeof useCommunity>;
  onClose: () => void;
}) {
  const [avatar, setAvatar] = useState<AvatarUpload | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [saving, setSaving] = useState(false);

  async function chooseAvatar() {
    setSelecting(true);
    setPhotoError('');
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: true,
        includeExtra: false,
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.8,
        assetRepresentationMode: 'compatible',
      });
      if (result.didCancel) return;
      if (result.errorCode)
        throw new Error(
          'Could not open your photo library. Check photo access in Settings.',
        );
      const selected = result.assets?.[0];
      if (!selected?.uri || !selected.base64)
        throw new Error('Could not read that photo. Please choose another.');
      const bytes = decode(selected.base64);
      const type = imageContentType(bytes);
      if (bytes.byteLength > 2 * 1024 * 1024)
        throw new Error('Choose an image smaller than 2 MB.');
      setAvatar({ bytes, contentType: type });
      setPreviewUri(selected.uri);
      setRemoveAvatar(false);
    } catch (issue) {
      setPhotoError(
        issue instanceof Error ? issue.message : 'Could not read that photo.',
      );
    } finally {
      setSelecting(false);
    }
  }

  async function save() {
    setSaving(true);
    const saved = await c.saveProfile(avatar ?? undefined, removeAvatar);
    setSaving(false);
    if (saved) onClose();
  }

  const photoUri = previewUri ?? (!removeAvatar ? c.avatarUrl : null);
  const validUsername = /^[A-Za-z0-9_]{3,20}$/.test(c.username.trim());
  const validBio = c.bio.length <= 280;

  return (
    <Modal
      visible
      onRequestClose={onClose}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.app}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.optionList}>
            <Text style={styles.pageEyebrow}>YOUR INSTEAD</Text>
            <Text style={styles.pageTitle}>Update your profile</Text>
            <Text style={styles.optionDetail}>
              Your username and optional bio appear with your approved recipes.
            </Text>

            <View style={local.avatarArea}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={local.avatar} />
              ) : (
                <View style={local.avatarPlaceholder}>
                  <Text style={local.avatarInitial}>
                    {(c.username.trim()[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                disabled={selecting || saving}
                onPress={chooseAvatar}
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.actionButtonText}>
                  {selecting
                    ? 'Opening photos…'
                    : photoUri
                    ? 'Change avatar'
                    : 'Add avatar'}
                </Text>
              </Pressable>
              {!!photoUri && (
                <Pressable
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={() => {
                    setAvatar(null);
                    setPreviewUri(null);
                    setRemoveAvatar(true);
                  }}
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.actionButtonText}>Remove avatar</Text>
                </Pressable>
              )}
              <Text style={styles.optionDetail}>
                Choose a photo · automatically optimized · up to 2 MB
              </Text>
              {!!photoError && (
                <Text accessibilityRole="alert" style={local.fieldError}>
                  {photoError}
                </Text>
              )}
            </View>

            <View>
              <Text style={local.fieldLabel}>Public username</Text>
              <TextInput
                accessibilityLabel="Public username"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                maxLength={20}
                value={c.username}
                onChangeText={c.setUsername}
                style={local.input}
              />
              {!validUsername && (
                <Text style={local.fieldError}>
                  Use 3–20 letters, numbers, or underscores.
                </Text>
              )}
            </View>

            <View>
              <Text style={local.fieldLabel}>Short bio (optional)</Text>
              <TextInput
                accessibilityLabel="Short bio (optional)"
                maxLength={280}
                multiline
                value={c.bio}
                onChangeText={c.setBio}
                style={[local.input, local.bioInput]}
              />
              <Text style={styles.optionDetail}>
                {c.bio.length}/280 characters
              </Text>
              {!validBio && (
                <Text style={local.fieldError}>
                  Keep your bio to 280 characters or fewer.
                </Text>
              )}
            </View>

            {!!c.error && (
              <Text accessibilityRole="alert" style={local.fieldError}>
                {c.error}
              </Text>
            )}
            <View style={local.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  disabled:
                    saving ||
                    c.busy ||
                    !c.canEditProfile ||
                    !validUsername ||
                    !validBio,
                }}
                disabled={
                  saving ||
                  c.busy ||
                  !c.canEditProfile ||
                  !validUsername ||
                  !validBio
                }
                onPress={save}
                style={({ pressed }) => [
                  local.primary,
                  (saving || c.busy) && local.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={local.primaryText}>
                  {saving || c.busy ? 'Updating…' : 'Update profile'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={saving || c.busy}
                onPress={onClose}
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const local = {
  avatarArea: { alignItems: 'center' as const, gap: 12, paddingVertical: 12 },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: COLORS.line,
  },
  avatarPlaceholder: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: COLORS.sage,
  },
  avatarInitial: {
    color: COLORS.ink,
    fontSize: 42,
    fontWeight: '800' as const,
  },
  fieldLabel: {
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  input: {
    minHeight: 56,
    borderColor: COLORS.ink,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: COLORS.ink,
    backgroundColor: COLORS.paper,
    fontSize: 17,
  },
  bioInput: {
    minHeight: 120,
    paddingTop: 12,
    textAlignVertical: 'top' as const,
  },
  fieldError: { color: '#8A2F20', fontSize: 14, lineHeight: 20 },
  actions: { gap: 12, paddingTop: 8 },
  primary: {
    minHeight: 56,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 16,
    backgroundColor: COLORS.ink,
  },
  primaryText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' as const },
  secondary: {
    minHeight: 52,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  secondaryText: {
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  disabled: { opacity: 0.55 },
};
