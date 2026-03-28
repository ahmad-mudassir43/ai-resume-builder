# Android Workflow

This project now includes a separate Android app shell built with Capacitor.

## Android Files

- `capacitor.config.json`
- `android/`

The web app remains in `src/` and `public/`. The Android-specific native project lives under `android/`.

## Android App Identity

- App name: `ResumeBuilder`
- App id: `com.resumebuilder.app`

## Android Branding

Native Android resources now include:

- custom adaptive launcher icon
- branded splash theme
- Android color resources for the app shell

Main branding files:

- `android/app/src/main/res/drawable/ic_resumebuilder_foreground.xml`
- `android/app/src/main/res/drawable/splash_screen.xml`
- `android/app/src/main/res/values/colors.xml`
- `android/app/src/main/res/values/styles.xml`

If you later want polished raster icons, you can replace the generated/icon resources with exported PNG launcher assets from Android Studio's Image Asset tool.

## Development Flow

### 1. Build and sync web assets into Android

```powershell
npm run android:sync
```

### 2. Open the Android project in Android Studio

```powershell
npm run android:open
```

### 3. Build a debug APK

```powershell
npm run android:apk
```

### 4. Run on a connected Android device or emulator

```powershell
npm run android:run
```

## What Capacitor Is Doing

- The React/Vite app is still the main UI.
- `npm run build` creates the production web bundle in `dist/`.
- Capacitor copies `dist/` into `android/app/src/main/assets/public/`.
- Android Studio or Gradle then packages that into an Android app.

## Current Notes

- This is the fastest route to an APK from the existing web app.
- The Android experience is a wrapped web app, not a full native rewrite.
- AI provider keys are still client-side right now, so public production distribution should move AI calls behind a backend proxy.
- `Ollama Local Bridge` on Android does not point to your computer's localhost. For mobile testing, prefer Gemini or Ollama Cloud unless you expose a reachable backend endpoint.
- The web UI has been adjusted for smaller screens, including mobile sidebar/backdrop behavior and safer viewport sizing for Android devices.

## Recommended Next Mobile Steps

- replace XML branding with final raster icon pack if desired
- tune mobile spacing and keyboard behavior
- add file picker / share support for importing resume images
- move AI requests to a backend before publishing to Play Store
