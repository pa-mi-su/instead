import type { Guide } from './types';

// Concept placeholders only. Publish ingredient quantities and instructions
// only after reviewing effectiveness, compatibility, preservation, and safety.
const topics: [string, Guide['category'], string, string, string][] = [
  [
    'Dish cleaner',
    'Cleaning',
    'dish soap dishwashing washing up',
    'Plant-based dish liquid',
    'Unscented dish soap bar',
  ],
  [
    'Toothpaste',
    'Personal Care',
    'teeth dental tooth paste',
    'Gentle paste concept',
    'Minimal-ingredient paste concept',
  ],
  [
    'Shampoo',
    'Personal Care',
    'hair wash',
    'Liquid shampoo concept',
    'Shampoo bar concept',
  ],
  [
    'Body soap',
    'Personal Care',
    'body wash shower hand soap',
    'Unscented soap bar concept',
    'Gentle body wash concept',
  ],
  [
    'Weed killer',
    'Home Maintenance',
    'garden weeds herbicide',
    'Targeted weed treatment concept',
    'Non-spray weed control concept',
  ],
  [
    'Deodorant',
    'Personal Care',
    'deoderant underarm odor',
    'Baking-soda-free balm concept',
    'Unscented deodorant stick concept',
  ],
  [
    'Glass cleaner',
    'Cleaning',
    'windows mirrors',
    'Fragrance-free glass spray concept',
    'Water-based glass cleaning concept',
  ],
  [
    'Laundry care',
    'Cleaning',
    'clothes detergent washing',
    'Unscented laundry powder concept',
    'Plant-based laundry liquid concept',
  ],
  [
    'Surface cleaner',
    'Cleaning',
    'all purpose countertop kitchen',
    'Gentle surface spray concept',
    'Simple surface wash concept',
  ],
];

export const placeholderCatalog: Guide[] = topics.map(
  ([title, category, keywords, first, second]) => ({
    id: `natural-${title.toLowerCase().replace(/ /g, '-')}`,
    title,
    category,
    prompt: 'Explore 2 natural alternative concepts',
    icon: '✳',
    answer: 'A simpler alternative starts here.',
    answerTone: 'depends',
    summary: `Recipe placeholders for ${title.toLowerCase()}. ${keywords}`,
    time: 'To be reviewed',
    estimatedCost: 'To be reviewed',
    estimatedSavings: 'Not estimated',
    difficulty: 'Easy',
    supplies: [],
    essentials: [],
    skipNote: '',
    avoid: [],
    options: [first, second].map(name => ({
      name,
      label: 'DIY FIRST',
      detail:
        'Recipe coming soon. Ingredients, quantities, instructions, storage, and safety notes are awaiting review.',
    })),
    safetyNote:
      'Use at your own risk. Natural does not automatically mean safe or effective. These are untested concepts, not instructions to make or use a product.',
    professionalHelp: [],
    evidence: 'Limited',
    evidenceNote:
      'Not reviewed. No safety or effectiveness claims have been verified.',
    updatedAt: 'Not yet reviewed',
  }),
);
