import { createClient } from "@/lib/supabase/server";
import { VisionBuilder } from "@/components/vision/VisionBuilder";
import { VisionView } from "@/components/vision/VisionView";

type Turn = { role: "user" | "assistant"; content: string };

export default async function VisionPage() {
  const supabase = await createClient();

  // RLS scopes this to the signed-in artist's own current Vision.
  const { data: vision } = await supabase
    .from("visions")
    .select("id, statement_text")
    .eq("is_current", true)
    .maybeSingle();

  if (!vision) return <VisionBuilder />;

  const { data: goals } = await supabase
    .from("goals")
    .select("id, category, description, display_order")
    .eq("vision_id", vision.id)
    .order("display_order", { ascending: true });

  // The saved Builder conversation, so "Refine" reopens it instead of restarting.
  const { data: transcriptRow } = await supabase
    .from("vision_builder_transcripts")
    .select("messages")
    .eq("vision_id", vision.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const transcript = Array.isArray(transcriptRow?.messages)
    ? (transcriptRow.messages as unknown as Turn[])
    : [];

  return (
    <VisionView vision={vision} goals={goals ?? []} transcript={transcript} />
  );
}
