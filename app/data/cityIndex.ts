// app/data/cityIndex.ts
import { usCities } from "./usCities";

type CityIndexItem = {
  label: string;     // "Jersey City, NJ"
  city: string;      // "Jersey City"
  state: string;     // "NJ"
  normLabel: string;
  normCity: string;
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const cityIndex: CityIndexItem[] = usCities
  .map((label) => {
    const parts = label.split(",");
    const city = parts[0]?.trim();
    const state = parts[1]?.trim();

    if (!city || !state) return null;

    return {
      label,
      city,
      state,
      normLabel: normalize(label),
      normCity: normalize(city),
    };
  })
  .filter(Boolean) as CityIndexItem[];

export function searchCities(query: string, limit = 8): string[] {
  const q = normalize(query);
  if (!q) return [];

  return cityIndex
    .map((item) => {
      let score = 0;

      if (item.normLabel.startsWith(q)) score += 100;
      if (item.normCity.startsWith(q)) score += 80;
      if (item.normLabel.includes(q)) score += 30;

      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item.label);
}