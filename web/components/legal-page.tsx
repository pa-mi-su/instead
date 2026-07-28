import type { ReactNode } from "react";
import { SiteFooter, StaticHeader } from "./site-chrome";

export const policyDate = "July 28, 2026";

export function LegalPage({
  eyebrow,
  title,
  introduction,
  children,
}: {
  eyebrow: string;
  title: string;
  introduction: string;
  children: ReactNode;
}) {
  return (
    <>
      <StaticHeader />
      <main className="legal-shell">
        <header className="legal-hero">
          <p>{eyebrow}</p>
          <h1>{title}</h1>
          <span>{introduction}</span>
          <small>LAST UPDATED {policyDate.toUpperCase()}</small>
        </header>
        <div className="legal-content">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}

export function PolicySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="policy-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function PolicyCallout({
  tone = "lime",
  title,
  children,
}: {
  tone?: "lime" | "orange" | "dark";
  title: string;
  children: ReactNode;
}) {
  return (
    <aside className={`policy-callout policy-callout-${tone}`}>
      <strong>{title}</strong>
      {children}
    </aside>
  );
}
