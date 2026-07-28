import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalPage,
  PolicyCallout,
  PolicySection,
} from "../../components/legal-page";
import { supportEmail } from "../../lib/site";

export const metadata: Metadata = {
  title: "Terms of Use — INSTEAD",
  description: "Terms for using the INSTEAD website and mobile apps.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="THE GROUND RULES"
      introduction="These terms describe the current INSTEAD website and mobile apps and the responsibilities that come with using them."
      title="Terms of Use"
    >
      <PolicyCallout title="PLEASE READ THIS FIRST">
        <p>
          INSTEAD is a reference tool, not a substitute for professional
          judgment. Use each guide as a starting point, verify what applies to
          your situation, and follow the safety boundaries.
        </p>
      </PolicyCallout>

      <PolicySection title="1. Accepting these terms">
        <p>
          By accessing or using the INSTEAD website or mobile applications (the
          “Services”), you agree to these Terms of Use. If you do not agree, do
          not use the Services.
        </p>
      </PolicySection>

      <PolicySection title="2. What INSTEAD provides">
        <p>
          INSTEAD publishes practical, educational guides about alternatives
          for everyday tasks, products, and services. The current Services do
          not provide user accounts, paid subscriptions, purchases, or
          community submissions.
        </p>
      </PolicySection>

      <PolicySection title="3. Informational use and safety">
        <p>
          Guides are general information and may not account for your health,
          property, equipment, location, local laws, product instructions, or
          other circumstances. They are not medical, legal, engineering,
          financial, environmental, pest-control, or other professional advice.
        </p>
        <p>
          You are responsible for evaluating whether a guide is appropriate,
          following manufacturer instructions and applicable laws, and using a
          qualified professional when a task is hazardous, regulated,
          destructive, uncertain, or beyond your skill. The{" "}
          <Link href="/safety">Safety page</Link> is part of these terms.
        </p>
      </PolicySection>

      <PolicySection title="4. Permitted use">
        <p>
          We grant you a limited, personal, non-exclusive, non-transferable,
          revocable right to use the Services for lawful purposes. You may not:
        </p>
        <ul>
          <li>interfere with or attempt to bypass service security;</li>
          <li>
            access the Services through abusive, automated, or excessive means;
          </li>
          <li>
            copy, sell, repackage, or commercially exploit substantial portions
            of the Services without permission;
          </li>
          <li>
            use the Services to violate law or the rights or safety of others;
          </li>
          <li>misrepresent INSTEAD content as professional certification.</li>
        </ul>
      </PolicySection>

      <PolicySection title="5. Content and intellectual property">
        <p>
          The Services, branding, design, and original guide content are owned
          by INSTEAD or its licensors and are protected by applicable
          intellectual-property laws. Product names and third-party marks
          belong to their respective owners. Mentioning a product or service
          does not transfer ownership or imply sponsorship.
        </p>
      </PolicySection>

      <PolicySection title="6. Third-party products and services">
        <p>
          Guides may discuss third-party products, manufacturers, service
          providers, or external resources. Availability, formulation,
          instructions, pricing, safety information, and claims can change.
          Unless expressly stated, a mention is not an endorsement, partnership,
          warranty, or paid placement. Third parties have their own terms and
          privacy practices.
        </p>
      </PolicySection>

      <PolicySection title="7. Changes and availability">
        <p>
          We may correct, add, remove, or update guides and service features.
          We do not promise that every guide is complete, current, available,
          or suitable for every user or location. The Services may occasionally
          be interrupted for maintenance, security, or reasons outside our
          control.
        </p>
      </PolicySection>

      <PolicySection title="8. Disclaimers">
        <p>
          To the fullest extent permitted by applicable law, the Services are
          provided “as is” and “as available,” without warranties of any kind,
          whether express, implied, or statutory, including warranties of
          accuracy, fitness for a particular purpose, non-infringement, or
          uninterrupted availability. Some jurisdictions do not allow certain
          warranty exclusions, so those exclusions may not apply to you.
        </p>
      </PolicySection>

      <PolicySection title="9. Limitation of liability">
        <p>
          To the fullest extent permitted by applicable law, INSTEAD and its
          contributors will not be liable for indirect, incidental, special,
          consequential, exemplary, or punitive damages, or for losses arising
          from reliance on a guide, use of a third-party product or service,
          property damage, data loss, or service interruption. Nothing in these
          terms excludes liability that cannot lawfully be excluded.
        </p>
      </PolicySection>

      <PolicySection title="10. Ending access">
        <p>
          You may stop using the Services at any time. We may restrict access
          when reasonably necessary to protect the Services, users, safety, or
          legal rights, or when these terms are materially violated.
        </p>
      </PolicySection>

      <PolicySection title="11. Changes to these terms">
        <p>
          We may revise these terms as the Services develop. The revised terms
          will display a new “Last updated” date. Continued use after revised
          terms take effect means you accept them where permitted by law.
        </p>
      </PolicySection>

      <PolicySection title="12. Contact">
        {supportEmail ? (
          <p>
            Questions about these terms may be sent to{" "}
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
          </p>
        ) : (
          <p>
            A public contact will be added here before release. Until then, this
            page is a pre-release terms draft.
          </p>
        )}
      </PolicySection>
    </LegalPage>
  );
}
