"use client";

import { useEffect } from "react";
import { trackErrorToFirestore, initObservabilityFirestore } from "@/lib/observability/logger";
import { trackEvent } from "@/lib/firebase/analytics";
import { db } from "@/lib/firebase/firestore";

/**
 * Global feilrapportering — fanger ubehandlede feil og promise rejections.
 * Sender til Firestore errorLogs og Firebase Analytics.
 */
export function ErrorReporter() {
  useEffect(() => {
    initObservabilityFirestore(db);

    function handleError(event: ErrorEvent) {
      trackErrorToFirestore({
        message: event.message,
        stack: event.error?.stack,
        context: `global_error:${window.location.pathname}`,
      });
      trackEvent("client_error", {
        error_message: event.message?.slice(0, 100),
        page: window.location.pathname,
      });
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const message =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason);
      trackErrorToFirestore({
        message: `Unhandled rejection: ${message}`,
        stack: event.reason instanceof Error ? event.reason.stack : undefined,
        context: `unhandled_rejection:${window.location.pathname}`,
      });
      trackEvent("client_error", {
        error_message: message?.slice(0, 100),
        error_type: "unhandled_rejection",
        page: window.location.pathname,
      });
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
