# Account-only Saved feature

Saving guides and recipes in the mobile app requires a verified, signed-in account. Guest Save actions open Saved with Create account and Sign in buttons. My INSTEAD contains profile and submission management; Saved is the only saved-content list.

The service is the source of truth: signing out hides saves, switching accounts loads only that account, and legacy device-wide saves are not automatically imported because their owner is unknown. Existing cloud saves remain intact. Loading and changing saves requires a network connection; no mobile offline save cache is promised.

Before Apple resubmission, update the listing description to replace “Save useful guides on your device” with “Sign in to save guides and recipes across your devices.” Review Notes must describe Menu > Saved for both guides and recipes and must not claim guest/local saving. Use the new tested beta build for evidence, not build 430.

Physical checks: guest Save opens registration/sign-in prompt; registered guide and recipe saves appear in Saved only; sign-out hides lists and count; signing back in restores account saves; switching accounts does not inherit any saves.
