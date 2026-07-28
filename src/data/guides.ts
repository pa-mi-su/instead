import { Guide } from '../types';

export const guides: Guide[] = [
  {
    id: 'brush-teeth',
    title: 'Brushing your teeth',
    prompt: 'Can I brush without toothpaste?',
    category: 'Personal Care',
    icon: '✦',
    answer: 'You can—but fluoride toothpaste adds proven cavity protection.',
    answerTone: 'depends',
    summary:
      'Brushing does most of the plaque removal. Toothpaste is not required for the mechanical cleaning, but fluoride toothpaste helps prevent cavities and is the evidence-backed default for most people.',
    time: '2 minutes',
    estimatedCost: '$0–$5 per month',
    estimatedSavings: 'Varies by toothpaste and how much you use',
    difficulty: 'Easy',
    supplies: ['Soft-bristled toothbrush', 'Water', 'Fluoride toothpaste'],
    essentials: [
      'Brush gently for two minutes, twice daily.',
      'Use a soft-bristled brush and clean every tooth surface.',
      'Clean between teeth once daily with floss or an interdental brush.',
    ],
    skipNote:
      'If you skip toothpaste occasionally, brush with water rather than substituting abrasive DIY powders. If you are cavity-prone, have dry mouth, wear braces, or have been advised to use fluoride, do not make toothpaste-free brushing your default without asking a dentist.',
    avoid: [
      {
        name: 'Charcoal powders',
        reason:
          'Often abrasive, with limited evidence of benefit and potential to wear enamel.',
      },
      {
        name: 'Lemon or vinegar',
        reason: 'Acids can soften and erode tooth enamel.',
      },
      {
        name: 'Aggressive brushing',
        reason: 'More pressure does not clean better and can irritate gums.',
      },
    ],
    options: [
      {
        name: 'Use less toothpaste',
        detail:
          'A pea-sized amount is enough for adults; more foam does not mean more cleaning.',
        label: 'USE LESS',
      },
      {
        name: 'Choose a simple fluoride toothpaste',
        detail:
          'Look for an ADA-accepted option without extra whitening claims if sensitivity is a concern.',
        label: 'SIMPLE SWAP',
      },
      {
        name: 'Brush with water occasionally',
        detail:
          'Better than skipping the brush entirely, but it does not provide fluoride protection.',
        label: 'PRODUCT',
      },
    ],
    safetyNote:
      'Do not use acidic or abrasive DIY substitutes that can damage enamel.',
    professionalHelp: [
      'Tooth pain, swelling, bleeding that persists, or a broken tooth',
      'Frequent cavities, dry mouth, braces, or personalized fluoride needs',
    ],
    evidence: 'Strong',
    evidenceNote:
      'Strong evidence supports twice-daily brushing with fluoride toothpaste for cavity prevention. Individual dental needs vary.',
    updatedAt: 'July 2026',
    featured: true,
  },
  {
    id: 'deodorant',
    title: 'Using deodorant',
    prompt: 'Do I need deodorant every day?',
    category: 'Personal Care',
    icon: '○',
    answer: 'No. Use it when odor control matters to you.',
    answerTone: 'yes',
    summary:
      'Body odor comes mainly from skin bacteria breaking down sweat. Deodorant reduces odor; antiperspirant reduces sweat. Neither is required for health.',
    time: '1–2 minutes',
    estimatedCost: '$0–$10 per month',
    estimatedSavings: 'Up to the cost of products you choose not to use',
    difficulty: 'Easy',
    supplies: ['Water', 'Gentle cleanser if needed', 'Clean clothing'],
    essentials: [
      'Wash and fully dry the underarm area.',
      'Wear breathable clothing and change damp shirts.',
      'Use deodorant only as often as you find useful.',
    ],
    skipNote:
      'You can skip deodorant entirely. If odor is the issue, washing, drying, and changing clothing may be enough. Persistent new or unusual odor can have medical causes and is worth discussing with a clinician.',
    avoid: [
      {
        name: 'Products that sting or cause a rash',
        reason:
          'Fragrance, baking soda, acids, and essential oils can all irritate sensitive skin.',
      },
      {
        name: 'Applying to broken skin',
        reason: 'Freshly shaved or irritated skin is more likely to react.',
      },
      {
        name: 'Fear-based aluminum claims',
        reason:
          'Current evidence has not established that approved aluminum antiperspirants cause breast cancer.',
      },
    ],
    options: [
      {
        name: 'Use nothing',
        detail: 'Wash, dry, and reassess. You may not need another step.',
        label: 'USE LESS',
      },
      {
        name: 'Fragrance-free deodorant',
        detail:
          'A short ingredient list may reduce irritation; patch test first.',
        label: 'SIMPLE SWAP',
      },
      {
        name: 'Antiperspirant when needed',
        detail:
          'Useful for sweat control. Apply to dry skin, often at night, as directed.',
        label: 'PRODUCT',
      },
    ],
    safetyNote:
      'Stop using products that cause burning, swelling, or a persistent rash.',
    professionalHelp: [
      'A new, strong, or unusual odor that does not improve with washing',
      'Painful lumps, drainage, severe sweating, or a persistent rash',
    ],
    evidence: 'Moderate',
    evidenceNote:
      'Deodorant use is a personal preference. Ingredient tolerance varies more than marketing categories suggest.',
    updatedAt: 'July 2026',
    featured: true,
  },
  {
    id: 'shower',
    title: 'Taking a shower',
    prompt: 'Do I need soap everywhere?',
    category: 'Personal Care',
    icon: '⌁',
    answer: 'Usually not. Focus cleanser where sweat, odor, or soil collects.',
    answerTone: 'yes',
    summary:
      'Water and gentle friction are enough for much of the body. Over-cleansing can dry or irritate skin, especially with hot water and fragranced products.',
    time: '5–10 minutes',
    estimatedCost: '$0–$8 per month',
    estimatedSavings: 'Varies by water use and products skipped',
    difficulty: 'Easy',
    supplies: [
      'Warm water',
      'Gentle cleanser for targeted areas',
      'Clean towel',
    ],
    essentials: [
      'Use warm—not very hot—water.',
      'Clean hands, underarms, groin, feet, and visibly soiled areas.',
      'Pat dry and moisturize dry areas while skin is slightly damp.',
    ],
    skipNote:
      'You can usually skip cleanser on arms, legs, and torso unless they are dirty, oily, or exposed to something that needs removal. Individual skin conditions may require different care.',
    avoid: [
      {
        name: 'Very hot, long showers',
        reason: 'They can strip skin oils and worsen dryness.',
      },
      {
        name: 'Harsh scrubbing',
        reason: 'Loofahs and rough exfoliation can irritate the skin barrier.',
      },
      {
        name: 'Heavy fragrance',
        reason: 'A common trigger for irritation or contact allergy.',
      },
    ],
    options: [
      {
        name: 'Targeted washing',
        detail: 'Use cleanser only where it is doing a clear job.',
        label: 'USE LESS',
      },
      {
        name: 'Fragrance-free gentle cleanser',
        detail:
          'Choose a simple syndet or mild wash for sensitive or dry skin.',
        label: 'SIMPLE SWAP',
      },
    ],
    safetyNote:
      'Use extra care with very hot water, slippery surfaces, and products that irritate skin.',
    professionalHelp: [
      'A spreading rash, signs of infection, or severe persistent itching',
      'Skin conditions that worsen despite gentle care',
    ],
    evidence: 'Moderate',
    evidenceNote:
      'Dermatology guidance generally favors short, warm showers and gentle, targeted cleansing for dry or sensitive skin.',
    updatedAt: 'July 2026',
    featured: true,
  },
  {
    id: 'wash-hair',
    title: 'Washing your hair',
    prompt: 'Do I need shampoo every day?',
    category: 'Personal Care',
    icon: '≈',
    answer: 'Usually not. Wash based on your scalp—not a fixed schedule.',
    answerTone: 'yes',
    summary:
      'Hair texture, scalp oil, styling products, exercise, and skin conditions all change how often shampoo is useful. The scalp is the target; the ends rarely need direct shampoo.',
    time: '5–15 minutes',
    estimatedCost: '$0–$10 per month',
    estimatedSavings: 'Varies with wash frequency and product use',
    difficulty: 'Easy',
    supplies: ['Water', 'Shampoo when needed', 'Conditioner if useful'],
    essentials: [
      'Apply shampoo primarily to the scalp.',
      'Rinse thoroughly and let suds run through the lengths.',
      'Adjust frequency if the scalp becomes itchy, oily, flaky, or irritated.',
    ],
    skipNote:
      'Water-only days can work between washes. Going indefinitely without shampoo is not automatically healthier, particularly with heavy product buildup or scalp conditions.',
    avoid: [
      {
        name: 'Undiluted essential oils',
        reason: 'They can irritate the scalp and cause contact allergy.',
      },
      {
        name: 'Scratching with fingernails',
        reason: 'This can damage irritated skin.',
      },
    ],
    options: [
      {
        name: 'Wash less often',
        detail:
          'Reduce gradually and let scalp comfort—not a trend—set the schedule.',
        label: 'USE LESS',
      },
      {
        name: 'Simple fragrance-free shampoo',
        detail: 'Useful when fragrance or botanicals trigger irritation.',
        label: 'SIMPLE SWAP',
      },
    ],
    safetyNote:
      'Avoid putting undiluted essential oils or harsh household ingredients on the scalp.',
    professionalHelp: [
      'Sudden or patchy hair loss',
      'Pain, sores, drainage, or persistent severe scaling',
    ],
    evidence: 'Moderate',
    evidenceNote:
      'There is no universal ideal shampoo schedule. Persistent flaking, pain, or hair loss warrants professional evaluation.',
    updatedAt: 'July 2026',
  },
  {
    id: 'laundry',
    title: 'Doing laundry',
    prompt: 'How much detergent do I really need?',
    category: 'Cleaning',
    icon: '□',
    answer: 'Often less than the label’s largest dose.',
    answerTone: 'yes',
    summary:
      'Using too much detergent can leave residue, trap soil, and require extra rinsing. Dose for load size, soil level, water hardness, and machine type.',
    time: '5 minutes of hands-on work',
    estimatedCost: '$0.10–$0.50 per load',
    estimatedSavings: 'Varies with detergent dose and avoided rewashing',
    difficulty: 'Easy',
    supplies: ['Washing machine or wash basin', 'Measured detergent', 'Water'],
    essentials: [
      'Start with the smallest recommended dose.',
      'Do not pack the machine so tightly that items cannot move.',
      'Use an extra rinse only if residue or sensitivity is a problem.',
    ],
    skipNote:
      'Lightly worn items may only need airing out. Detergent is still useful for body oils, visible soil, illness-related laundry, and odors.',
    avoid: [
      {
        name: 'Scent boosters',
        reason: 'They add fragrance but do not improve cleaning.',
      },
      {
        name: 'Fabric softener by default',
        reason: 'It can coat fibers and reduce towel absorbency.',
      },
      {
        name: 'Mixing cleaning chemicals',
        reason: 'Some combinations can release dangerous gases.',
      },
    ],
    options: [
      {
        name: 'Air and rewear',
        detail: 'For clean, lightly worn items, hanging them up may be enough.',
        label: 'USE LESS',
      },
      {
        name: 'Fragrance-free detergent',
        detail: 'Choose a concentrated product and measure the dose.',
        label: 'SIMPLE SWAP',
      },
    ],
    safetyNote: 'Never mix bleach with ammonia, acids, or other cleaners.',
    professionalHelp: [
      'A leaking, sparking, smoking, or repeatedly overflowing machine',
      'Contaminated occupational or hazardous-material laundry',
    ],
    evidence: 'Moderate',
    evidenceNote:
      'Laundry needs vary with water, machine, fabric, and soil. Product instructions remain important for disinfection or occupational exposure.',
    updatedAt: 'July 2026',
    featured: true,
  },
  {
    id: 'wash-dishes',
    title: 'Washing dishes',
    prompt: 'Do I need antibacterial dish soap?',
    category: 'Cleaning',
    icon: '◒',
    answer: 'Usually not. Regular dish soap and friction do the job.',
    answerTone: 'yes',
    summary:
      'Surfactants loosen grease and food so water can carry them away. For routine dishwashing, technique and thorough rinsing matter more than antibacterial marketing.',
    time: '5–20 minutes',
    estimatedCost: 'Usually under $1 per load',
    estimatedSavings: 'Varies with soap and water use',
    difficulty: 'Easy',
    supplies: ['Warm water', 'Dish soap', 'Clean brush, cloth, or sponge'],
    essentials: [
      'Remove food scraps first.',
      'Use a small amount of dish soap with warm water.',
      'Rinse and allow items to dry completely.',
    ],
    skipNote:
      'Plain water may be enough for a glass that only held water. Greasy, protein-rich, or contaminated dishes need detergent and proper cleaning.',
    avoid: [
      {
        name: 'Overfilling the sink with soap',
        reason:
          'More suds can mean more residue and rinsing without better cleaning.',
      },
      {
        name: 'Old, wet sponges',
        reason:
          'They hold food and moisture; clean, dry, and replace them regularly.',
      },
    ],
    options: [
      {
        name: 'Use one small drop',
        detail: 'Increase only when grease or load size requires it.',
        label: 'USE LESS',
      },
      {
        name: 'Fragrance-free dish soap',
        detail: 'A practical choice for sensitive skin or fragrance avoidance.',
        label: 'SIMPLE SWAP',
      },
    ],
    safetyNote:
      'Handle knives and broken glass separately, and never mix cleaning chemicals.',
    professionalHelp: [
      'A sink that repeatedly backs up or leaks into cabinets or walls',
      'Suspected sewage contamination',
    ],
    evidence: 'Strong',
    evidenceNote:
      'Soap, water, friction, rinsing, and drying are established foundations of routine cleaning.',
    updatedAt: 'July 2026',
  },
  {
    id: 'moisturize',
    title: 'Moisturizing your skin',
    prompt: 'Do I need body lotion?',
    category: 'Personal Care',
    icon: '◇',
    answer: 'Only if your skin is dry, tight, itchy, or needs barrier support.',
    answerTone: 'yes',
    summary:
      'Moisturizer reduces water loss and supports the skin barrier. If your skin feels comfortable, applying lotion everywhere is optional.',
    time: '1–3 minutes',
    estimatedCost: '$0–$15 per month',
    estimatedSavings: 'Up to the cost of unnecessary specialty products',
    difficulty: 'Easy',
    supplies: ['A simple moisturizer only where needed'],
    essentials: [
      'Apply to dry areas rather than automatically covering the whole body.',
      'Use after bathing while skin is slightly damp.',
      'Choose thicker creams or ointments for very dry areas.',
    ],
    skipNote:
      'Normal, comfortable skin does not require lotion. Red, cracked, persistently itchy, or changing skin needs more than product experimentation.',
    avoid: [
      {
        name: 'Fragrance on irritated skin',
        reason: 'It can increase the chance of stinging or contact allergy.',
      },
      {
        name: 'Long ingredient lists for no clear reason',
        reason:
          'More ingredients create more opportunities for sensitivity without guaranteed benefit.',
      },
    ],
    options: [
      {
        name: 'Spot moisturize',
        detail:
          'Use only on hands, shins, elbows, or other areas that need it.',
        label: 'USE LESS',
      },
      {
        name: 'Plain fragrance-free cream',
        detail: 'Look for a simple formula in a tube or tub.',
        label: 'SIMPLE SWAP',
      },
    ],
    safetyNote:
      'Stop using a product that causes burning, swelling, hives, or a worsening rash.',
    professionalHelp: [
      'Cracked, bleeding, infected, or persistently inflamed skin',
      'A changing mole or unexplained skin change',
    ],
    evidence: 'Strong',
    evidenceNote:
      'Moisturizers are well supported for dry skin and barrier disorders, but routine full-body use is a preference.',
    updatedAt: 'July 2026',
  },
  {
    id: 'clean-counters',
    title: 'Cleaning counters',
    prompt: 'Do I need disinfectant every time?',
    category: 'Cleaning',
    icon: '—',
    answer: 'No. Cleaning and disinfecting are different jobs.',
    answerTone: 'yes',
    summary:
      'Soap or a general cleaner removes everyday dirt and many microbes. Disinfectant is useful for specific higher-risk situations, not every routine wipe-down.',
    time: '5–10 minutes',
    estimatedCost: 'Usually under $1 per cleaning',
    estimatedSavings: 'Varies with specialized products avoided',
    difficulty: 'Easy',
    supplies: [
      'Reusable cloth',
      'Soap or surface-appropriate cleaner',
      'Water',
    ],
    essentials: [
      'Remove crumbs and visible soil.',
      'Clean with soap or an appropriate surface cleaner.',
      'Disinfect only when needed and follow the product’s contact time.',
    ],
    skipNote:
      'Skip disinfectant for most routine cleaning. Consider it after raw meat contamination, certain illnesses, or when public-health guidance calls for it.',
    avoid: [
      {
        name: 'Mixing bleach with other cleaners',
        reason: 'Mixing can create toxic gases.',
      },
      {
        name: 'Spraying near food or faces',
        reason: 'Apply carefully, ventilate, and follow the label.',
      },
      {
        name: 'Ignoring contact time',
        reason:
          'A disinfectant wiped away immediately may not work as intended.',
      },
    ],
    options: [
      {
        name: 'Soap and water',
        detail:
          'The default for ordinary dirt and day-to-day counter cleaning.',
        label: 'USE LESS',
      },
      {
        name: 'Surface-appropriate cleaner',
        detail:
          'Choose based on the counter material, not broad “natural” claims.',
        label: 'SIMPLE SWAP',
      },
    ],
    safetyNote:
      'Ventilate the area and never mix bleach with ammonia, acids, or other cleaners.',
    professionalHelp: [
      'Large sewage, mold, chemical, or biohazard contamination',
      'A surface problem caused by an active leak or structural damage',
    ],
    evidence: 'Strong',
    evidenceNote:
      'Public-health guidance distinguishes routine cleaning from targeted disinfection. Always follow surface and product instructions.',
    updatedAt: 'July 2026',
  },
  {
    id: 'routine-pest-control',
    title: 'Routine pest control',
    prompt: 'Can I try something before paying for recurring pest control?',
    category: 'Household Services',
    icon: '⌂',
    answer:
      'Often, yes. Start by removing food, water, shelter, and entry points.',
    answerTone: 'depends',
    summary:
      'Many minor ant, roach, and occasional-invader problems improve when you identify the pest, remove what attracts it, seal entry points, and use a targeted control. The right response depends on the species and severity.',
    time: '30–90 minutes, plus monitoring',
    estimatedCost: '$10–$50 for basic supplies',
    estimatedSavings:
      'Potentially $100–$400 compared with a recurring general service',
    difficulty: 'Moderate',
    supplies: [
      'Flashlight',
      'Sealed food containers',
      'Caulk or door sweep',
      'Species-appropriate traps or enclosed bait',
    ],
    essentials: [
      'Identify the pest before choosing a treatment.',
      'Remove accessible food, standing water, clutter, and waste.',
      'Seal small gaps and repair screens or door sweeps.',
      'Use the least hazardous targeted trap or bait that fits the pest, following the label exactly.',
      'Monitor activity for one to two weeks and record where it appears.',
    ],
    skipNote:
      'You may be able to skip a recurring general spray when the problem is minor and the cause can be corrected. Do not delay professional help for destructive, dangerous, or rapidly spreading pests.',
    avoid: [
      {
        name: 'Spraying before identifying the pest',
        reason:
          'The wrong treatment may fail, scatter pests, or create unnecessary exposure.',
      },
      {
        name: 'Foggers and broad indoor spraying',
        reason:
          'They can increase pesticide exposure and may not reach where pests live.',
      },
      {
        name: 'Unlabeled DIY chemical mixtures',
        reason:
          'Mixing or repurposing chemicals can poison people, pets, or wildlife.',
      },
    ],
    options: [
      {
        name: 'Remove the attraction',
        detail:
          'Store food, clean crumbs and grease, fix drips, and empty waste regularly.',
        label: 'DIY FIRST',
      },
      {
        name: 'Block the route',
        detail:
          'Seal gaps, repair screens, and add a door sweep where pests enter.',
        label: 'SIMPLE SWAP',
      },
      {
        name: 'Use a targeted trap or bait',
        detail:
          'Choose a product labeled for the identified pest and keep it away from children and pets.',
        label: 'PRODUCT',
      },
    ],
    safetyNote:
      'Read and follow every pesticide label. Keep traps and baits away from children, pets, food, and food-preparation surfaces.',
    professionalHelp: [
      'Termites, bed bugs, stinging-insect nests, venomous pests, or wildlife',
      'Rodents inside living areas, extensive droppings, or possible disease exposure',
      'A large, recurring, or unidentified infestation',
      'Any treatment requiring restricted chemicals, ladders, roofs, or wall access',
    ],
    evidence: 'Moderate',
    evidenceNote:
      'Integrated pest management emphasizes identification, sanitation, exclusion, monitoring, and targeted controls before routine broad pesticide use. Results depend heavily on the pest and building.',
    updatedAt: 'July 2026',
    featured: true,
  },
];

export const categories = [
  'All',
  'Personal Care',
  'Cleaning',
  'Household Services',
] as const;
