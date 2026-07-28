export type GuideCategory =
  | 'Personal Care'
  | 'Cleaning'
  | 'Home Maintenance'
  | 'Household Services';

export type AnswerTone = 'yes' | 'depends' | 'no';
export type Difficulty = 'Easy' | 'Moderate' | 'Advanced';

export type AvoidItem = {
  name: string;
  reason: string;
};

export type BetterOption = {
  name: string;
  detail: string;
  label: 'USE LESS' | 'SIMPLE SWAP' | 'DIY FIRST' | 'PRODUCT';
};

export type Guide = {
  id: string;
  title: string;
  prompt: string;
  category: GuideCategory;
  icon: string;
  answer: string;
  answerTone: AnswerTone;
  summary: string;
  time: string;
  estimatedCost: string;
  estimatedSavings: string;
  difficulty: Difficulty;
  supplies: string[];
  essentials: string[];
  skipNote: string;
  avoid: AvoidItem[];
  options: BetterOption[];
  safetyNote: string;
  professionalHelp: string[];
  evidence: 'Strong' | 'Moderate' | 'Limited';
  evidenceNote: string;
  updatedAt: string;
  featured?: boolean;
};
