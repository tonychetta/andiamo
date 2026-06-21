import type { createClient } from "@/lib/supabase/server";

type DB = Awaited<ReturnType<typeof createClient>>;

export type CompiledWtf = {
  weekStart: string;
  weekEnd: string;
  milestones: {
    id: string;
    description: string;
    status: string;
    priority: boolean;
    goalTitle: string;
    milestoneTitle: string;
  }[];
  releases: {
    id: string;
    description: string;
    completed: boolean;
    dueDate: string | null;
    releaseTitle: string;
  }[];
  content: {
    id: string;
    date: string;
    typeName: string;
    songTitle: string;
  }[];
};

// Monday→Sunday bounds for the week containing `today` (YYYY-MM-DD).
export function weekBounds(today: string): { start: string; end: string } {
  const [y, m, d] = today.split("-").map(Number);
  const base = Date.UTC(y, m - 1, d);
  const dow = new Date(base).getUTCDay(); // 0 Sun … 6 Sat
  const offset = (dow + 6) % 7; // days since Monday
  const startMs = base - offset * 86_400_000;
  const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return { start: fmt(startMs), end: fmt(startMs + 6 * 86_400_000) };
}

// Compile the current week's WTF: swiped Milestone Tasks + Release Tasks and
// Content scheduled within the week. RLS scopes everything to the artist.
export async function compileWtf(
  supabase: DB,
  weekStart: string,
  weekEnd: string,
): Promise<CompiledWtf> {
  const [{ data: mt }, { data: rt }, { data: cp }] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, description, status, wtf_priority, display_order, milestones(description, goals(description))",
      )
      .eq("on_wtf", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("release_tasks")
      .select("id, description, is_completed, due_date, releases(title)")
      .gte("due_date", weekStart)
      .lte("due_date", weekEnd)
      .order("due_date", { ascending: true }),
    supabase
      .from("content_pieces")
      .select(
        "id, scheduled_date, songs(title), content_piece_types(content_type_tags(name))",
      )
      .gte("scheduled_date", weekStart)
      .lte("scheduled_date", weekEnd)
      .order("scheduled_date", { ascending: true }),
  ]);

  const milestones = (mt ?? []).map((t) => {
    const ms = t.milestones as {
      description?: string;
      goals?: { description?: string } | null;
    } | null;
    return {
      id: t.id,
      description: t.description,
      status: t.status as string,
      priority: t.wtf_priority,
      goalTitle: ms?.goals?.description ?? "",
      milestoneTitle: ms?.description ?? "",
    };
  });

  const releases = (rt ?? []).map((r) => {
    const rel = r.releases as { title?: string } | null;
    return {
      id: r.id,
      description: r.description,
      completed: r.is_completed,
      dueDate: r.due_date,
      releaseTitle: rel?.title ?? "",
    };
  });

  const content = (cp ?? []).map((c) => {
    const song = c.songs as { title?: string } | null;
    const types = c.content_piece_types as
      | { content_type_tags?: { name?: string } | null }[]
      | null;
    return {
      id: c.id,
      date: c.scheduled_date,
      songTitle: song?.title ?? "",
      typeName: types?.[0]?.content_type_tags?.name ?? "Content",
    };
  });

  return { weekStart, weekEnd, milestones, releases, content };
}

export function weekLabel(start: string, end: string): string {
  const f = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  };
  return `${f(start)} – ${f(end)}`;
}

// Branded HTML email for the WTF (inline styles for email-client safety).
export function buildWtfHtml(w: CompiledWtf, artistName: string): string {
  const priority = w.milestones.find((m) => m.priority);
  const rest = w.milestones.filter((m) => !m.priority);
  const ink = "#2c2522";
  const soft = "#7a716b";
  const gold = "#c7a35c";
  const cream = "#f7f3ec";

  const li = (text: string, sub?: string, isPriority = false) => `
    <tr><td style="padding:8px 0;border-bottom:1px solid #e7e0d5;">
      <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${
        isPriority ? gold : "#cfc6ba"
      };margin-right:10px;${isPriority ? `box-shadow:0 0 6px ${gold};` : ""}"></span>
      <span style="color:${ink};font-size:15px;">${text}</span>
      ${sub ? `<div style="color:${soft};font-size:12px;margin:2px 0 0 20px;">${sub}</div>` : ""}
    </td></tr>`;

  const section = (title: string, rows: string) =>
    rows
      ? `<tr><td style="padding:18px 0 6px;"><div style="color:${soft};font-size:11px;letter-spacing:2px;text-transform:uppercase;">${title}</div></td></tr>${rows}`
      : "";

  const milestoneRows =
    (priority ? li(priority.description, priority.goalTitle, true) : "") +
    rest.map((m) => li(m.description, m.goalTitle)).join("");
  const releaseRows = w.releases
    .map((r) => li(r.description, r.releaseTitle))
    .join("");
  const contentRows = w.content
    .map((c) => li(`${c.typeName} — ${c.songTitle}`, fmtDay(c.date)))
    .join("");

  return `<!doctype html><html><body style="margin:0;background:${cream};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${cream};padding:28px 0;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:92%;background:#fffdf9;border-radius:18px;padding:28px 26px;">
        <tr><td>
          <div style="color:${soft};font-size:12px;letter-spacing:3px;text-transform:uppercase;">Andiamo</div>
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;color:${ink};margin-top:6px;">WTF // Week of ${weekLabel(w.weekStart, w.weekEnd)}</div>
          ${artistName ? `<div style="color:${soft};font-size:14px;margin-top:4px;">${artistName}</div>` : ""}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${section("Milestone Tasks", milestoneRows)}
            ${section("Release Tasks", releaseRows)}
            ${section("Content", contentRows)}
            ${
              !milestoneRows && !releaseRows && !contentRows
                ? `<tr><td style="padding:18px 0;color:${soft};font-size:14px;">No tasks on the WTF this week.</td></tr>`
                : ""
            }
          </table>
          <div style="color:${soft};font-size:12px;margin-top:22px;">Your one Priority is at the top. Start there.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
  </body></html>`;
}

function fmtDay(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
