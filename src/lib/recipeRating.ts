export type RecipeRating = {
  score: number;
  upvotes: number;
  downvotes: number;
  my_vote: number;
};

// Adjust only the current user's contribution; tapping a selected vote removes it.
export function applyRecipeVote(
  current: RecipeRating,
  value: number,
): RecipeRating {
  const next = current.my_vote === value ? 0 : value;
  const upvotes =
    current.upvotes - (current.my_vote === 1 ? 1 : 0) + (next === 1 ? 1 : 0);
  const downvotes =
    current.downvotes -
    (current.my_vote === -1 ? 1 : 0) +
    (next === -1 ? 1 : 0);
  return { upvotes, downvotes, score: upvotes - downvotes, my_vote: next };
}
