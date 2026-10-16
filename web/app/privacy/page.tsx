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
          Browsing does not require an account. Commenting and voting use email-code sign-in. Your comments and approved recipes and photos are public; your email is private. No public profile is required. Saved guides stay on your device or in your browser. We do not use advertising or behavioral tracking.
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
          If you sign in, Supabase processes your email address to send a one-time code and maintain your account. We store comments, recipe submissions, optional photos, votes, and reports you submit. Pending recipes and photos are visible only to their submitter and administrators. We do not ask for a password, legal name, or payment information. Do not put private information in comments, recipes, or photos.
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
          website stores saved-guide identifiers in your browser’s local storage. Signed-in sessions are stored locally on your device or browser so you can stay signed in. Signing out removes the local session. This lets saved guides remain
          available and helps the Services remain useful when the network is
          unavailable. INSTEAD does not receive this local storage merely
          because you use the save feature.
        </p>
        <h3>Network and service information</h3>
        <p>
          Supabase provides authentication and the shared community database. Public responses include community content, dates, and vote totals; they do not include email addresses or account identifiers. Reports and account information are not public. As with ordinary internet traffic, the service
          provider may process technical request information such as an IP
          address, user agent, timestamps, and diagnostic or security logs to
          deliver content, prevent abuse, and maintain the service.
        </p>
        <h3>Information we do not request</h3>
        <p>
          The current Services do not request access to precise location,
          contacts, camera, microphone, health records, or advertising
          identifiers. We do not use advertising SDKs or behavioral tracking
          tools. You can optionally select up to three recipe photos through the system photo picker or browser. Only selected images are uploaded. Photos are stored privately in Supabase until publication. Temporary photo links may remain usable for up to five minutes after content is hidden.
        </p>
      </PolicySection>

      <PolicySection title="4. How information is used">
        <p>Information is used only as reasonably necessary to:</p>
        <ul>
          <li>deliver guides and operate email sign-in, comments, votes, and moderation;</li>
          <li>operate, secure, troubleshoot, and improve the Services;</li>
          <li>respond to support, privacy, accessibility, or safety reports;</li>
          <li>comply with law and protect users, INSTEAD, and others.</li>
        </ul>
      </PolicySection>

      <PolicySection title="5. Service providers and disclosure">
        <p>
          Supabase provides authentication, email delivery integration, and database infrastructure
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
          You can delete your own comments and remove your votes in the product discussion. Account, comment, recipe, vote, and report records otherwise remain until deleted or removed through moderation. You can withdraw your recipes; they disappear from the directory, and the app attempts to remove their photo files. Withdrawn text and failed photo cleanups remain available to administrators until purged. Contact support for permanent removal. To request account deletion, contact support from your account email; we will verify the request. Deleting an account removes its community comments, recipes, votes, and reports. Administrators must also remove stored recipe photos during account deletion. See the <Link href="/support">Support page</Link> for help. Clearing local storage does not delete server records.
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

      <PolicySection title="9. Community contributions">
        <p>
          Community contributions are public and unreviewed. Other people may copy public content before you delete it. Reports are available to moderators, and content may be hidden or removed for safety, abuse, or other service concerns. Email verification establishes access to an inbox; it does not verify a person’s identity or expertise.
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
