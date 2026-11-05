import { Platform } from 'react-native';
import {
  refreshRecipeVisibility,
  useRecipeVisibility,
} from '../src/hooks/useRecipeVisibility';
jest.mock('../src/hooks/useRecipeVisibility', () => ({
  refreshRecipeVisibility: jest.fn(),
  useRecipeVisibility: jest.fn(() => ({ acceptReport: jest.fn() })),
}));
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
      'Your report was sent to INSTEAD. This recipe is now hidden from your account. It remains available to others unless an admin removes it.',
    ),
  ).toBeTruthy();
});

test('a restored reported recipe keeps its duplicate-report guard', async () => {
  const screen = await render(
    <ReportRecipeButton {...props} signedIn reported />,
  );
  expect(screen.getByText('Concern already submitted')).toBeTruthy();
  expect(screen.queryByText(/Reporting a concern does not/)).toBeNull();
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

test('a successful report closes its confirmation before hiding the card', async () => {
  const acceptReport = jest.fn();
  (useRecipeVisibility as jest.Mock).mockReturnValue({ acceptReport });
  const platform = jest.replaceProperty(Platform, 'OS', 'android');
  const refresh = refreshRecipeVisibility as jest.Mock;
  refresh.mockClear();
  const screen = await render(<ReportRecipeButton {...props} signedIn />);
  await fireEvent.press(
    screen.getByLabelText('Report or raise a concern about A recipe'),
  );
  await fireEvent.changeText(
    screen.getByLabelText('Describe your concern'),
    'Please check this recipe',
  );
  await fireEvent.press(screen.getByText('Send report'));
  expect(acceptReport).not.toHaveBeenCalled();
  expect(refresh).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('Close'));
  expect(acceptReport).toHaveBeenCalledWith(
    'topic',
    'builtin:recipe',
    'A recipe',
  );
  expect(refresh).toHaveBeenCalledTimes(1);
  platform.restore();
});
