import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable as Pressable } from './AnimatedPressable';
import { useCommunity } from '../hooks/useCommunity';
import { supabase } from '../lib/supabase';
import { styles } from '../styles';
import { KeyboardDismissControl } from './KeyboardDismissControl';
import { ProductComments } from './ProductComments';

export function RecipeComments({
  productId,
  recipeId,
  title,
}: {
  productId: string;
  recipeId: string;
  title: string;
}) {
  const c = useCommunity(supabase, productId, recipeId);
  const [open, setOpen] = useState(false);
  const top = c.comments.find(
    comment => comment.moderation_status === 'approved',
  );
  return (
    <View>
      <Text style={styles.optionName}>Recipe comments</Text>
      {c.loading ? (
        <Text>Loading comments…</Text>
      ) : c.error ? (
        <Text>Comments unavailable. Open comments to retry.</Text>
      ) : top ? (
        <>
          <Text style={styles.optionLabel}>
            TOP COMMENT · {top.votes} votes
          </Text>
          <Text numberOfLines={3} style={styles.optionDetail}>
            {top.body}
          </Text>
        </>
      ) : (
        <Text>No published comments yet.</Text>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
      >
        <Text style={styles.chipText}>
          {c.publicCount
            ? `View all ${c.publicCount} ${
                c.publicCount === 1 ? 'comment' : 'comments'
              }`
            : 'Add a comment / View comments'}
        </Text>
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setOpen(false);
          c.retry();
        }}
      >
        <View style={local.modalRoot}>
          <ScrollView
            contentContainerStyle={local.content}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          >
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              onPress={() => {
                setOpen(false);
                c.retry();
              }}
            >
              <Text style={styles.chipText}>Back to recipe</Text>
            </Pressable>
            <Text style={styles.optionName}>{title}</Text>
            {open && (
              <ProductComments productId={productId} recipeId={recipeId} />
            )}
          </ScrollView>
          <KeyboardDismissControl />
        </View>
      </Modal>
    </View>
  );
}

const local = StyleSheet.create({
  modalRoot: { flex: 1 },
  content: { padding: 24, paddingTop: 56, paddingBottom: 60 },
});
