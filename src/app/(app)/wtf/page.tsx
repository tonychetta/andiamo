import { createClient } from "@/lib/supabase/server";
import { compileWtf, weekBounds, weekLabel } from "@/lib/wtf/compile";
import { WTFView } from "@/components/wtf/WTFView";

export default async function WtfPage() {
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const { start, end } = weekBounds(today);

  const compiled = await compileWtf(supabase, start, end);

  const { data: history } = await supabase
    .from("wtfs")
    .select("id, week_start, generated_at, payload")
    .order("generated_at", { ascending: false })
    .limit(12);

  return (
    <WTFView
      label={weekLabel(start, end)}
      compiled={compiled}
      history={history ?? []}
    />
  );
}
