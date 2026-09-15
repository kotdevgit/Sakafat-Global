import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/config";

const cookieName = "sakafat_access";
const endpoints: Record<string, string> = { login: "login/", register: "register/", verify: "verify_otp/", resend: "resend_otp/" };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  if ((await context.params).action !== "session") return reply({ message: "Not found." }, 404);
  const access = request.cookies.get(cookieName)?.value;
  if (!access) return reply({ authenticated: false });
  try {
    const upstream = await fetch(new URL("me/", getApiBaseUrl()), { headers: { Authorization: `Bearer ${access}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000) });
    if (upstream.status === 401 || upstream.status === 403) {
      const response = reply({ authenticated: false });
      response.cookies.set(cookieName, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
      return response;
    }
    if (!upstream.ok) return reply({ message: "Account services are temporarily unavailable." }, 503);
    const user = await upstream.json();
    return reply({ authenticated: true, username: user.username });
  } catch { return reply({ message: "Account services are temporarily unavailable." }, 503); }
}

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") || new URL(request.url).host;
  let sameOrigin = false;
  try { sameOrigin = Boolean(origin && new URL(origin).host === host && ["http:", "https:"].includes(new URL(origin).protocol)); } catch { /* Invalid origins are rejected. */ }
  if (!sameOrigin) return reply({ message: "Please submit this form from the Sakafat website." }, 403);
  const { action } = await context.params;
  if (action === "logout") {
    const response = reply({ message: "Signed out." });
    response.cookies.set(cookieName, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
    return response;
  }
  if (!Object.hasOwn(endpoints, action)) return reply({ message: "Not found." }, 404);
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return reply({ message: "Please check your form and try again." }, 400); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return reply({ message: "Invalid form." }, 400);
  const fields = action === "resend" ? ["username"] : action === "register" ? ["username", "email", "password"] : action === "verify" ? ["username", "otp"] : ["username", "password"];
  const payload: Record<string, string> = {};
  for (const field of fields) {
    if (typeof input[field] !== "string" || !input[field] || input[field].length > 1024) return reply({ message: "Please complete all required fields." }, 400);
    payload[field] = input[field];
  }
  let base: string;
  try { base = getApiBaseUrl(); } catch { return reply({ message: "Account services are not available yet. Please try again later." }, 503); }
  try {
    const upstream = await fetch(new URL(endpoints[action], base), {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000),
    });
    if (upstream.status >= 500) return reply({ message: action === "register" ? "We couldn’t confirm registration. If an email arrives, use Verify email below before trying again." : "Account services are temporarily unavailable. Please try again later." }, 502);
    const data = await upstream.json();
    if (!upstream.ok) {
      const errors: Record<string, string> = {};
      for (const key of [...fields, "non_field_errors", "detail", "error"]) {
        const value = data[key];
        if (typeof value === "string") errors[key] = value;
        else if (Array.isArray(value)) errors[key] = value.filter((item) => typeof item === "string").join(" ");
      }
      return reply({ message: errors.non_field_errors || errors.detail || errors.error || "Please check the highlighted fields.", errors }, upstream.status);
    }
    const response = reply({ message: action === "login" ? "Signed in successfully." : action === "register" ? "Check your email for your verification code." : action === "resend" ? "If your account is awaiting verification, a new code has been sent." : "Email verified. You can now log in." });
    if (action === "login") {
      if (typeof data.access !== "string") return reply({ message: "We couldn’t complete login. Please try again." }, 502);
      const claims = JSON.parse(Buffer.from(data.access.split(".")[1], "base64url").toString());
      const maxAge = Math.floor(Number(claims.exp) - Date.now() / 1000);
      if (!Number.isFinite(maxAge) || maxAge <= 0) return reply({ message: "Your session has expired. Please log in again." }, 502);
      response.cookies.set(cookieName, data.access, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: Math.min(maxAge, 1800) });
    }
    return response;
  } catch {
    return reply({ message: "We couldn’t reach account services. Please try again shortly. If you were registering, check your email before trying again." }, 503);
  }
}
