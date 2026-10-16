"use client";
import Link from "next/link";

import { useEffect, useMemo, useState } from "react";
import { categories } from "../../src/categories";
import type { Guide } from "../../src/types";
import { universalSafetyNotices } from "../../src/safetyNotices";
import { ProductComments } from "../components/product-comments";
import { SiteFooter } from "../components/site-chrome";

const SAVED_KEY = "instead:web:saved-guides";

type View = "home" | "saved" | "detail";

export default function HomeClient({
  initialGuides,
}: {
  initialGuides: Guide[];
}) {
  const catalog = initialGuides;
  const [view, setView] = useState<View>("home");
  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState<(typeof categories)[number]>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    let saved: string[] | null = null;

    try {
      const stored = window.localStorage.getItem(SAVED_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          saved = parsed.filter(
            (item): item is string => typeof item === "string",
          );
        }
      }

    } catch {
      // The site remains usable if browser storage is unavailable.
    }

    const timeout = window.setTimeout(() => {
      if (saved) setSavedIds(saved);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [initialGuides]);

  const filteredGuides = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return catalog.filter((guide) => {
      const matchesCategory =
        category === "All" || guide.category === category;
      const matchesQuery =
        !normalized ||
        `${guide.title} ${guide.prompt} ${guide.category} ${guide.summary}`
          .toLowerCase()
          .includes(normalized);

      return matchesCategory && matchesQuery;
    });
  }, [catalog, category, query]);

  const savedGuides = catalog.filter((guide) => savedIds.includes(guide.id));
  const selectedGuide =
    catalog.find((guide) => guide.id === selectedId) ?? null;

  function showHome() {
    setSelectedId(null);
    setView("home");
  }

  function openGuide(id: string) {
    setSelectedId(id);
    setView("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleSaved(id: string) {
    const next = savedIds.includes(id)
      ? savedIds.filter((savedId) => savedId !== id)
      : [...savedIds, id];

    setSavedIds(next);
    try {
      window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    } catch {
      // Keep in-memory saving available when browser storage is blocked.
    }
  }

  if (view === "detail" && selectedGuide) {
    return (
      <GuideDetail
        guide={selectedGuide}
        isSaved={savedIds.includes(selectedGuide.id)}
        onBack={showHome}
        onSave={() => toggleSaved(selectedGuide.id)}
      />
    );
  }

  return (
    <>
      <main>
        <Header
          savedCount={savedIds.length}
          savedActive={view === "saved"}
          onHome={showHome}
          onSaved={() => setView("saved")}
        />

        {view === "saved" ? (
          <SavedGuides
            guides={savedGuides}
            onOpen={openGuide}
            onHome={showHome}
          />
        ) : (
          <GuideDirectory
            category={category}
            filteredGuides={filteredGuides}
            onCategory={setCategory}
            onOpen={openGuide}
            onQuery={setQuery}
            query={query}
          />
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function Header({
  savedCount,
  savedActive,
  onHome,
  onSaved,
}: {
  savedCount: number;
  savedActive: boolean;
  onHome: () => void;
  onSaved: () => void;
}) {
  return (
    <header className="site-header">
      <button
        aria-label="INSTEAD home"
        className="wordmark"
        onClick={onHome}
        type="button"
      >
        <span>INSTEAD</span>
        <small aria-hidden="true">try</small>
      </button>
      <Link className="saved-button" href="/safety">INFO & SAFETY</Link>
      <button
        aria-pressed={savedActive}
        className={`saved-button ${savedActive ? "active" : ""}`}
        onClick={onSaved}
        type="button"
      >
        <span aria-hidden="true">♡</span>
        SAVED
        {savedCount > 0 ? <strong>{savedCount}</strong> : null}
      </button>
    </header>
  );
}

function GuideDirectory({
  category,
  filteredGuides,
  onCategory,
  onOpen,
  onQuery,
  query,
}: {
  category: (typeof categories)[number];
  filteredGuides: Guide[];
  onCategory: (category: (typeof categories)[number]) => void;
  onOpen: (id: string) => void;
  onQuery: (query: string) => void;
  query: string;
}) {
  return (
    <div className="page-shell">
      <section className="hero">
        <p className="eyebrow">
          <span aria-hidden="true" />
          SIMPLE INGREDIENTS. EVERYDAY ALTERNATIVES.
        </p>
        <h1>What would you like to replace?</h1>
        <p className="hero-copy">
          Search everyday products and explore natural alternatives.
        </p>
      </section>

      <label className="search">
        <span aria-hidden="true">⌕</span>
        <span className="sr-only">Search guides</span>
        <input
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Try “toothpaste” or “weed killer”"
          type="search"
          value={query}
        />
        {query ? (
          <button
            aria-label="Clear search"
            onClick={() => onQuery("")}
            type="button"
          >
            ×
          </button>
        ) : null}
      </label>

      <nav aria-label="Guide categories" className="categories">
        {categories.map((item) => (
          <button
            aria-pressed={category === item}
            className={category === item ? "active" : ""}
            key={item}
            onClick={() => onCategory(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </nav>

      <section className="directory">
        <div className="directory-heading">
          <h2>
            {query
              ? "MATCHING ALTERNATIVES"
              : category === "All"
                ? "EXPLORE THE DIRECTORY"
                : category.toUpperCase()}
          </h2>
          <p>
            {filteredGuides.length}{" "}
            {filteredGuides.length === 1 ? "TOPIC" : "TOPICS"}
          </p>
        </div>

        <div className="guide-list">
          {filteredGuides.map((guide, index) => (
            <GuideCard
              guide={guide}
              index={index + 1}
              key={guide.id}
              onOpen={onOpen}
            />
          ))}
        </div>

        {filteredGuides.length === 0 ? (
          <div className="empty-state">
            <strong>?</strong>
            <h3>Nothing here yet.</h3>
            <p>Try a broader search or another category.</p>
          </div>
        ) : null}
      </section>

      <section className="promise">
        <p>THE PROMISE</p>
        <h2>Natural deserves a closer look.</h2>
        <span>
          Use at your own risk. Natural does not automatically mean safe or effective.
        </span>
      </section>
    </div>
  );
}

function GuideCard({
  guide,
  index,
  onOpen,
}: {
  guide: Guide;
  index: number;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      aria-label={`Open guide: ${guide.title}. ${guide.prompt}`}
      className="guide-card"
      onClick={() => onOpen(guide.id)}
      type="button"
    >
      <span className="guide-number">{String(index).padStart(2, "0")}</span>
      <span className="guide-copy">
        <small>{guide.category.toUpperCase()}</small>
        <strong>{guide.title}</strong>
        <span>{guide.prompt}</span>
      </span>
      <span aria-hidden="true" className="guide-arrow">
        →
      </span>
    </button>
  );
}

function SavedGuides({
  guides: savedGuides,
  onOpen,
  onHome,
}: {
  guides: Guide[];
  onOpen: (id: string) => void;
  onHome: () => void;
}) {
  return (
    <div className="page-shell saved-page">
      <section className="saved-intro">
        <p>YOUR SHORTLIST</p>
        <h1>Saved for later.</h1>
        <span>Your saved guides stay in this browser.</span>
      </section>

      {savedGuides.length ? (
        <div className="guide-list">
          {savedGuides.map((guide, index) => (
            <GuideCard
              guide={guide}
              index={index + 1}
              key={guide.id}
              onOpen={onOpen}
            />
          ))}
        </div>
      ) : (
        <section className="empty-saved">
          <span aria-hidden="true">♡</span>
          <h2>No saved guides.</h2>
          <p>Save guides you want to find quickly.</p>
          <button onClick={onHome} type="button">
            EXPLORE GUIDES →
          </button>
        </section>
      )}
    </div>
  );
}

function GuideDetail({
  guide,
  isSaved,
  onBack,
  onSave,
}: {
  guide: Guide;
  isSaved: boolean;
  onBack: () => void;
  onSave: () => void;
}) {

  return (
    <>
      <main>
        <header className="detail-header">
        <button aria-label="Back to guides" onClick={onBack} type="button">
          ←
        </button>
        <span aria-label="INSTEAD" className="wordmark wordmark-static">
          <span>INSTEAD</span>
          <small aria-hidden="true">try</small>
        </span>
        <button
          aria-label={isSaved ? "Remove saved guide" : "Save this guide"}
          aria-pressed={isSaved}
          className={isSaved ? "active" : ""}
          onClick={onSave}
          type="button"
        >
          {isSaved ? "♥" : "♡"}
        </button>
        </header>

        <article className="detail-shell">
        <section className="detail-title">
          <p>{guide.category.toUpperCase()}</p>
          <h1>{guide.title}</h1>
          <span>{guide.prompt}</span>
        </section>

        <section className="answer-card">
          <div>
            <small>NATURAL ALTERNATIVES</small>
            <b aria-hidden="true">{guide.icon}</b>
          </div>
          <h2>{guide.answer}</h2>
        </section>

        <aside className="safety-card" aria-label="Universal safety">
          <small>UNIVERSAL SAFETY</small>
          {universalSafetyNotices.map(notice => (
            <div key={notice.title}>
              <h3>{notice.title}</h3><p>{notice.body}</p>
            </div>
          ))}
        </aside>
        {guide.recipes?.length ? (
          <DetailSection number="01" title="RECIPES">
            <div className="option-list">
              {guide.recipes.map(recipe => (
                <div key={recipe.name}>
                  <h3>{recipe.name}</h3>
                  <h4>Ingredients</h4>
                  <ul>{recipe.ingredients.map(item => <li key={item}>{item}</li>)}</ul>
                  <h4>Equipment</h4>
                  <ul>{recipe.equipment.map(item => <li key={item}>{item}</li>)}</ul>
                  <h4>Instructions</h4>
                  <ol>{recipe.instructions.map(step => <li key={step}>{step}</li>)}</ol>
                  <h4>Storage</h4><p>{recipe.storage}</p>
                  <h4>Cautions</h4><p>{recipe.cautions}</p>
                </div>
              ))}
            </div>
          </DetailSection>
        ) : null}
        <DetailSection number={guide.recipes?.length ? "02" : "01"} title="BEFORE YOU TRY ANYTHING">
          <div className="safety-card">
            <small>USE AT YOUR OWN RISK</small>
            <p>{guide.safetyNote}</p>
            <p>{guide.evidenceNote}</p>
          </div>
        </DetailSection>
        <DetailSection number={guide.recipes?.length ? "03" : "02"} title="COMMUNITY SUGGESTIONS">
          <ProductComments key={guide.id} productId={guide.id} />
        </DetailSection>
        <p className="disclaimer">
          Educational information only. Use qualified professional help when a
          task is hazardous, regulated, destructive, or beyond your experience.
        </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

function DetailSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="detail-section">
      <div className="section-heading">
        <span>{number}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}
