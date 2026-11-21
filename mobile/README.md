# Thrifty Owl — mobile app

Expo + React Native + TypeScript + Expo Router. Claymorphism tokens live in
`constants/theme.ts`; motion tokens in `constants/motion.ts`.

## Run

```bash
npm install
npx expo start -c
```

`-c` clears the Metro cache, which is required after changing `app.json`,
`babel.config.js`, fonts or icon assets.

## Brand assets

```bash
npm run assets:brand
```

Reads `assets/brand/source/owl-logo.svg` (layered: bubble, ears, body, belly,
eyes, pupils, beak) and renders every runtime asset into `assets/images/`:

- `icon.png` 1024×1024 — Ink owl on Lavender `#B9A0EB`
- `adaptive-icon.png` — transparent foreground inside Android's 66% safe zone
- `monochrome-icon.png` — Android 13 themed icon
- `splash-icon.png` — transparent, shown on `#F3EEFA`
- `favicon.png`, `notification-icon.png` (96×96, white on transparent)

If you add a raster original at `assets/brand/source/owl-logo.png`, the script
also traces it to `assets/brand/owl-logo.traced.svg` for reference. The traced
result is flat regions, not semantic layers, so the layered SVG remains the
animation source.

## Important: icons and app name in Expo Go

The name, icon, adaptive icon, splash image and notification icon are native
resources. They only appear after:

```bash
eas build -p android --profile preview   # APK
```

or after `npx expo prebuild --clean` for a local native build. Expo Go always
shows its own shell icon and name, even though the in-app UI is already rebranded.

## App identifiers

`app.json` keeps the existing identifiers so EAS credentials and existing
installs keep working:

- Android package / iOS bundle id: `com.unimart.campusmarketplace`
- URL scheme: `thriftyowl` (changed)

If you want `com.yourteam.thriftyowl`, update `app.json` **and** the Clerk
dashboard redirect URLs, then re-run `npx expo prebuild --clean`. The checked-in
`android/` folder still declares the old package until a prebuild.

## Motion system

- `components/fx/` — AnimatedOwl, AnimatedSplash, ClayPressable, FloatingBlobs,
  HeartBurst, Stagger/SkeletonCard, AnimatedTabBar, VerifiedBadge, OrderStepper,
  CelebrationOverlay, Toast.
- `app/dev/motion-lab.tsx` — dev-only gallery (`__DEV__`), reachable at
  `/dev/motion-lab`.
- Only `transform` and `opacity` are animated. Loops pause with `paused`
  (`useIsFocused` in screens) and respect `useReducedMotion()`.

## Checks

```bash
npm run typecheck
npm run lint
npx expo-doctor
```
