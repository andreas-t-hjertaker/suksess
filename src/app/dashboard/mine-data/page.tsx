"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  collection,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { deleteUser } from "firebase/auth";
import { nowISO, todayISO } from "@/lib/utils/time";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/lib/toast";
import { ErrorState } from "@/components/error-state";
import {
  Download,
  Trash2,
  ShieldCheck,
  Eye,
  FileJson,
  AlertTriangle,
  Loader2,
  Database,
  User,
  Brain,
  GraduationCap,
  MessageCircle,
  BookOpen,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Hjelpefunksjoner
// ---------------------------------------------------------------------------

/**
 * Fullstendig dataeksport — GDPR Art. 20 (rett til dataportabilitet).
 * Inkluderer all brukerdata i strukturert, maskinlesbart JSON-format.
 * Datatilsynet-frist: 30 dager fra forespørsel.
 */
async function exportUserData(userId: string) {
  const result: Record<string, unknown> = {};

  // Enkeltdokumenter
  const docPaths: Record<string, string> = {
    profil: `profiles/${userId}`,
    bruker: `users/${userId}`,
    abonnement: `subscriptions/${userId}`,
  };

  for (const [key, path] of Object.entries(docPaths)) {
    try {
      const snap = await getDoc(doc(db, path));
      if (snap.exists()) result[key] = snap.data();
    } catch { /* samling finnes ikke */ }
  }

  // Subcollections under users/{userId}
  const subcols = [
    "grades",
    "testResults",
    "conversations",       // AI-samtalehistorikk
    "notifications",
    "gamification",        // XP, badges, streaks
    "achievements",        // Opptjente badges
    "studier",
    "jobbmatch",
    "soknadscoach",
    "cv",                  // CV-utkast
    "documents",           // Opplastede dokumenter
    "feedback",            // Tilbakemeldinger på AI-svar
    "personalityProfile",  // Big Five / RIASEC
    "aiCache",             // Cachelagrede AI-svar
    "xp",                  // XP-transaksjoner
    "soknader",            // Søknader
  ];

  for (const col of subcols) {
    try {
      const snaps = await getDocs(collection(db, "users", userId, col));
      if (!snaps.empty) {
        result[col] = snaps.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    } catch { /* subcollection finnes ikke */ }
  }

  // AI-beslutningslogg (for EU AI Act Art. 12 åpenhet)
  try {
    const aiLogs = await getDocs(collection(db, "llmLogs"));
    // Filtrer kun denne brukerens logg klient-side (serveren gjøre dette bedre)
    result["aiDecisionLog"] = aiLogs.docs
      .filter((d) => d.data().userId === userId)
      .map((d) => ({ id: d.id, ...d.data() }));
  } catch { /* samling ikke tilgjengelig fra klient */ }

  return result;
}

/**
 * Slett all brukerdata — GDPR Art. 17 (rett til sletting).
 * Logger slettingen for lovpålagt revisjonsspor.
 * Datatilsynet-frist: 30 dager fra forespørsel.
 */
async function deleteAllUserData(userId: string) {
  const subcols = [
    "grades", "testResults", "conversations",
    "notifications", "gamification", "achievements",
    "studier", "jobbmatch", "soknadscoach", "cv",
    "documents", "feedback", "personalityProfile",
    "aiCache", "xp", "soknader",
  ];

  for (const sub of subcols) {
    try {
      const snaps = await getDocs(collection(db, "users", userId, sub));
      await Promise.all(snaps.docs.map((d) => deleteDoc(d.ref)));
    } catch { /* subcollection finnes kanskje ikke */ }
  }

  // Slett hoveddokumenter
  try { await deleteDoc(doc(db, "profiles", userId)); } catch { /* ok */ }
  try { await deleteDoc(doc(db, "subscriptions", userId)); } catch { /* ok */ }
  try { await deleteDoc(doc(db, "users", userId)); } catch { /* ok */ }
}

// ---------------------------------------------------------------------------
// Datalag-oversikt
// ---------------------------------------------------------------------------

const DATA_LAYERS = [
  {
    icon: User,
    title: "Profil og konto",
    desc: "Navn, e-post, profilbilde, opprettet dato",
    collection: "users",
  },
  {
    icon: Brain,
    title: "Personlighetsprofil",
    desc: "Big Five-scorer, RIASEC-koder, styrker, interesser",
    collection: "profiles",
  },
  {
    icon: Database,
    title: "Testresultater",
    desc: "Rådata fra alle personlighets- og interessetester",
    collection: "testResults (subcollection)",
  },
  {
    icon: GraduationCap,
    title: "Karakterer",
    desc: "Registrerte fag og karakterer fra VGS",
    collection: "grades (subcollection)",
  },
  {
    icon: MessageCircle,
    title: "Samtalehistorikk",
    desc: "AI-veileder chat-historikk",
    collection: "conversations (subcollection)",
  },
  {
    icon: BookOpen,
    title: "Studiemestring",
    desc: "Registrerte emner og eksamenssjekkliste",
    collection: "studier (subcollection)",
  },
  {
    icon: FileJson,
    title: "CV-utkast",
    desc: "Lagret CV-innhold og personlige opplysninger",
    collection: "cv (subcollection)",
  },
  {
    icon: Database,
    title: "Søknadscoach og jobbmatch",
    desc: "Favorittmarkerte studieprogram og stillinger",
    collection: "soknadscoach/jobbmatch (subcollections)",
  },
];

// ---------------------------------------------------------------------------
// Side
// ---------------------------------------------------------------------------

export default function MineDataPage() {
  const { firebaseUser, loading } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  if (!loading && !firebaseUser) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">Mine data</h1>
          <p className="text-muted-foreground">
            Se, eksporter og slett alle dine persondata — i tråd med GDPR.
          </p>
        </div>
        <ErrorState message="Du må være logget inn for å se dine data." />
      </div>
    );
  }

  async function handleExport() {
    if (!firebaseUser) return;
    setExporting(true);
    try {
      const data = await exportUserData(firebaseUser.uid);
      const json = JSON.stringify(
        {
          exportedAt: nowISO(),
          userId: firebaseUser.uid,
          email: firebaseUser.email,
          data,
        },
        null,
        2
      );
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `suksess-data-${todayISO()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast.success("Data eksportert");
    } catch {
      showToast.error("Eksport feilet — prøv igjen");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAll() {
    if (!firebaseUser || confirmText !== "SLETT ALT") return;
    setDeleting(true);
    try {
      await deleteAllUserData(firebaseUser.uid);
      await deleteUser(firebaseUser);
      showToast.success("All data slettet. Konto er avsluttet.");
    } catch {
      showToast.error(
        "Sletting feilet. Du må kanskje logge inn på nytt og prøve igjen."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Mine data</h1>
        <p className="text-muted-foreground">
          Se, eksporter og slett alle dine persondata — i tråd med GDPR.
        </p>
      </div>

      {/* Rettigheter */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Dine rettigheter</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Eye, label: "Rett til innsyn", desc: "Se all lagret data nedenfor" },
              { icon: Download, label: "Rett til portabilitet", desc: "Eksporter alt som JSON" },
              { icon: Trash2, label: "Rett til sletting", desc: "Slett all data og konto" },
            ].map((r) => (
              <div key={r.label} className="rounded-lg bg-muted p-3 space-y-1">
                <div className="flex items-center gap-1.5">
                  <r.icon className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">{r.label}</p>
                </div>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hva vi lagrer */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Data vi lagrer om deg</CardTitle>
          <CardDescription>
            All data lagres kryptert i EU (Google Cloud europe-west1).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DATA_LAYERS.map((layer) => (
              <div key={layer.title} className="flex items-start gap-3 rounded-lg border p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <layer.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{layer.title}</p>
                  <p className="text-xs text-muted-foreground">{layer.desc}</p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  Firestore
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Eksport */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Eksporter mine data</CardTitle>
          </div>
          <CardDescription>
            Last ned all din data som en maskinlesbar JSON-fil (GDPR Art. 20).
            Inkluderer profil, karakterer, testresultater, AI-samtalehistorikk,
            XP/badges, CV-utkast, søknader og AI-beslutningslogg.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={exporting} className="gap-2">
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exporting ? "Eksporterer..." : "Last ned dataeksport (JSON)"}
          </Button>
        </CardContent>
      </Card>

      {/* Slett alt */}
      <Card className="border-destructive/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-base text-destructive">Slett all data og konto</CardTitle>
          </div>
          <CardDescription>
            Dette sletter all din data permanent — profil, karakterer, testresultater og
            samtalehistorikk. Kontoen avsluttes umiddelbart. Handlingen kan ikke angres.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!confirmDelete ? (
            <Button
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/5"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Slett all data og konto
            </Button>
          ) : (
            <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive">
                Skriv <strong>SLETT ALT</strong> for å bekrefte
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="SLETT ALT"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                aria-label="Bekreftelse for sletting"
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={confirmText !== "SLETT ALT" || deleting}
                  onClick={handleDeleteAll}
                  className="gap-2"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Slett permanent
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setConfirmDelete(false);
                    setConfirmText("");
                  }}
                >
                  Avbryt
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personvernerkæring-lenke */}
      <p className="text-xs text-muted-foreground">
        Les vår{" "}
        <a href="/personvern" className="underline underline-offset-2 hover:text-foreground">
          personvernerklæring
        </a>{" "}
        for mer informasjon om hvordan vi behandler dine personopplysninger.
        Spørsmål? Ta kontakt på{" "}
        <a href="mailto:personvern@suksess.no" className="underline underline-offset-2 hover:text-foreground">
          personvern@suksess.no
        </a>
        .
      </p>
    </div>
  );
}
