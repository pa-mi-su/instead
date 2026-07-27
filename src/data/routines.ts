import { Routine } from "../types";

export const routines: Routine[] = [
  {
    id: "brush-teeth",
    title: "Brushing your teeth",
    prompt: "Can I brush without toothpaste?",
    category: "Bathroom",
    icon: "✦",
    answer: "You can—but fluoride toothpaste adds proven cavity protection.",
    answerTone: "depends",
    summary:
      "Brushing does most of the plaque removal. Toothpaste is not required for the mechanical cleaning, but fluoride toothpaste helps prevent cavities and is the evidence-backed default for most people.",
    essentials: [
      "Brush gently for two minutes, twice daily.",
      "Use a soft-bristled brush and clean every tooth surface.",
      "Clean between teeth once daily with floss or an interdental brush."
    ],
    skipNote:
      "If you skip toothpaste occasionally, brush with water rather than substituting abrasive DIY powders. If you are cavity-prone, have dry mouth, wear braces, or have been advised to use fluoride, do not make toothpaste-free brushing your default without asking a dentist.",
    avoid: [
      {
        name: "Charcoal powders",
        reason: "Often abrasive, with limited evidence of benefit and potential to wear enamel."
      },
      {
        name: "Lemon or vinegar",
        reason: "Acids can soften and erode tooth enamel."
      },
      {
        name: "Aggressive brushing",
        reason: "More pressure does not clean better and can irritate gums."
      }
    ],
    options: [
      {
        name: "Use less toothpaste",
        detail: "A pea-sized amount is enough for adults; more foam does not mean more cleaning.",
        label: "USE LESS"
      },
      {
        name: "Choose a simple fluoride toothpaste",
        detail: "Look for an ADA-accepted option without extra whitening claims if sensitivity is a concern.",
        label: "SIMPLE SWAP"
      },
      {
        name: "Brush with water occasionally",
        detail: "Better than skipping the brush entirely, but it does not provide fluoride protection.",
        label: "PRODUCT"
      }
    ],
    evidence: "Strong",
    evidenceNote:
      "Strong evidence supports twice-daily brushing with fluoride toothpaste for cavity prevention. Individual dental needs vary.",
    updatedAt: "July 2026",
    featured: true
  },
  {
    id: "deodorant",
    title: "Using deodorant",
    prompt: "Do I need deodorant every day?",
    category: "Body",
    icon: "○",
    answer: "No. Use it when odor control matters to you.",
    answerTone: "yes",
    summary:
      "Body odor comes mainly from skin bacteria breaking down sweat. Deodorant reduces odor; antiperspirant reduces sweat. Neither is required for health.",
    essentials: [
      "Wash and fully dry the underarm area.",
      "Wear breathable clothing and change damp shirts.",
      "Use deodorant only as often as you find useful."
    ],
    skipNote:
      "You can skip deodorant entirely. If odor is the issue, washing, drying, and changing clothing may be enough. Persistent new or unusual odor can have medical causes and is worth discussing with a clinician.",
    avoid: [
      {
        name: "Products that sting or cause a rash",
        reason: "Fragrance, baking soda, acids, and essential oils can all irritate sensitive skin."
      },
      {
        name: "Applying to broken skin",
        reason: "Freshly shaved or irritated skin is more likely to react."
      },
      {
        name: "Fear-based aluminum claims",
        reason: "Current evidence has not established that approved aluminum antiperspirants cause breast cancer."
      }
    ],
    options: [
      {
        name: "Use nothing",
        detail: "Wash, dry, and reassess. You may not need another step.",
        label: "USE LESS"
      },
      {
        name: "Fragrance-free deodorant",
        detail: "A short ingredient list may reduce irritation; patch test first.",
        label: "SIMPLE SWAP"
      },
      {
        name: "Antiperspirant when needed",
        detail: "Useful for sweat control. Apply to dry skin, often at night, as directed.",
        label: "PRODUCT"
      }
    ],
    evidence: "Moderate",
    evidenceNote:
      "Deodorant use is a personal preference. Ingredient tolerance varies more than marketing categories suggest.",
    updatedAt: "July 2026",
    featured: true
  },
  {
    id: "shower",
    title: "Taking a shower",
    prompt: "Do I need soap everywhere?",
    category: "Bathroom",
    icon: "⌁",
    answer: "Usually not. Focus cleanser where sweat, odor, or soil collects.",
    answerTone: "yes",
    summary:
      "Water and gentle friction are enough for much of the body. Over-cleansing can dry or irritate skin, especially with hot water and fragranced products.",
    essentials: [
      "Use warm—not very hot—water.",
      "Clean hands, underarms, groin, feet, and visibly soiled areas.",
      "Pat dry and moisturize dry areas while skin is slightly damp."
    ],
    skipNote:
      "You can usually skip cleanser on arms, legs, and torso unless they are dirty, oily, or exposed to something that needs removal. Individual skin conditions may require different care.",
    avoid: [
      {
        name: "Very hot, long showers",
        reason: "They can strip skin oils and worsen dryness."
      },
      {
        name: "Harsh scrubbing",
        reason: "Loofahs and rough exfoliation can irritate the skin barrier."
      },
      {
        name: "Heavy fragrance",
        reason: "A common trigger for irritation or contact allergy."
      }
    ],
    options: [
      {
        name: "Targeted washing",
        detail: "Use cleanser only where it is doing a clear job.",
        label: "USE LESS"
      },
      {
        name: "Fragrance-free gentle cleanser",
        detail: "Choose a simple syndet or mild wash for sensitive or dry skin.",
        label: "SIMPLE SWAP"
      }
    ],
    evidence: "Moderate",
    evidenceNote:
      "Dermatology guidance generally favors short, warm showers and gentle, targeted cleansing for dry or sensitive skin.",
    updatedAt: "July 2026",
    featured: true
  },
  {
    id: "wash-hair",
    title: "Washing your hair",
    prompt: "Do I need shampoo every day?",
    category: "Body",
    icon: "≈",
    answer: "Usually not. Wash based on your scalp—not a fixed schedule.",
    answerTone: "yes",
    summary:
      "Hair texture, scalp oil, styling products, exercise, and skin conditions all change how often shampoo is useful. The scalp is the target; the ends rarely need direct shampoo.",
    essentials: [
      "Apply shampoo primarily to the scalp.",
      "Rinse thoroughly and let suds run through the lengths.",
      "Adjust frequency if the scalp becomes itchy, oily, flaky, or irritated."
    ],
    skipNote:
      "Water-only days can work between washes. Going indefinitely without shampoo is not automatically healthier, particularly with heavy product buildup or scalp conditions.",
    avoid: [
      {
        name: "Undiluted essential oils",
        reason: "They can irritate the scalp and cause contact allergy."
      },
      {
        name: "Scratching with fingernails",
        reason: "This can damage irritated skin."
      }
    ],
    options: [
      {
        name: "Wash less often",
        detail: "Reduce gradually and let scalp comfort—not a trend—set the schedule.",
        label: "USE LESS"
      },
      {
        name: "Simple fragrance-free shampoo",
        detail: "Useful when fragrance or botanicals trigger irritation.",
        label: "SIMPLE SWAP"
      }
    ],
    evidence: "Moderate",
    evidenceNote:
      "There is no universal ideal shampoo schedule. Persistent flaking, pain, or hair loss warrants professional evaluation.",
    updatedAt: "July 2026"
  },
  {
    id: "laundry",
    title: "Doing laundry",
    prompt: "How much detergent do I really need?",
    category: "Laundry",
    icon: "□",
    answer: "Often less than the label’s largest dose.",
    answerTone: "yes",
    summary:
      "Using too much detergent can leave residue, trap soil, and require extra rinsing. Dose for load size, soil level, water hardness, and machine type.",
    essentials: [
      "Start with the smallest recommended dose.",
      "Do not pack the machine so tightly that items cannot move.",
      "Use an extra rinse only if residue or sensitivity is a problem."
    ],
    skipNote:
      "Lightly worn items may only need airing out. Detergent is still useful for body oils, visible soil, illness-related laundry, and odors.",
    avoid: [
      {
        name: "Scent boosters",
        reason: "They add fragrance but do not improve cleaning."
      },
      {
        name: "Fabric softener by default",
        reason: "It can coat fibers and reduce towel absorbency."
      },
      {
        name: "Mixing cleaning chemicals",
        reason: "Some combinations can release dangerous gases."
      }
    ],
    options: [
      {
        name: "Air and rewear",
        detail: "For clean, lightly worn items, hanging them up may be enough.",
        label: "USE LESS"
      },
      {
        name: "Fragrance-free detergent",
        detail: "Choose a concentrated product and measure the dose.",
        label: "SIMPLE SWAP"
      }
    ],
    evidence: "Moderate",
    evidenceNote:
      "Laundry needs vary with water, machine, fabric, and soil. Product instructions remain important for disinfection or occupational exposure.",
    updatedAt: "July 2026",
    featured: true
  },
  {
    id: "wash-dishes",
    title: "Washing dishes",
    prompt: "Do I need antibacterial dish soap?",
    category: "Kitchen",
    icon: "◒",
    answer: "Usually not. Regular dish soap and friction do the job.",
    answerTone: "yes",
    summary:
      "Surfactants loosen grease and food so water can carry them away. For routine dishwashing, technique and thorough rinsing matter more than antibacterial marketing.",
    essentials: [
      "Remove food scraps first.",
      "Use a small amount of dish soap with warm water.",
      "Rinse and allow items to dry completely."
    ],
    skipNote:
      "Plain water may be enough for a glass that only held water. Greasy, protein-rich, or contaminated dishes need detergent and proper cleaning.",
    avoid: [
      {
        name: "Overfilling the sink with soap",
        reason: "More suds can mean more residue and rinsing without better cleaning."
      },
      {
        name: "Old, wet sponges",
        reason: "They hold food and moisture; clean, dry, and replace them regularly."
      }
    ],
    options: [
      {
        name: "Use one small drop",
        detail: "Increase only when grease or load size requires it.",
        label: "USE LESS"
      },
      {
        name: "Fragrance-free dish soap",
        detail: "A practical choice for sensitive skin or fragrance avoidance.",
        label: "SIMPLE SWAP"
      }
    ],
    evidence: "Strong",
    evidenceNote:
      "Soap, water, friction, rinsing, and drying are established foundations of routine cleaning.",
    updatedAt: "July 2026"
  },
  {
    id: "moisturize",
    title: "Moisturizing your skin",
    prompt: "Do I need body lotion?",
    category: "Body",
    icon: "◇",
    answer: "Only if your skin is dry, tight, itchy, or needs barrier support.",
    answerTone: "yes",
    summary:
      "Moisturizer reduces water loss and supports the skin barrier. If your skin feels comfortable, applying lotion everywhere is optional.",
    essentials: [
      "Apply to dry areas rather than automatically covering the whole body.",
      "Use after bathing while skin is slightly damp.",
      "Choose thicker creams or ointments for very dry areas."
    ],
    skipNote:
      "Normal, comfortable skin does not require lotion. Red, cracked, persistently itchy, or changing skin needs more than product experimentation.",
    avoid: [
      {
        name: "Fragrance on irritated skin",
        reason: "It can increase the chance of stinging or contact allergy."
      },
      {
        name: "Long ingredient lists for no clear reason",
        reason: "More ingredients create more opportunities for sensitivity without guaranteed benefit."
      }
    ],
    options: [
      {
        name: "Spot moisturize",
        detail: "Use only on hands, shins, elbows, or other areas that need it.",
        label: "USE LESS"
      },
      {
        name: "Plain fragrance-free cream",
        detail: "Look for a simple formula in a tube or tub.",
        label: "SIMPLE SWAP"
      }
    ],
    evidence: "Strong",
    evidenceNote:
      "Moisturizers are well supported for dry skin and barrier disorders, but routine full-body use is a preference.",
    updatedAt: "July 2026"
  },
  {
    id: "clean-counters",
    title: "Cleaning counters",
    prompt: "Do I need disinfectant every time?",
    category: "Home",
    icon: "—",
    answer: "No. Cleaning and disinfecting are different jobs.",
    answerTone: "yes",
    summary:
      "Soap or a general cleaner removes everyday dirt and many microbes. Disinfectant is useful for specific higher-risk situations, not every routine wipe-down.",
    essentials: [
      "Remove crumbs and visible soil.",
      "Clean with soap or an appropriate surface cleaner.",
      "Disinfect only when needed and follow the product’s contact time."
    ],
    skipNote:
      "Skip disinfectant for most routine cleaning. Consider it after raw meat contamination, certain illnesses, or when public-health guidance calls for it.",
    avoid: [
      {
        name: "Mixing bleach with other cleaners",
        reason: "Mixing can create toxic gases."
      },
      {
        name: "Spraying near food or faces",
        reason: "Apply carefully, ventilate, and follow the label."
      },
      {
        name: "Ignoring contact time",
        reason: "A disinfectant wiped away immediately may not work as intended."
      }
    ],
    options: [
      {
        name: "Soap and water",
        detail: "The default for ordinary dirt and day-to-day counter cleaning.",
        label: "USE LESS"
      },
      {
        name: "Surface-appropriate cleaner",
        detail: "Choose based on the counter material, not broad “natural” claims.",
        label: "SIMPLE SWAP"
      }
    ],
    evidence: "Strong",
    evidenceNote:
      "Public-health guidance distinguishes routine cleaning from targeted disinfection. Always follow surface and product instructions.",
    updatedAt: "July 2026"
  }
];

export const categories = ["All", "Body", "Bathroom", "Laundry", "Kitchen", "Home"] as const;
