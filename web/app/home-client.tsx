"use client";
import Link from "next/link";

import { useEffect, useMemo, useRef, useState } from "react";
import { categories } from "../../src/categories";
import { useCommunity } from "../../src/hooks/useCommunity";
import { communityRpc } from "../../src/lib/community";
import type { Guide } from "../../src/types";
import { universalSafetyNotices } from "../../src/safetyNotices";
import { AccountHub } from "../components/account-hub";
import { ProductCommunity } from "../components/product-community";
import { communityClient } from "../lib/community-client";
import { SiteFooter } from "../components/site-chrome";

const SAVED_KEY = "instead:web:saved-guides";

type View = "home" | "saved" | "account" | "detail";

export default function HomeClient({
  initialGuides,
}: {
  initialGuides: Guide[];
}) {
  const catalog = initialGuides;
  const community = useCommunity(
    communityClient,
    catalog[0]?.id ?? "natural-toothpaste",
    undefined,
    "helpful",
    false,
  );
  const [view, setView] = useState<View>("home");
  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState<(typeof categories)[number]>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [cloudSavedIds, setCloudSavedIds] = useState<string[]>([]);
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);
  const [favoritesReady, setFavoritesReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"local" | "syncing" | "synced" | "error">("local");
  const userId = community.session?.user.id;
  const localSavedRef = useRef(savedIds);

  useEffect(() => {
    localSavedRef.current = savedIds;
  }, [savedIds]);

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
      setFavoritesReady(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [initialGuides]);

  useEffect(() => {
    if (!userId || !favoritesReady || !communityClient) return;
    let active = true;
    const syncingTimer = window.setTimeout(() => setSyncStatus("syncing"), 0);
    void (async () => {
      try {
        const rows = await communityRpc<{ product_id: string }[]>(
          communityClient,
          "community_saved_guides_list",
        );
        const remote = rows.map((row) => row.product_id);
        const remoteSet = new Set(remote);
        const localSaved = localSavedRef.current;
        for (const productId of localSaved) {
          if (!remoteSet.has(productId)) {
            await communityRpc(communityClient, "community_saved_guides_set", {
              p_product: productId,
              p_saved: true,
            });
          }
        }
        window.clearTimeout(syncingTimer);
        if (active) {
          setCloudSavedIds([...new Set([...remote, ...localSaved])]);
          setCloudUserId(userId);
          setSyncStatus("synced");
        }
      } catch {
        window.clearTimeout(syncingTimer);
        if (active) setSyncStatus("error");
      }
    })();
    return () => { active = false; window.clearTimeout(syncingTimer); };
  }, [userId, favoritesReady]);

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

  const activeCloudIds = cloudUserId === userId ? cloudSavedIds : [];
  const allSavedIds = [...new Set([...savedIds, ...activeCloudIds])];
  const savedGuides = catalog.filter((guide) => allSavedIds.includes(guide.id));
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
    const activeIds = allSavedIds;
    const next = activeIds.includes(id)
      ? activeIds.filter((savedId) => savedId !== id)
      : [...activeIds, id];
    const localNext = savedIds.includes(id)
      ? savedIds.filter((savedId) => savedId !== id)
      : userId && activeCloudIds.includes(id)
        ? savedIds
        : [...savedIds, id];

    setSavedIds(localNext);
    try {
      window.localStorage.setItem(SAVED_KEY, JSON.stringify(localNext));
    } catch {
      // Keep in-memory saving available when browser storage is blocked.
    }
    if (userId && communityClient) {
      const cloudNext = next;
      setCloudSavedIds(cloudNext);
      setCloudUserId(userId);
      void communityRpc(communityClient, "community_saved_guides_set", {
        p_product: id,
        p_saved: cloudNext.includes(id),
      }).catch(() => setSyncStatus("error"));
    }
  }

  if (view === "detail" && selectedGuide) {
    return (
      <GuideDetail
        guide={selectedGuide}
        isSaved={allSavedIds.includes(selectedGuide.id)}
        onBack={showHome}
        onSave={() => toggleSaved(selectedGuide.id)}
      />
    );
  }

  return (
    <>
      <main>
        <Header
          savedCount={allSavedIds.length}
          savedActive={view === "saved"}
          accountActive={view === "account"}
          onHome={showHome}
          onSaved={() => setView("saved")}
          onAccount={() => setView("account")}
        />

        {view === "account" ? (
          <AccountHub
            community={community}
            guides={catalog}
            savedGuides={savedGuides}
            syncStatus={syncStatus}
            onOpenGuide={openGuide}
          />
        ) : view === "saved" ? (
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
  accountActive,
  onHome,
  onSaved,
  onAccount,
}: {
  savedCount: number;
  savedActive: boolean;
  accountActive: boolean;
  onHome: () => void;
  onSaved: () => void;
  onAccount: () => void;
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
      <button
        aria-pressed={accountActive}
        className={`saved-button ${accountActive ? "active" : ""}`}
        onClick={onAccount}
        type="button"
      >
        MY INSTEAD
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
        <span>Saved guides stay in this browser. Sign in through My INSTEAD to sync across devices.</span>
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

        <aside className="safety-card" aria-label="Safety warnings">
          <small>SAFETY · READ BEFORE USE</small>
          <p>Natural does not mean safe. Read each recipe’s cautions. Honey: never under 12 months. Essential oils can harm pets.</p>
          <details key={guide.id}><summary>Read all safety warnings</summary>
            {universalSafetyNotices.map(notice => <div key={notice.title}><h3>{notice.title}</h3><p>{notice.body}</p></div>)}
            {guide.reviewNotice && <><h3>Content review</h3><p>{guide.reviewNotice}</p></>}
            <p>{guide.safetyNote}</p><p>{guide.evidenceNote}</p>
          </details>
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
        <DetailSection number={guide.recipes?.length ? "02" : "01"} title="COMMUNITY RECIPES & ACCOUNT">
          <ProductCommunity key={guide.id} productId={guide.id} />
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
