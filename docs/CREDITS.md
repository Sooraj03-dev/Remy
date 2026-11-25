# CREDITS — Thrifty Owl mobile

All third-party code, fonts and brand assets used by `mobile/`, with licences.
Everything listed is permissively licensed (MIT / Apache-2.0 / OFL / Unlicense).

## Runtime libraries

| Package | Version | Licence | Used for |
| --- | --- | --- | --- |
| `react-native-svg` | 15.2.0 | MIT | Owl mascot, brand mark, icon rendering |
| `react-native-reanimated` | 3.10.1 | MIT | All motion, shared values, entering animations |
| `react-native-gesture-handler` | 2.16.1 | MIT | Toast swipe-to-dismiss, gesture root |
| `react-native-confetti-cannon` | 1.5.2 | MIT | Celebration confetti |
| `expo-haptics` | 13.0.1 | MIT | Press / hoot / heart haptics |
| `expo-linear-gradient` | 13.0.2 | MIT | Skeleton shimmer, verification shine |
| `expo-font` | 12.0.10 | MIT | Custom font loading |
| `expo-splash-screen` | 0.27.5 | MIT | Native splash handoff |

## Interface icons

Remy uses 67 glyphs from [Kubai Icons](https://icons.kubai.design/) (`icons-line`),
bundled locally in `mobile/assets/icons/kubai-line.json` (24x24 grid, rounded
strokes; `shirt` and `wifi-off` adapted in matching 24x24 Kubai Line geometry).
The [upstream MIT license](../THIRD_PARTY_LICENSES) accompanies the artwork.

## Fonts

| Font | Package | Licence | Used for |
| --- | --- | --- | --- |
| Plus Jakarta Sans (400, 500, 600, 700) | `@expo-google-fonts/plus-jakarta-sans` 0.4.2 | SIL Open Font License 1.1 | Unified display, title, body, and label type scale |

One family per weight is registered in `app/_layout.tsx`; Android does not map
`fontWeight` onto custom font files, so no synthetic bold is used.

## Build-time tooling

| Package | Version | Licence | Used for |
| --- | --- | --- | --- |
| `sharp` | 0.35.5 | Apache-2.0 | Rendering PNG icon/splash variants from the brand SVG |
| `imagetracerjs` | 1.2.6 | Unlicense (public domain) | Optional raster → SVG trace step in `scripts/generate-brand-assets.mjs` |

`potrace` (the native CLI) is intentionally not used: it needs a platform binary
in CI and on developer machines, while ImageTracerJS is pure JavaScript and the
committed layered SVG already provides cleaner, semantic paths.

## Brand artwork

| Asset | Source | Licence |
| --- | --- | --- |
| Owl-in-speech-bubble mark | Authored vector at `mobile/assets/brand/source/owl-logo.svg` | Original work for this project (no third-party artwork) |
| Generated icons | Rendered from the SVG by `scripts/generate-brand-assets.mjs` | Same as above |

The original raster logo the team supplied was not present in the repository at
build time, so the layered SVG in `assets/brand/source/` is the current source of
truth. Replace that file (keeping the `bubble` / `ears` / `body` / `belly` /
`eyes` / `pupils` / `beak` group ids) and re-run `npm run assets:brand` to
regenerate every icon.

## Animation assets

No Lottie files or third-party animation assets are bundled. All motion is
code-driven with Reanimated, SVG and the libraries above.
