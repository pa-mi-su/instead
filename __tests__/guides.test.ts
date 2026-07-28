import { categories, guides } from '../src/data/guides';

describe('offline guide catalog', () => {
  it('contains unique, searchable guides with practical safety information', () => {
    expect(guides.length).toBeGreaterThan(0);
    expect(new Set(guides.map(guide => guide.id)).size).toBe(guides.length);

    for (const guide of guides) {
      expect(categories).toContain(guide.category);
      expect(guide.title).toBeTruthy();
      expect(guide.summary).toBeTruthy();
      expect(guide.time).toBeTruthy();
      expect(guide.estimatedCost).toBeTruthy();
      expect(guide.estimatedSavings).toBeTruthy();
      expect(guide.supplies.length).toBeGreaterThan(0);
      expect(guide.essentials.length).toBeGreaterThan(0);
      expect(guide.options.length).toBeGreaterThan(0);
      expect(guide.avoid.length).toBeGreaterThan(0);
      expect(guide.safetyNote).toBeTruthy();
      expect(guide.professionalHelp.length).toBeGreaterThan(0);
    }
  });

  it('includes at least one household-service guide', () => {
    expect(guides.some(guide => guide.category === 'Household Services')).toBe(
      true,
    );
  });
});
