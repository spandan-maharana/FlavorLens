import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mood, budget, diet, latitude, longitude, locationText } = body;

    if (!mood) {
      return NextResponse.json(
        { error: "Mood is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.YELP_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing Yelp API Key" },
        { status: 500 }
      );
    }

    const queryParts = [];
    queryParts.push(`Suggest 3 restaurants that match this context: "${mood}".`);
    if (budget) queryParts.push(`Budget: ${budget}.`);
    if (diet) queryParts.push(`Dietary preference: ${diet}.`);

    queryParts.push(
      "Return options as JSON: name, url, rating, price, categories, short_reason."
    );

    const query = queryParts.join(" ");

    const payload = {
      query: locationText
        ? `${query} Location: ${locationText}.`
        : query,
      user_context: {
        locale: "en_US",
        latitude,
        longitude,
      },
    };

    const yelpRes = await fetch("https://api.yelp.com/ai/chat/v2", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await yelpRes.json();

    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}