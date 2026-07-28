import { Guide } from '../types';

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
