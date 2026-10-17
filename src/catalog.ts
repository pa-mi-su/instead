import type { Guide, StarterRecipe } from './types';

const topics: [string, Guide['category'], string][] = [
  ['Dish cleaner', 'Cleaning', 'dish soap dishwashing washing up'],
  ['Toothpaste', 'Personal Care', 'teeth dental tooth paste'],
  ['Shampoo', 'Personal Care', 'hair wash'],
  ['Body soap', 'Personal Care', 'body wash shower hand soap'],
  ['Weed killer', 'Home Maintenance', 'garden weeds herbicide'],
  ['Deodorant', 'Personal Care', 'deoderant underarm odor'],
  ['Glass cleaner', 'Cleaning', 'window cleaner windows mirrors'],
  ['Laundry care', 'Cleaning', 'clothes detergent washing'],
  ['Surface cleaner', 'Cleaning', 'all purpose countertop kitchen'],
  ['Skin care', 'Skin Care', 'skin skincare moisturizer dry skin'],
  ['Sunburn care', 'First Aid', 'sun burn sunburn cooling skin'],
  ['Bug bite care', 'First Aid', 'insect bites mosquito itch sting'],
  ['Cough comfort', 'Cough & Cold Care', 'cough cold honey throat syrup'],
  ['Clogged drains', 'Home Maintenance', 'blocked sink drain clog plumbing'],
  ['Mouse deterrents', 'Pest Prevention', 'mice mouse repel rodent'],
  ['Spider deterrents', 'Pest Prevention', 'spiders spider repel pest'],
];

const dishCleanerRecipe: StarterRecipe = {
  id: 'builtin:dishCleanerRecipe',
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
  id: 'builtin:dishScrubRecipe',
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
  id: 'builtin:toothpasteRecipe',
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

const bodySoapRecipe: StarterRecipe = {
  id: 'builtin:bodySoapRecipe',
  name: 'Honey & Oat Melt-and-Pour Soap',
  ingredients: [
    '1 lb (454 g) melt-and-pour soap base (goat’s milk, shea butter, or glycerin; follow the base manufacturer’s directions)',
    '2 tablespoons finely ground oatmeal',
    '1 tablespoon honey',
    '10–15 drops skin-safe essential oil (optional; use only an oil approved for the intended use and follow its supplier’s maximum use level)',
  ],
  equipment: [
    'Microwave-safe glass measuring cup or double boiler',
    'Knife and cutting board',
    'Spoon or spatula',
    'Silicone soap mold',
    'Small spray bottle with rubbing alcohol (optional)',
  ],
  instructions: [
    'Cut the soap base into small, even cubes so it melts evenly.',
    'Place the cubes in a microwave-safe glass measuring cup. Heat in short intervals, stirring between each, until melted. Do not boil. If using a double boiler, keep water out of the soap.',
    'Let the melted base cool briefly while it remains pourable. Stir in the honey and finely ground oatmeal. Add essential oil only if it is labeled for skin use, and stay within its supplier’s maximum use level for soap.',
    'Pour the mixture into a clean silicone mold. Avoid splashes and handle the hot container carefully.',
    'If bubbles form on top, lightly mist the surface with rubbing alcohol immediately after pouring, if desired. Keep alcohol away from heat, sparks, and flame.',
    'Leave the mold undisturbed until the bars are fully firm, following the soap-base manufacturer’s cooling directions. Unmold and use as directed for that base.',
  ],
  storage:
    'Let bars cool and dry fully, then store them in a clean, dry place according to the soap-base manufacturer’s instructions. Label with the ingredients and preparation date. No shelf life has been established for this altered formula; discard if the bar changes unexpectedly in appearance or smell.',
  cautions:
    'Owner-supplied, untested formula for external use only. Add-ins may change the base’s texture, lather, or stability; the manufacturer’s directions take priority. Honey can trigger an allergic reaction, and oatmeal or essential oils can irritate skin. Essential oils are optional; do not use them on infants or young children without qualified advice, and stop use if irritation occurs. Avoid eyes, broken or irritated skin, and swallowing. Do not claim this soap treats skin conditions or acts as an antibacterial product. Rubbing alcohol is flammable; keep it away from heat and flame.',
};

const tallowSkinBalmRecipe: StarterRecipe = {
  id: 'builtin:tallowSkinBalmRecipe',
  name: 'Tallow & Olive or Jojoba Balm',
  ingredients: [
    '8 oz (227 g) beef tallow',
    '2 oz (57 g) olive oil or jojoba oil',
    '30–40 drops essential oil (optional; use only a skin-safe oil and follow the supplier’s maximum use level)',
  ],
  equipment: [
    'Small saucepan and double boiler, or another suitable low-heat setup',
    'Spoon or spatula',
    'Clean, dry glass jars or metal tins',
  ],
  instructions: [
    'Place the tallow and olive or jojoba oil in the top of a double boiler. Warm gently until the tallow is fully melted. Avoid overheating and keep water out of the mixture.',
    'Remove from the heat and let the mixture cool until warm but still liquid.',
    'If using essential oil, add only an oil labeled for skin use and stay within the supplier’s maximum use level. Stir thoroughly.',
    'Pour into clean, completely dry jars or tins. Handle the warm mixture carefully.',
    'Leave the containers undisturbed until the balm has fully solidified. Apply a small amount to a small area of intact skin first and stop if irritation occurs.',
  ],
  storage:
    'Close the container after use. Use clean, dry hands or a clean, dry scoop, and keep water out of the balm. Store cool and away from direct sunlight. No safe shelf life has been established for this owner-supplied formula; discard if its appearance or smell changes.',
  cautions:
    'Owner-supplied, untested formula for external use only. It has not been evaluated for treating dry skin or any skin condition. Tallow, plant oils, and essential oils can cause irritation or allergic reactions; essential oil is optional. Do not use on broken, infected, or severely irritated skin, near the eyes, or on infants or young children without qualified advice. Stop use if a reaction occurs. Do not ingest. Warm oils can burn; take care while melting and pouring.',
};

const sunburnFirstAid: StarterRecipe = {
  id: 'builtin:sunburnFirstAid',
  name: 'Cool Compress & Aloe or Soy Moisturizer',
  ingredients: [
    'Cool, clean water or a clean, cool, damp cloth',
    'A plain moisturizer containing aloe or soy for mild sunburn without blisters',
    'Drinking water',
  ],
  equipment: ['Clean washcloth (optional)'],
  instructions: [
    'Move out of the sun and indoors. Use a cool shower or bath, or place a clean, cool, damp cloth on the affected skin. Pat gently dry.',
    'For mild sunburn without blisters, apply a plain moisturizer containing aloe or soy while the skin is still slightly damp. Stop if it stings or causes irritation.',
    'Drink water and protect the affected skin from further sun exposure while it heals. Do not pop blisters or peel skin.',
    'Get medical advice promptly for fever, chills, dizziness, severe or painful blistering, signs of dehydration, or a severe or worsening reaction.',
  ],
  storage:
    'No homemade mixture to store. Keep any moisturizer in its original, labeled container and follow its label directions.',
  cautions:
    'This is general first-aid information, not a homemade sunburn treatment or medical advice. The submitted tallow-and-oil balm is omitted: oil-based products are not recommended on active sunburn by NIH MedlinePlus, and essential oils can irritate injured skin. Do not apply tallow, olive or jojoba oil, peppermint oil, or lavender oil to sunburned skin. Seek medical care for severe symptoms or if you are unsure how serious the burn is.',
};

const glassCleanerRecipe: StarterRecipe = {
  id: 'builtin:glassCleanerRecipe',
  name: 'Vinegar & Alcohol Glass Cleaner',
  ingredients: [
    '1 cup distilled water',
    '¼ cup plain white vinegar (5% acidity)',
    '¼ cup plain rubbing alcohol (70% isopropyl alcohol)',
    '5–10 drops lemon or peppermint essential oil',
  ],
  equipment: [
    'Clean glass spray bottle, at least 16 ounces, with a solvent-compatible sprayer',
    'Funnel',
    'Clean, flat-weave microfiber cloth',
  ],
  instructions: [
    'In a well-ventilated area away from heat, sparks, and flames, use a funnel to pour the distilled water, white vinegar, rubbing alcohol, and essential oil into the spray bottle.',
    'Close the bottle and gently shake before each use. Essential oils may separate and can leave residue; results will vary.',
    'Remove loose grit from the glass with a soft cloth first. Test a small area and check the surface manufacturer’s cleaning directions.',
    'Lightly spray compatible, uncoated window glass and wipe with a clean, flat-weave microfiber cloth. For mirrors, dampen the cloth instead of spraying the mirror to keep liquid away from edges and backing.',
    'Finish with a clean, dry section of the cloth. Clean cool glass out of direct sunlight and avoid overspray onto frames or nearby surfaces. A streak-free finish is not guaranteed.',
  ],
  storage:
    'Label with the ingredients, alcohol strength, and preparation date. Keep tightly closed, upright, and away from heat, sunlight, flames, children, and pets. Do not use a beverage container. No tested shelf life has been established for this exact mixture.',
  cautions:
    'Rubbing alcohol is flammable; keep the ingredients and mixture away from ignition sources and do not heat. Use ventilation, avoid breathing spray, and avoid eyes and skin. Never mix with bleach, ammonia, or other cleaners. Do not use on screens, lenses, tinted or coated glass, acrylic, or specialty glazing unless the manufacturer allows it. Protect natural stone and painted, sealed, or composite frames from vinegar and alcohol. Essential oils can irritate and may leave oily streaks. This is a glass cleaner, not a sanitizer or disinfectant.',
};

const vinegarGlassRecipe: StarterRecipe = {
  id: 'builtin:vinegarGlassRecipe',
  name: 'Two-Ingredient Vinegar Glass Cleaner',
  ingredients: [
    '1 cup plain white vinegar (5% acidity)',
    '1 cup water — distilled if your tap water is hard',
  ],
  equipment: [
    'Clean spray bottle, at least 20 ounces, with room to shake',
    'Microfiber cloth or crumpled newspaper',
  ],
  instructions: [
    'Pour the vinegar and water into a clean spray bottle that has not held other cleaning chemicals. Close the bottle and shake briefly to mix.',
    'Remove loose grit and check the glass manufacturer’s cleaning directions. Test a small area first.',
    'Lightly spray compatible, uncoated glass and wipe immediately with a microfiber cloth or crumpled newspaper. Newspaper ink may transfer to hands or frames; use microfiber if that happens.',
    'For mirrors, dampen the cloth instead of spraying directly to protect edges and backing. Wipe dry, keeping liquid off frames and nearby surfaces. Clean cool glass out of direct sunlight.',
  ],
  storage:
    'Label the bottle with the contents and mixing date. Keep closed and out of reach of children and pets. Do not use a beverage container or a bottle that previously held bleach or other cleaners. No tested shelf life has been established for this exact mixture.',
  cautions:
    'Never mix vinegar with bleach or other cleaners. Avoid eyes and breathing spray. Keep off marble, limestone, and other acid-sensitive surfaces. Do not use on screens, lenses, tinted or coated glass, or specialty glazing unless the manufacturer allows it. Protect painted or sealed frames and mirror backing. Results vary; this cleaner is not a sanitizer or disinfectant.',
};

const laundryPowderRecipe: StarterRecipe = {
  id: 'builtin:laundryPowderRecipe',
  name: 'Mineral Laundry Powder — Booster Formula',
  ingredients: [
    '1½ cups washing soda (sodium carbonate)',
    '1½ cups baking soda (sodium bicarbonate)',
    '½ cup plain Epsom salt (magnesium sulfate)',
    'Optional: 30–40 drops lavender or eucalyptus essential oil',
  ],
  equipment: [
    'Large, dry mixing bowl',
    'Spoon or whisk',
    'Airtight, labeled container',
    'Dry measuring spoon',
  ],
  instructions: [
    'Gently stir the washing soda, baking soda, and Epsom salt together in a dry bowl until evenly blended and free of clumps. Avoid raising or breathing dust.',
    'If including the optional essential oil, drizzle it over the powder and stir thoroughly. Fragrance is not necessary for cleaning and can irritate sensitive skin.',
    'Transfer to an airtight container and label with the ingredients and mixing date.',
    'The submitted recipe suggests 2 tablespoons for a normal load or 4 tablespoons for a large, heavily soiled load, placed in the drum before clothing. These doses and this placement have not been validated for this blend or for HE machines. Follow washer, garment, detergent, and ingredient-label directions; do not use this formula where they conflict.',
    'This blend contains no soap or detergent surfactant. Do not use it as a replacement for laundry detergent. Use a labeled laundry product if compatibility or dosing is uncertain.',
  ],
  storage:
    'Keep tightly closed and dry, with a dry scoop, away from children and pets. Do not store in a food container. No tested shelf life has been established for the blend, especially with essential oils added.',
  cautions:
    'Owner-supplied, untested booster formula; not a complete detergent or disinfectant. Epsom salt adds magnesium, a contributor to water hardness, and is not established here as a fabric softener. Washing soda is alkaline and can irritate skin and eyes; handle according to its label. Avoid use on wool, silk, or other alkali-sensitive fabrics unless their care instructions allow it. Essential oils can cause irritation or leave residue. Machine compatibility, cleaning performance, and the suggested doses have not been verified. Do not combine with other cleaners beyond what their labels expressly permit.',
};

const surfaceCleanerRecipe: StarterRecipe = {
  id: 'builtin:surfaceCleanerRecipe',
  name: 'Vinegar & Dish Soap Surface Cleaner',
  ingredients: [
    '1 cup plain white vinegar (5% acidity)',
    '1 cup distilled water',
    '1 teaspoon plain dishwashing liquid, without bleach — not castile soap',
  ],
  equipment: [
    'Clean glass spray bottle, at least 20 ounces, with room to mix',
    'Soft cleaning cloth',
    'Clean water for rinsing',
  ],
  instructions: [
    'Check the dishwashing liquid label: use only a product whose manufacturer permits mixing with vinegar. Do not use bleach-containing, disinfecting, or otherwise incompatible products.',
    'Pour the distilled water and vinegar into a clean bottle that has not held other cleaners. Add the dishwashing liquid, close, and roll or shake gently to combine without excessive foam.',
    'Check the surface manufacturer’s care instructions and spot-test an inconspicuous area. Use only where acidic cleaners are permitted.',
    'Lightly dampen a soft cloth with the cleaner and wipe the compatible surface, keeping liquid away from joints, grout, electrical parts, and surrounding sensitive materials.',
    'Remove soap residue with a clean, water-dampened cloth and dry. Rinse food-contact surfaces thoroughly with clean water. For glass, use sparingly and wipe dry; soap can leave streaks.',
  ],
  storage:
    'Label with ingredients and mixing date. Keep closed, upright, and out of reach of children and pets. Do not use a beverage container. No tested shelf life has been established for this mixture.',
  cautions:
    'Never mix with bleach, ammonia, disinfectants, or other cleaners. Do not heat. Avoid eyes and breathing spray; use ventilation. Exclude natural-stone and engineered-stone counters, including marble, granite, soapstone, and quartz, as well as wood floors or furniture, grout, screens, and electronics. Acid can damage stone, sealers, finishes, grout, and coatings; the mechanism and susceptibility vary by material. Fiberglass, glazed ceramic, porcelain, laminate, stainless steel, fixtures, stovetops, and microwave interiors are candidates only when their manufacturers allow acidic cleaners; no blanket compatibility is promised. Protect appliance openings and controls and never spray inside a powered appliance. This cleaner is not a sanitizer or disinfectant.',
};

const shampooRecipe: StarterRecipe = {
  id: 'builtin:shampooRecipe',
  name: 'Simple Castile Soap Shampoo',
  ingredients: [
    '¼ cup distilled water',
    '¼ cup liquid castile soap — unscented or lavender',
    '½ teaspoon jojoba oil or olive oil — omit for naturally very oily hair',
    '8–10 drops rosemary or peppermint essential oil',
  ],
  equipment: ['Clean, dry shampoo bottle with a cap', 'Small funnel'],
  instructions: [
    'Use a thoroughly cleaned, rinsed, and dried shampoo bottle without leftover product. Pour in the distilled water and liquid castile soap.',
    'Add the jojoba or olive oil if using, followed by the essential oil. Close the bottle and shake gently to blend.',
    'Gently mix before each use as ingredients may separate. The mixture will be thinner than commercial gel shampoo.',
    'Wet hair thoroughly. Apply a small amount to the scalp and roots, massage gently, and rinse thoroughly with water. Avoid eyes. Stop use if irritation, unusual dryness, tangling, or residue develops.',
  ],
  storage:
    'Label with ingredients and preparation date and keep tightly closed. Distilled water does not preserve the mixture; adding water changes the soap’s preservation. Follow the soap manufacturer’s dilution and storage guidance. No tested shelf life has been established for this exact formula. Do not top up an old batch or let shower water enter the bottle.',
  cautions:
    'Owner-supplied, untested rinse-off formula. Castile soap is alkaline; adding oil does not lower its pH or establish that it protects hair from damage. It can leave residue, particularly in hard water, and may be unsuitable for dyed or chemically treated hair. Check your hair-treatment provider’s guidance. Essential oils may irritate the scalp and eyes; this formula is not a proven hair-growth treatment. Do not use on children or an irritated or broken scalp. Keep away from children and pets. Do not add vinegar or other acids to the soap bottle.',
};

const twoStepHairRecipe: StarterRecipe = {
  id: 'builtin:twoStepHairRecipe',
  name: 'Two-Step Baking Soda Wash & ACV Rinse',
  ingredients: [
    'Wash: 1 tablespoon baking soda + 1 cup warm water',
    'Separate rinse: 1–2 tablespoons plain apple cider vinegar (5% acidity) + 1 cup water',
  ],
  equipment: [
    'Two clean, clearly labeled containers',
    'Measuring cup and tablespoon',
    'Spoon',
  ],
  instructions: [
    'For the wash, stir the baking soda into 1 cup of warm water until dissolved. Do not add extra powder to make the liquid cloudy.',
    'In a second container, mix the apple cider vinegar with 1 cup of water. Keep the wash and rinse separate; never combine them in a closed container.',
    'Submitted method, not a validated hair-care recommendation: apply the baking soda solution to wet scalp and roots, massage for 1–2 minutes, and rinse thoroughly with warm water. It will not lather. These contact times have not been established as safe for this formula.',
    'The submitted second step applies the diluted ACV to hair lengths and ends for 30 seconds, followed by a thorough cool-water rinse. Avoid the scalp and eyes. Rinse immediately if stinging occurs; the suggested contact time has not been validated.',
  ],
  storage:
    'Prepare the two solutions fresh and separately for a single use; discard leftovers. Label each container and keep away from children and pets. Do not store or mix them in a sealed bottle together.',
  cautions:
    'Owner-supplied, untested method. Baking soda is alkaline and diluted vinegar is acidic; either can irritate, and alkaline washing may increase hair friction and damage. A vinegar rinse does not establish that prior damage is reversed or that the routine is pH-balanced. No safe frequency has been established: once or twice weekly is not a verified safe limit. This is not a replacement for a formulated shampoo and conditioner. Avoid on children, irritated or broken scalp, or dyed, chemically treated, or damaged hair. Stop with irritation, dryness, tangling, or breakage and seek professional advice. Vinegar odor may linger; disappearance is not guaranteed.',
};

const deodorantRecipe: StarterRecipe = {
  id: 'builtin:deodorantRecipe',
  name: 'Three-Ingredient Coconut Deodorant',
  ingredients: [
    '3 tablespoons coconut oil — softened, not fully melted',
    '2 tablespoons baking soda',
    '2 tablespoons arrowroot powder or cornstarch',
  ],
  equipment: [
    'Small, clean, dry bowl',
    'Fork',
    'Clean, dry jar with a lid',
    'Clean, dry scoop',
  ],
  instructions: [
    'Mash the softened coconut oil, baking soda, and arrowroot powder or cornstarch together with a fork until evenly blended into a smooth paste.',
    'Transfer to a clean, dry jar and label with the ingredients and preparation date.',
    'The submitted method uses a pea-sized amount spread gently onto clean, dry underarm skin. This amount has not been independently evaluated for this formula. Use a clean, dry scoop or clean, dry finger; avoid dipping wet or soiled fingers into the jar.',
    'Do not apply to broken, irritated, or freshly shaved skin. Stop immediately if burning, redness, itching, or rash occurs; wash off gently. Seek medical advice if symptoms persist or are severe.',
  ],
  storage:
    'Keep covered, cool, and dry, away from children and pets. Coconut oil softens in warmth; texture may change and the mixture may separate. Keep water out of the jar. No tested shelf life has been established for this exact formula.',
  cautions:
    'Owner-supplied, untested deodorant formula. Baking soda is alkaline and can cause underarm irritation, especially on sensitive skin; a small-area trial does not rule out a later reaction. This is not an antiperspirant and does not stop sweating. Odor and moisture-control results vary and are not guaranteed. Coconut oil may leave marks on clothing. If irritation occurs, discontinue rather than switching immediately to another homemade formula; magnesium-based alternatives are not automatically non-irritating.',
};

const tallowDeodorantRecipe: StarterRecipe = {
  id: 'builtin:tallowDeodorantRecipe',
  name: 'Tallow & Orange Deodorant',
  ingredients: [
    '3 tablespoons rendered beef tallow — gently softened',
    '1 tablespoon coconut oil',
    '2 tablespoons arrowroot powder or cornstarch',
    '1 tablespoon baking soda',
    '15–20 drops sweet orange essential oil',
  ],
  equipment: [
    'Small glass mixing bowl',
    'Separate dry container for powders',
    'Fork or small spatula',
    'Clean, dry glass jar with a lid',
    'Clean, dry scoop',
  ],
  instructions: [
    'Combine the tallow and coconut oil in the glass bowl. If firm, gently warm the bowl in warm water, keeping water out of the mixture, until the fats are soft like room-temperature butter. Do not overheat or fully melt.',
    'In a separate dry container, stir the arrowroot powder or cornstarch and baking soda together, breaking up lumps.',
    'Add the powders to the softened fats. Mash and stir with a fork or spatula until a smooth, creamy paste forms.',
    'Add the sweet orange essential oil and stir thoroughly for about 30 seconds. Use only a product whose supplier supports skin use at the intended concentration; drop sizes vary, so the drop count does not verify a safe concentration.',
    'Transfer to the clean, dry jar, close the lid, and label with ingredients and preparation date.',
    'The submitted method uses a pea-sized amount warmed between clean, dry fingertips and spread over clean, dry underarms. This amount has not been independently evaluated. Use a clean, dry scoop or finger; avoid broken, irritated, or freshly shaved skin.',
  ],
  storage:
    'Keep tightly closed, cool, dry, and away from direct sunlight, children, and pets. Keep water and wet fingers out. Ingredient age, handling, and storage affect stability; a 6–12 month shelf life has not been established for this exact blend. Discard if the odor, color, or texture changes or contamination is suspected; normal appearance does not prove safety.',
  cautions:
    'Owner-supplied, untested deodorant formula containing animal-derived tallow. Baking soda and essential oil may cause irritation or allergy. Stop immediately and gently wash off if burning, itching, redness, or rash occurs; seek medical advice if symptoms persist or are severe. This is not an antiperspirant and does not prevent sweating. Odor-control, wetness absorption, and antibacterial effects have not been verified for the finished blend. Oils and fats may mark clothing. Do not ingest.',
};

const weedControlRecipe: StarterRecipe = {
  id: 'builtin:weedControlRecipe',
  name: 'Vinegar, Salt & Dish Soap Weed Spray',
  ingredients: [
    '1 US gallon plain household white vinegar (5% acidity only)',
    '1 cup table salt',
    '1 tablespoon plain liquid dishwashing detergent — without bleach, not castile soap',
  ],
  equipment: [
    'Dedicated, clearly labeled chemical-compatible container or garden sprayer larger than 1 gallon',
    'Measuring cup and tablespoon',
    'Gloves and eye protection',
  ],
  instructions: [
    'This is a submitted formula for reference, not a recommended general garden treatment. Consider hand-pulling weeds or using a labeled product suitable for the site instead; salt can harm soil and nearby plants through runoff.',
    'If preparing the submitted formula, use only 5% household vinegar and a dishwashing detergent whose manufacturer permits mixing with vinegar. Do not substitute 10% or 20% horticultural vinegar or add other cleaners.',
    'Put the salt into the dedicated container, add the vinegar, close, and gently mix until the salt dissolves. Leave room in the container; a full gallon bottle is too small for a gallon of vinegar plus the other ingredients.',
    'Add the dishwashing liquid last and stir or roll gently to limit foam. Label the container with all ingredients and preparation date.',
    'Do not apply to lawns, garden beds, edible crops, tree-root zones, soil intended for planting, or anywhere runoff can reach plants, drains, or waterways. Cracks and gravel are not isolated from surrounding soil, so they are not automatically suitable.',
    'Where site suitability has been established, avoid wind, rain, overspray, and runoff and target only unwanted foliage. Do not soak soil or automatically reapply after rain. Household vinegar may scorch leaves without killing roots; regrowth is possible.',
  ],
  storage:
    'Keep in a closed, compatible, clearly labeled container away from children, pets, food, and feed. Never use a beverage container or reuse the sprayer for edible plants. No tested shelf life has been established for this mixture. Do not pour leftovers into drains or onto soil; follow local household-chemical disposal guidance.',
  cautions:
    'Owner-supplied, untested formula. Non-selective: it can damage desirable plants, but complete weed kill is not guaranteed. Salt can accumulate or move with water and harm soil, roots, and waterways; duration depends on dose and site, so no permanent weed-free result is promised. Vinegar can damage paving, stone, metal, and finishes. Avoid skin, eyes, and breathing spray; use ventilation while mixing. Keep people and pets away from application and prevent contact with treated vegetation. Never mix with bleach or other cleaners. Concentrated horticultural vinegar can cause serious skin and eye injury and is excluded from this recipe. Natural does not mean safe for people, pets, or the environment.',
};

const saltFreeWeedRecipe: StarterRecipe = {
  id: 'builtin:saltFreeWeedRecipe',
  name: 'Salt-Free Vinegar Weed Spray',
  ingredients: [
    '2 cups plain household white vinegar (5% acidity only)',
    '1 teaspoon plain liquid dishwashing detergent — without bleach, not castile soap',
  ],
  equipment: [
    'Dedicated, clearly labeled spray bottle larger than 16 ounces',
    'Measuring cup and teaspoon',
    'Gloves and eye protection',
  ],
  instructions: [
    'Check that the dishwashing detergent manufacturer permits mixing with vinegar. Use only 5% household vinegar, never concentrated horticultural vinegar.',
    'Pour the vinegar into a clean, dedicated spray bottle with room for the dishwashing liquid and mixing. Add the detergent, close, and gently roll or swirl to combine without excessive foam.',
    'Consider hand-pulling first. Where site suitability has been established, target only unwanted foliage and avoid wind, overspray, runoff, desirable plants, drains, and waterways. Do not soak soil.',
    'Check results before considering any further treatment. Leaf damage does not guarantee root kill, and deep-rooted perennial weeds may regrow. No fixed one-week repeat schedule has been validated for this formula.',
  ],
  storage:
    'Label with ingredients and mixing date. Keep closed and away from children, pets, food, and feed. Never use a beverage container or reuse the bottle for edible plants. No tested shelf life has been established. Follow local household-chemical disposal guidance rather than pouring leftovers into drains or onto soil.',
  cautions:
    'Owner-supplied, untested contact-treatment formula. Salt-free does not mean harmless to soil, plants, people, pets, or the environment. Vinegar and dishwashing detergent can damage desirable foliage and affect nearby soil or organisms; avoid broad application and runoff. Non-selective: keep off lawns, garden plants, edible crops, and tree-root zones. It may damage stone, paving, metal, or finishes. Avoid eyes, skin contact, and breathing spray. Keep people and pets away during application and prevent contact with treated vegetation. Never mix with bleach or other cleaners.',
};

const draftCatalog: Guide[] = topics.map(([title, category, keywords]) => ({
  id: `natural-${title.toLowerCase().replace(/ /g, '-')}`,
  title,
  category,
  prompt:
    title === 'Dish cleaner'
      ? 'Two options for hand-washing dishes'
      : title === 'Glass cleaner'
      ? 'Two options for compatible window glass'
      : title === 'Body soap'
      ? 'Honey and oatmeal melt-and-pour soap'
      : title === 'Skin care'
      ? 'Tallow balm with olive or jojoba oil'
      : title === 'Sunburn care'
      ? 'Cooling first aid for mild sunburn'
      : title === 'Laundry care'
      ? 'Mineral laundry booster formula'
      : title === 'Surface cleaner'
      ? 'Vinegar and dish soap for compatible surfaces'
      : title === 'Shampoo'
      ? 'Two owner-supplied hair-washing methods'
      : title === 'Deodorant'
      ? 'Two cream deodorant formulas'
      : title === 'Weed killer'
      ? 'Two vinegar-based formulas with site restrictions'
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
      : title === 'Body soap'
      ? [bodySoapRecipe]
      : title === 'Skin care'
      ? [tallowSkinBalmRecipe]
      : title === 'Sunburn care'
      ? [sunburnFirstAid]
      : title === 'Glass cleaner'
      ? [glassCleanerRecipe, vinegarGlassRecipe]
      : title === 'Laundry care'
      ? [laundryPowderRecipe]
      : title === 'Surface cleaner'
      ? [surfaceCleanerRecipe]
      : title === 'Shampoo'
      ? [shampooRecipe, twoStepHairRecipe]
      : title === 'Deodorant'
      ? [deodorantRecipe, tallowDeodorantRecipe]
      : title === 'Weed killer'
      ? [weedControlRecipe, saltFreeWeedRecipe]
      : [],
  safetyNote:
    title === 'Toothpaste'
      ? 'Fluoride-free and untested. Review this formula with a dentist before oral use. Natural ingredients do not establish dental safety or cavity protection.'
      : title === 'Sunburn care'
      ? 'Sunburn is a burn injury. This entry covers mild self-care only; do not rely on it for a severe burn or other urgent symptoms.'
      : 'Use at your own risk. Natural does not automatically mean safe or effective. Follow product-specific cautions and do not mix cleaning products.',
  professionalHelp: [],
  evidence: 'Limited',
  evidenceNote:
    title === 'Dish cleaner'
      ? 'Owner-supplied recipes. These exact methods have not been independently tested for effectiveness or compatibility; shelf life has not been established for the mixed cleaner.'
      : title === 'Sunburn care'
      ? 'General first-aid steps based on public dermatology and NIH MedlinePlus guidance. This is not individualized medical advice.'
      : 'Community votes do not establish safety or effectiveness.',
  updatedAt: '',
}));

// Keep supplied recipes visible with prominent, topic-specific safety context.
export const productCatalog: Guide[] = draftCatalog.map(guide => {
  if (guide.category === 'Personal Care' || guide.category === 'Skin Care')
    return {
      ...guide,
      reviewNotice:
        'Owner-supplied, untested formulas. Qualified review of ingredient grades, concentrations, compatibility, and preservation has not been completed. These recipes are not medical or dental advice. Read each recipe’s cautions and seek appropriate professional advice before use.',
    };
  if (guide.id === 'natural-weed-killer')
    return {
      ...guide,
      reviewNotice:
        'Vinegar mixtures can damage nearby plants. Salt can persist in soil and harm plants through runoff. Read the site restrictions and cautions before considering either formula; hand-pulling avoids introducing these mixtures into the environment.',
    };
  return guide;
});
