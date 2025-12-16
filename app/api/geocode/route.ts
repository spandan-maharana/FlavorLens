import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (q.length < 2) return NextResponse.json([]);

  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?format=jsonv2` +
    `&q=${encodeURIComponent(q)}` +
    `&addressdetails=1` +
    `&limit=5` +
    `&countrycodes=us`;

  const res = await fetch(url, {
    headers: {
      // Nominatim often blocks requests without a UA
      "User-Agent": "FlavorLens/1.0 (local dev)",
      "Accept-Language": "en",
    },
    // helps avoid caching weirdness in dev
    cache: "no-store",
  });

  if (!res.ok) {
    // return empty list so UI can handle it gracefully
    return NextResponse.json([], { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(Array.isArray(data) ? data : []);
}