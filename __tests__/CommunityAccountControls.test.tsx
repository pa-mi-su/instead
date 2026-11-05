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
test('deletion is a separate section and preserves explicit confirmation', async () => {
  const screen = await render(
    <CommunityAccountManagement community={community} />,
  );
  expect(screen.queryByText('Unblock contributor')).toBeNull();
  await fireEvent.press(screen.getByText('Delete account'));
  expect(requestDeletion).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('Confirm account deletion request'));
  expect(requestDeletion).toHaveBeenCalledTimes(1);
});
