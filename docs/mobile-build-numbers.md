# Installed versions and mobile build reservations

Mobile releases reserve sequential build numbers independently for Android and iOS using append-only `instead-build-android-N` and `instead-build-ios-N` Git tags. The starting floor is 401 because release run 4 was in progress under the previous formula. The first new reservation is 402, followed by 403 and 404.

The reservation runs at the start of each platform job, including retries. Failed builds can leave gaps; a number is never deliberately reused. Do not delete reservation tags or rerun historical workflows containing the old numbering formula. Trigger a fresh Mobile Release from main instead. Build numbers are independent of the public APP_VERSION.

The release jobs need repository contents write permission to reserve tags. Checkout does not persist credentials, and the token is explicitly passed only to the reservation step. Tag creation through the workflow token does not dispatch another mobile release. Unit tests exercise both platforms, sequential reservations, collisions, and fail-closed API errors.

Both platforms receive shared-source changes, but **they are not guaranteed to use the same numeric build** or become available simultaneously. A platform-only change or failed/retried job advances its counter separately. Compare the reservation tag's commit SHA and each platform's successful upload job. A green debug/simulator CI build creates no store upload and does not identify the next release number.

The installed app displays its native version and build at the bottom of **Info & Safety**. iOS supplies `CFBundleShortVersionString`/`CFBundleVersion`; Android supplies `BuildConfig.VERSION_NAME`/`VERSION_CODE`. Release workflows use `APP_VERSION` for the public version and the reserved number for the build. The root npm package version and local native defaults are not the installed store version. If native props are unavailable, the screen explicitly says version information is unavailable rather than guessing.
