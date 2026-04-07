"use client";

import { useState } from "react";
import { deleteUser, type User as FirebaseUser } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { showToast } from "@/lib/toast";
import { apiDelete } from "@/lib/api-client";
import { Loader2, Trash2 } from "lucide-react";

interface DangerZoneCardProps {
  firebaseUser: FirebaseUser;
}

export function DangerZoneCard({ firebaseUser }: DangerZoneCardProps) {
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteAccount() {
    if (deleteConfirm !== "SLETT") return;
    setDeleting(true);
    try {
      await apiDelete("/account");
      await deleteUser(firebaseUser);
      showToast.success("Kontoen din er slettet");
    } catch {
      showToast.error(
        "Kunne ikke slette konto. Du kan trenge å logge inn på nytt."
      );
    }
    setDeleting(false);
  }

  return (
    <Card className="max-w-2xl border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive"><h2>Faresone</h2></CardTitle>
        <CardDescription>
          Irreversible handlinger som påvirker kontoen din.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Sletting av kontoen din fjerner alle data permanent, inkludert
          abonnementer, API-nøkler og dokumenter. Denne handlingen kan ikke
          angres.
        </p>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Skriv SLETT for å bekrefte"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            className="max-w-xs"
            aria-label="Bekreftelse for sletting"
          />
          <Button
            variant="destructive"
            onClick={handleDeleteAccount}
            disabled={deleteConfirm !== "SLETT" || deleting}
          >
            {deleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Slett konto
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
