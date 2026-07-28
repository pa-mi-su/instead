import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalPage,
  PolicyCallout,
  PolicySection,
} from "../../components/legal-page";
import { supportEmail } from "../../lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy — INSTEAD",
  description: "How INSTEAD handles information in its website and mobile apps.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="PRIVACY, IN PLAIN LANGUAGE"
      introduction="This policy explains what information the INSTEAD website and mobile apps use, where it stays, and the choices available to you."
      title="Privacy Policy"
    >
      <PolicyCallout title="THE SHORT VERSION">
        <p>
          INSTEAD currently has no accounts, advertising, behavioral analytics,
          or cross-app tracking. Saved guides and cached guide content stay on
          your device or in your browser.
        </p>
      </PolicyCallout>

      <PolicySection title="1. Scope">
        <p>
          This policy applies to the INSTEAD website and INSTEAD mobile
          applications for iOS and Android (together, the “Services”). It does
          not apply to third-party websites, products, or services that may be
          mentioned in a guide.
        </p>
      </PolicySection>

      <PolicySection title="2. Information you provide">
        <p>
          The current Services do not offer account registration, user
          profiles, comments, or guide submissions. We therefore do not ask you
          to provide a name, account password, profile, or payment information.
        </p>
        <p>
          If you contact support, we receive the information you choose to send,
          such as your email address, message, device type, or screenshots. Do
          not include sensitive personal information that is not needed to
          answer your request.
        </p>
      </PolicySection>

      <PolicySection title="3. Information used by the Services">
        <h3>Saved guides and cached content</h3>
        <p>
          The mobile apps store saved-guide identifiers on your device. The
          website stores saved-guide identifiers and a cached copy of published
          guides in your browser’s local storage. This lets saved guides remain
          available and helps the Services remain useful when the network is
          unavailable. INSTEAD does not receive this local storage merely
          because you use the save feature.
        </p>
        <h3>Network and service information</h3>
        <p>
          The Services request published guide content from infrastructure
          provided by Supabase. As with ordinary internet traffic, the service
          provider may process technical request information such as an IP
          address, user agent, timestamps, and diagnostic or security logs to
          deliver content, prevent abuse, and maintain the service.
        </p>
        <h3>Information we do not request</h3>
        <p>
          The current Services do not request access to precise location,
          contacts, photos, camera, microphone, health records, or advertising
          identifiers. We do not use advertising SDKs or behavioral tracking
          tools.
        </p>
      </PolicySection>

      <PolicySection title="4. How information is used">
        <p>Information is used only as reasonably necessary to:</p>
        <ul>
          <li>deliver and update published guides;</li>
          <li>operate, secure, troubleshoot, and improve the Services;</li>
          <li>respond to support, privacy, accessibility, or safety reports;</li>
          <li>comply with law and protect users, INSTEAD, and others.</li>
        </ul>
      </PolicySection>

      <PolicySection title="5. Service providers and disclosure">
        <p>
          Supabase provides the database and content-delivery infrastructure
          used by the Services. Service providers may process technical
          information only to provide and protect their services under their
          applicable terms and privacy practices.
        </p>
        <p>
          We do not sell personal information or share it for cross-context
          behavioral advertising. Information may be disclosed if reasonably
          necessary to comply with law, address fraud or security, protect
          safety or legal rights, or complete a business reorganization subject
          to appropriate protections.
        </p>
      </PolicySection>

      <PolicySection title="6. Retention and deletion">
        <p>
          Saved guides and cached content remain locally until you remove them,
          clear the app or browser storage, or uninstall the app. Support
          messages may be kept while a request is handled and as reasonably
          necessary for security, recordkeeping, or legal obligations.
          Infrastructure logs are retained only as reasonably necessary for
          service operation, security, and provider requirements.
        </p>
        <p>
          Because there are no user accounts, INSTEAD currently has no account
          record to delete. See the <Link href="/support">Support page</Link> for
          steps to remove local information or make a privacy request.
        </p>
      </PolicySection>

      <PolicySection title="7. Security">
        <p>
          We use reasonable technical and organizational safeguards appropriate
          to the current Services. No internet transmission or storage system
          can be guaranteed completely secure.
        </p>
      </PolicySection>

      <PolicySection title="8. Children">
        <p>
          The Services are intended for a general audience and are not directed
          to children under 13. We do not knowingly collect personal information
          from children through the current Services. Contact us if you believe
          a child has provided personal information.
        </p>
      </PolicySection>

      <PolicySection title="9. Future accounts or contributions">
        <p>
          INSTEAD does not currently support accounts or community
          contributions. Before introducing those features, we will update this
          policy and the Services’ disclosures to explain the additional
          information, controls, moderation, and deletion options involved.
        </p>
      </PolicySection>

      <PolicySection title="10. Changes to this policy">
        <p>
          We may update this policy as the Services change. The revised policy
          will show a new “Last updated” date. If a change materially affects
          how personal information is handled, we will provide additional
          notice where appropriate.
        </p>
      </PolicySection>

      <PolicySection title="11. Contact">
        {supportEmail ? (
          <p>
            Privacy questions and requests may be sent to{" "}
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
          </p>
        ) : (
          <p>
            A public privacy contact will be added here before the Services are
            released. Until then, this page is a pre-release policy draft.
          </p>
        )}
      </PolicySection>
    </LegalPage>
  );
}
