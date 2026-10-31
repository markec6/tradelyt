import { loadSessionProfile } from "@/lib/profile"

export async function GET() {
  const profile = await loadSessionProfile()
  return Response.json(
    { profile },
    { headers: { "Cache-Control": "no-store" } },
  )
}
