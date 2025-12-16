"use client";

import LocationAutocomplete from "./components/LocationAutocomplete";
import LoadingSkeleton from "./components/LoadingSkeleton";

import Image from "next/image";

import { useState } from "react";
import { FormEvent } from "react";
import { useEffect } from "react";

type YelpCategory = {
  title: string;
};

type YelpPhoto = {
  original_url: string;
};

type YelpSummaries = {
  short?: string;
  medium?: string;
  long?: string;
};

type YelpLocation = {
  formatted_address?: string;
};

type YelpContextualInfo = {
  photos?: YelpPhoto[];
};

type Favorite = {
  id: string;
  name: string;
  photo: string;
  rating?: number;
  price?: string;
  categories: string[];
  address?: string;
  url?: string;
};

type YelpBusiness = {
  id: string;
  name: string;
  rating?: number;
  review_count?: number;
  price?: string;
  url?: string;
  summaries?: YelpSummaries;
  categories: YelpCategory[];
  location: YelpLocation;
  contextual_info?: YelpContextualInfo;
};

type YelpBusinessWithScore = YelpBusiness & {
  matchScore: number;
};

// -----------------------------
// MATCH SCORE ENGINE
// -----------------------------
function calculateMatchScore(
  business: YelpBusiness,
  mood: string,
  budget: string,
  diet: string
): number {
  let score = 0;

  // 1️⃣ Rating Weight (0–25 pts)
  if (business.rating) {
    score += business.rating * 5; // 4.5 stars → 22 pts
  }

  // 2️⃣ Review Count Weight (0–20 pts)
  if (business.review_count) {
    const capped = Math.min(business.review_count, 800);
    score += (capped / 800) * 20;
  }

  // 3️⃣ Mood Relevance (0–30 pts)
  if (mood) {
    const moodLower = mood.toLowerCase();
    const summary = business.summaries?.short?.toLowerCase() ?? "";

    if (summary.includes("comfort")) score += 12;
    if (summary.includes("noodle")) score += 8;
    if (summary.includes("warm")) score += 6;
    if (summary.includes("cozy")) score += 10;

    // fuzzy mood-category match
    business.categories.forEach((c) => {
      const t = c.title.toLowerCase();
      if (moodLower.includes(t)) score += 10;
    });
  }

  // 4️⃣ Budget Fit (0–10 pts)
  if (budget && business.price) {
    score += business.price === budget ? 10 : 0;
  }

  // 5️⃣ Diet Fit (0–10 pts)
  if (diet) {
    const sum = business.summaries?.short?.toLowerCase() ?? "";

    if (diet === "vegetarian" && sum.includes("vegetarian")) score += 10;
    else if (diet === "vegan" && sum.includes("vegan")) score += 10;
    else if (diet === "gluten-free" && sum.includes("gluten")) score += 10;
  }

  // normalize to 0–100
  return Math.min(100, Math.round(score));
}

// ------------------------------------------------
// MATCH SCORE BREAKDOWN (for progress bars)
// ------------------------------------------------
function getScoreBreakdown(
  business: YelpBusiness,
  mood: string,
  budget: string,
  diet: string
) {
  // Rating (max 25)
  const ratingScore = business.rating ? Math.round(business.rating * 5) : 0;

  // Reviews (max 20)
  const reviewScore = business.review_count
    ? Math.round((Math.min(business.review_count, 800) / 800) * 20)
    : 0;

  // Mood (max 30)
  let moodScore = 0;
  const summary = business.summaries?.short?.toLowerCase() ?? "";
  const moodLower = mood.toLowerCase();

  if (summary.includes("comfort")) moodScore += 12;
  if (summary.includes("noodle")) moodScore += 8;
  if (summary.includes("warm")) moodScore += 6;
  if (summary.includes("cozy")) moodScore += 10;

  business.categories.forEach((c) => {
    if (moodLower.includes(c.title.toLowerCase())) moodScore += 10;
  });

  if (moodScore > 30) moodScore = 30; // cap

  // Budget (max 10)
  const budgetScore = budget && business.price === budget ? 10 : 0;

  // Diet (max 10)
  let dietScore = 0;
  if (diet) {
    if (diet === "vegetarian" && summary.includes("vegetarian")) dietScore = 10;
    if (diet === "vegan" && summary.includes("vegan")) dietScore = 10;
    if (diet === "gluten-free" && summary.includes("gluten")) dietScore = 10;
  }

  return {
    ratingScore,
    reviewScore,
    moodScore,
    budgetScore,
    dietScore,
  };
}

// ----------------------------------------
// SCORE COLOR BADGE FUNCTION
// ----------------------------------------
function scoreColor(score: number) {
  if (score >= 80) return "bg-green-600";
  if (score >= 60) return "bg-yellow-500 text-black";
  return "bg-gray-600";
}

// ------------------------------------------------
// VIBE TAG ENGINE
// ------------------------------------------------
type FlavorVibe =
  | "Cozy"
  | "Comfort Food"
  | "Spicy"
  | "Healthy"
  | "Quick Bite"
  | "Romantic";

function inferVibes(
  business: YelpBusinessWithScore,
  mood: string
): FlavorVibe[] {
  const vibes: FlavorVibe[] = [];
  const summary = business.summaries?.short?.toLowerCase() ?? "";
  const cats = business.categories.map((c) => c.title.toLowerCase()).join(" ");
  const moodLower = mood.toLowerCase();

  // Cozy / comfort
  if (
    summary.includes("cozy") ||
    summary.includes("warm") ||
    summary.includes("comfort") ||
    cats.includes("cafe") ||
    cats.includes("coffee")
  ) {
    vibes.push("Cozy");
  }

  if (
    summary.includes("comfort") ||
    cats.includes("diner") ||
    cats.includes("bbq") ||
    cats.includes("noodle")
  ) {
    vibes.push("Comfort Food");
  }

  // Spicy
  if (
    summary.includes("spicy") ||
    cats.includes("indian") ||
    cats.includes("thai") ||
    cats.includes("mexican")
  ) {
    vibes.push("Spicy");
  }

  // Healthy
  if (
    summary.includes("healthy") ||
    summary.includes("salad") ||
    cats.includes("vegan") ||
    cats.includes("vegetarian")
  ) {
    vibes.push("Healthy");
  }

  // Quick Bite
  if (
    summary.includes("quick") ||
    summary.includes("casual") ||
    cats.includes("fast food") ||
    cats.includes("sandwiches")
  ) {
    vibes.push("Quick Bite");
  }

  // Romantic
  if (
    summary.includes("romantic") ||
    summary.includes("intimate") ||
    summary.includes("date night")
  ) {
    vibes.push("Romantic");
  }

  // Lightly bias by mood text itself
  if (moodLower.includes("date") || moodLower.includes("romantic")) {
    if (!vibes.includes("Romantic")) vibes.push("Romantic");
  }
  if (moodLower.includes("light") || moodLower.includes("healthy")) {
    if (!vibes.includes("Healthy")) vibes.push("Healthy");
  }
  if (moodLower.includes("spicy")) {
    if (!vibes.includes("Spicy")) vibes.push("Spicy");
  }

  // De-duplicate
  return Array.from(new Set(vibes));
}

// ------------------------------------------------
// SHORT, PUNCHY SUMMARY ENGINE
// ------------------------------------------------
function generateShortSummary(
  business: YelpBusinessWithScore,
  mood: string
) {
  const moodText = mood
    ? `You're craving something "${mood}", and this place nails that vibe. `
    : "";

  const category = business.categories?.[0]?.title
    ? business.categories[0].title
    : "great food";

  const ratingText = business.rating
    ? `${business.rating}⭐ rated `
    : "";

  const priceText = business.price ? `(${business.price})` : "";

  return (
    `${moodText}` +
    `${business.name} is a ${category.toLowerCase()} spot ` +
    `with ${ratingText}${priceText}. ` +
    `A top match for what you're feeling right now!`
  );
}




export default function Home() {
  const [mood, setMood] = useState("");
  const [budget, setBudget] = useState("");
  const [diet, setDiet] = useState("");
  const [locationText, setLocationText] = useState("");
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState<YelpBusiness | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [activeTab, setActiveTab] = useState<"search" | "favorites">("search");

// Load favorites from localStorage on mount
useEffect(() => {
  try {
    const saved = localStorage.getItem("flavorlens-favorites");
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  } catch {
    // ignore JSON errors
  }
}, []);

// Persist favorites whenever they change
useEffect(() => {
  localStorage.setItem("flavorlens-favorites", JSON.stringify(favorites));
}, [favorites]);

function toggleFavorite(b: YelpBusiness) {
  const exists = favorites.find((f) => f.id === b.id);

  if (exists) {
    // remove
    setFavorites(favorites.filter((f) => f.id !== b.id));
  } else {
    // add
    setFavorites([
      ...favorites,
      {
        id: b.id,
        name: b.name,
        photo:
          b.contextual_info?.photos?.[0]?.original_url ?? "/placeholder.png",
        rating: b.rating,
        price: b.price,
        categories: b.categories.map((c) => c.title),
        address: b.location.formatted_address,
        url: b.url,
      },
    ]);
  }
}

function removeFavorite(id: string){
    setFavorites((prev) => prev.filter((f) => f.id !== id));
}

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/flavorlens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood,
          budget,
          diet,
          locationText,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setResult(data);
      }
    } catch (err: unknown) {
      if (err instanceof Error){
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white p-6">
      <div className="w-full max-w-2xl bg-gray-900 p-6 rounded-lg border border-gray-700">
        <h1 className="text-3xl font-semibold text-purple-300 mb-2">
          FlavorLens
        </h1>
        <div className="flex gap-3 mb-6">
  <button
    onClick={() => setActiveTab("search")}
    className={`px-3 py-1 rounded text-sm ${
      activeTab === "search"
        ? "bg-purple-600"
        : "bg-gray-700 hover:bg-gray-600"
    }`}
  >
    Search
  </button>

  <button
    onClick={() => setActiveTab("favorites")}
    className={`px-3 py-1 rounded text-sm ${
      activeTab === "favorites"
        ? "bg-purple-600"
        : "bg-gray-700 hover:bg-gray-600"
    }`}
  >
    Favorites ({favorites.length})
  </button>
</div>
        <p className="mb-6 text-gray-300">
          AI that understands your food mood.
        </p>
{activeTab === "search" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            placeholder="Describe your mood…"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            required
          />

          <div className="grid grid-cols-3 gap-3">
            <select
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="p-2 rounded bg-gray-800 border border-gray-700 w-full"
            >
              <option value="">Any</option>
              <option value="$">$</option>
              <option value="$$">$$</option>
              <option value="$$$">$$$</option>
            </select>

            <select
              value={diet}
              onChange={(e) => setDiet(e.target.value)}
              className="p-2 rounded bg-gray-800 border border-gray-700 w-full"
            >
              <option value="">No preference</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="gluten-free">Gluten-free</option>
            </select>

            <div className="w-full flex flex-col justify-end">
              <LocationAutocomplete value={locationText} onChange = {setLocationText} onSelect={(value) => setLocationText(value)} />
            </div>
          </div>

          <button
            className="bg-purple-500 p-2 rounded w-full hover:bg-purple-400 transition"
            disabled={loading}
          >
            {loading ? "Thinking…" : "Find My Perfect Place"}
          </button>
        </form>
)}
        {error && <p className="mt-4 text-red-400">{error}</p>}
        {loading && <LoadingSkeleton />}

        {/* FAVORITES SECTION */}
{/* FAVORITES SECTION – only on Favorites tab */}
{activeTab === "favorites" && (
  <div className="mt-6 bg-gray-800 p-4 rounded border border-gray-700">
    <h3 className="font-semibold text-purple-300 mb-2 text-sm">
      Your FlavorLens Favorites
    </h3>

    {favorites.length === 0 ? (
      <p className="text-xs text-gray-400">
        You haven’t saved any spots yet. Tap the ❤️ on a place to add it here.
      </p>
    ) : (
      <div className="flex flex-col gap-3">
        {favorites.map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-between gap-3 p-2 bg-gray-900 rounded border border-gray-700"
          >
            {/* Left: business info + link */}
            <a
              href={f.url}
              target="_blank"
              className="flex items-center gap-3 flex-1 hover:border-purple-400/60"
            >
              <Image
                src={f.photo}
                alt={f.name}
                width={48}
                height={48}
                className="rounded object-cover"
              />
              <div>
                <p className="text-sm font-semibold">{f.name}</p>
                <p className="text-xs text-gray-400">
                  {f.rating && <>⭐ {f.rating} · </>}
                  {f.price && <>{f.price} · </>}
                  {f.categories.join(", ")}
                </p>
                {f.address && (
                  <p className="text-[11px] text-gray-500 truncate">
                    {f.address}
                  </p>
                )}
              </div>
            </a>

            {/* Right: remove button */}
            <button
              type="button"
              onClick={() => removeFavorite(f.id)}
              className="text-[11px] px-2 py-1 rounded border border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-red-400"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
)}

        {/* -------------------------------------------- */}
        {/* SORT + MATCH SCORE + RENDER CARDS */}
        {/* -------------------------------------------- */}

        {!loading && result?.entities?.[0] && (
          <div className="mt-6 grid grid-cols-1 gap-4">
            {result.entities[0].businesses
              .map((b: YelpBusiness) => ({
                ...b,
                matchScore: calculateMatchScore(b, mood, budget, diet),
              }))
              .sort((a: YelpBusinessWithScore, b: YelpBusinessWithScore) => b.matchScore - a.matchScore)
              .map((b: YelpBusinessWithScore) => (
  <div
    key={b.id}
    role="button"
    tabIndex={0}
    onClick={() => setSelectedBusiness(b)}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") setSelectedBusiness(b);
    }}
    className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex gap-4 w-full text-left hover:border-purple-400 hover:bg-gray-800/80 transition cursor-pointer"
  >
        {/* Image */}
        <Image
          src={b.contextual_info?.photos?.[0]?.original_url ?? "/placeholder.png"}
          alt={b.name}
          width={128}
          height={128}
          className="object-cover rounded"
        />

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
    <h2 className="text-lg font-semibold">{b.name}</h2>

    {/* FAVORITE HEART BUTTON */}
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(b);
      }}
      className="text-xl"
      aria-label="Save to favorites"
    >
      {favorites.some((f) => f.id === b.id) ? "❤️" : "🤍"}
    </button>
  </div>
          {/* MATCH SCORE BADGE */}
                    <div
                      className={`inline-block px-2 py-1 rounded text-xs font-bold mb-2 ${scoreColor(
                        b.matchScore
                      )}`}
                    >
                      Match: {b.matchScore}%
                    </div>

                                {/* VIBE BADGES */}
            {inferVibes(b, mood).length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {inferVibes(b, mood).map((vibe) => (
                  <span
                    key={vibe}
                    className="px-2 py-0.5 rounded-full text-[10px] border border-purple-400/50 text-purple-200 bg-purple-500/10"
                  >
                    {vibe}
                  </span>
                ))}
              </div>
            )}

          <p className="text-sm text-gray-400">
            {b.summaries?.short}
          </p>

          <p className="text-sm mt-2">
            ⭐ {b.rating} · {b.review_count} reviews · {b.price || ""}
          </p>

          <p className="text-xs text-gray-400">
            {b.categories.map((c: YelpCategory) => c.title).join(", ")}
          </p>

          <p className="text-xs text-gray-400 mt-1">
            📍 {b.location.formatted_address}
          </p>

          <a
            href={b.url}
            target="_blank"
            onClick = {(e) => e.stopPropagation()}
            className="inline-block mt-2 text-purple-300 hover:text-purple-200 text-sm"
          >
            View on Yelp →
          </a>
        </div>
        </div>
    ))}
  </div>
)}
{/* MODAL – shows when a card is clicked */}
        {selectedBusiness && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 relative">
              {/* Close Button */}
              <button
                onClick={() => setSelectedBusiness(null)}
                className="absolute right-3 top-3 text-gray-400 hover:text-white text-xl"
              >
                ×
              </button>

              {/* Header Image */}
              <Image
                src={
                  selectedBusiness.contextual_info?.photos?.[0]?.original_url ??
                  "/placeholder.png"
                }
                alt={selectedBusiness.name}
                width={600}
                height={400}
                className="w-full h-56 object-cover rounded-lg"
              />

              {/* Business Info */}
              <h2 className="text-2xl font-semibold mt-3">
                {selectedBusiness.name}
              </h2>
              {/* AI Explanation */}
<div className="mt-3 bg-gray-800 p-3 rounded border border-gray-700 text-sm text-purple-200">
  <h3 className="font-semibold text-purple-300 mb-1">
    Why FlavorLens Picked This For You
  </h3>
    <p>
    {generateShortSummary(
      {
        ...selectedBusiness,
        matchScore: calculateMatchScore(
          selectedBusiness,
          mood,
          budget,
          diet
        ),
      },
      mood
    )}
  </p>
</div>
              {/* VIBE BADGES IN MODAL */}
              {inferVibes(
                {
                  ...selectedBusiness,
                  matchScore: calculateMatchScore(
                    selectedBusiness,
                    mood,
                    budget,
                    diet
                  ),
                },
                mood
              ).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {inferVibes(
                    {
                      ...selectedBusiness,
                      matchScore: calculateMatchScore(
                        selectedBusiness,
                        mood,
                        budget,
                        diet
                      ),
                    },
                    mood
                  ).map((vibe) => (
                    <span
                      key={vibe}
                      className="px-2 py-0.5 rounded-full text-[10px] border border-purple-400/50 text-purple-200 bg-purple-500/10"
                    >
                      {vibe}
                    </span>
                  ))}
                </div>
              )}

              {/* SCORE BREAKDOWN */}
<div className="mt-4 bg-gray-800 p-4 rounded border border-gray-700">
  <h3 className="font-semibold text-purple-300 mb-3 text-sm">
    Match Score Breakdown
  </h3>

  {(() => {
    const breakdown = getScoreBreakdown(selectedBusiness, mood, budget, diet);

    const bar = (value: number, max: number) => (
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-300">
            {Math.round((value / max) * 100)}%
          </span>
          <span className="text-gray-400">
            {value}/{max}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded h-2">
          <div
            className="bg-purple-500 h-2 rounded"
            style={{ width: `${(value / max) * 100}%` }}
          ></div>
        </div>
      </div>
    );

    return (
      <>
        <p className="text-xs text-gray-400 mb-2">Rating</p>
        {bar(breakdown.ratingScore, 25)}

        <p className="text-xs text-gray-400 mb-2">Reviews</p>
        {bar(breakdown.reviewScore, 20)}

        <p className="text-xs text-gray-400 mb-2">Mood Match</p>
        {bar(breakdown.moodScore, 30)}

        <p className="text-xs text-gray-400 mb-2">Budget Fit</p>
        {bar(breakdown.budgetScore, 10)}

        <p className="text-xs text-gray-400 mb-2">Diet Fit</p>
        {bar(breakdown.dietScore, 10)}
      </>
    );
  })()}
</div>

              <p className="text-gray-400 text-sm mt-2">
                {selectedBusiness.summaries?.medium ||
                  selectedBusiness.summaries?.short ||
                  "No description available."}
              </p>

              <p className="text-sm mt-3">
                ⭐ {selectedBusiness.rating} ·{" "}
                {selectedBusiness.review_count} reviews ·{" "}
                {selectedBusiness.price}
              </p>

              <p className="text-xs text-gray-400 mt-1">
                {selectedBusiness.categories.map((c) => c.title).join(", ")}
              </p>

              <p className="text-xs text-gray-400 mt-1">
                📍 {selectedBusiness.location.formatted_address}
              </p>

              {/* Modal Buttons */}
              <div className="mt-4 flex gap-3">
                <a
                  href={selectedBusiness.url}
                  target="_blank"
                  className="px-3 py-2 rounded bg-purple-500 text-sm hover:bg-purple-400"
                >
                  View on Yelp
                </a>

                <button
                  onClick={() => setSelectedBusiness(null)}
                  className="px-3 py-2 rounded border border-gray-600 text-sm hover:bg-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}