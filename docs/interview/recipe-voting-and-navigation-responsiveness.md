---
title: Fixing jumpy recipe voting and slow mobile navigation
date: 2026-11-03
tags:
  - interview
  - react-native
  - performance
  - state-management
---

# Fixing jumpy recipe voting and slow mobile navigation

## Interview question

“How did you diagnose a UI that felt slow even though its individual API calls worked?”

## Short answer

In INSTEAD, a vote was treated like a change to the entire community dataset. After saving it, the app broadcast a global invalidation, cleared displayed ratings or recipes, and fetched them again. Community voting also explicitly refreshed the list, duplicating the refresh caused by the broadcast. Meanwhile, built-in recipe ordering depended directly on live vote scores. One tap could change counts, reorder cards, clear the controls, and then reorder the cards again when the network response arrived.

I separated a small vote mutation from a full content refresh. After the server confirms the vote, the app updates only that recipe’s counts and selected button. The list keeps its existing order while the user votes. I also removed an iPhone menu fade that navigation was waiting to finish, while retaining the native dismissal callback needed for safe modal sequencing.

## What the user saw

- Upvoting, downvoting, or removing a vote made cards jump and controls flicker.
- Switching between My INSTEAD, Saved, and Info & safety felt delayed by about a second. This was the user’s observation, not an instrumented timing measurement.

## Root causes found in code

1. **Too broad an invalidation.** Vote handlers called `notifyCommunityChanged()`, which notified unrelated account/content subscribers. A small change caused a large refresh fan-out.
2. **Destructive loading state.** Refresh effects cleared rating maps or recipe lists before replacement data arrived. Controls disappeared and list height changed.
3. **Sorting on every score change.** Built-in ranking was derived directly from the same state updated by voting. A card could move underneath the finger after a tap.
4. **Duplicated work.** Community voting both emitted the global update and called `refresh()`. A refresh fetches public/private lists, author metadata, and signed photo URLs, rather than just updating a vote.
5. **Busy state at the wrong scope.** A community vote used the same busy state as submitting a recipe, changing the submission button’s label and disabling unrelated controls.
6. **Navigation gated by a native animation.** On iOS, the drawer used a fading native Modal and waited for `onDismiss` before changing screens. The sequencing served a purpose, but the fade put avoidable animation time on the navigation path.

These are consequences of using a simple full-refresh strategy as the feature grew. The problem was the scope and timing of state changes, not that React Native inherently makes voting slow.

## Changes

- Built-in and community votes update their own confirmed totals without broadcasting a global content refresh.
- One shared vote calculation handles upvote, downvote, switching sides, and tapping the selected vote to remove it. Other users’ counts are preserved.
- Built-in ranking uses the last fetched ranking snapshot. A vote updates visible counts without immediately moving the recipe. Reopening or an explicit refresh can fetch current server ranking.
- Background built-in rating refreshes no longer clear the displayed map at the start. Account/guide changes still clear scoped state, and failed fetches still show the existing retry UI rather than fabricated totals.
- Community votes have per-recipe request locks; only the affected voting control uses its local busy indicator. They do not reuse the submission form’s busy state.
- The iOS drawer uses `animationType="none"`. Destination changes still run once through `onDismiss`, preserving safe sequencing if the destination presents another modal. Other platforms retain their existing behavior.

## Validation and limits

Regression tests check stable card order through selection/removal, unchanged list/rating read counts after voting, correct totals, and iPhone navigation that does not depend on fade duration but still waits for dismissal. Existing account-deletion/account-switch rating tests continue to protect against stale personal vote state.

The update is server-confirmed rather than an optimistic success: network time still affects when a vote is confirmed. Other users’ concurrent changes are reconciled on a normal refresh or reopening the view. This change does not add realtime subscriptions or claim exact frame-rate/latency improvements. The next TestFlight build must be tested on a physical iPhone; simulator/unit results cannot establish perceived smoothness on that device.

## Follow-up questions

**Why not just debounce the refresh?** Debouncing would reduce request frequency, but retain list clearing, live reordering, and broad invalidation. Fix the mutation’s scope first.

**Why not navigate immediately while the Modal dismisses?** That can race presentation of a second native modal. Removing the animation preserves the sequencing guarantee without waiting through a fade.

**How would you measure it?** Record tap-to-feedback and tap-to-destination-render on a physical release build, inspect network request counts, and profile JS/UI frames under throttled network conditions. Compare the same device and flow before and after; do not substitute passing unit tests for those measurements.

**What principle does this illustrate?** Scope state and loading indicators to the action, keep list identity/order stable during direct manipulation, and distinguish data freshness from replacing the entire screen.
