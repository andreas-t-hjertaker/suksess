"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Bug } from "lucide-react";
import { utlosFeilrapport } from "@/lib/feil-kontekst";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
};

/** Fanger uventede feil i komponenttreet og viser en fallback-UI */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
  }

  /** Åpner feedback-dialogen med feilinformasjon pre-fylt */
  private handleRapporterFeil = () => {
    const { error, errorInfo } = this.state;
    utlosFeilrapport({
      feilmelding: error?.message ?? "Ukjent feil",
      stackTrace: error?.stack,
      komponentStack: errorInfo?.componentStack ?? undefined,
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div role="alert" aria-live="assertive" className="flex min-h-[400px] items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-destructive" />
            <CardTitle>Noe gikk galt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              En uventet feil har oppstått. Du kan rapportere feilen for å hjelpe
              oss å fikse den, eller laste siden på nytt.
            </p>
            {this.state.error && (
              <pre className="overflow-auto rounded-lg bg-muted p-3 text-left text-xs">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={this.handleRapporterFeil}
              >
                <Bug className="mr-2 h-4 w-4" />
                Rapporter feil
              </Button>
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  window.location.reload();
                }}
              >
                Last inn på nytt
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
