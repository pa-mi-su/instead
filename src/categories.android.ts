import { categories as sharedCategories } from './categories.ts';

// These categories have no guides in the Android catalog.
export const categories = sharedCategories.filter(
  category => category !== 'First Aid' && category !== 'Cough & Cold Care',
);
