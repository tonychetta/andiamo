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
    goalLabel: string;
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
    sections: string[];
  }[];
};

// Sunday→Saturday bounds for the week containing `today` (YYYY-MM-DD).
export function weekBounds(today: string): { start: string; end: string } {
  const [y, m, d] = today.split("-").map(Number);
  const base = Date.UTC(y, m - 1, d);
  const dow = new Date(base).getUTCDay(); // 0 Sun … 6 Sat
  const startMs = base - dow * 86_400_000; // back to Sunday
  const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return { start: fmt(startMs), end: fmt(startMs + 6 * 86_400_000) };
}

// The 7 day-dates Sun→Sat for a week starting at `start`.
export function weekDays(start: string): string[] {
  const [y, m, d] = start.split("-").map(Number);
  const base = Date.UTC(y, m - 1, d);
  return Array.from({ length: 7 }, (_, i) =>
    new Date(base + i * 86_400_000).toISOString().slice(0, 10),
  );
}

const GOAL_LABEL: Record<string, string> = {
  audience_size: "Audience",
  revenue_generating: "Revenue",
  team: "Team",
  catalog: "Catalog",
  recognition_awards: "Recognition",
};

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
        "id, description, status, wtf_priority, display_order, milestones(goals(category))",
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
        "id, scheduled_date, song_sections, songs(title), content_piece_types(content_type_tags(name))",
      )
      .gte("scheduled_date", weekStart)
      .lte("scheduled_date", weekEnd)
      .order("scheduled_date", { ascending: true }),
  ]);

  const milestones = (mt ?? []).map((t) => {
    const ms = t.milestones as {
      goals?: { category?: string } | null;
    } | null;
    return {
      id: t.id,
      description: t.description,
      status: t.status as string,
      priority: t.wtf_priority,
      goalLabel: GOAL_LABEL[ms?.goals?.category ?? ""] ?? "",
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
      sections: (c.song_sections as string[]) ?? [],
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
    (priority ? li(priority.description, priority.goalLabel, true) : "") +
    rest.map((m) => li(m.description, m.goalLabel)).join("");
  const releaseRows = w.releases
    .map((r) => li(r.description, r.releaseTitle))
    .join("");

  // Content as a Sun–Sat week calendar with pills in each day.
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayCells = weekDays(w.weekStart)
    .map((d) => {
      const [yy, mm, dd] = d.split("-").map(Number);
      const dow = new Date(Date.UTC(yy, mm - 1, dd)).getUTCDay();
      const pills = w.content
        .filter((c) => c.date === d)
        .map(
          (c) =>
            `<div style="background:#efe9dd;border-radius:6px;padding:3px 4px;margin-bottom:3px;font-size:9px;color:${ink};line-height:1.3;">${c.typeName}<br><span style="color:${soft};">${c.songTitle}${
              c.sections.length ? ` · ${c.sections.join(", ")}` : ""
            }</span></div>`,
        )
        .join("");
      return `<td valign="top" style="width:14.2%;padding:3px;border:1px solid #e7e0d5;">
        <div style="font-size:9px;color:${soft};text-transform:uppercase;">${wd[dow]}</div>
        <div style="font-size:12px;color:${ink};margin-bottom:3px;">${dd}</div>
        ${pills}
      </td>`;
    })
    .join("");
  const contentCalendar = w.content.length
    ? `<tr><td style="padding:18px 0 6px;"><div style="color:${soft};font-size:11px;letter-spacing:2px;text-transform:uppercase;">Content</div></td></tr>
       <tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;"><tr>${dayCells}</tr></table></td></tr>`
    : "";

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
            ${contentCalendar}
            ${
              !milestoneRows && !releaseRows && !w.content.length
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
