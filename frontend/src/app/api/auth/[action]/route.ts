import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/config";
import { resolveAuthMessage, validateAuthField, type AuthField } from "@/lib/validation/auth";
import { getDictionary } from "@/lib/i18n/dictionary";
import { localeFromRequest } from "@/lib/i18n/request";

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
  const api = getDictionary(localeFromRequest(request)).api.auth;
  if ((await context.params).action !== "session") return reply({ message: api.notFound }, 404);
  let access = request.cookies.get(cookieName)?.value;
  const refresh = request.cookies.get(refreshCookieName)?.value;
  let base: string;
  try {
    base = getApiBaseUrl();
  } catch {
    return reply({ message: api.unavailable }, 503);
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
    if (!upstream.ok) return reply({ message: api.unavailable }, 503);
    const user = await upstream.json();
    const response = reply({ authenticated: true, username: user.username });
    if (refreshedAccess) {
      setAuthCookies(response, refreshedAccess, refreshedRefresh ?? undefined);
    }
    return response;
  } catch {
    return reply({ message: api.unavailable }, 503);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const dict = getDictionary(localeFromRequest(request));
  const api = dict.api.auth;
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
  if (!sameOrigin) return reply({ message: api.wrongOrigin }, 403);

  const { action } = await context.params;
  if (action === "logout") {
    const response = reply({ message: api.signedOut });
    clearAuthCookies(response);
    return response;
  }

  if (!Object.hasOwn(endpoints, action)) return reply({ message: api.notFound }, 404);

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return reply({ message: api.malformed }, 400);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return reply({ message: api.invalidForm }, 400);
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

  // Registration rules are enforced here as well as in the browser. Signing in is
  // only length-checked: an account created before any rule change must still work.
  const ruleSet = action === "register" ? "register" : "login";
  const checked = new Set<AuthField>(["username", "email", "password", "new_password", "otp"]);

  const payload: Record<string, string> = {};
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const value = input[field];
    if (typeof value !== "string" || !value || value.length > 1024) {
      return reply({ message: api.completeFields }, 400);
    }
    if (checked.has(field as AuthField)) {
      const problem = validateAuthField(field as AuthField, value, {
        context: ruleSet,
        username: typeof input.username === "string" ? input.username : "",
      });
      if (problem) {
        errors[field] = resolveAuthMessage(dict, problem);
        continue;
      }
    }
    payload[field] = value;
  }
  if (Object.keys(errors).length > 0) {
    return reply({ message: api.checkFields, errors }, 400);
  }

  let base: string;
  try {
    base = getApiBaseUrl();
  } catch {
    return reply({ message: api.notConfigured }, 503);
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
          message: action === "register" ? api.registerUnconfirmed : api.unavailableLater,
        },
        502
      );
    }

    const data = await upstream.json();
    if (!upstream.ok) {
      // A login by someone who never verified their email is not a failure the
      // visitor can fix on this form, so it is passed through as a code the page
      // acts on rather than an error message.
      if (action === "login" && data.code === "ACCOUNT_NOT_VERIFIED") {
        return reply(
          {
            code: "ACCOUNT_NOT_VERIFIED",
            username: typeof data.username === "string" ? data.username : "",
            message: api.notVerified,
          },
          upstream.status,
        );
      }
      const errors: Record<string, string> = {};
      for (const key of [...fields, "non_field_errors", "detail", "error"]) {
        const value = data[key];
        if (typeof value === "string") errors[key] = value;
        else if (Array.isArray(value)) errors[key] = value.filter((item) => typeof item === "string").join(" ");
      }
      return reply(
        {
          message: errors.non_field_errors || errors.detail || errors.error || api.checkFields,
          errors,
        },
        upstream.status
      );
    }

    const success: Record<string, string> = {
      login: api.successLogin,
      register: api.successRegister,
      resend: api.successResend,
      verify: api.successVerify,
      "forgot-password": api.successForgotPassword,
      "verify-reset-otp": api.successVerifyResetOtp,
      "reset-password": api.successResetPassword,
    };
    const response = reply({ message: success[action] ?? api.success });

    if (action === "login") {
      if (typeof data.access !== "string") {
        return reply({ message: api.loginIncomplete }, 502);
      }
      try {
        const claims = JSON.parse(Buffer.from(data.access.split(".")[1], "base64url").toString());
        const maxAge = Math.floor(Number(claims.exp) - Date.now() / 1000);
        if (!Number.isFinite(maxAge) || maxAge <= 0) {
          return reply({ message: api.sessionExpired }, 502);
        }
        response.cookies.set(cookieName, data.access, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: Math.min(maxAge, 1800),
        });
      } catch {
        return reply({ message: api.loginIncomplete }, 502);
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
    return reply({ message: api.unreachable }, 503);
  }
}
