/**
 * @fileOverview Centralized notification helper for ntfy.sh integration.
 */

export async function sendNtfy(payload: { title: string; tags?: string[]; data: any }) {
  try {
    await fetch("https://ntfy.sh/falaadealsnkoaaa", {
      method: "POST",
      headers: {
        Title: payload.title,
        Priority: "high",
        Tags: payload.tags?.join(",") || ""
      },
      body: JSON.stringify(payload.data, null, 2)
    });
  } catch (err) {
    console.error("ntfy failed:", err);
  }
}
