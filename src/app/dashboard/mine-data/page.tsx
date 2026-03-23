"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  collection,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { deleteUser } from "firebase/auth";
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

async function exportUserData(userId: string) {
  const result: Record<string, unknown> = {};

  // Hent hvert datalag
  const paths: Record<string, string> = {
    profil: `profiles/${userId}`,
    bruker: `users/${userId}`,
  };

  // Subcollections
  const subcols = ["grades", "testResults", "conversations", "notifications", "gamification", "studier", "jobbmatch", "soknadscoach"];

  for (const [key, path] of Object.entries(paths)) {
    const snap = await getDoc(doc(db, path));
    if (snap.exists()) result[key] = snap.data();
  }

  for (const col of subcols) {
    const snaps = await getDocs(query(collection(db, "users", userId, col)));
    result[col] = snaps.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  return result;
}

async function deleteAllUserData(userId: string) {
  const subcols = [
    "grades", "testResults", "conversations", "apiKeys/keys",
    "notifications", "gamification", "studier", "jobbmatch", "soknadscoach", "cv",
  ];

  for (const sub of subcols) {
    const parts = sub.split("/");
    const colPath = parts.length === 2
      ? `users/${userId}/${parts[0]}/${parts[1]}`
      : `users/${userId}/${sub}`;
    try {
      const snaps = await getDocs(collection(db, colPath));
      await Promise.all(snaps.docs.map((d) => deleteDoc(d.ref)));
    } catch {
      // Subcollection finnes kanskje ikke
    }
  }

  // Slett hoveddokumenter
  try { await deleteDoc(doc(db, "profiles", userId)); } catch { /* ok */ }
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
  const { firebaseUser } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  async function handleExport() {
    if (!firebaseUser) return;
    setExporting(true);
    try {
      const data = await exportUserData(firebaseUser.uid);
      const json = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
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
      a.download = `suksess-data-${new Date().toISOString().split("T")[0]}.json`;
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
            Last ned all din data som en JSON-fil. Inkluderer profil, karakterer,
            testresultater og samtalehistorikk.
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
