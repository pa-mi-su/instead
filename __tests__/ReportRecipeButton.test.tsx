import { fireEvent, render } from '@testing-library/react-native';
import { ReportRecipeButton } from '../src/components/ReportRecipeButton';
import { supabase } from '../src/lib/supabase';
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    functions: { invoke: jest.fn(async () => ({ data: {}, error: null })) },
  },
}));
jest.mock('../src/components/AnimatedPressable', () => ({
  AnimatedPressable: require('react-native').Pressable,
}));
jest.mock('react-native/Libraries/Modal/Modal', () => ({
  __esModule: true,
  default: ({ visible, children }: { visible: boolean; children: unknown }) =>
    visible ? children : null,
}));
const props = {
  productId: 'topic',
  recipeId: 'builtin:recipe',
  title: 'A recipe',
  onSignIn: jest.fn(),
};
test('every recipe can offer reporting while guests are directed to sign in', async () => {
  const screen = await render(
    <ReportRecipeButton {...props} signedIn={false} />,
  );
  await fireEvent.press(
    screen.getByLabelText('Report or raise a concern about A recipe'),
  );
  await fireEvent.press(screen.getByText('Sign in to report'));
  expect(props.onSignIn).toHaveBeenCalled();
  expect(supabase!.functions!.invoke).not.toHaveBeenCalled();
});
test('signed-in reports send IDs and concern text, never client-supplied identity', async () => {
  const screen = await render(<ReportRecipeButton {...props} signedIn />);
  await fireEvent.press(
    screen.getByLabelText('Report or raise a concern about A recipe'),
  );
  await fireEvent.changeText(
    screen.getByLabelText('Describe your concern'),
    'Please check these quantities.',
  );
  await fireEvent.press(screen.getByText('Send report'));
  expect(supabase!.functions!.invoke).toHaveBeenCalledWith('report-recipe', {
    body: {
      productId: 'topic',
      recipeId: 'builtin:recipe',
      reason: 'Unsafe advice',
      details: 'Please check these quantities.',
    },
  });
  expect(
    await screen.findByText(
      'Your report was sent to INSTEAD. Thank you for raising your concern.',
    ),
  ).toBeTruthy();
});

test('an existing concern is marked without hiding the recipe or claiming a new submission', async () => {
  const screen = await render(
    <ReportRecipeButton {...props} signedIn reported canBlock />,
  );
  expect(screen.getByText('Concern submitted')).toBeTruthy();
  expect(screen.getByText(/block the contributor below/)).toBeTruthy();
  expect(
    screen.getByLabelText('Report or raise a concern about A recipe'),
  ).toBeTruthy();
});

test('a reported recipe cannot submit another concern through the button', async () => {
  const invoke = supabase!.functions!.invoke as jest.Mock;
  const previous = invoke.mock.calls.length;
  const screen = await render(
    <ReportRecipeButton {...props} signedIn reported />,
  );
  const button = screen.getByLabelText(
    'Report or raise a concern about A recipe',
  );
  expect(button.props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(button);
  expect(screen.queryByText('Send report')).toBeNull();
  expect(invoke).toHaveBeenCalledTimes(previous);
});
