export type ProductRecord = {
  product_name?: string;
  abbreviated_product_name?: string;
  generic_name?: string;
  brands?: string;
  categories?: string;
  categories_tags?: string[];
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
    /\b(tooth\s?paste(?:s)?|dentifrice(?:s)?|tooth powder|oral hygiene)\b/,
    'natural-toothpaste',
  ],
  [/\b(shampoo|shampoos)\b/, 'natural-shampoo'],
  [
    /\b(deodorant|deodorants|antiperspirant|antiperspirants)\b/,
    'natural-deodorant',
  ],
  [
    /\b(dish soap|dishwashing|dish detergent|washing up liquid)\b/,
    'natural-dish-cleaner',
  ],
  [
    /\b(laundry detergent|laundry soap|washing powder|fabric softener)\b/,
    'natural-laundry-care',
  ],
  [
    /\b(window cleaner|glass cleaner|glass and window cleaner)\b/,
    'natural-glass-cleaner',
  ],
  [
    /\b(all purpose cleaner|multi purpose cleaner|surface cleaner|countertop cleaner)\b/,
    'natural-surface-cleaner',
  ],
  [
    /\b(weed killer|weedkiller|herbicide|weed control)\b/,
    'natural-weed-killer',
  ],
  [
    /\b(body wash|body soaps?|shower gel|bath soaps?|hand soaps?)\b/,
    'natural-body-soap',
  ],
  [
    /\b(moisturizer|moisturiser|face cream|skin cream|body lotion|skin care|skincare)\b/,
    'natural-skin-care',
  ],
  [/\b(drain cleaner|pipe cleaner|drain opener)\b/, 'natural-clogged-drains'],
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
  const barcode = value.trim();
  return /^(?:\d{8}|\d{12,14})$/.test(barcode) ? barcode : null;
}

export function classifyProduct(product: ProductRecord): string | null {
  const source = [
    product.product_name,
    product.abbreviated_product_name,
    product.generic_name,
    product.categories,
    ...(product.categories_tags ?? []),
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
  const name =
    product.product_name?.trim() ||
    product.abbreviated_product_name?.trim() ||
    product.generic_name?.trim() ||
    '';
  if (!name) return null;

  return {
    barcode,
    name,
    brand: product.brands?.split(',')[0]?.trim() ?? '',
    productType: product.product_type?.trim() ?? '',
    guideId: classifyProduct(product),
  };
}

export async function lookupBarcodeProduct(
  rawBarcode: string,
): Promise<BarcodeProduct | null> {
  const barcode = normalizeBarcode(rawBarcode);
  if (!barcode)
    throw new Error('That barcode could not be read. Please try again.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const fields = [
    'product_name',
    'abbreviated_product_name',
    'generic_name',
    'brands',
    'categories',
    'categories_tags',
    'product_type',
  ].join(',');

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v3/product/${barcode}?product_type=all&cc=us&lc=en&fields=${fields}`,
      {
        headers: { 'User-Agent': 'INSTEAD/1.0 (https://insteadtry.com)' },
        signal: controller.signal,
      },
    );
    if (response.status === 404) return null;
    if (!response.ok)
      throw new Error('The product lookup service is unavailable.');
    return parseProductLookup(barcode, await response.json());
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
