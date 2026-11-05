import { act, fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import {
  RecipeConcernHistory,
  groupRecipeConcerns,
} from '../src/components/RecipeConcernHistory';
import type {
  RecipeConcern,
  useRecipeConcerns,
} from '../src/hooks/useRecipeConcerns';
jest.mock('../src/components/AnimatedPressable', () => ({
  AnimatedPressable: require('react-native').Pressable,
}));
const row: RecipeConcern = {
  id: 'report',
  product_id: 'topic',
  recipe_id: 'recipe',
  title: 'Surface cleaner',
  reason: 'Other',
  reviewed_at: '2026-11-05',
  created_at: '2026-11-05',
  hidden_at: null,
};
function reports(rows: RecipeConcern[] = [row]) {
  return {
    concerns: rows,
    error: '',
    loading: false,
    saving: false,
    refresh: jest.fn(),
    setHidden: jest.fn(async () => undefined),
  } as ReturnType<typeof useRecipeConcerns>;
}
test('history starts collapsed and can be shown and hidden without losing entries', async () => {
  const controller = reports();
  const screen = await render(
    <RecipeConcernHistory reports={controller} guides={[]} />,
  );
  expect(screen.queryByText(row.title)).toBeNull();
  await fireEvent.press(screen.getByLabelText('Show recipe concerns'));
  expect(screen.getByText(row.title)).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Hide recipe concerns'));
  expect(screen.queryByText(row.title)).toBeNull();
  expect(controller.setHidden).not.toHaveBeenCalled();
});
test('clearing requires confirmation and restoring uses the same history entry', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  const controller = reports();
  const screen = await render(
    <RecipeConcernHistory reports={controller} guides={[]} />,
  );
  await fireEvent.press(screen.getByLabelText('Show recipe concerns'));
  await fireEvent.press(screen.getByText('Clear from history'));
  expect(controller.setHidden).not.toHaveBeenCalled();
  await act(() =>
    alert.mock.calls[0]?.[2]
      ?.find(button => button.text === 'Clear from history')
      ?.onPress?.(),
  );
  expect(controller.setHidden).toHaveBeenCalledWith(['recipe'], true, false);
  const cleared = reports([{ ...row, hidden_at: '2026-11-05' }]);
  await screen.rerender(<RecipeConcernHistory reports={cleared} guides={[]} />);
  await fireEvent.press(screen.getByText('Show cleared (1)'));
  expect(screen.getByText(row.title)).toBeTruthy();
  await fireEvent.press(screen.getByText('Restore to history'));
  expect(cleared.setHidden).toHaveBeenCalledWith(['recipe'], false);
  alert.mockRestore();
});
test('bulk clearing reviewed concerns explicitly asks the server to preserve pending concerns', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  const controller = reports();
  const screen = await render(
    <RecipeConcernHistory reports={controller} guides={[]} />,
  );
  await fireEvent.press(screen.getByLabelText('Show recipe concerns'));
  await fireEvent.press(screen.getByText('Clear reviewed'));
  await act(() =>
    alert.mock.calls[0]?.[2]
      ?.find(button => button.text === 'Clear from history')
      ?.onPress?.(),
  );
  expect(controller.setHidden).toHaveBeenCalledWith(['recipe'], true, true);
  alert.mockRestore();
});
test('legacy duplicates group by recipe ID while different recipes with the same title remain distinct', () => {
  const grouped = groupRecipeConcerns([
    row,
    { ...row, id: 'old', reviewed_at: null },
    { ...row, id: 'different-report', recipe_id: 'different-recipe' },
  ]);
  expect(grouped).toHaveLength(2);
  expect(grouped[0]?.reviewed_at).toBeNull();
});

test('expanded history loads entries in manageable groups', async () => {
  const rows = Array.from({ length: 15 }, (_, index) => ({
    ...row,
    id: `report-${index}`,
    recipe_id: `recipe-${index}`,
    title: `Recipe ${index + 1}`,
  }));
  const screen = await render(
    <RecipeConcernHistory reports={reports(rows)} guides={[]} />,
  );
  await fireEvent.press(screen.getByLabelText('Show recipe concerns'));
  expect(screen.getByText('Recipe 10')).toBeTruthy();
  expect(screen.queryByText('Recipe 11')).toBeNull();
  await fireEvent.press(screen.getByText('Show more concerns'));
  expect(screen.getByText('Recipe 11')).toBeTruthy();
});
