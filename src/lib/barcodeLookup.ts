export type ProductRecord = {
  product_name?: string;
  product_name_en?: string;
  abbreviated_product_name?: string;
  generic_name?: string;
  generic_name_en?: string;
  brands?: string;
  categories?: string;
  categories_tags?: string[];
  categories_hierarchy?: string[];
  categories_old?: string;
  product_type?: string;
};

export type BarcodeProduct = {
  barcode: string;
  name: string;
  brand: string;
  productType: string;
  guideId: string | null;
};

type ProductLookupResponse = {
  status?: number | string;
  product?: ProductRecord;
};

const categoryMatches: [RegExp, string][] = [
  [
    /\b(tooth\s?paste(?:s)?|dentifrice(?:s)?|tooth powder|tooth gel|dental cream|oral care|oral hygiene)\b/,
    'natural-toothpaste',
  ],
  [/\b(shampoo(?:s|ing)?|hair cleanser|hair cleansing)\b/, 'natural-shampoo'],
  [
    /\b(deodorant(?:s)?|antiperspirant(?:s)?|underarm deodorant)\b/,
    'natural-deodorant',
  ],
  [
    /\b(dish cleaners?|dish soap|dishwashing|dish detergent|dish liquid|washing up liquid|washing-up liquid)\b/,
    'natural-dish-cleaner',
  ],
  [
    /\b(laundry(?: care| detergent| soap| powder)?|washing powder|clothes washing detergent|fabric softener)\b/,
    'natural-laundry-care',
  ],
  [
    /\b(window cleaner|glass cleaner|glass and window cleaner|window washing)\b/,
    'natural-glass-cleaner',
  ],
  [
    /\b(all purpose cleaner|multi purpose cleaner|surface cleaner|countertop cleaner|household cleaner)\b/,
    'natural-surface-cleaner',
  ],
  [
    /\b(weed killer|weedkiller|herbicide|weed control|weed destroyer)\b/,
    'natural-weed-killer',
  ],
  [
    /\b(body wash|body soaps?|shower gel|bath soaps?|hand soaps?|bar soaps?|soap bars?|toilet soaps?|solid soaps?|handmade soaps?|soaps?)\b/,
    'natural-body-soap',
  ],
  [
    /\b(moisturizer|moisturiser|face cream|skin cream|body lotion|skin care|skincare|after sun lotion)\b/,
    'natural-skin-care',
  ],
  [
    /\b(clogged drains?|drain cleaners?|drain openers?|pipe cleaners?|blocked drains?|sink uncloggers?)\b/,
    'natural-clogged-drains',
  ],
  [/\b(sunburn|sun burn|after sun|sunburn relief)\b/, 'natural-sunburn-care'],
  [
    /\b(bug bite|insect bite|mosquito bite|bite relief|sting relief)\b/,
    'natural-bug-bite-care',
  ],
  [
    /\b(cough comfort|cough drops?|cough syrup|throat lozenges?|cough and cold|cold remedies?)\b/,
    'natural-cough-comfort',
  ],
  [
    /\b(mouse|mice|rodent)(?:s)?(?:\s+(?:repellent|deterrent|control|prevention))?\b/,
    'natural-mouse-deterrents',
  ],
  [
    /\b(spiders?|arachnids?)(?:\s+(?:repellent|deterrent|control|prevention))?\b/,
    'natural-spider-deterrents',
  ],
  [
    /\b(roach(?:es)?|cockroaches?)(?:\s+(?:control|prevention|repellent))?\b/,
    'natural-roach-control',
  ],
  [
    /\b(ants?)(?:\s+(?:control|prevention|repellent))?\b/,
    'natural-ant-control',
  ],
];

function normalize(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\ben:/g, '')
    .replace(/[-_]+/g, ' ')
    .toLowerCase();
}

export function normalizeBarcode(value: string): string | null {
  const raw = value.trim();
  // GS1 DataMatrix and Code 128 scans can include an AIM prefix and GTIN AI.
  const gs1 = raw.match(/^(?:\][A-Za-z0-9]{2})?(?:\(01\)|01)(\d{14}).*$/);
  const barcode = gs1?.[1] ?? raw.replace(/[\s-]/g, '');
  return /^(?:\d{8}|\d{12,14})$/.test(barcode) ? barcode : null;
}

function upcEToUpcA(barcode: string): string | null {
  if (!/^[01]\d{6}\d$/.test(barcode)) return null;
  const numberSystem = barcode.charAt(0);
  const digits = barcode.slice(1, 7);
  const checkDigit = barcode.charAt(7);
  const d1 = digits.charAt(0);
  const d2 = digits.charAt(1);
  const d3 = digits.charAt(2);
  const d4 = digits.charAt(3);
  const d5 = digits.charAt(4);
  const d6 = digits.charAt(5);

  switch (d6) {
    case '0':
    case '1':
    case '2':
      return numberSystem + d1 + d2 + d6 + '0000' + d3 + d4 + d5 + checkDigit;
    case '3':
      return numberSystem + d1 + d2 + d3 + '00000' + d4 + d5 + checkDigit;
    case '4':
      return numberSystem + d1 + d2 + d3 + d4 + '00000' + d5 + checkDigit;
    default:
      return numberSystem + d1 + d2 + d3 + d4 + d5 + '0000' + d6 + checkDigit;
  }
}

function lookupCodes(barcode: string, format?: string): string[] {
  const codes = [barcode];
  if (/^\d{8}$/.test(barcode) && format === 'upc-e') {
    const upcA = upcEToUpcA(barcode);
    if (upcA) codes.push(upcA, '0' + upcA);
  } else if (barcode.length === 12) {
    codes.push('0' + barcode);
  } else if (barcode.length === 14 && barcode.startsWith('00')) {
    codes.push(barcode.slice(1), barcode.slice(2));
  } else if (barcode.length === 14 && barcode.startsWith('0')) {
    codes.push(barcode.slice(1));
  } else if (barcode.length === 13 && barcode.startsWith('0')) {
    codes.push(barcode.slice(1));
  }
  return [...new Set(codes)];
}

export function classifyProduct(product: ProductRecord): string | null {
  const source = [
    product.product_name,
    product.product_name_en,
    product.abbreviated_product_name,
    product.generic_name,
    product.generic_name_en,
    product.categories,
    product.categories_old,
    ...(product.categories_tags ?? []),
    ...(product.categories_hierarchy ?? []),
  ]
    .filter(Boolean)
    .join(' ');
  const searchable = normalize(source);
  return (
    categoryMatches.find(([pattern]) => pattern.test(searchable))?.[1] ?? null
  );
}

export function parseProductLookup(
  barcode: string,
  value: unknown,
): BarcodeProduct | null {
  if (typeof value !== 'object' || value === null) return null;
  const response = value as ProductLookupResponse;
  const found =
    response.status === 1 ||
    response.status === 'success' ||
    response.status === 'success_with_errors';
  if (!found || !response.product) return null;

  const product = response.product;
  const guideId = classifyProduct(product);
  const name =
    product.product_name?.trim() ||
    product.product_name_en?.trim() ||
    product.abbreviated_product_name?.trim() ||
    product.generic_name?.trim() ||
    product.generic_name_en?.trim() ||
    (guideId ? 'Unlabeled product' : '');
  if (!name) return null;

  return {
    barcode,
    name,
    brand: product.brands?.split(',')[0]?.trim() ?? '',
    productType: product.product_type?.trim() ?? '',
    guideId,
  };
}

export async function lookupBarcodeProduct(
  rawBarcode: string,
  format?: string,
): Promise<BarcodeProduct | null> {
  const barcode = normalizeBarcode(rawBarcode);
  if (!barcode)
    throw new Error('That barcode could not be read. Please try again.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 16000);
  const fields = [
    'product_name',
    'product_name_en',
    'abbreviated_product_name',
    'generic_name',
    'generic_name_en',
    'brands',
    'categories',
    'categories_tags',
    'categories_hierarchy',
    'categories_old',
    'product_type',
  ].join(',');

  try {
    for (const code of lookupCodes(barcode, format)) {
      const response = await fetch(
        'https://world.openfoodfacts.org/api/v3/product/' +
          code +
          '?product_type=all&cc=us&lc=en&fields=' +
          fields,
        {
          headers: { 'User-Agent': 'INSTEAD/1.0 (https://insteadtry.com)' },
          signal: controller.signal,
        },
      );
      if (response.status === 404) continue;
      if (!response.ok)
        throw new Error('The product lookup service is unavailable.');
      const product = parseProductLookup(barcode, await response.json());
      if (product) return product;
    }
    return null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        'The product lookup took too long. Check your connection and try again.',
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
