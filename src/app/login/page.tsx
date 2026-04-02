"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Cloud, Loader2, Mail, UserRound } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { getAuthErrorMessage, isNetworkError } from "@/lib/firebase/auth-errors";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const {
    user,
    loading,
    feideError,
    emailPromptNeeded,
    signInGoogle,
    signInFeide,
    signInEmail,
    signUpEmail,
    resetPassword,
    signInAnonymously,
    sendEmailSignInLink,
    completeEmailSignIn,
    confirmEmailForSignIn,
    clearFeideError,
  } = useAuth();

  const [mode, setMode] = useState<
    "login" | "register" | "reset" | "emaillink"
  >("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const { t } = useLocale();

  // Fullfør e-postlenke-innlogging hvis URL inneholder en sign-in link
  useEffect(() => {
    completeEmailSignIn()
      .then((completed) => {
        if (completed) router.replace(callbackUrl);
      })
      .catch((err) => {
        setError(getAuthErrorMessage(err));
      });
  }, [completeEmailSignIn, router, callbackUrl]);

  // Vis Feide-redirect-feil fra oppstart
  useEffect(() => {
    if (feideError) {
      setError(feideError);
      clearFeideError();
    }
  }, [feideError, clearFeideError]);

  // Omdiriger om allerede innlogget
  if (!loading && user) {
    router.replace(callbackUrl);
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      if (mode === "reset") {
        await resetPassword(email);
        setMessage(t.auth.resetEmailSent);
        setEmail("");
        setSubmitting(false);
        return;
      }

      if (mode === "emaillink") {
        await sendEmailSignInLink(email);
        setMessage(t.auth.loginLinkSent);
        setSubmitting(false);
        return;
      }

      if (mode === "login") {
        await signInEmail(email, password);
      } else {
        await signUpEmail(email, password);
      }
      router.replace(callbackUrl);
    } catch (err: unknown) {
      setIsOffline(isNetworkError(err));
      setError(getAuthErrorMessage(err));
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setIsOffline(false);
    setSubmitting(true);
    try {
      await signInGoogle();
      router.replace(callbackUrl);
    } catch (err) {
      setIsOffline(isNetworkError(err));
      setError(getAuthErrorMessage(err));
      setSubmitting(false);
    }
  }

  async function handleFeideSignIn() {
    setError("");
    setIsOffline(false);
    setSubmitting(true);
    try {
      // Feide bruker redirect — siden laster på nytt etter innlogging
      await signInFeide();
      // Koden her nås ikke med redirect, men er med for klarhet
    } catch (err) {
      setIsOffline(isNetworkError(err));
      setError(getAuthErrorMessage(err));
      setSubmitting(false);
    }
  }

  async function handleAnonymousSignIn() {
    setError("");
    setIsOffline(false);
    setSubmitting(true);
    try {
      await signInAnonymously();
      router.replace(callbackUrl);
    } catch (err) {
      setIsOffline(isNetworkError(err));
      setError(getAuthErrorMessage(err));
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const title: Record<typeof mode, string> = {
    login: t.auth.login,
    register: t.auth.createAccount,
    reset: t.auth.resetPassword,
    emaillink: t.auth.loginWithEmailLink,
  };

  const description: Record<typeof mode, string> = {
    login: t.auth.loginToSuksess,
    register: t.auth.createNewAccount,
    reset: t.auth.resetPasswordDesc,
    emaillink: t.auth.emailLinkDesc,
  };

  const submitLabel: Record<typeof mode, string> = {
    login: t.auth.login,
    register: t.auth.createAccount,
    reset: t.auth.sendResetLink,
    emaillink: t.auth.sendLoginLink,
  };

  const showPasswordField = mode === "login" || mode === "register";
  const showSocialButtons = mode === "login" || mode === "register";

  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <Cloud className="h-8 w-8" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">{title[mode]}</CardTitle>
          <CardDescription>{description[mode]}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* E-postbekreftelse for kryss-enhet e-postlenke-innlogging */}
          {emailPromptNeeded && (
            <form
              className="mb-4 space-y-3 rounded-md border border-primary/20 bg-primary/5 p-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setSubmitting(true);
                try {
                  const completed = await confirmEmailForSignIn(email);
                  if (completed) router.replace(callbackUrl);
                } catch (err) {
                  setError(getAuthErrorMessage(err));
                }
                setSubmitting(false);
              }}
            >
              <p className="text-sm text-muted-foreground">
                {t.auth.enterEmailForLink}
              </p>
              <Input
                type="email"
                placeholder="din@epost.no"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t.auth.confirmEmail}
              </Button>
            </form>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t.auth.email}</Label>
              <Input
                id="email"
                type="email"
                placeholder="din@epost.no"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {showPasswordField && (
              <div className="space-y-2">
                <Label htmlFor="password">{t.auth.password}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            )}

            {error && (
              <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <p>{error}</p>
                {isOffline && (
                  <button
                    type="button"
                    className="mt-1 underline underline-offset-2 hover:no-underline"
                    onClick={() => { setError(""); setIsOffline(false); }}
                  >
                    {t.common.tryAgain ?? "Prøv igjen"}
                  </button>
                )}
              </div>
            )}
            {message && (
              <p role="status" className="text-sm text-green-500">{message}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
            >
              {submitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {submitLabel[mode]}
            </Button>
          </form>

          {showSocialButtons && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    {t.common.or}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {/* Feide — primær innlogging for norske skoler */}
                <Button
                  variant="default"
                  className="w-full bg-[#1f4e79] hover:bg-[#1a3f63] text-white"
                  onClick={handleFeideSignIn}
                  disabled={submitting}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                  </svg>
                  {t.auth.loginWithFeide}
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={submitting}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  {t.auth.loginWithGoogle}
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setMode("emaillink");
                    setError("");
                    setMessage("");
                  }}
                  disabled={submitting}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {t.auth.loginWithEmailLink}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={handleAnonymousSignIn}
                  disabled={submitting}
                >
                  <UserRound className="mr-2 h-4 w-4" />
                  {t.auth.continueAsGuest}
                </Button>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-center gap-1 text-sm">
          {mode === "login" ? (
            <>
              <span className="text-muted-foreground">{t.auth.noAccount}</span>
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => {
                  setMode("register");
                  setError("");
                  setMessage("");
                }}
              >
                {t.auth.createAccount}
              </button>
              <span className="text-muted-foreground mx-1">·</span>
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => {
                  setMode("reset");
                  setError("");
                  setMessage("");
                }}
              >
                {t.auth.forgotPassword}
              </button>
            </>
          ) : (
            <>
              <span className="text-muted-foreground">{t.auth.hasAccount}</span>
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setMessage("");
                }}
              >
                {t.auth.login}
              </button>
            </>
          )}
        </CardFooter>
      </Card>
    </main>
  );
}
