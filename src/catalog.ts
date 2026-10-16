import type { Guide, StarterRecipe } from './types';

const topics: [string, Guide['category'], string][] = [
  ['Dish cleaner', 'Cleaning', 'dish soap dishwashing washing up'],
  ['Toothpaste', 'Personal Care', 'teeth dental tooth paste'],
  ['Shampoo', 'Personal Care', 'hair wash'],
  ['Body soap', 'Personal Care', 'body wash shower hand soap'],
  ['Weed killer', 'Home Maintenance', 'garden weeds herbicide'],
  ['Deodorant', 'Personal Care', 'deoderant underarm odor'],
  ['Glass cleaner', 'Cleaning', 'windows mirrors'],
  ['Laundry care', 'Cleaning', 'clothes detergent washing'],
  ['Surface cleaner', 'Cleaning', 'all purpose countertop kitchen'],
];

const dishCleanerRecipe: StarterRecipe = {
  name: 'Citrus Castile Dish Cleaner',
  ingredients: [
    '1 cup unscented liquid castile soap',
    '1/2 cup warm distilled water',
    '1 teaspoon baking soda',
    '20 drops lemon or wild orange essential oil',
  ],
  equipment: ['Clean 16-ounce pump dispenser', 'Whisk and mixing bowl'],
  instructions: [
    'Whisk the baking soda into the warm distilled water until completely dissolved. Adding it directly to the soap can cause clumps.',
    'Pour the liquid castile soap and essential oil into the dispenser.',
    'Add the water and baking soda mixture. Close the lid and swirl gently to combine. Avoid vigorous shaking, which creates excess foam.',
    'Swirl gently before each use. Apply a small amount to a sponge, hand-wash dishes, and rinse thoroughly with clean water.',
  ],
  storage:
    'Label the dispenser with its contents and mixing date. Diluting soap changes its preservation; distilled water does not preserve the mixture. A safe shelf life has not been established for this formula. Follow the soap manufacturer’s dilution and storage guidance.',
  cautions:
    'For hand-washing dishes only, never an automatic dishwasher. Essential oils can irritate skin; avoid if sensitive to citrus or fragrance. Avoid eyes and keep out of reach of children and pets. Do not add vinegar, bleach, ammonia, or other cleaners. Glass can break near a sink; use a suitable dispenser. This mixture is not a sanitizer or disinfectant.',
};

export const productCatalog: Guide[] = topics.map(
  ([title, category, keywords]) => ({
    id: `natural-${title.toLowerCase().replace(/ /g, '-')}`,
    title,
    category,
    prompt:
      title === 'Dish cleaner'
        ? 'Citrus castile soap for hand-washing dishes'
        : 'Explore natural alternatives',
    icon: '✳',
    answer: 'A simpler alternative starts here.',
    answerTone: 'depends',
    summary: `${title}. ${keywords}`,
    time: '',
    estimatedCost: '',
    estimatedSavings: '',
    difficulty: 'Easy',
    supplies: [],
    essentials: [],
    skipNote: '',
    avoid: [],
    options: [],
    recipes: title === 'Dish cleaner' ? [dishCleanerRecipe] : [],
    safetyNote:
      'Use at your own risk. Natural does not automatically mean safe or effective. Follow product-specific cautions and do not mix cleaning products.',
    professionalHelp: [],
    evidence: 'Limited',
    evidenceNote:
      title === 'Dish cleaner'
        ? 'Owner-supplied recipe. This exact mixture has not been independently tested for effectiveness, compatibility, or shelf life.'
        : 'Community votes do not establish safety or effectiveness.',
    updatedAt: '',
  }),
);
