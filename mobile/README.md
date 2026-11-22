# Remy mobile app

Expo + React Native + TypeScript + Expo Router. Claymorphism tokens live in
`constants/theme.ts`; motion tokens in `constants/motion.ts`.

## Run

From the repository root, run the mobile project's Expo server.

```bash
npm --prefix mobile install
npm run mobile
```

From inside the mobile directory, use `npm start`. To clear Metro's cache from
the repository root, use `npm run mobile -- --clear`.

## Brand assets

```bash
npm run assets:brand
```

The generator uses the same SVG geometry in `assets/brand/source/remy-art.json`
as the in-app mascot. It refreshes the checked-in Android resources and these
Expo assets in `assets/images/`.

- `icon.png` 1024×1024 — Remy in a caramel clay badge
- `adaptive-icon.png` — transparent foreground inside Android's 66% safe zone
- `monochrome-icon.png` — Android 13 themed icon
- `splash-icon.png` — oat badge on the `#FAF6F1` canvas
- `favicon.png`, `notification-icon.png` (96×96, white on transparent)

The four-pose sprite sheet is saved to `assets/brand/remy-sprite-sheet.png`.

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
- URL scheme: `thriftyowl`

If you want `com.yourteam.thriftyowl`, update `app.json` **and** the Clerk
dashboard redirect URLs, then re-run `npx expo prebuild --clean`. The checked-in
`android/` folder still declares the old package until a prebuild.

## Motion system

- `components/ui/` contains `RemyLogo` and `RemyMascot`.
- `components/fx/` — AnimatedOwl, AnimatedSplash, ClayPressable, FloatingBlobs,
  HeartBurst, Stagger/SkeletonCard, AnimatedTabBar, VerifiedBadge, OrderStepper,
  CelebrationOverlay, Toast.
- `app/dev/motion-lab.tsx` — dev-only gallery (`__DEV__`), reachable at
  `/dev/motion-lab`.
- Press feedback animates the surface transform and shadow depth. Idle loops
  pause on unfocused screens and respect reduced motion.

## Checks

```bash
npm run typecheck
npm run lint
npx expo-doctor
```
