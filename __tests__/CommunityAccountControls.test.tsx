jest.mock('lucide-react-native', () => ({
  ChevronDown: 'ChevronDown',
  ChevronUp: 'ChevronUp',
}));
import { fireEvent, render } from '@testing-library/react-native';
import {
  CommunityAccountControls,
  CommunityAccountManagement,
} from '../src/components/CommunityAccountControls';
import type { useCommunity } from '../src/hooks/useCommunity';
jest.mock('../src/components/AnimatedPressable', () => ({
  AnimatedPressable: require('react-native').Pressable,
}));
const unblock = jest.fn();
const requestDeletion = jest.fn();
const community = {
  blocks: [{ id: 'block', label: 'Recipe: Surface cleaner', created_at: '' }],
  account: { policy_accepted: true },
  accountReady: true,
  canManage: true,
  busy: false,
  unblock,
  requestDeletion,
} as unknown as ReturnType<typeof useCommunity>;
test('recipe access controls never include block management or account deletion', async () => {
  const screen = await render(
    <CommunityAccountControls community={community} />,
  );
  expect(screen.queryByText('Unblock contributor')).toBeNull();
  expect(screen.queryByText('Delete account')).toBeNull();
});
test('blocked recipes have their own titled section and unblock the selected contributor', async () => {
  const screen = await render(
    <CommunityAccountManagement community={community} section="blocks" />,
  );
  expect(screen.queryByText('Surface cleaner')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Show blocked contributors'));
  expect(screen.getByText('Surface cleaner')).toBeTruthy();
  expect(screen.queryByText('Recipe: Surface cleaner')).toBeNull();
  expect(screen.queryByText('Delete account')).toBeNull();
  await fireEvent.press(screen.getByText('Unblock contributor'));
  expect(unblock).toHaveBeenCalledWith('block');
});
test('deletion is a separate section and preserves explicit confirmation', async () => {
  const screen = await render(
    <CommunityAccountManagement community={community} section="deletion" />,
  );
  expect(screen.queryByText('Unblock contributor')).toBeNull();
  await fireEvent.press(screen.getByText('Delete account'));
  expect(requestDeletion).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('Confirm account deletion request'));
  expect(requestDeletion).toHaveBeenCalledTimes(1);
});
