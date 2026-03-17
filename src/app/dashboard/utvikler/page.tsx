"use client";

import { useState } from "react";
import { Code, Plus, Copy, Eye, EyeOff, AlertTriangle } from "lucide-react";
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
import { showToast } from "@/lib/toast";
import { formatDate } from "@/lib/utils";

export default function UtviklerPage() {
  const { keys, loading, createKey, revokeKey } = useApiKeys();

  // Skjema-tilstand
  const [showForm, setShowForm] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);

  // Vis nyopprettet nøkkel
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(true);

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
  https://ketlcloud.web.app/api/me \\
  -H "x-api-key: sk_live_din_nøkkel_her"`}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
