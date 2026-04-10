"use client";

import { useState } from "react";
import { Code, Plus, Copy, Eye, EyeOff, AlertTriangle, Database, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useApiKeys } from "@/hooks/use-api-keys";
import { useAuth } from "@/hooks/use-auth";
import { showToast } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import { seedTestUser, TEST_USER_SUMMARY, type SeedResult } from "@/lib/firebase/seed-test-user";

export default function UtviklerPage() {
  const { keys, loading, error: loadError, createKey, revokeKey } = useApiKeys();
  const { user } = useAuth();

  // Skjema-tilstand
  const [showForm, setShowForm] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);

  // Vis nyopprettet nøkkel
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(true);

  // Seed-tilstand
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null);

  async function handleSeed() {
    if (!user?.uid) {
      showToast.error("Du må være innlogget for å seede testdata.");
      return;
    }
    setSeeding(true);
    setSeedResult(null);
    const result = await seedTestUser(user.uid);
    setSeedResult(result);
    setSeeding(false);
    if (result.success) {
      showToast.success(result.message);
    } else {
      showToast.error(result.message);
    }
  }

  /** Opprett ny nøkkel */
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!keyName.trim()) return;

    setCreating(true);
    const key = await createKey(keyName.trim());
    if (key) {
      setNewKey(key);
      setKeyName("");
      setShowForm(false);
      showToast.success("API-nøkkel opprettet!");
    } else {
      showToast.error("Kunne ikke opprette API-nøkkel.");
    }
    setCreating(false);
  }

  /** Kopier nøkkel til utklippstavle */
  function copyKey(text: string) {
    navigator.clipboard.writeText(text);
    showToast.success("Kopiert til utklippstavlen!");
  }

  /** Tilbakekall nøkkel */
  async function handleRevoke(id: string) {
    const ok = await revokeKey(id);
    if (ok) {
      showToast.success("API-nøkkel tilbakekalt.");
    } else {
      showToast.error("Kunne ikke tilbakekalle nøkkelen.");
    }
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Code className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Utvikler-tilgang ikke tilgjengelig</CardTitle>
            <CardDescription>
              API-nøkler og utviklerverktøy er kun tilgjengelig for kontoer med utviklertilgang.
              Kontakt administrator dersom du trenger tilgang.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Utvikler</h1>
          <p className="text-muted-foreground">
            Administrer API-nøkler for programmatisk tilgang.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="mr-2 h-4 w-4" />
          Opprett ny nøkkel
        </Button>
      </div>

      {/* Opprett-skjema */}
      {showForm && (
        <Card>
          <form onSubmit={handleCreate}>
            <CardHeader>
              <CardTitle>Ny API-nøkkel</CardTitle>
              <CardDescription>
                Gi nøkkelen et beskrivende navn slik at du kan identifisere den
                senere.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="key-name">Navn</Label>
                <Input
                  id="key-name"
                  placeholder="f.eks. Produksjon, Testing, CI/CD..."
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  autoFocus
                />
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button type="submit" disabled={creating || !keyName.trim()}>
                {creating ? <Spinner className="mr-2 h-4 w-4" /> : null}
                Opprett
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowForm(false)}
              >
                Avbryt
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* Nyopprettet nøkkel — vises bare én gang */}
      {newKey && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <AlertTriangle className="h-5 w-5" />
              Lagre nøkkelen nå
            </CardTitle>
            <CardDescription>
              Denne nøkkelen vises bare én gang. Kopier og lagre den et sikkert
              sted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 rounded-md bg-muted p-3 font-mono text-sm">
              <code className="flex-1 break-all">
                {showKey ? newKey : "•".repeat(newKey.length)}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyKey(newKey)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => setNewKey(null)}>
              Ferdig — jeg har lagret nøkkelen
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Eksisterende nøkler */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            API-nøkler
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : keys.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Ingen API-nøkler ennå. Opprett en for å komme i gang.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Navn</TableHead>
                  <TableHead>Nøkkel</TableHead>
                  <TableHead>Opprettet</TableHead>
                  <TableHead>Sist brukt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {key.prefix}...
                    </TableCell>
                    <TableCell>{formatDate(key.createdAt)}</TableCell>
                    <TableCell>
                      {key.lastUsedAt ? formatDate(key.lastUsedAt) : "Aldri"}
                    </TableCell>
                    <TableCell>
                      {key.revoked ? (
                        <Badge variant="destructive">Tilbakekalt</Badge>
                      ) : (
                        <Badge variant="default">Aktiv</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!key.revoked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRevoke(key.id)}
                        >
                          Tilbakekall
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Seed testbruker */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Seed testbruker
          </CardTitle>
          <CardDescription>
            Fyll din bruker med komplett testdata for å se alle funksjoner i aksjon.
            Overskriver eksisterende data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-4 text-sm space-y-2">
            <p className="font-medium">{TEST_USER_SUMMARY.name} — {TEST_USER_SUMMARY.school}</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>Personlighet: {TEST_USER_SUMMARY.personality.riasec}</li>
              <li>Big Five: {TEST_USER_SUMMARY.personality.bigFive}</li>
              <li>Styrker: {TEST_USER_SUMMARY.personality.strengths}</li>
              <li>Karakterer: {TEST_USER_SUMMARY.grades.count} fag, snitt {TEST_USER_SUMMARY.grades.average} ({TEST_USER_SUMMARY.grades.highlights})</li>
              <li>Gamification: {TEST_USER_SUMMARY.gamification.xp} XP ({TEST_USER_SUMMARY.gamification.level}), {TEST_USER_SUMMARY.gamification.achievements} achievements, {TEST_USER_SUMMARY.gamification.streak}-dagers streak</li>
              <li>AI-samtaler: {TEST_USER_SUMMARY.conversations} samtaler med historikk</li>
              <li>Feature flags: Alle aktivert</li>
            </ul>
          </div>

          {seedResult && (
            <div className={`rounded-md p-4 text-sm ${seedResult.success ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"}`}>
              <div className="flex items-center gap-2 font-medium mb-2">
                {seedResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
                {seedResult.message}
              </div>
              <ul className="space-y-0.5 text-muted-foreground">
                {seedResult.details.map((d, i) => (
                  <li key={i}>- {d}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSeed} disabled={seeding} variant="outline">
            {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            {seeding ? "Seeder data..." : "Seed testdata for min bruker"}
          </Button>
        </CardFooter>
      </Card>

      {/* Brukseksempel */}
      <Card>
        <CardHeader>
          <CardTitle>Brukseksempel</CardTitle>
          <CardDescription>
            Bruk API-nøkkelen i forespørsler med <code>x-api-key</code>-headeren.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
            <code>{`curl -X GET \\
  https://suksess.no/api/me \\
  -H "x-api-key: sk_live_din_nøkkel_her"`}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
