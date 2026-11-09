import datetime
import importlib.util
import pathlib
import plistlib
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('ios_release', pathlib.Path(__file__).with_name('validate-ios-release.py'))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)

class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.temp.name)
        self.addCleanup(self.temp.cleanup)

    def profile(self, **changes):
        value = {'ExpirationDate': datetime.datetime(2030, 1, 1),
                 'Name': 'Distribution & Store', 'TeamIdentifier': ['TEAM'],
                 'Entitlements': {'application-identifier': 'TEAM.com.pamisu.instead', 'get-task-allow': False}}
        value.update(changes)
        path = self.root / 'profile.plist'
        path.write_bytes(plistlib.dumps(value))
        return path

    def test_profile(self):
        release.validate_profile(self.profile(), 'TEAM', 'Distribution & Store')
        for change in [{'ExpirationDate': datetime.datetime(2020, 1, 1)},
                       {'TeamIdentifier': ['OTHER']}, {'Name': 'Wrong'},
                       {'ProvisionedDevices': ['device']}, {'ProvisionsAllDevices': True},
                       {'Entitlements': {'application-identifier': 'TEAM.com.pamisu.instead', 'get-task-allow': True}}]:
            with self.assertRaises(ValueError):
                release.validate_profile(self.profile(**change), 'TEAM', 'Distribution & Store')

    def ipa(self, **changes):
        value = {'CFBundleIdentifier': 'com.pamisu.instead', 'CFBundleVersion': '446',
                 'CFBundleShortVersionString': '1.0.0', 'CFBundleSupportedPlatforms': ['iPhoneOS']}
        value.update(changes)
        with zipfile.ZipFile(self.root / 'Instead.ipa', 'w') as archive:
            archive.writestr('Payload/Instead.app/Info.plist', plistlib.dumps(value))
            archive.writestr('Payload/Instead.app/Frameworks/Nested.framework/Info.plist', plistlib.dumps({}))

    def test_exact_export(self):
        with self.assertRaises(ValueError):
            release.validate_ipa(self.root, '1.0.0', '446')
        self.ipa()
        self.assertEqual(release.validate_ipa(self.root, '1.0.0', '446'), str((self.root / 'Instead.ipa').resolve()))
        for changes in [{'CFBundleIdentifier': 'other.app'}, {'CFBundleVersion': '445'},
                        {'CFBundleShortVersionString': '2.0.0'}, {'CFBundleSupportedPlatforms': ['iPhoneSimulator']}]:
            self.ipa(**changes)
            with self.assertRaises(ValueError):
                release.validate_ipa(self.root, '1.0.0', '446')
        self.ipa()
        (self.root / 'Stale.ipa').write_bytes(b'stale')
        with self.assertRaises(ValueError):
            release.validate_ipa(self.root, '1.0.0', '446')

if __name__ == '__main__':
    unittest.main()
