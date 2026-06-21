// Minimal Resend client over REST (no SDK dependency). Server-only.
// Sends from the verified andiamodev.com domain (override with WTF_EMAIL_FROM).

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !opts.to) return { ok: false, error: "missing key or recipient" };
  const from = process.env.WTF_EMAIL_FROM || "Andiamo <wtf@andiamodev.com>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("resend send failed", res.status, text);
      return { ok: false, error: text };
    }
    return { ok: true };
  } catch (err) {
    console.error("resend send error", err);
    return { ok: false, error: String(err) };
  }
}
