import type { Metadata } from "next";
import { policyDocuments } from "../../../src/policies";
import { LegalPage, PolicySection } from "../../components/legal-page";
export const metadata: Metadata = { title: "Privacy Policy — INSTEAD" };
export default function PolicyPage() {
  return <LegalPage eyebrow="INSTEAD POLICIES" title="Privacy Policy" introduction="Applies to the INSTEAD website and mobile apps.">
    {policyDocuments.privacy.map(section => <PolicySection key={section.title} title={section.title}>
      {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
    </PolicySection>)}
  </LegalPage>;
}
