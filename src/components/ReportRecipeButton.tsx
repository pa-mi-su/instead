import { notifyRecipeConcernChanged } from '../hooks/useRecipeConcerns';
import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AnimatedPressable as Pressable } from './AnimatedPressable';
import { supabase } from '../lib/supabase';
import { reportReasons, type ReportReason } from '../lib/community';
import { styles } from '../styles';

export function ReportRecipeButton({
  productId,
  recipeId,
  title,
  signedIn,
  onSignIn,
  reported = false,
  canBlock = false,
}: {
  productId: string;
  recipeId: string;
  title: string;
  signedIn: boolean;
  reported?: boolean;
  canBlock?: boolean;
  onSignIn: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('Unsafe advice');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    if (!signedIn) {
      setSubmitted(false);
      setDetails('');
      setMessage('');
      setSent(false);
    }
  }, [signedIn]);
  function close() {
    if (!lock.current) setOpen(false);
  }
  async function submit() {
    if (lock.current || details.trim().length < 3) return;
    lock.current = true;
    setBusy(true);
    setMessage('');
    try {
      if (!supabase?.functions)
        throw new Error('Reporting is unavailable. Please try again later.');
      const result = await supabase.functions.invoke('report-recipe', {
        body: { productId, recipeId, reason, details: details.trim() },
      });
      if (result.error) {
        if (
          (result.error as { context?: { status?: number } }).context
            ?.status === 429
        )
          throw new Error(
            'You’ve reached the reporting limit. Please try again later.',
          );
        throw new Error(
          'Could not send the report email. Your report may be saved; retry to finish sending it.',
        );
      }
      setSent(true);
      setSubmitted(true);
      notifyRecipeConcernChanged();
      setDetails('');
      setMessage(
        'Your report was sent to INSTEAD. Thank you for raising your concern.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not send your report. Please retry.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const button = (label: string, action: () => void, disabled = busy) => (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={action}
      style={styles.actionButton}
    >
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
  return (
    <>
      {signedIn && (reported || submitted) && (
        <View style={local.reported} accessibilityLiveRegion="polite">
          <Text style={styles.optionName}>Concern submitted</Text>
          <Text style={styles.optionDetail}>
            You submitted this recipe for review. Reporting a concern does not
            hide the recipe.
            {canBlock
              ? ' If you don’t want to see it, block the contributor below.'
              : ''}
          </Text>
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Report or raise a concern about ${title}`}
        disabled={signedIn && (reported || submitted)}
        accessibilityState={{ disabled: signedIn && (reported || submitted) }}
        onPress={() => {
          setOpen(true);
          setSent(false);
          setMessage('');
        }}
        style={styles.actionButton}
      >
        <Text style={styles.actionButtonText}>
          {signedIn && (reported || submitted)
            ? 'Concern already submitted'
            : 'Report or raise a concern'}
        </Text>
      </Pressable>
      <Modal
        visible={open}
        transparent={false}
        animationType="slide"
        onRequestClose={close}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, local.content]}
          keyboardShouldPersistTaps="handled"
        >
          <Text accessibilityRole="header" style={styles.pageTitle}>
            Report a recipe
          </Text>
          <Text style={styles.optionName}>{title}</Text>
          {!signedIn ? (
            <View>
              <Text style={styles.optionDetail}>
                Sign in to send your concern so we can follow up with you.
              </Text>
              {button('Sign in to report', () => {
                setOpen(false);
                onSignIn();
              })}
            </View>
          ) : sent ? (
            <Text accessibilityLiveRegion="polite">{message}</Text>
          ) : (
            <>
              <Text style={styles.optionDetail}>
                Your concern, recipe details, account ID, and verified email
                will be sent privately to info@insteadtry.com.
              </Text>
              <Text style={styles.optionName}>Reason *</Text>
              {reportReasons.map(value => (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: reason === value }}
                  disabled={busy}
                  onPress={() => setReason(value)}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonText}>
                    {reason === value ? '● ' : '○ '}
                    {value}
                  </Text>
                </Pressable>
              ))}
              <Text style={styles.optionName}>Describe your concern *</Text>
              <TextInput
                accessibilityLabel="Describe your concern"
                value={details}
                onChangeText={setDetails}
                multiline
                maxLength={2000}
                editable={!busy}
                style={[styles.searchInput, local.input]}
              />
              {!!message && <Text accessibilityRole="alert">{message}</Text>}
              {button(
                busy ? 'Sending report…' : 'Send report',
                submit,
                busy || details.trim().length < 3,
              )}
            </>
          )}
          {button('Close', close)}
        </ScrollView>
      </Modal>
    </>
  );
}

const local = StyleSheet.create({
  content: { paddingTop: 60, paddingBottom: 45 },
  input: { minHeight: 110 },
  reported: {
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#B7C9AC',
    backgroundColor: '#F0F4E8',
    borderRadius: 16,
  },
});
