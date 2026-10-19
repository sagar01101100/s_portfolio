# Android app setup

This repository is a static Vite-served Three.js portfolio. Capacitor packages the existing `dist/` website into an Android application, so the interactive room and cat remain part of the app.

## Requirements

- Node.js 20.19+ or 22.12+
- Android Studio with an Android SDK installed
- Java/JDK supported by your installed Android Gradle Plugin

## Create and run the Android project

From the repository root:

```sh
npm ci
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli
npx cap add android
npm run android:sync
npm run android:open
```

Android Studio opens the native project. Select an emulator or connected Android phone and press **Run**.

## Build an APK

In Android Studio, use **Build → Build Bundle(s) / APK(s) → Build APK(s)**. For a release APK or Play Store bundle, configure a signing key in Android Studio and choose the corresponding signed build option.

## Updating the portfolio

The existing website assets are in `dist/`. After changing them, run:

```sh
npm run android:sync
```

Then rebuild/run from Android Studio.

## Notes

- The website remains the source of truth; this does not replace the existing Netlify deployment.
- Test touch interactions, small screens, device rotation, and WebGL performance on a real phone.
- Use HTTPS for external links and services. Do not put secrets or private credentials in the bundled client.
- The `android/` folder is generated locally by `npx cap add android`; it is intentionally not hand-written here.
