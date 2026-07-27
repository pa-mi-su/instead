export type RoutineCategory =
  | "Body"
  | "Bathroom"
  | "Laundry"
  | "Kitchen"
  | "Home";

export type AnswerTone = "yes" | "depends" | "no";

export type AvoidItem = {
  name: string;
  reason: string;
};

export type BetterOption = {
  name: string;
  detail: string;
  label: "USE LESS" | "SIMPLE SWAP" | "PRODUCT";
};

export type Routine = {
  id: string;
  title: string;
  prompt: string;
  category: RoutineCategory;
  icon: string;
  answer: string;
  answerTone: AnswerTone;
  summary: string;
  essentials: string[];
  skipNote: string;
  avoid: AvoidItem[];
  options: BetterOption[];
  evidence: "Strong" | "Moderate" | "Limited";
  evidenceNote: string;
  updatedAt: string;
  featured?: boolean;
};
