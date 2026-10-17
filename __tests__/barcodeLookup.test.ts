import {
  classifyProduct,
  normalizeBarcode,
  parseProductLookup,
} from '../src/lib/barcodeLookup';

describe('barcodeLookup', () => {
  it('accepts standard UPC and EAN lengths and rejects other scans', () => {
    expect(normalizeBarcode('0123456789012')).toBe('0123456789012');
    expect(normalizeBarcode('12345678')).toBe('12345678');
    expect(normalizeBarcode('12-34')).toBeNull();
    expect(normalizeBarcode('QR: 123456789012')).toBeNull();
  });

  it.each([
    [{ product_name: 'Colgate Total Toothpaste' }, 'natural-toothpaste'],
    [{ categories_tags: ['en:hair-shampoos'] }, 'natural-shampoo'],
    [{ generic_name: 'Antiperspirant deodorant' }, 'natural-deodorant'],
    [{ product_name: 'Dishwashing liquid' }, 'natural-dish-cleaner'],
    [{ categories: 'Laundry detergent' }, 'natural-laundry-care'],
    [{ product_name: 'Window cleaner spray' }, 'natural-glass-cleaner'],
    [
      { generic_name: 'Multi purpose surface cleaner' },
      'natural-surface-cleaner',
    ],
    [{ product_name: 'Weed killer concentrate' }, 'natural-weed-killer'],
    [{ categories: 'Body lotion' }, 'natural-skin-care'],
    [{ product_name: 'Mystery household product' }, null],
  ])('classifies only a recognized product category', (product, expected) => {
    expect(classifyProduct(product)).toBe(expected);
  });

  it('parses the small product result and leaves unclear products unmatched', () => {
    expect(
      parseProductLookup('0123456789012', {
        status: 'success',
        product: {
          product_name: 'Fresh Toothpaste',
          brands: 'Example, Brand Two',
          categories_tags: ['en:toothpastes'],
          product_type: 'beauty',
        },
      }),
    ).toEqual({
      barcode: '0123456789012',
      name: 'Fresh Toothpaste',
      brand: 'Example',
      productType: 'beauty',
      guideId: 'natural-toothpaste',
    });

    expect(parseProductLookup('0123456789012', { status: 0 })).toBeNull();
  });
});
