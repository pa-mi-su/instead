import {
  type GuideRow,
  isGuide,
  mapGuideRow,
  mapGuideRows,
  parseCachedGuides,
} from '../src/lib/guideRows';

const row: GuideRow = {
  slug: 'sample-guide',
  title: 'Sample guide',
  prompt: 'Can I try this?',
  category: 'Home Maintenance',
  icon: '○',
  answer: 'Yes.',
  answer_tone: 'yes',
  summary: 'A short summary.',
  time: '5 minutes',
  estimated_cost: '$0',
  estimated_savings: '$10',
  difficulty: 'Easy',
  supplies: ['Water'],
  essentials: ['Start safely.'],
  skip_note: 'Skip it when needed.',
  avoid: [{ name: 'A hazard', reason: 'It is unsafe.' }],
  options: [
    {
      name: 'A better option',
      detail: 'Try this first.',
      label: 'DIY FIRST',
    },
  ],
  safety_note: 'Use care.',
  professional_help: ['Call a professional when needed.'],
  evidence: 'Moderate',
  evidence_note: 'Evidence varies.',
  updated_at_label: 'July 2026',
  featured: true,
};

describe('Supabase guide rows', () => {
  it('maps database column names to the app guide model', () => {
    expect(mapGuideRow(row)).toEqual(
      expect.objectContaining({
        id: 'sample-guide',
        answerTone: 'yes',
        estimatedCost: '$0',
        safetyNote: 'Use care.',
        updatedAt: 'July 2026',
      }),
    );
  });

  it('rejects malformed Supabase payloads before they reach the UI', () => {
    expect(() =>
      mapGuideRows([{ ...row, professional_help: 'not-an-array' }]),
    ).toThrow('Supabase returned an invalid guides payload.');
  });

  it('maps an entire valid Supabase response', () => {
    expect(mapGuideRows([row])).toHaveLength(1);
  });

  it('validates cached guides before rendering them', () => {
    const guide = mapGuideRow(row);

    expect(isGuide(guide)).toBe(true);
    expect(parseCachedGuides(JSON.stringify([guide]))).toEqual([guide]);
    expect(parseCachedGuides(JSON.stringify([{ id: 'broken' }]))).toEqual([]);
  });
});
