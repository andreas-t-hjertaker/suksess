"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { showToast } from "@/lib/toast";
import { Loader2, Users, Copy, UserMinus } from "lucide-react";
import {
  formatInviteCode,
  createParentInvite,
  getLinkedGuardians,
  unlinkGuardian,
  type GuardianLink,
} from "@/lib/foresatt/guardian-link";
import { logGuardianAction, buildAuditAction } from "@/lib/foresatt/audit";

export function GuardianSettingsCard({ userUid }: { userUid: string }) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [guardians, setGuardians] = useState<GuardianLink[]>([]);
  const [guardiansLoaded, setGuardiansLoaded] = useState(false);
  const [unlinkingGuardian, setUnlinkingGuardian] = useState<string | null>(null);

  useEffect(() => {
    if (guardiansLoaded) return;
    async function load() {
      try {
        const links = await getLinkedGuardians(userUid);
        setGuardians(links);
        setGuardiansLoaded(true);
      } catch {
        console.error("[Innstillinger] Kunne ikke laste foresatte");
      }
    }
    load();
  }, [userUid, guardiansLoaded]);

  async function handleGenerateCode() {
    setGeneratingCode(true);
    try {
      const code = await createParentInvite(userUid);
      setInviteCode(code);
      showToast.success("Koblingskode generert");
    } catch {
      showToast.error("Kunne ikke generere koblingskode");
    }
    setGeneratingCode(false);
  }

  function handleCopyCode() {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    showToast.success("Kode kopiert til utklippstavlen");
  }

  async function handleUnlink(parentUid: string) {
    setUnlinkingGuardian(parentUid);
    try {
      await unlinkGuardian(userUid, parentUid);
      try {
        await logGuardianAction(
          buildAuditAction("link_removed", parentUid, userUid)
        );
      } catch {
        // Audit feiler ikke brukeropplevelsen
      }
      setGuardians((prev) => prev.filter((g) => g.parentUid !== parentUid));
      showToast.success("Foresatt frakoblet");
    } catch {
      showToast.error("Kunne ikke frakoble foresatt");
    }
    setUnlinkingGuardian(null);
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" aria-hidden="true" />
          <CardTitle>Foresatt-tilgang</CardTitle>
        </div>
        <CardDescription>
          La foresatte følge med på karriereutforskingen din. De ser kun overordnet fremdrift — aldri AI-samtaler eller detaljerte testresultater.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Generer koblingskode */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium">Generer koblingskode</h2>
          <p className="text-xs text-muted-foreground">
            Del koden med foresatte slik at de kan koble seg til kontoen din. Koden er gyldig i 30 minutter.
          </p>
          {inviteCode ? (
            <div className="flex items-center gap-3">
              <div className="rounded-lg border bg-muted px-6 py-3">
                <span className="font-mono text-2xl font-bold tracking-[0.3em]">
                  {formatInviteCode(inviteCode)}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyCode} aria-label="Kopier koblingskode">
                <Copy className="h-4 w-4 mr-1" />
                Kopier
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={handleGenerateCode}
              disabled={generatingCode}
            >
              {generatingCode ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Users className="mr-2 h-4 w-4" />
              )}
              Generer kode
            </Button>
          )}
        </div>

        {/* Koblede foresatte */}
        {guardians.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium">Koblede foresatte</h2>
            <div className="space-y-2">
              {guardians.map((g) => (
                <div
                  key={g.parentUid}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Foresatt</Badge>
                    <span className="text-sm">
                      {g.parentDisplayName || g.parentUid.slice(0, 8) + "..."}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Koblet {g.linkedAt.toLocaleDateString("nb-NO")}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnlink(g.parentUid)}
                    disabled={unlinkingGuardian === g.parentUid}
                    aria-label={`Fjern kobling for ${g.parentDisplayName || "foresatt"}`}
                    className="text-destructive hover:text-destructive"
                  >
                    {unlinkingGuardian === g.parentUid ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserMinus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
