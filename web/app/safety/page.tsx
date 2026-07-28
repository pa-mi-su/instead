import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalPage,
  PolicyCallout,
  PolicySection,
} from "../../components/legal-page";

export const metadata: Metadata = {
  title: "Safety — INSTEAD",
  description:
    "How to use INSTEAD guides safely and know when to stop or get professional help.",
};

export default function SafetyPage() {
  return (
    <LegalPage
      eyebrow="KNOW THE BOUNDARY"
      introduction="INSTEAD can make everyday decisions simpler. It cannot see your situation, inspect a hazard, or replace a qualified professional."
      title="Use guides safely."
    >
      <PolicyCallout tone="orange" title="NOT FOR EMERGENCIES">
        <p>
          Do not rely on INSTEAD during an emergency or possible poisoning,
          fire, gas leak, electrical hazard, severe allergic reaction, medical
          crisis, active infestation danger, or immediate threat to people,
          animals, or property. Move to safety and contact the appropriate local
          emergency service or qualified professional.
        </p>
      </PolicyCallout>

      <PolicySection title="A reference, not professional advice">
        <p>
          INSTEAD guides provide general educational information. They are not
          medical diagnosis or treatment, legal advice, engineering or
          structural advice, financial advice, environmental testing,
          pest-control instruction for every species or jurisdiction, or a
          substitute for a licensed trade or other qualified professional.
        </p>
      </PolicySection>

      <PolicySection title="Check your specific situation">
        <p>Before acting on a guide, consider:</p>
        <ul>
          <li>your health, allergies, medications, age, and mobility;</li>
          <li>children, pets, wildlife, and other people who may be exposed;</li>
          <li>
            the exact product, material, equipment, building, pest, and site;
          </li>
          <li>manufacturer instructions, labels, warnings, and safety data;</li>
          <li>
            local laws, codes, permits, disposal rules, and landlord or
            insurance requirements;
          </li>
          <li>protective equipment, ventilation, tools, and training needed.</li>
        </ul>
        <p>
          Product labels, official safety instructions, applicable law, and
          directions from a qualified professional take priority over a general
          INSTEAD guide.
        </p>
      </PolicySection>

      <PolicySection title="Stop and get qualified help">
        <p>Do not continue on your own when a task involves or may involve:</p>
        <ul>
          <li>electricity, gas, fire, fuel, pressurized systems, or utilities;</li>
          <li>
            structural changes, roofing, excavation, confined spaces, or
            significant work at height;
          </li>
          <li>
            suspected asbestos, lead, mold, contaminated water, sewage, or
            hazardous chemicals;
          </li>
          <li>
            pesticides, protected wildlife, venomous animals, dangerous pests,
            or a large or recurring infestation;
          </li>
          <li>
            symptoms, injuries, pregnancy, medication interactions, severe
            allergies, or decisions about medical treatment;
          </li>
          <li>
            a permit, license, inspection, specialized testing, or professional
            certification;
          </li>
          <li>
            uncertainty about the hazard, the correct method, or your ability to
            complete the work safely.
          </li>
        </ul>
      </PolicySection>

      <PolicySection title="Products and ingredients change">
        <p>
          Names, formulas, concentrations, warnings, certifications, recalls,
          and availability can change without notice. Read the current label
          and instructions each time. Test cautiously where appropriate, never
          mix products unless authoritative instructions explicitly say it is
          safe, and keep products away from children and animals.
        </p>
      </PolicySection>

      <PolicySection title="Evidence has limits">
        <p>
          Evidence labels summarize the strength and consistency of information
          available when a guide was reviewed; they are not guarantees.
          Research can be incomplete or change over time, and an evidence label
          does not establish that a choice is safe for every person or
          situation.
        </p>
      </PolicySection>

      <PolicySection title="Report a concern">
        <p>
          If a guide appears unsafe, incorrect, outdated, or unclear, stop using
          it and report the guide through the{" "}
          <Link href="/support">Support page</Link>. Include the guide title and
          the specific concern, but do not include unnecessary personal or
          medical information.
        </p>
      </PolicySection>
    </LegalPage>
  );
}
