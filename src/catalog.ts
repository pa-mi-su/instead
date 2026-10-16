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

const dishScrubRecipe: StarterRecipe = {
  name: 'Baking Soda Scrub & Separate Vinegar Rinse',
  ingredients: [
    'Baking soda — enough to lightly sprinkle over the soiled area',
    'Plain household white vinegar (5% acidity) — enough to lightly wet compatible dishes',
    'Clean water for wetting and thorough rinsing',
  ],
  equipment: ['Soft, non-scratch sponge', 'Clean cloth for drying'],
  instructions: [
    'Wet the dish with water. Lightly sprinkle baking soda over stuck-on food and gently scrub with a wet, non-scratch sponge. Follow the cookware manufacturer’s cleaning directions.',
    'Rinse away all baking soda and loosened food with clean water before using vinegar. Keep the ingredients separate; do not combine them in a bottle.',
    'For remaining hard-water film on vinegar-compatible glass or glazed dishes, lightly wet with plain white vinegar and wipe gently. Results vary; a spotless finish is not guaranteed.',
    'Rinse thoroughly with clean water and dry with a clean cloth. If grease or food remains, wash with dish detergent and rinse again.',
  ],
  storage:
    'No batch to prepare or store. Keep baking soda dry and vinegar in its original labeled container. Use each separately as needed.',
  cautions:
    'A cleaning aid, not a sanitizer or disinfectant, and not a substitute for detergent when it is needed to remove grease. For hand-washing only. Abrasives and acids can damage finishes; check manufacturer guidance before using on nonstick coatings, aluminum, cast iron, decorated dishes, or other sensitive surfaces. Keep vinegar off natural-stone counters. Never combine vinegar with bleach or other cleaners. Avoid eyes; keep supplies away from children and pets.',
};

const toothpasteRecipe: StarterRecipe = {
  name: 'Zero-Sweetener Coconut Toothpaste',
  ingredients: [
    '4 tablespoons coconut oil',
    '2½ tablespoons calcium carbonate',
    '½ tablespoon baking soda',
    '10 drops sweet orange essential oil',
    '5 drops peppermint essential oil',
    '5 drops vanilla extract (check the label for added sweeteners)',
  ],
  equipment: [
    'Small glass mixing bowl',
    'Silicone spatula or sturdy spoon',
    'Clean, airtight glass jar',
    'Clean, dry scoop',
  ],
  instructions: [
    'Soften the coconut oil to a soft-butter consistency without fully melting it. Warm the closed coconut-oil container in warm water, then measure into the bowl. Keep water out of the mixture.',
    'In the dry mixing bowl, stir the calcium carbonate and baking soda together, breaking up lumps and avoiding breathing in the powders.',
    'Add the softened coconut oil. Mash and stir until the mixture forms a uniform paste.',
    'The submitted formula includes sweet orange essential oil, peppermint essential oil, and vanilla extract. Before adding them, have a dentist or qualified formulator review the specific products and concentrations for oral use; aromatherapy oils are not automatically suitable for the mouth.',
    'Stir for about 60 seconds to distribute the ingredients. Mixing alone does not verify safety or guarantee that flavorings stay evenly dispersed.',
    'Transfer to the clean jar, close the lid, and label with ingredients and preparation date.',
  ],
  storage:
    'Keep the jar closed and use a clean, dry scoop rather than dipping a wet toothbrush. Coconut oil softens or melts around 76°F (24°C), depending on the product; texture can change with room temperature. Cooling or stirring does not preserve or sanitize the paste. Vanilla extract can introduce water or alcohol. No safe shelf life has been established for this exact formula.',
  cautions:
    'Owner-supplied, untested formula for reference, not a dentist-approved daily brushing recommendation. It contains no fluoride and is not an equivalent replacement for fluoride toothpaste for cavity prevention. Abrasiveness depends on the powder grade, particle size, and finished formula and has not been measured here. Essential oils can irritate the mouth and be harmful if swallowed; do not swallow or give this mixture to children. Have a dentist review it before oral use, especially with sensitivity, exposed roots, or dental work. Stop if irritation occurs. No brushing dose is recommended for this untested formula.',
};

export const productCatalog: Guide[] = topics.map(
  ([title, category, keywords]) => ({
    id: `natural-${title.toLowerCase().replace(/ /g, '-')}`,
    title,
    category,
    prompt:
      title === 'Dish cleaner'
        ? 'Two options for hand-washing dishes'
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
    recipes:
      title === 'Dish cleaner'
        ? [dishCleanerRecipe, dishScrubRecipe]
        : title === 'Toothpaste'
        ? [toothpasteRecipe]
        : [],
    safetyNote:
      title === 'Toothpaste'
        ? 'Fluoride-free and untested. Review this formula with a dentist before oral use. Natural ingredients do not establish dental safety or cavity protection.'
        : 'Use at your own risk. Natural does not automatically mean safe or effective. Follow product-specific cautions and do not mix cleaning products.',
    professionalHelp: [],
    evidence: 'Limited',
    evidenceNote:
      title === 'Dish cleaner'
        ? 'Owner-supplied recipes. These exact methods have not been independently tested for effectiveness or compatibility; shelf life has not been established for the mixed cleaner.'
        : 'Community votes do not establish safety or effectiveness.',
    updatedAt: '',
  }),
);
