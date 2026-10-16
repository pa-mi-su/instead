import type { Guide } from './types';

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

export const productCatalog: Guide[] = topics.map(
  ([title, category, keywords]) => ({
    id: `natural-${title.toLowerCase().replace(/ /g, '-')}`,
    title,
    category,
    prompt: 'Explore natural alternatives',
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
    safetyNote:
      'Use at your own risk. Natural does not automatically mean safe or effective. Follow product-specific cautions and do not mix cleaning products.',
    professionalHelp: [],
    evidence: 'Limited',
    evidenceNote: 'Community votes do not establish safety or effectiveness.',
    updatedAt: '',
  }),
);
