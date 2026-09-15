import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/config";

const cookieName = "sakafat_access";
const refreshCookieName = "sakafat_refresh";

const endpoints: Record<string, string> = {
  login: "login/",
  register: "register/",
  verify: "verify_otp/",
  resend: "resend_otp/",
  "forgot-password": "forgot-password/",
  "verify-reset-otp": "verify-reset-otp/",
  "reset-password": "reset-password/",
  refresh: "token/refresh/",
};

const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

function setAuthCookies(response: NextResponse, access: string, refresh?: string) {
  try {
    const claims = JSON.parse(Buffer.from(access.split(".")[1], "base64url").toString());
    const maxAge = Math.floor(Number(claims.exp) - Date.now() / 1000);
    if (Number.isFinite(maxAge) && maxAge > 0) {
      response.cookies.set(cookieName, access, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: Math.min(maxAge, 1800),
      });
    }
  } catch {
    /* Ignore token decode failures */
  }
  if (refresh) {
    response.cookies.set(refreshCookieName, refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 86400,
    });
  }
}

function clearAuthCookies(response: NextResponse) {
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(refreshCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth",
    maxAge: 0,
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  if ((await context.params).action !== "session") return reply({ message: "Not found." }, 404);
  let access = request.cookies.get(cookieName)?.value;
  const refresh = request.cookies.get(refreshCookieName)?.value;
  let base: string;
  try {
    base = getApiBaseUrl();
  } catch {
    return reply({ message: "Account services are temporarily unavailable." }, 503);
  }

  let refreshedAccess: string | null = null;
  let refreshedRefresh: string | null = null;

  if (!access && refresh) {
    try {
      const refreshRes = await fetch(new URL("token/refresh/", base), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refresh }),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (typeof refreshData.access === "string") {
          access = refreshData.access;
          refreshedAccess = refreshData.access;
          if (typeof refreshData.refresh === "string") {
            refreshedRefresh = refreshData.refresh;
          }
        }
      }
    } catch {
      /* Continue to unauthenticated check */
    }
  }

  if (!access) {
    const response = reply({ authenticated: false });
    if (refresh) clearAuthCookies(response);
    return response;
  }

  try {
    let upstream = await fetch(new URL("me/", base), {
      headers: { Authorization: `Bearer ${access}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });

    if ((upstream.status === 401 || upstream.status === 403) && refresh && !refreshedAccess) {
      try {
        const refreshRes = await fetch(new URL("token/refresh/", base), {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ refresh }),
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(10000),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (typeof refreshData.access === "string") {
            access = refreshData.access;
            refreshedAccess = refreshData.access;
            if (typeof refreshData.refresh === "string") {
              refreshedRefresh = refreshData.refresh;
            }
            upstream = await fetch(new URL("me/", base), {
              headers: { Authorization: `Bearer ${access}` },
              cache: "no-store",
              redirect: "error",
              signal: AbortSignal.timeout(10000),
            });
          }
        }
      } catch {
        /* Continue with existing upstream status */
      }
    }

    if (upstream.status === 401 || upstream.status === 403) {
      const response = reply({ authenticated: false });
      clearAuthCookies(response);
      return response;
    }
    if (!upstream.ok) return reply({ message: "Account services are temporarily unavailable." }, 503);
    const user = await upstream.json();
    const response = reply({ authenticated: true, username: user.username });
    if (refreshedAccess) {
      setAuthCookies(response, refreshedAccess, refreshedRefresh ?? undefined);
    }
    return response;
  } catch {
    return reply({ message: "Account services are temporarily unavailable." }, 503);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") || new URL(request.url).host;
  let sameOrigin = false;
  try {
    sameOrigin = Boolean(
      origin && new URL(origin).host === host && ["http:", "https:"].includes(new URL(origin).protocol)
    );
  } catch {
    /* Invalid origins are rejected */
  }
  if (!sameOrigin) return reply({ message: "Please submit this form from the Sakafat website." }, 403);

  const { action } = await context.params;
  if (action === "logout") {
    const response = reply({ message: "Signed out." });
    clearAuthCookies(response);
    return response;
  }

  if (!Object.hasOwn(endpoints, action)) return reply({ message: "Not found." }, 404);

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return reply({ message: "Please check your form and try again." }, 400);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return reply({ message: "Invalid form." }, 400);
  }

  const fields =
    action === "resend"
      ? ["username"]
      : action === "register"
      ? ["username", "email", "password"]
      : action === "verify"
      ? ["username", "otp"]
      : action === "forgot-password"
      ? ["email"]
      : action === "verify-reset-otp"
      ? ["email", "otp"]
      : action === "reset-password"
      ? ["email", "otp", "new_password"]
      : action === "refresh"
      ? ["refresh"]
      : ["username", "password"];

  const payload: Record<string, string> = {};
  for (const field of fields) {
    if (typeof input[field] !== "string" || !input[field] || input[field].length > 1024) {
      return reply({ message: "Please complete all required fields." }, 400);
    }
    payload[field] = input[field];
  }

  let base: string;
  try {
    base = getApiBaseUrl();
  } catch {
    return reply({ message: "Account services are not available yet. Please try again later." }, 503);
  }

  try {
    const upstream = await fetch(new URL(endpoints[action], base), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });

    if (upstream.status >= 500) {
      return reply(
        {
          message:
            action === "register"
              ? "We couldn’t confirm registration. If an email arrives, use Verify email below before trying again."
              : "Account services are temporarily unavailable. Please try again later.",
        },
        502
      );
    }

    const data = await upstream.json();
    if (!upstream.ok) {
      const errors: Record<string, string> = {};
      for (const key of [...fields, "non_field_errors", "detail", "error"]) {
        const value = data[key];
        if (typeof value === "string") errors[key] = value;
        else if (Array.isArray(value)) errors[key] = value.filter((item) => typeof item === "string").join(" ");
      }
      return reply(
        {
          message: errors.non_field_errors || errors.detail || errors.error || "Please check the highlighted fields.",
          errors,
        },
        upstream.status
      );
    }

    const response = reply({
      message:
        action === "login"
          ? "Signed in successfully."
          : action === "register"
          ? "Check your email for your verification code."
          : action === "resend"
          ? "If your account is awaiting verification, a new code has been sent."
          : action === "verify"
          ? "Email verified. You can now log in."
          : action === "forgot-password"
          ? "Password reset code sent to your email."
          : action === "verify-reset-otp"
          ? "Code verified. Please set your new password."
          : action === "reset-password"
          ? "Password reset successfully. You can now log in."
          : "Success.",
    });

    if (action === "login") {
      if (typeof data.access !== "string") {
        return reply({ message: "We couldn’t complete login. Please try again." }, 502);
      }
      try {
        const claims = JSON.parse(Buffer.from(data.access.split(".")[1], "base64url").toString());
        const maxAge = Math.floor(Number(claims.exp) - Date.now() / 1000);
        if (!Number.isFinite(maxAge) || maxAge <= 0) {
          return reply({ message: "Your session has expired. Please log in again." }, 502);
        }
        response.cookies.set(cookieName, data.access, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: Math.min(maxAge, 1800),
        });
      } catch {
        return reply({ message: "We couldn’t complete login. Please try again." }, 502);
      }
      if (typeof data.refresh === "string") {
        response.cookies.set(refreshCookieName, data.refresh, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/api/auth",
          maxAge: 86400,
        });
      }
    }

    return response;
  } catch {
    return reply(
      {
        message:
          "We couldn’t reach account services. Please try again shortly. If you were registering, check your email before trying again.",
      },
      503
    );
  }
}
