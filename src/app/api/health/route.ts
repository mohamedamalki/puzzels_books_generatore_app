export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok", service: "nicheforge-books" }, { headers: { "Cache-Control": "no-store" } });
}
