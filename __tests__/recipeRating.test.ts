import { applyRecipeVote } from '../src/lib/recipeRating';
test('vote switching and removal preserve other users totals', () => {
  const base = { upvotes: 12, downvotes: 3, score: 9, my_vote: 1 };
  expect(applyRecipeVote(base, -1)).toEqual({
    upvotes: 11,
    downvotes: 4,
    score: 7,
    my_vote: -1,
  });
  expect(applyRecipeVote(base, 1)).toEqual({
    upvotes: 11,
    downvotes: 3,
    score: 8,
    my_vote: 0,
  });
  expect(base.my_vote).toBe(1);
});
