import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  ACKNOWLEDGEMENT_KEY,
  hasCurrentAcknowledgement,
  makeAcknowledgement,
} from '../disclaimer';
export function useSafetyAcknowledgement() {
  const [status, setStatus] = useState<'loading' | 'required' | 'accepted'>(
    'loading',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(ACKNOWLEDGEMENT_KEY)
      .then(value => {
        if (active)
          setStatus(hasCurrentAcknowledgement(value) ? 'accepted' : 'required');
      })
      .catch(() => {
        if (active) setStatus('required');
      });
    return () => {
      active = false;
    };
  }, []);
  async function accept() {
    setBusy(true);
    setError('');
    try {
      await AsyncStorage.setItem(ACKNOWLEDGEMENT_KEY, makeAcknowledgement());
      setStatus('accepted');
    } catch {
      setError('Your acknowledgement could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return { status, busy, error, accept };
}
