import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runReminders } from "@/lib/reminders";

export const runtime = "nodejs";

/*
  Runs hourly. Each artist is only reminded during their own chosen hour, in
  their own timezone, and at most once per local day — so running this 24 times
  a day is safe and is what makes per-timezone timing possible at all.
*/
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron not configured." }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const result = await runReminders(createAdminClient());
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("reminders cron error", err);
    return NextResponse.json({ error: "Reminder run failed." }, { status: 500 });
  }
}
