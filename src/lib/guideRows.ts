import type { Guide } from '../types';

export type GuideRow = {
  slug: string;
  title: string;
  prompt: string;
  category: Guide['category'];
  icon: string;
  answer: string;
  answer_tone: Guide['answerTone'];
  summary: string;
  time: string;
  estimated_cost: string;
  estimated_savings: string;
  difficulty: Guide['difficulty'];
  supplies: Guide['supplies'];
  essentials: Guide['essentials'];
  skip_note: string;
  avoid: Guide['avoid'];
  options: Guide['options'];
  safety_note: string;
  professional_help: Guide['professionalHelp'];
  evidence: Guide['evidence'];
  evidence_note: string;
  updated_at_label: string;
  featured: boolean;
};

const stringFields = [
  'slug',
  'title',
  'prompt',
  'icon',
  'answer',
  'summary',
  'time',
  'estimated_cost',
  'estimated_savings',
  'skip_note',
  'safety_note',
  'evidence_note',
  'updated_at_label',
] as const;

const guideStringFields = [
  'id',
  'title',
  'prompt',
  'icon',
  'answer',
  'summary',
  'time',
  'estimatedCost',
  'estimatedSavings',
  'skipNote',
  'safetyNote',
  'evidenceNote',
  'updatedAt',
] as const;

const guideCategories: readonly Guide['category'][] = [
  'Personal Care',
  'Cleaning',
  'Home Maintenance',
  'Household Services',
];
const answerTones: readonly Guide['answerTone'][] = ['yes', 'depends', 'no'];
const difficulties: readonly Guide['difficulty'][] = [
  'Easy',
  'Moderate',
  'Advanced',
];
const evidenceRatings: readonly Guide['evidence'][] = [
  'Strong',
  'Moderate',
  'Limited',
];
const optionLabels: readonly Guide['options'][number]['label'][] = [
  'USE LESS',
  'SIMPLE SWAP',
  'DIY FIRST',
  'PRODUCT',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isAvoidItems(value: unknown): value is Guide['avoid'] {
  return (
    Array.isArray(value) &&
    value.every(
      item =>
        isRecord(item) &&
        typeof item.name === 'string' &&
        typeof item.reason === 'string',
    )
  );
}

function isOptions(value: unknown): value is Guide['options'] {
  return (
    Array.isArray(value) &&
    value.every(
      item =>
        isRecord(item) &&
        typeof item.name === 'string' &&
        typeof item.detail === 'string' &&
        optionLabels.includes(item.label as Guide['options'][number]['label']),
    )
  );
}

export function isGuideRow(value: unknown): value is GuideRow {
  if (!isRecord(value)) return false;

  return (
    stringFields.every(field => typeof value[field] === 'string') &&
    guideCategories.includes(value.category as Guide['category']) &&
    answerTones.includes(value.answer_tone as Guide['answerTone']) &&
    difficulties.includes(value.difficulty as Guide['difficulty']) &&
    evidenceRatings.includes(value.evidence as Guide['evidence']) &&
    isStringArray(value.supplies) &&
    isStringArray(value.essentials) &&
    isAvoidItems(value.avoid) &&
    isOptions(value.options) &&
    isStringArray(value.professional_help) &&
    typeof value.featured === 'boolean'
  );
}

export function isGuide(value: unknown): value is Guide {
  if (!isRecord(value)) return false;

  return (
    guideStringFields.every(field => typeof value[field] === 'string') &&
    guideCategories.includes(value.category as Guide['category']) &&
    answerTones.includes(value.answerTone as Guide['answerTone']) &&
    difficulties.includes(value.difficulty as Guide['difficulty']) &&
    evidenceRatings.includes(value.evidence as Guide['evidence']) &&
    isStringArray(value.supplies) &&
    isStringArray(value.essentials) &&
    isAvoidItems(value.avoid) &&
    isOptions(value.options) &&
    isStringArray(value.professionalHelp) &&
    (value.featured === undefined || typeof value.featured === 'boolean')
  );
}

export function mapGuideRow(row: GuideRow): Guide {
  return {
    id: row.slug,
    title: row.title,
    prompt: row.prompt,
    category: row.category,
    icon: row.icon,
    answer: row.answer,
    answerTone: row.answer_tone,
    summary: row.summary,
    time: row.time,
    estimatedCost: row.estimated_cost,
    estimatedSavings: row.estimated_savings,
    difficulty: row.difficulty,
    supplies: row.supplies,
    essentials: row.essentials,
    skipNote: row.skip_note,
    avoid: row.avoid,
    options: row.options,
    safetyNote: row.safety_note,
    professionalHelp: row.professional_help,
    evidence: row.evidence,
    evidenceNote: row.evidence_note,
    updatedAt: row.updated_at_label,
    featured: row.featured,
  };
}

export function mapGuideRows(value: unknown): Guide[] {
  if (!Array.isArray(value) || !value.every(isGuideRow)) {
    throw new Error('Supabase returned an invalid guides payload.');
  }

  return value.map(mapGuideRow);
}

export function parseCachedGuides(value: string | null): Guide[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every(isGuide) ? parsed : [];
  } catch {
    return [];
  }
}
