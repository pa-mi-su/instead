import Link from "next/link";

export function StaticHeader() {
  return (
    <header className="static-header">
      <Link aria-label="INSTEAD home" className="wordmark" href="/">
        <span>INSTEAD</span>
        <small aria-hidden="true">try</small>
      </Link>
      <Link className="back-link" href="/">
        ← GUIDES
      </Link>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <Link aria-label="INSTEAD home" className="wordmark" href="/">
          <span>INSTEAD</span>
          <small aria-hidden="true">try</small>
        </Link>
        <p>Practical alternatives for everyday life.</p>
      </div>
      <nav aria-label="Legal and support">
        <Link href="/safety">Safety</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/support">Support</Link>
      </nav>
      <small>© {new Date().getFullYear()} INSTEAD</small>
    </footer>
  );
}
