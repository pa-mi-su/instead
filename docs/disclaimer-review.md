# Safety acknowledgement and policy review

Implemented October 16, 2026; policy version `2026-10-16.1`.

## Implemented behavior

- First use requires an unchecked acknowledgement and explicit Agree & continue. Declining leaves the directory inaccessible. Safety, Terms, and Privacy remain readable before agreement.
- Mobile has a permanent Info screen with bundled offline policies. Web has Info & Safety and policy pages accessible without acceptance.
- Native AsyncStorage and browser local storage hold only version and acceptance timestamp. Nothing is sent to Supabase. A version change, cleared storage, reinstall, or another device prompts again. This is local UX acknowledgement, not an authenticated server audit trail or a signed waiver. A failed write leaves the gate closed and shows an error.
- `src/policies.ts` supplies the same Terms and Privacy text to mobile and web. `src/disclaimer.ts` supplies shared medical/safety wording and receipt parsing. Bump POLICY_VERSION whenever material terms or safety acknowledgement text changes.
- No medical/dental advice, diagnosis/treatment, clinician relationship, emergency reliance, guarantees of natural-product safety, or professional endorsement by moderation/votes is claimed. Rights that cannot lawfully be waived are reserved.

## Before public release

The owner should have qualified legal counsel review the operating entity/contact details, applicable jurisdictions, terms assent and liability language, age/children provisions, privacy obligations, and whether a durable account-linked acceptance record is needed. This implementation does not guarantee enforceability, compliance, or protection from liability.

Qualified health/formulation review is needed for health recipes and claims, doses, ingredient grades, stability, preservation, contraindications, and the moderation process. A disclaimer does not make unsafe instructions safe or substantiate health claims. Existing recipes are labeled untested; no professional review has been represented.

Verify public policy/support URLs and support inbox delivery before store release. Native offline policies work independently of public hosting. Store declarations must match the app's health content, data use, and moderation behavior.

Sources consulted (guidance, not legal approval):
- https://termly.io/resources/articles/medical-disclaimer-examples/
- https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance
- https://developer.apple.com/app-store/review/guidelines/#physical-harm
