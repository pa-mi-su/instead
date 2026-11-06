import {
  refreshRecipeVisibility,
  useRecipeVisibility,
} from '../hooks/useRecipeVisibility';
import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AnimatedPressable as Pressable } from './AnimatedPressable';
import { supabase } from '../lib/supabase';
import { reportReasons, type ReportReason } from '../lib/community';
import { COLORS, styles } from '../styles';

export function ReportRecipeButton({
  productId,
  recipeId,
  title,
  signedIn,
  onSignIn,
  reported = false,
  authorUsername,
}: {
  productId: string;
  recipeId: string;
  title: string;
  signedIn: boolean;
  reported?: boolean;
  authorUsername?: string;
  onSignIn: () => void;
}) {
  const visibility = useRecipeVisibility();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('Unsafe advice');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [deliveryDelayed, setDeliveryDelayed] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    if (!signedIn) {
      setSubmitted(false);
      setDetails('');
      setMessage('');
      setSent(false);
    }
  }, [signedIn]);
  const refreshOnClose = useRef(false);
  function close() {
    if (!lock.current) {
      setOpen(false);
      if (Platform.OS !== 'ios') dismissed();
    }
  }
  function dismissed() {
    if (refreshOnClose.current) {
      refreshOnClose.current = false;
      if (sent) visibility?.acceptReport(productId, recipeId, authorUsername);
      refreshRecipeVisibility();
    }
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
      refreshOnClose.current = true;
      if (
        (result.error as { context?: { status?: number } } | null)?.context
          ?.status === 503
      ) {
        setSent(true);
        setSubmitted(true);
        setDeliveryDelayed(true);
        setMessage(
          'Thank you for reporting this recipe. We will evaluate it and take action if necessary.',
        );
        return;
      }
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
      setDeliveryDelayed(false);
      setDetails('');
      setMessage(
        'Thank you for reporting this recipe. We will evaluate it and take action if necessary.',
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
      style={[
        local.button,
        label.includes('report') && local.primary,
        disabled && local.disabled,
      ]}
    >
      <Text
        style={[
          styles.actionButtonText,
          label.includes('report') && local.primaryText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
  return (
    <>
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
        onDismiss={dismissed}
      >
        <KeyboardAvoidingView
          style={local.modal}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[styles.scrollContent, local.content]}
            keyboardShouldPersistTaps="handled"
          >
            <Text accessibilityRole="header" style={local.heading}>
              Report a recipe
            </Text>
            <View style={local.recipe}>
              <Text style={local.recipeTitle}>{title}</Text>
            </View>
            {!signedIn ? (
              <View>
                <Text style={styles.optionDetail}>
                  Sign in to report this recipe. We will review your concern and
                  take appropriate action if necessary.
                </Text>
                {button('Sign in to report', () => {
                  setOpen(false);
                  onSignIn();
                })}
              </View>
            ) : sent ? (
              <View style={local.success}>
                <Text
                  accessibilityLiveRegion="polite"
                  style={local.successText}
                >
                  {message}
                </Text>
                {deliveryDelayed &&
                  button(
                    busy ? 'Retrying delivery…' : 'Retry email delivery',
                    submit,
                  )}
              </View>
            ) : (
              <>
                <Text style={styles.optionDetail}>
                  Your concern, recipe details, account ID, and verified email
                  will be sent privately to info@insteadtry.com.
                </Text>
                <Text style={local.label}>Reason *</Text>
                {reportReasons.map(value => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: reason === value }}
                    disabled={busy}
                    onPress={() => setReason(value)}
                    style={[local.reason, reason === value && local.selected]}
                  >
                    <Text style={styles.actionButtonText}>
                      {reason === value ? '● ' : '○ '}
                      {value}
                    </Text>
                  </Pressable>
                ))}
                <Text style={local.label}>Describe your concern *</Text>
                <TextInput
                  accessibilityLabel="Describe your concern"
                  value={details}
                  onChangeText={setDetails}
                  multiline
                  maxLength={2000}
                  editable={!busy}
                  placeholder="Tell us what concerns you about this recipe…"
                  placeholderTextColor={COLORS.muted}
                  textAlignVertical="top"
                  style={local.input}
                />
                <Text style={local.counter}>
                  {details.length}/2,000 characters
                </Text>
                <Text style={local.notice}>
                  Sending a report permanently removes this recipe from your
                  account. For community recipes, you will no longer see that
                  contributor or their recipes. Other people can still see
                  published content while it is reviewed.
                </Text>
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
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const local = StyleSheet.create({
  success: {
    padding: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: '#A7BCAE',
    borderRadius: 14,
    backgroundColor: '#EDF2E9',
  },
  successText: { color: COLORS.ink, fontSize: 16, lineHeight: 25 },
  modal: { flex: 1, backgroundColor: COLORS.paper },
  content: {
    flexGrow: 1,
    paddingTop: 60,
    paddingBottom: 45,
    gap: 16,
    backgroundColor: COLORS.paper,
  },
  heading: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: COLORS.ink,
  },
  recipe: {
    backgroundColor: '#EDF2E9',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#B1C5B6',
  },
  recipeTitle: {
    color: COLORS.ink,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '700',
  },
  label: {
    color: COLORS.ink,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    marginTop: 8,
  },
  reason: {
    borderWidth: 1,
    borderColor: '#A7BCAE',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  selected: {
    backgroundColor: '#DEEBDF',
    borderColor: COLORS.ink,
    borderWidth: 2,
  },
  input: {
    minHeight: 150,
    padding: 16,
    borderWidth: 2,
    borderColor: '#789889',
    borderRadius: 12,
    backgroundColor: '#F3F7EF',
    color: COLORS.ink,
    fontSize: 16,
    lineHeight: 24,
  },
  counter: { color: COLORS.muted, fontSize: 12, textAlign: 'right' },
  notice: { color: COLORS.muted, fontSize: 14, lineHeight: 21 },
  button: {
    minHeight: 50,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7BCAE',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  primary: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  primaryText: { color: '#FFFFFF' },
  disabled: { opacity: 0.5 },
});
