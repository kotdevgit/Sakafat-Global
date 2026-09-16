"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useAuth } from "./auth-provider";
import {
  emailMaxLength,
  otpLength,
  passwordMaxLength,
  passwordMinLength,
  usernameMaxLength,
  filterAuthValue,
  validateAuthField,
  type AuthField,
} from "@/lib/validation/auth";
import { filterInput } from "@/lib/validation/filter";
import styles from "./auth.module.css";

type Mode = "login" | "register" | "forgot-password";

export function AuthForm({ mode }: { mode: Mode }) {
  const { authenticated, setAuthenticated } = useAuth();
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [resetStep, setResetStep] = useState<"email" | "otp">("email");
  // Registration continues into the code step on the same page. The username is
  // kept here so the visitor never retypes what they just chose.
  const [registerStep, setRegisterStep] = useState<"details" | "otp">("details");
  const [registeredUsername, setRegisteredUsername] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const feedback = useRef<HTMLDivElement>(null);
  // Fields validate once the visitor has left them, then on every edit, so an
  // error never appears while they are still part-way through typing.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>({});

  // Signing in checks only that something was entered: an account created before
  // any rule tightening must still be able to log in.
  const context = mode === "login" ? "login" : "register";

  function messageFor(field: AuthField, value: string, all: Record<string, string>) {
    return validateAuthField(field, value, {
      context,
      username: all.username ?? "",
      password: all.newPassword ?? all.password ?? "",
    });
  }

  /** Wires one field for live validation. `key` is where its error is reported. */
  function liveProps(field: AuthField, key: string = field) {
    return {
      "aria-invalid": errors[key] ? true : undefined,
      onBlur: (event: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = event.currentTarget;
        const all = { ...values, [name]: value };
        setValues(all);
        setTouched((current) => ({ ...current, [key]: true }));
        setErrors((current) => {
          const text = messageFor(field, value, all);
          if ((current[key] ?? null) === text) return current;
          const next = { ...current };
          if (text) next[key] = text;
          else delete next[key];
          return next;
        });
      },
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        const element = event.currentTarget;
        const { name } = element;
        // Characters the field does not accept are removed as they are typed.
        const value = filterInput(element, (raw) => filterAuthValue(field, raw));
        const all = { ...values, [name]: value };
        setValues(all);
        if (!touched[key]) return;
        setErrors((current) => {
          const text = messageFor(field, value, all);
          if ((current[key] ?? null) === text) return current;
          const next = { ...current };
          if (text) next[key] = text;
          else delete next[key];
          return next;
        });
      },
    };
  }


  function showError(text: string, fields: Record<string, string> = {}) {
    setMessage(text);
    setErrors(fields);
    requestAnimationFrame(() => feedback.current?.focus());
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    // Captured now: currentTarget is cleared once the handler yields at an await.
    const form = event.currentTarget;
    const data = new FormData(form);
    const username = String(data.get("username") || "").trim();
    const password = String(data.get("password") || "");

    // Only the details step has password fields; the code step that follows it is
    // still mode "register" and must not be held to this check.
    if (mode === "register" && registerStep === "details" && password !== data.get("confirmPassword")) {
      showError("Your passwords don’t match.", { confirmPassword: "Enter the same password in both fields." });
      return;
    }

    if (mode === "forgot-password" && resetStep === "otp") {
      const newPassword = String(data.get("newPassword") || "");
      if (newPassword !== data.get("confirmPassword")) {
        showError("Your passwords don’t match.", { confirmPassword: "Enter the same password in both fields." });
        return;
      }
    }

    setBusy(true);
    setMessage("");
    setNotice("");
    setErrors({});

    try {
      if (mode === "forgot-password") {
        if (resetStep === "email") {
          const email = String(data.get("email") || "").trim();
          const response = await fetch("/api/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const result = await response.json();
          if (!response.ok) {
            showError(result.message || "Please check your email address and try again.", result.errors);
            return;
          }
          setResetEmail(email);
          setResetStep("otp");
          setNotice(result.message || "A reset code has been sent to your email.");
          return;
        } else {
          const otp = String(data.get("otp") || "").trim();
          const new_password = String(data.get("newPassword") || "");
          const response = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: resetEmail, otp, new_password }),
          });
          const result = await response.json();
          if (!response.ok) {
            showError(result.message || "Please check your code and new password.", result.errors);
            return;
          }
          setResetDone(true);
          return;
        }
      }

      // The second step of registration verifies the account it just created, so
      // it posts to the verify endpoint rather than to /api/auth/register.
      const enteringCode = registerStep === "otp";
      const action = enteringCode ? "verify" : mode;
      const payload = enteringCode
        ? {
            username: registerStep === "otp" ? registeredUsername : username,
            otp: String(data.get("otp") || "").trim(),
          }
        : mode === "register"
        ? { username, email: String(data.get("email") || "").trim(), password }
        : { username, password };

      const response = await fetch(`/api/auth/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        // Signing in with an account that was never verified is not a wrong
        // password: carry them into the code step instead of refusing them.
        if (result.code === "ACCOUNT_NOT_VERIFIED") {
          setRegisteredUsername(result.username || username);
          setRegisterStep("otp");
          setErrors({});
          setNotice(result.message);
          form.reset();
          return;
        }
        showError(result.message || "Please try again.", result.errors);
        return;
      }
      if (enteringCode) setVerified(true);
      else if (mode === "register") {
        // Registration succeeded: continue to the code step in place rather than
        // sending the visitor to a page that asks for the username again.
        setRegisteredUsername(username);
        setRegisterStep("otp");
        setNotice(result.message || "Check your email for your verification code.");
        setTouched({});
        setValues({});
        form.reset();
      } else setAuthenticated(true);
    } catch {
      showError("We couldn’t connect. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    // After registering the username is held in state; on the standalone verify
    // page it still comes from the field on screen.
    const username =
      registeredUsername ||
      (document.getElementById("username") as HTMLInputElement | null)?.value.trim();
    if (!username) {
      showError("Enter your username first.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const result = await response.json();
      if (response.ok) setNotice(result.message);
      else showError(result.message || "Please try again.", result.errors);
    } catch {
      showError("We couldn’t connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resendResetCode() {
    if (!resetEmail) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const result = await response.json();
      if (response.ok) setNotice("A new reset code has been sent to your email.");
      else showError(result.message || "Please try again.", result.errors);
    } catch {
      showError("We couldn’t connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      setAuthenticated(false);
    } catch {
      showError("We couldn’t sign you out. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // Someone part-way through entering a code is not signed in yet, so the
  // signed-in panel must not replace the step they are on.
  if (authenticated && registerStep === "details") {
    return (
      <>
        <p className={styles.eyebrow}>Your account</p>
        <h1 id="auth-heading">You’re signed in.</h1>
        <p className={styles.intro}>Continue exploring Sakafat’s stories and programmes.</p>
        <Link className={styles.submit} href="/programs">
          Explore programmes <span aria-hidden="true">→</span>
        </Link>
        <button className={styles.textButton} disabled={busy} onClick={logout}>
          {busy ? "Signing out…" : "Sign out"}
        </button>
        <div role="alert" ref={feedback} tabIndex={-1} className={message ? styles.error : undefined}>
          {message}
        </div>
      </>
    );
  }

  if (verified) {
    return (
      <>
        <p className={styles.eyebrow}>Email verified</p>
        <h1 id="auth-heading">You’re ready.</h1>
        <p className={styles.intro}>Your email is verified. Log in with your username and password to continue.</p>
        <Link className={styles.submit} href="/login">
          Continue to login <span aria-hidden="true">→</span>
        </Link>
      </>
    );
  }

  if (resetDone) {
    return (
      <>
        <p className={styles.eyebrow}>Password Updated</p>
        <h1 id="auth-heading">Password reset successfully.</h1>
        <p className={styles.intro}>Your password has been changed. You can now log in with your new credentials.</p>
        <Link className={styles.submit} href="/login">
          Continue to login <span aria-hidden="true">→</span>
        </Link>
      </>
    );
  }

  const isForgotPassword = mode === "forgot-password";
  // True while the form is asking for a verification code — either straight after
  // registering, or on the standalone page someone returns to later.
  const enteringCode = registerStep === "otp";
  // Only the details step collects a username, email and password.
  const registering = mode === "register" && registerStep === "details";

  return (
    <>
      <nav className={styles.tabs} aria-label="Account navigation">
        <Link href="/login" aria-current={mode === "login" ? "page" : undefined}>
          Login
        </Link>
        <Link href="/register" aria-current={registering ? "page" : undefined}>
          Register
        </Link>
      </nav>

      <h1 id="auth-heading">
        {enteringCode
          ? "Check your email."
          : isForgotPassword
          ? resetStep === "email"
            ? "Reset your password."
            : "Set new password."
          : registering
          ? "Join Sakafat."
          : "Welcome back."}
      </h1>

      <p className={styles.intro}>
        {enteringCode
          ? `Enter the six-digit code we sent to activate ${registeredUsername}.`
          : isForgotPassword
          ? resetStep === "email"
            ? "Enter your account email to receive a password reset verification code."
            : `Enter the six-digit code sent to ${resetEmail} and choose a new password.`
          : registering
          ? "Create your account and be part of the conversation."
          : "Log in to your Sakafat Global account."}
      </p>

      {/*
        method="post" is a safety net, not the submit path: submit() calls
        preventDefault and posts through fetch. It matters only if the page fails
        to hydrate, when the browser would otherwise submit natively — and a form
        without it defaults to GET, putting the password in the URL and from there
        into server logs and browser history.
      */}
      <form method="post" onSubmit={submit} aria-busy={busy}>
        <div ref={feedback} tabIndex={-1} role="alert" className={message ? styles.error : undefined}>
          {message}
        </div>
        {notice && (
          <p role="status" className={styles.notice}>
            {notice}
          </p>
        )}

        <fieldset disabled={busy} className={styles.fields}>
          {isForgotPassword ? (
            resetStep === "email" ? (
              <div className={styles.field}>
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  name="email"
                  maxLength={emailMaxLength}
                  {...liveProps("email")}
                  type="email"
                  autoComplete="email"
                  required
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && (
                  <p id="email-error" className={styles.fieldError}>
                    {errors.email}
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className={styles.field}>
                  <label htmlFor="otp">Verification code</label>
                  <input
                    id="otp"
                    name="otp"
                    {...liveProps("otp")}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={otpLength}
                    minLength={otpLength}
                    required
                    className={styles.code}
                    aria-invalid={Boolean(errors.otp)}
                    aria-describedby="otp-hint"
                  />
                  <p id="otp-hint" className={errors.otp ? styles.fieldError : styles.hint}>
                    {errors.otp || "Use the six-digit code sent to your email."}
                  </p>
                </div>
                <div className={styles.field}>
                  <label htmlFor="newPassword">New Password</label>
                  <div className={styles.password}>
                    <input
                      id="newPassword"
                      name="newPassword"
                      maxLength={passwordMaxLength}
                      {...liveProps("new_password")}
                      type={visible ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={passwordMinLength}
                      aria-invalid={Boolean(errors.new_password)}
                      aria-describedby="password-hint"
                    />
                    <button
                      type="button"
                      onClick={() => setVisible(!visible)}
                      aria-label={visible ? "Hide password" : "Show password"}
                      aria-pressed={visible}
                    >
                      {visible ? "Hide" : "Show"}
                    </button>
                  </div>
                  <p id="password-hint" className={errors.new_password ? styles.fieldError : styles.hint}>
                    {errors.new_password || "Use at least 8 characters."}
                  </p>
                </div>
                <div className={styles.field}>
                  <label htmlFor="confirmPassword">Confirm new password</label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    maxLength={passwordMaxLength}
                    {...liveProps("confirmPassword")}
                    type={visible ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={passwordMinLength}
                    aria-invalid={Boolean(errors.confirmPassword)}
                    aria-describedby={errors.confirmPassword ? "confirm-error" : undefined}
                  />
                  {errors.confirmPassword && (
                    <p id="confirm-error" className={styles.fieldError}>
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </>
            )
          ) : (
            <>
              {/* The code step is only ever reached once the username is known —
                  from registering, or from signing in to an unverified account —
                  so it is never asked for again. */}
              {!enteringCode && (
              <div className={styles.field}>
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  name="username"
                  maxLength={usernameMaxLength}
                  {...liveProps("username")}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                                    required
                  aria-invalid={Boolean(errors.username)}
                  aria-describedby={errors.username ? "username-error" : undefined}
                />
                {errors.username && (
                  <p id="username-error" className={styles.fieldError}>
                    {errors.username}
                  </p>
                )}
              </div>
              )}

              {registering && (
                <div className={styles.field}>
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    name="email"
                    maxLength={emailMaxLength}
                    {...liveProps("email")}
                    type="email"
                    autoComplete="email"
                    required
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "email-error" : undefined}
                  />
                  {errors.email && (
                    <p id="email-error" className={styles.fieldError}>
                      {errors.email}
                    </p>
                  )}
                </div>
              )}

              {enteringCode ? (
                <div className={styles.field}>
                  <label htmlFor="otp">Verification code</label>
                  <input
                    id="otp"
                    name="otp"
                    {...liveProps("otp")}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={otpLength}
                    minLength={otpLength}
                    required
                    className={styles.code}
                    aria-invalid={Boolean(errors.otp)}
                    aria-describedby="otp-hint"
                  />
                  <p id="otp-hint" className={errors.otp ? styles.fieldError : styles.hint}>
                    {errors.otp || "Use the six-digit code from your registration email."}
                  </p>
                </div>
              ) : (
                <>
                  <div className={styles.field}>
                    <label htmlFor="password">Password</label>
                    <div className={styles.password}>
                      <input
                        id="password"
                        name="password"
                        maxLength={passwordMaxLength}
                        {...liveProps("password")}
                        type={visible ? "text" : "password"}
                        autoComplete={registering ? "new-password" : "current-password"}
                        required
                        minLength={registering ? passwordMinLength : undefined}
                        aria-invalid={Boolean(errors.password)}
                        aria-describedby={registering || errors.password ? "password-hint" : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setVisible(!visible)}
                        aria-label={visible ? "Hide password" : "Show password"}
                        aria-pressed={visible}
                      >
                        {visible ? "Hide" : "Show"}
                      </button>
                    </div>
                    {(registering || errors.password) && (
                      <p id="password-hint" className={errors.password ? styles.fieldError : styles.hint}>
                        {errors.password || "Use at least 8 characters."}
                      </p>
                    )}
                    {mode === "login" && (
                      <p className={styles.hint} style={{ marginTop: "6px" }}>
                        <Link href="/forgot-password">Forgot password?</Link>
                      </p>
                    )}
                  </div>

                  {registering && (
                    <div className={styles.field}>
                      <label htmlFor="confirmPassword">Confirm password</label>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        maxLength={passwordMaxLength}
                        {...liveProps("confirmPassword")}
                        type={visible ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        minLength={passwordMinLength}
                        aria-invalid={Boolean(errors.confirmPassword)}
                        aria-describedby={errors.confirmPassword ? "confirm-error" : undefined}
                      />
                      {errors.confirmPassword && (
                        <p id="confirm-error" className={styles.fieldError}>
                          {errors.confirmPassword}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          <button className={styles.submit} type="submit">
            {busy
              ? "Please wait…"
              : isForgotPassword
              ? resetStep === "email"
                ? "Send reset code"
                : "Reset password"
              : enteringCode
              ? "Verify email"
              : registering
              ? "Create account"
              : "Login"}
            <span aria-hidden="true">→</span>
          </button>
        </fieldset>
      </form>

      {enteringCode && (
        <button type="button" className={styles.textButton} disabled={busy} onClick={resend}>
          Send a new code
        </button>
      )}

      {isForgotPassword && resetStep === "otp" && (
        <button type="button" className={styles.textButton} disabled={busy} onClick={resendResetCode}>
          Resend reset code
        </button>
      )}

      <p className={styles.footnote}>
        {enteringCode ? (
          <>
            Already verified? <Link href="/login">Log in</Link>
          </>
        ) : isForgotPassword ? (
          <>
            Remember your password? <Link href="/login">Log in</Link>
          </>
        ) : registering ? (
          <>
            Already have an account? <Link href="/login">Log in</Link>
          </>
        ) : (
          <>
            New to Sakafat? <Link href="/register">Create an account</Link>
          </>
        )}
      </p>

    </>
  );
}
