import { NextRequest, NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant"; content: string };

type BookingDetails = {
  name?: string;
  occasion?:
    | "Birthday"
    | "Baby Shower"
    | "Engagement"
    | "Anniversary"
    | "Corporate"
    | "Other";
  date?: string;
  timeSlot?: string;
  guests?: number;
  decoration?: boolean;
  contact?: string;
};

const VENUE_LINK = process.env.NEXT_PUBLIC_VENUE_LINK || "https://example.com/happyhearts";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { messages?: ChatMessage[] };
    const messages = body.messages || [];
    const userText = messages[messages.length - 1]?.content || "";

    if (askedForMedia(userText)) {
      return NextResponse.json({ reply: `Here is our venue preview: ${VENUE_LINK}` });
    }
    if (askedForPrice(userText)) {
      const { date, timeSlot, guests } = extractBooking(messages);
      if (!date || !timeSlot || !guests) {
        return NextResponse.json({
          reply:
            "Our pricing depends on date, timing & guest count. I can give an exact quote once I have these 3 details.",
        });
      }
    }

    const details = extractBooking(messages);
    const missing = requiredMissing(details);

    if (missing.length > 0) {
      const ask = formatMissingPrompt(missing);
      return NextResponse.json({ reply: ask });
    }

    const reply = buildConfirmation(details);
    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json({ reply: "Sorry, something went wrong. Please try again." }, { status: 200 });
  }
}

function askedForMedia(text: string): boolean {
  const t = normalize(text);
  return [
    "photo",
    "photos",
    "pics",
    "pictures",
    "video",
    "videos",
    "gallery",
    "preview",
    "send photo",
    "send photos",
    "send video",
  ].some((k) => t.includes(k));
}

function askedForPrice(text: string): boolean {
  const t = normalize(text);
  return ["price", "pricing", "cost", "charges", "rate", "how much"].some((k) => t.includes(k));
}

function extractBooking(messages: ChatMessage[]): BookingDetails {
  const collected: BookingDetails = {};
  for (const m of messages) {
    if (m.role !== "user") continue;
    const text = m.content;
    if (!collected.name) collected.name = extractName(text);
    if (!collected.occasion) collected.occasion = extractOccasion(text);
    if (!collected.guests) collected.guests = extractGuests(text);
    if (!collected.date) collected.date = extractDate(text);
    if (!collected.timeSlot) collected.timeSlot = extractTimeSlot(text);
    if (collected.decoration === undefined) {
      const dec = extractDecoration(text);
      if (dec !== undefined) collected.decoration = dec;
    }
    if (!collected.contact) collected.contact = extractContact(text);
  }
  return collected;
}

function requiredMissing(d: BookingDetails): Array<keyof BookingDetails> {
  const need: Array<keyof BookingDetails> = [];
  if (!d.name) need.push("name");
  if (!d.occasion) need.push("occasion");
  if (!d.date) need.push("date");
  if (!d.timeSlot) need.push("timeSlot");
  if (!d.guests) need.push("guests");
  if (d.decoration === undefined) need.push("decoration");
  if (!d.contact) need.push("contact");
  return need;
}

function formatMissingPrompt(missing: Array<keyof BookingDetails>): string {
  const labels: Record<keyof BookingDetails, string> = {
    name: "Name",
    occasion: "Occasion (Birthday / Baby Shower / Engagement / Anniversary / Corporate / Other)",
    date: "Date",
    timeSlot: "Time slot",
    guests: "Number of guests",
    decoration: "Decoration required (Yes/No)",
    contact: "Contact number",
  };
  const list = missing.map((k) => labels[k]).join(", ");
  return `Sure! To assist you, please share: ${list}.`;
}

function buildConfirmation(d: BookingDetails): string {
  const availability = "We currently have availability for that slot.";
  const estimate = estimatePriceRange(d);
  const inclusions =
    "Includes: 4-hour hall, AC, seating setup, basic lighting & sound, housekeeping, on-site coordinator.";
  const advance = "To confirm: 30% advance.";
  return [
    `Thanks ${d.name || "there"}!`,
    availability,
    `Price range: ${estimate}.`,
    inclusions,
    advance,
  ].join("\n");
}

function estimatePriceRange(d: BookingDetails): string {
  const guests = Math.max(1, Math.min(800, d.guests || 50));
  const perHeadBase = 180;
  let base = perHeadBase * guests;

  const t = normalize(`${d.date || ""} ${d.timeSlot || ""}`);
  const weekend = /(sat|sun|weekend|fri)/.test(t);
  const evening = /(evening|night|pm|6-10|7-11|6?10|7?11)/.test(t);
  if (weekend) base *= 1.15;
  if (evening) base *= 1.1;

  const min = Math.round((base * 0.9) / 100) * 100;
  const max = Math.round((base * 1.15) / 100) * 100;
  return `?${formatInr(min)}??${formatInr(max)}`;
}

function formatInr(n: number): string {
  return n.toLocaleString("en-IN");
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function extractName(text: string): string | undefined {
  const t = normalize(text);
  const m = t.match(/\b(?:i am|i'm|this is|my name is)\s+([a-zA-Z][a-z\s'.-]{1,30})/i);
  if (m) return capitalizeWords(m[1].trim());
  return undefined;
}

function extractOccasion(text: string): BookingDetails["occasion"] | undefined {
  const t = normalize(text);
  const map: Record<string, BookingDetails["occasion"]> = {
    birthday: "Birthday",
    "baby shower": "Baby Shower",
    engagement: "Engagement",
    anniversary: "Anniversary",
    corporate: "Corporate",
  };
  for (const key of Object.keys(map)) {
    if (t.includes(key)) return map[key];
  }
  if (/(party|function|event)/.test(t)) return "Other";
  return undefined;
}

function extractGuests(text: string): number | undefined {
  const t = normalize(text);
  const m = t.match(/\b(\d{1,4})\s*(guests|people|pax|persons|heads|attendees)?\b/);
  if (!m) return undefined;
  const num = parseInt(m[1], 10);
  if (!isFinite(num) || num <= 0) return undefined;
  return num;
}

function extractDate(text: string): string | undefined {
  const m1 = text.match(/\b(\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?)\b/);
  if (m1) return m1[1];
  const m2 = text.match(/\b(\d{1,2}\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\.?\s*(\d{2,4})?)\b/i);
  if (m2) return m2[1];
  const m3 = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (m3) return m3[1];
  return undefined;
}

function extractTimeSlot(text: string): string | undefined {
  const t = normalize(text);
  const mRange = t.match(/\b(\d{1,2})(?:\s*[:.]\s*(\d{2}))?\s*(am|pm)?\s*[-?to]+\s*(\d{1,2})(?:\s*[:.]\s*(\d{2}))?\s*(am|pm)?\b/);
  if (mRange) return formatTimeRange(mRange);
  if (/(morning)/.test(t)) return "morning";
  if (/(afternoon)/.test(t)) return "afternoon";
  if (/(evening|night)/.test(t)) return "evening";
  return undefined;
}

function formatTimeRange(m: RegExpMatchArray): string {
  const [_, h1, mm1, ap1, h2, mm2, ap2] = m;
  const a = `${h1}${mm1 ? ":" + mm1 : ""}${ap1 ? " " + ap1 : ""}`;
  const b = `${h2}${mm2 ? ":" + mm2 : ""}${ap2 ? " " + ap2 : ""}`;
  return `${a} - ${b}`;
}

function extractDecoration(text: string): boolean | undefined {
  const t = normalize(text);
  if (/\b(decoration|decor|decorate)\b/.test(t)) {
    if (/(no|not required|without|dont|don't)/.test(t)) return false;
    if (/(need|yes|required|with)/.test(t)) return true;
  }
  if (/\b(no)\b/.test(t) && /decor/.test(t)) return false;
  if (/\b(yes)\b/.test(t) && /decor/.test(t)) return true;
  return undefined;
}

function extractContact(text: string): string | undefined {
  const m = text.replace(/[()\s-]/g, "").match(/\+?\d{10,15}/);
  if (!m) return undefined;
  return m[0];
}

function capitalizeWords(s: string): string {
  return s.replace(/\b([a-z])/g, (c) => c.toUpperCase());
}
