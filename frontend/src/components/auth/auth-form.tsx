"use client";
import { useRef, useState } from "react";
import { useAuth } from "./auth-provider";
import { LocaleLink } from "@/components/i18n/locale-link";
import {
  emailMaxLength,
  otpLength,
  passwordMaxLength,
  passwordMinLength,
  usernameMaxLength,
  filterAuthValue,
  resolveAuthMessage,
  validateAuthField,
  type AuthField,
} from "@/lib/validation/auth";
import { filterInput } from "@/lib/validation/filter";
import { useI18n } from "@/lib/i18n/context";
import styles from "./auth.module.css";

type Mode = "login" | "register" | "forgot-password";

export function AuthForm({ mode }: { mode: Mode }) {
  const { dict, t } = useI18n();
  const copy = dict.auth;
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

  function messageFor(field: AuthField, value: string, all: Record<string, string>): string | null {
    const issue = validateAuthField(field, value, {
      context,
      username: all.username ?? "",
      password: all.newPassword ?? all.password ?? "",
    });
    return issue ? resolveAuthMessage(dict, issue) : null;
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
      showError(copy.messages.passwordsDoNotMatch, { confirmPassword: dict.validation.confirmPasswordMismatch });
      return;
    }

    if (mode === "forgot-password" && resetStep === "otp") {
      const newPassword = String(data.get("newPassword") || "");
      if (newPassword !== data.get("confirmPassword")) {
        showError(copy.messages.passwordsDoNotMatch, { confirmPassword: dict.validation.confirmPasswordMismatch });
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
            showError(result.message || copy.messages.checkEmailAddress, result.errors);
            return;
          }
          setResetEmail(email);
          setResetStep("otp");
          setNotice(result.message || copy.messages.resetCodeSent);
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
            showError(result.message || copy.messages.checkCodeAndPassword, result.errors);
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
        showError(result.message || copy.messages.tryAgain, result.errors);
        return;
      }
      if (enteringCode) setVerified(true);
      else if (mode === "register") {
        // Registration succeeded: continue to the code step in place rather than
        // sending the visitor to a page that asks for the username again.
        setRegisteredUsername(username);
        setRegisterStep("otp");
        setNotice(result.message || copy.messages.verificationCodeSent);
        setTouched({});
        setValues({});
        form.reset();
      } else setAuthenticated(true);
    } catch {
      showError(copy.messages.offline);
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
      showError(copy.messages.enterUsernameFirst);
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
      else showError(result.message || copy.messages.tryAgain, result.errors);
    } catch {
      showError(copy.messages.offlineShort);
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
      if (response.ok) setNotice(copy.messages.newResetCodeSent);
      else showError(result.message || copy.messages.tryAgain, result.errors);
    } catch {
      showError(copy.messages.offlineShort);
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
      showError(copy.messages.signOutFailed);
    } finally {
      setBusy(false);
    }
  }

  // Someone part-way through entering a code is not signed in yet, so the
  // signed-in panel must not replace the step they are on.
  if (authenticated && registerStep === "details") {
    return (
      <>
        <p className={styles.eyebrow}>{copy.signedIn.eyebrow}</p>
        <h1 id="auth-heading">{copy.signedIn.heading}</h1>
        <p className={styles.intro}>{copy.signedIn.body}</p>
        <LocaleLink className={styles.submit} href="/programs">
          {copy.signedIn.explore} <span className={styles.arrow} aria-hidden="true">→</span>
        </LocaleLink>
        <button className={styles.textButton} disabled={busy} onClick={logout}>
          {busy ? copy.signedIn.signingOut : copy.signedIn.signOut}
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
        <p className={styles.eyebrow}>{copy.verified.eyebrow}</p>
        <h1 id="auth-heading">{copy.verified.heading}</h1>
        <p className={styles.intro}>{copy.verified.body}</p>
        <LocaleLink className={styles.submit} href="/login">
          {copy.verified.continue} <span className={styles.arrow} aria-hidden="true">→</span>
        </LocaleLink>
      </>
    );
  }

  if (resetDone) {
    return (
      <>
        <p className={styles.eyebrow}>{copy.resetDone.eyebrow}</p>
        <h1 id="auth-heading">{copy.resetDone.heading}</h1>
        <p className={styles.intro}>{copy.resetDone.body}</p>
        <LocaleLink className={styles.submit} href="/login">
          {copy.resetDone.continue} <span className={styles.arrow} aria-hidden="true">→</span>
        </LocaleLink>
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
      <nav className={styles.tabs} aria-label={copy.tabsAria}>
        <LocaleLink href="/login" aria-current={mode === "login" ? "page" : undefined}>
          {copy.login}
        </LocaleLink>
        <LocaleLink href="/register" aria-current={registering ? "page" : undefined}>
          {copy.register}
        </LocaleLink>
      </nav>

      <h1 id="auth-heading">
        {enteringCode
          ? copy.headings.checkEmail
          : isForgotPassword
          ? resetStep === "email"
            ? copy.headings.resetPassword
            : copy.headings.setNewPassword
          : registering
          ? copy.headings.join
          : copy.headings.welcomeBack}
      </h1>

      <p className={styles.intro}>
        {enteringCode
          ? t(copy.intros.checkEmail, { username: registeredUsername })
          : isForgotPassword
          ? resetStep === "email"
            ? copy.intros.resetPassword
            : t(copy.intros.setNewPassword, { email: resetEmail })
          : registering
          ? copy.intros.join
          : copy.intros.welcomeBack}
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
                <label htmlFor="email">{copy.fields.email}</label>
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
                  <label htmlFor="otp">{copy.fields.otp}</label>
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
                    {errors.otp || copy.hints.otpEmail}
                  </p>
                </div>
                <div className={styles.field}>
                  <label htmlFor="newPassword">{copy.fields.newPassword}</label>
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
                      aria-label={visible ? copy.hidePassword : copy.showPassword}
                      aria-pressed={visible}
                    >
                      {visible ? copy.hide : copy.show}
                    </button>
                  </div>
                  <p id="password-hint" className={errors.new_password ? styles.fieldError : styles.hint}>
                    {errors.new_password || copy.hints.password}
                  </p>
                </div>
                <div className={styles.field}>
                  <label htmlFor="confirmPassword">{copy.fields.confirmNewPassword}</label>
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
                <label htmlFor="username">{copy.fields.username}</label>
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
                  <label htmlFor="email">{copy.fields.email}</label>
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
                  <label htmlFor="otp">{copy.fields.otp}</label>
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
                    {errors.otp || copy.hints.otpRegistration}
                  </p>
                </div>
              ) : (
                <>
                  <div className={styles.field}>
                    <label htmlFor="password">{copy.fields.password}</label>
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
                        aria-label={visible ? copy.hidePassword : copy.showPassword}
                        aria-pressed={visible}
                      >
                        {visible ? copy.hide : copy.show}
                      </button>
                    </div>
                    {(registering || errors.password) && (
                      <p id="password-hint" className={errors.password ? styles.fieldError : styles.hint}>
                        {errors.password || copy.hints.password}
                      </p>
                    )}
                    {mode === "login" && (
                      <p className={styles.hint} style={{ marginTop: "6px" }}>
                        <LocaleLink href="/forgot-password">{copy.forgotPassword}</LocaleLink>
                      </p>
                    )}
                  </div>

                  {registering && (
                    <div className={styles.field}>
                      <label htmlFor="confirmPassword">{copy.fields.confirmPassword}</label>
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
              ? copy.submit.busy
              : isForgotPassword
              ? resetStep === "email"
                ? copy.submit.sendResetCode
                : copy.submit.resetPassword
              : enteringCode
              ? copy.submit.verifyEmail
              : registering
              ? copy.submit.createAccount
              : copy.submit.login}
            <span className={styles.arrow} aria-hidden="true">→</span>
          </button>
        </fieldset>
      </form>

      {enteringCode && (
        <button type="button" className={styles.textButton} disabled={busy} onClick={resend}>
          {copy.sendNewCode}
        </button>
      )}

      {isForgotPassword && resetStep === "otp" && (
        <button type="button" className={styles.textButton} disabled={busy} onClick={resendResetCode}>
          {copy.resendResetCode}
        </button>
      )}

      <p className={styles.footnote}>
        {enteringCode ? (
          <>
            {copy.footnotes.alreadyVerified} <LocaleLink href="/login">{copy.footnotes.logIn}</LocaleLink>
          </>
        ) : isForgotPassword ? (
          <>
            {copy.footnotes.rememberPassword} <LocaleLink href="/login">{copy.footnotes.logIn}</LocaleLink>
          </>
        ) : registering ? (
          <>
            {copy.footnotes.alreadyHaveAccount} <LocaleLink href="/login">{copy.footnotes.logIn}</LocaleLink>
          </>
        ) : (
          <>
            {copy.footnotes.newToSakafat} <LocaleLink href="/register">{copy.footnotes.createAccount}</LocaleLink>
          </>
        )}
      </p>

    </>
  );
}
