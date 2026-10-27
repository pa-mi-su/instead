import { fireEvent, render } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { ProfileEditor } from '../src/components/ProfileEditor';
import type { useCommunity } from '../src/hooks/useCommunity';

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));
jest.mock('../src/components/AnimatedPressable', () => ({
  AnimatedPressable: require('react-native').Pressable,
}));

const images = [
  { base64: '/9j/4A==', type: 'image/jpeg' },
  { base64: 'iVBORw0KGgo=', type: 'image/png' },
  { base64: 'UklGRgAAAABXRUJQ', type: 'image/webp' },
];

describe.each(['android', 'ios'] as const)('%s profile photos', platform => {
  test.each(images)(
    'selects and saves $type using image bytes',
    async image => {
      const os = jest.replaceProperty(Platform, 'OS', platform);
      try {
        // Picker metadata can disagree with bytes, particularly on iOS.
        jest.mocked(launchImageLibrary).mockResolvedValue({
          assets: [
            {
              uri: 'file:///selected-photo',
              base64: image.base64,
              type: 'image/jpg',
            },
          ],
        });
        const saveProfile = jest.fn(async () => true);
        const clearProfileError = jest.fn();
        const community = {
          username: 'PhotoUser',
          bio: '',
          busy: false,
          canEditProfile: true,
          error: '',
          errorSource: 'profile',
          avatarUrl: null,
          saveProfile,
          clearProfileError,
        } as unknown as ReturnType<typeof useCommunity>;
        const onClose = jest.fn();
        const screen = await render(
          <ProfileEditor community={community} onClose={onClose} />,
        );
        await fireEvent.press(screen.getByText('Add avatar'));
        expect(await screen.findByText('Change avatar')).toBeTruthy();
        await fireEvent.press(
          screen.getByRole('button', { name: 'Update profile' }),
        );
        expect(saveProfile).toHaveBeenCalledWith(
          { bytes: expect.any(ArrayBuffer), contentType: image.type },
          false,
        );
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(clearProfileError).toHaveBeenCalledTimes(1);
      } finally {
        os.restore();
      }
    },
  );
});
