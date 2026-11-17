// Stop an Android build before generating an APK without Firebase configuration.
if (process.env.EAS_BUILD_PLATFORM === 'android') {
  require('./check-android-config.cjs');
  if (!process.exitCode) require('./check-update-config.cjs');
}
