import { POLICY_VERSION } from './policies';
export const ACKNOWLEDGEMENT_KEY = 'instead:safety-acknowledgement';
export const acknowledgementText =
  'I agree to the Terms of Use and acknowledge the Safety information and Privacy Policy.';
export const disclaimerSections = [
  {
    title: 'Information, not medical advice',
    body: 'INSTEAD is an educational recipe directory, not a healthcare provider. Content is not medical or dental advice, diagnosis, or treatment, and using the app does not create a clinician–patient relationship. Ask a qualified professional before making health decisions. Do not delay care or change prescribed treatment because of a recipe.',
  },
  {
    title: 'Natural does not mean safe',
    body: 'Recipes may be untested. Ingredient strength, dose, allergens, preservation, shelf life, and surface or equipment compatibility matter. Publication, moderation, and votes are not proof of safety or effectiveness. Follow product labels and recipe cautions; stop if a reaction occurs.',
  },
  {
    title: 'Not for emergencies',
    body: 'Do not rely on this app for urgent symptoms, poisoning, breathing difficulty, a severe allergic reaction, serious burns or injury, or immediate danger. Contact local emergency services or a qualified professional.',
  },
] as const;
export function makeAcknowledgement() {
  return JSON.stringify({
    version: POLICY_VERSION,
    acceptedAt: new Date().toISOString(),
  });
}
export function hasCurrentAcknowledgement(value: string | null) {
  try {
    const receipt: unknown = JSON.parse(value ?? 'null');
    return (
      !!receipt &&
      typeof receipt === 'object' &&
      'version' in receipt &&
      receipt.version === POLICY_VERSION &&
      'acceptedAt' in receipt &&
      typeof receipt.acceptedAt === 'string' &&
      Number.isFinite(Date.parse(receipt.acceptedAt))
    );
  } catch {
    return false;
  }
}
