"""Validate signing metadata and the exact IPA before a store upload."""
import argparse
import datetime
import pathlib
import plistlib
import zipfile


def validate_profile(path, team, profile_name, now=None):
    profile = plistlib.loads(pathlib.Path(path).read_bytes())
    now = now or datetime.datetime.now(datetime.timezone.utc)
    expiry = profile.get('ExpirationDate')
    if not isinstance(expiry, datetime.datetime):
        raise ValueError('Provisioning profile has no expiration date')
    if expiry.replace(tzinfo=datetime.timezone.utc) <= now:
        raise ValueError('Provisioning profile has expired')
    if profile.get('TeamIdentifier') != [team]:
        raise ValueError('Provisioning team does not match')
    entitlements = profile.get('Entitlements', {})
    if entitlements.get('application-identifier') != f'{team}.com.pamisu.instead':
        raise ValueError('Provisioning app identifier does not match')
    if entitlements.get('get-task-allow') is not False:
        raise ValueError('Distribution profile must disable debugging')
    if profile.get('Name') != profile_name:
        raise ValueError('Provisioning profile name does not match')
    if 'ProvisionedDevices' in profile or profile.get('ProvisionsAllDevices'):
        raise ValueError('App Store distribution profile required')


def validate_ipa(directory, version, build):
    files = list(pathlib.Path(directory).glob('*.ipa'))
    if len(files) != 1:
        raise ValueError('Expected exactly one exported IPA')
    with zipfile.ZipFile(files[0]) as archive:
        info_files = [name for name in archive.namelist()
                      if name.startswith('Payload/') and name.count('/') == 2
                      and name.endswith('.app/Info.plist')]
        if len(info_files) != 1:
            raise ValueError('Expected exactly one main app in IPA')
        info = plistlib.loads(archive.read(info_files[0]))
        expected = {'CFBundleIdentifier': 'com.pamisu.instead',
                    'CFBundleShortVersionString': version,
                    'CFBundleVersion': build}
        for key, value in expected.items():
            if str(info.get(key, '')) != value:
                raise ValueError(f'IPA {key} does not match release configuration')
        if info.get('CFBundleSupportedPlatforms') != ['iPhoneOS']:
            raise ValueError('IPA must target physical iOS devices')
    return str(files[0].resolve())


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest='command', required=True)
    profile = sub.add_parser('profile')
    profile.add_argument('path')
    profile.add_argument('team')
    profile.add_argument('name')
    ipa = sub.add_parser('ipa')
    ipa.add_argument('directory')
    ipa.add_argument('version')
    ipa.add_argument('build')
    args = parser.parse_args()
    if args.command == 'profile':
        validate_profile(args.path, args.team, args.name)
    else:
        print(validate_ipa(args.directory, args.version, args.build))


if __name__ == '__main__':
    main()
