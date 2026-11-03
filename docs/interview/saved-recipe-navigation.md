# Fixing Saved recipe navigation

## Symptom

Opening a saved recipe could land halfway through a different recipe in the same guide.

## Cause

The route preserved the correct guide and recipe IDs. The error was in scroll positioning: code added offsets from several nested `onLayout` callbacks, then permanently marked the jump complete. A child could report layout before its parents, so some offsets were still zero. Later rating results could reorder cards, and remote catalogue content could change their heights, making that earlier offset stale. The previous test assumed parent offsets were zero and therefore missed the native layout race.

## Change

Measure the actual target card relative to an explicit native scroll-content view using `measureLayout`. Wait for initial catalogue ranking, coalesce layout events into one animation frame, and remeasure after content changes until the user interacts. Ignore callbacks from older measurements or destinations. Keep the target and content views from being flattened by React Native. Key the guide screen by guide/recipe destination so a new route starts with fresh scroll state.

Saved community recipes also search subsequent published pages when the target is not loaded yet; duplicate-page guards prevent retry loops. Plain guide links retain no recipe target. Profile/back navigation restores the original recipe ID.

## Validation

Automated regressions cover delayed ranking, late reflow, out-of-order native measurement callbacks, manual-scroll cancellation, missing native layouts, changing destinations, and a community recipe on page two. Navigation tests cover Saved recipes/guides, Home guides, barcode results, profile/back, Info, and registration/sign-in links.

Physical-device verification is still required in the next beta: save Paul’s toothpaste and a second recipe in the same guide, open each from Saved, confirm the correct card begins near the top, then scroll manually and confirm background updates do not pull the page back.

## Interview explanation

“I separated route identity from visual positioning. The route was correct, but independently reported layout offsets produced a race. I switched to measuring the target in one native coordinate space, waited for ranking to settle, rejected stale callbacks, and stopped automatic positioning when the user took control. Tests then exercised asynchronous ordering rather than assuming a fixed layout.”
