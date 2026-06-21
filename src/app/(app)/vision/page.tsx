import { createClient } from "@/lib/supabase/server";
import { VisionBuilder } from "@/components/vision/VisionBuilder";
import { VisionView } from "@/components/vision/VisionView";

type Turn = { role: "user" | "assistant"; content: string };

export default async function VisionPage() {
  const supabase = await createClient();

  // Only the artist themselves (their own row) can build/refine/edit the Vision.
  // A coach viewing the artist sees it read-only.
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  const { data: own } = uid
    ? await supabase.from("artists").select("id").eq("user_id", uid).maybeSingle()
    : { data: null };
  const canEdit = !!own;

  // RLS scopes this to the current artist's Vision (own, or the coach's active).
  const { data: vision } = await supabase
    .from("visions")
    .select("id, statement_text")
    .eq("is_current", true)
    .maybeSingle();

  if (!vision) {
    if (canEdit) return <VisionBuilder />;
    return (
      <div className="pt-6">
        <p className="text-sm uppercase tracking-[0.2em] text-ink-soft">
          Your Vision
        </p>
        <div className="mt-8 rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-soft">
          This artist hasn&apos;t built their Vision yet.
        </div>
      </div>
    );
  }

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
    <VisionView
      vision={vision}
      goals={goals ?? []}
      transcript={transcript}
      canEdit={canEdit}
    />
  );
}
