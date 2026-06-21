import { createClient } from "@/lib/supabase/server";
import { ResultsView } from "@/components/results/ResultsView";

export default async function ResultsPage() {
  const supabase = await createClient();

  const [{ data: entries }, { data: songs }] = await Promise.all([
    supabase
      .from("results_entries")
      .select("id, metric_key, song_id, entry_date, value, updated_at")
      .order("entry_date", { ascending: true }),
    supabase
      .from("songs")
      .select("id, title")
      .order("title", { ascending: true }),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <ResultsView entries={entries ?? []} songs={songs ?? []} today={today} />
  );
}
