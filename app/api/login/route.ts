import { GENERIC_LOGIN_ERROR, loginWithPassword } from "@/lib/auth"

export async function POST(request: Request) {
  let email = ""
  let password = ""
  try {
    const body: unknown = await request.json()
    if (body && typeof body === "object") {
      if ("email" in body && typeof body.email === "string") email = body.email
      if ("password" in body && typeof body.password === "string") password = body.password
    }
  } catch {
    return Response.json({ error: GENERIC_LOGIN_ERROR }, { status: 401 })
  }

  const result = await loginWithPassword(email, password)
  if (!result.ok) return Response.json({ error: result.error }, { status: 401 })
  return Response.json({ destination: result.destination })
}
