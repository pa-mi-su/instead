import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalPage,
  PolicyCallout,
  PolicySection,
} from "../../components/legal-page";
import { supportEmail } from "../../lib/site";

export const metadata: Metadata = {
  title: "Support — INSTEAD",
  description:
    "Get help with INSTEAD or report a content, privacy, accessibility, or safety concern.",
};

export default function SupportPage() {
  return (
    <LegalPage
      eyebrow="HELP & CONTACT"
      introduction="Get help with the website or mobile apps, report a guide concern, or make a privacy or accessibility request."
      title="How can we help?"
    >
      {supportEmail ? (
        <PolicyCallout title="CONTACT SUPPORT">
          <p>
            Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. Please
            choose a clear subject such as “App problem,” “Guide correction,”
            “Safety concern,” “Accessibility,” or “Privacy request.”
          </p>
        </PolicyCallout>
      ) : (
        <PolicyCallout tone="orange" title="PRE-RELEASE CONTACT">
          <p>
            The public support email has not been configured yet. It will be
            displayed here before the website or mobile apps are released.
          </p>
        </PolicyCallout>
      )}

      <PolicySection title="What to include">
        <p>For a technical problem, include only what is useful:</p>
        <ul>
          <li>whether you are using the website, iOS app, or Android app;</li>
          <li>your app version and device or browser version;</li>
          <li>what you expected, what happened, and steps to reproduce it;</li>
          <li>
            a screenshot if helpful, after removing personal or sensitive
            information.
          </li>
        </ul>
        <p>
          For a guide concern, include the guide title, the exact statement at
          issue, why it may be incorrect or unsafe, and a reliable source when
          available.
        </p>
      </PolicySection>

      <PolicySection title="Safety and urgent situations">
        <p>
          Support is not an emergency service and is not monitored for urgent
          hazards. If anyone may be in immediate danger, move to safety and
          contact the appropriate local emergency service or qualified
          professional. Read the <Link href="/safety">Safety page</Link> before
          using a guide for a potentially hazardous task.
        </p>
      </PolicySection>

      <PolicySection title="Saved guides and local data">
        <p>
          INSTEAD currently has no user accounts. Saved guides are stored on
          your device or in your browser, not in an INSTEAD user profile.
        </p>
        <ul>
          <li>
            On the website, remove individual saved guides in INSTEAD or clear
            this site’s browser storage.
          </li>
          <li>
            On mobile, remove individual saved guides in the app. Clearing app
            storage or uninstalling the app removes its local saved data.
          </li>
        </ul>
      </PolicySection>

      <PolicySection title="Accounts and contributions">
        <p>
          Accounts and community guide contributions are not currently
          available. Support cannot create an account or accept a public
          contribution yet. If those features are introduced, INSTEAD will add
          clear submission, moderation, attribution, and deletion controls
          first.
        </p>
      </PolicySection>

      <PolicySection title="Response expectations">
        <p>
          We will make a reasonable effort to review support messages. Response
          times may vary, and we cannot guarantee that every requested guide,
          feature, product review, or correction will be published.
        </p>
      </PolicySection>

      <PolicySection title="Policies">
        <ul className="policy-link-list">
          <li>
            <Link href="/privacy">Privacy Policy</Link>
          </li>
          <li>
            <Link href="/terms">Terms of Use</Link>
          </li>
          <li>
            <Link href="/safety">Safety information</Link>
          </li>
        </ul>
      </PolicySection>
    </LegalPage>
  );
}
