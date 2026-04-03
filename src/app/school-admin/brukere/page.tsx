"use client";

/**
 * Skole self-service — Brukeradministrasjon (#134).
 *
 * Funksjoner:
 * - Liste over elever og rådgivere i tenanten
 * - Inviter nye brukere via e-post
 * - Endre rolle, deaktiver, slett (GDPR Art. 17)
 * - Bulk-import via CSV
 * - Søk og rollefilter
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useTenant } from "@/hooks/use-tenant";
import { fetchApi, apiPost, apiDelete } from "@/lib/api-client";
import { ErrorState } from "@/components/error-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { showToast } from "@/lib/toast";
import {
  Users,
  Search,
  MoreHorizontal,
  UserPlus,
  Upload,
  Shield,
  Trash2,
  Ban,
  CheckCircle2,
  Loader2,
  Mail,
  Send,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

type SchoolUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  role: string;
  disabled: boolean;
  onboardingComplete: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

const ROLE_LABELS: Record<string, string> = {
  student: "Elev",
  counselor: "Rådgiver",
  admin: "Administrator",
};

const ROLE_COLORS: Record<string, string> = {
  student: "bg-blue-500/10 text-blue-700",
  counselor: "bg-purple-500/10 text-purple-700",
  admin: "bg-orange-500/10 text-orange-700",
};

// ---------------------------------------------------------------------------
// CSV-parser
// ---------------------------------------------------------------------------

function parseCsv(text: string): { name: string; email: string; role: string }[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const results: { name: string; email: string; role: string }[] = [];

  for (const line of lines) {
    // Hopp over header
    if (line.toLowerCase().startsWith("navn") || line.toLowerCase().startsWith("name")) continue;

    const cols = line.split(/[,;]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    const name = cols[0] || "";
    const email = cols[1] || "";
    const role = cols[2] || "student";

    if (email.includes("@")) {
      results.push({ name, email, role: ["student", "counselor"].includes(role) ? role : "student" });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Side
// ---------------------------------------------------------------------------

export default function SchoolAdminBrukerePage() {
  const { tenantId, loading: tenantLoading } = useTenant();
  const [users, setUsers] = useState<SchoolUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [tab, setTab] = useState<"liste" | "inviter" | "import">("liste");

  // Invite
  const [inviteEmails, setInviteEmails] = useState("");
  const [sending, setSending] = useState(false);

  // CSV
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvPreview, setCsvPreview] = useState<{ name: string; email: string; role: string }[]>([]);
  const [importing, setImporting] = useState(false);

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (tenantLoading || !tenantId) return;
    loadUsers();
  }, [tenantId, tenantLoading]);

  async function loadUsers() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetchApi<{ users: SchoolUser[] }>("/school-admin/users");
      if (res.success && res.data) {
        setUsers(res.data.users);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetRole(uid: string, role: string) {
    try {
      const res = await apiPost(`/school-admin/users/${uid}/role`, { role });
      if (res.success) {
        setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role } : u)));
        showToast.success(`Rolle endret til ${ROLE_LABELS[role] || role}`);
      } else {
        showToast.error("Kunne ikke endre rolle");
      }
    } catch {
      showToast.error("Noe gikk galt");
    }
  }

  async function handleToggleDisable(uid: string, disabled: boolean) {
    try {
      const res = await apiPost(`/school-admin/users/${uid}/disable`, { disabled });
      if (res.success) {
        setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, disabled } : u)));
        showToast.success(disabled ? "Bruker deaktivert" : "Bruker aktivert");
      }
    } catch {
      showToast.error("Noe gikk galt");
    }
  }

  async function handleDeleteUser(uid: string) {
    try {
      const res = await apiDelete(`/school-admin/users/${uid}`);
      if (res.success) {
        setUsers((prev) => prev.filter((u) => u.uid !== uid));
        showToast.success("Brukerdata slettet (GDPR Art. 17)");
        setConfirmDelete(null);
      } else {
        showToast.error("Sletting feilet");
      }
    } catch {
      showToast.error("Noe gikk galt");
    }
  }

  async function handleSendInvites() {
    const emails = inviteEmails
      .split(/[,;\n]/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    if (emails.length === 0) {
      showToast.error("Skriv inn minst én e-postadresse");
      return;
    }

    setSending(true);
    try {
      const res = await apiPost("/email/invite", { emails, schoolName: "Skolen", tenantId });
      if (res.success) {
        showToast.success(`${emails.length} invitasjoner sendt`);
        setInviteEmails("");
      }
    } catch {
      showToast.error("Noe gikk galt");
    } finally {
      setSending(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCsv(text);
      setCsvPreview(parsed);
    };
    reader.readAsText(file);
  }

  async function handleBulkImport() {
    if (csvPreview.length === 0) return;
    setImporting(true);
    try {
      const csvData = "navn,epost,rolle\n" + csvPreview.map((u) => `${u.name},${u.email},${u.role}`).join("\n");
      const res = await apiPost<{ imported: number; errors: string[] }>("/school-admin/users/bulk-import", { csvData });
      if (res.success && res.data) {
        showToast.success(`${res.data.imported} brukere importert`);
        if (res.data.errors.length > 0) {
          showToast.error(`${res.data.errors.length} feil: ${res.data.errors[0]}`);
        }
        setCsvPreview([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        loadUsers();
      }
    } catch {
      showToast.error("Import feilet");
    } finally {
      setImporting(false);
    }
  }

  const filtered = useMemo(() => {
    let list = users;
    if (roleFilter !== "all") list = list.filter((u) => u.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          (u.displayName?.toLowerCase().includes(q)) ||
          (u.email?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [users, roleFilter, search]);

  if (tenantLoading || loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message="Kunne ikke laste brukerlisten." onRetry={loadUsers} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Brukeradministrasjon
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Administrer elever og rådgivere i din skole
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {([
          { id: "liste", label: "Brukerliste", icon: Users },
          { id: "inviter", label: "Inviter", icon: Mail },
          { id: "import", label: "CSV-import", icon: Upload },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "liste" && (
        <div className="space-y-4">
          {/* Søk + filter */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Søk navn eller e-post..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1">
              {["all", "student", "counselor", "admin"].map((r) => (
                <Button
                  key={r}
                  variant={roleFilter === r ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRoleFilter(r)}
                >
                  {r === "all" ? "Alle" : ROLE_LABELS[r] || r}
                </Button>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{filtered.length} brukere</p>

          {/* Tabell */}
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium">Bruker</th>
                  <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Rolle</th>
                  <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Status</th>
                  <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">Siste aktivitet</th>
                  <th className="text-right px-4 py-2 font-medium">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.uid} className={cn("border-b last:border-0", u.disabled && "opacity-50")}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{u.displayName || "Uten navn"}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant="outline" className={cn("text-xs", ROLE_COLORS[u.role])}>
                        {ROLE_LABELS[u.role] || u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {u.disabled ? (
                        <Badge variant="destructive" className="text-xs">Deaktivert</Badge>
                      ) : u.onboardingComplete ? (
                        <Badge variant="outline" className="text-xs text-green-700 bg-green-500/10">Aktiv</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-yellow-700 bg-yellow-500/10">Onboarding</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {u.updatedAt ? new Date(u.updatedAt).toLocaleDateString("nb-NO") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {confirmDelete === u.uid ? (
                        <div className="flex items-center gap-1 justify-end">
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(u.uid)} className="text-xs gap-1">
                            <Trash2 className="h-3 w-3" /> Bekreft
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setConfirmDelete(null)} className="text-xs">
                            Avbryt
                          </Button>
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {["student", "counselor", "admin"]
                              .filter((r) => r !== u.role)
                              .map((r) => (
                                <DropdownMenuItem key={r} onClick={() => handleSetRole(u.uid, r)}>
                                  <Shield className="mr-2 h-4 w-4" />
                                  Sett som {ROLE_LABELS[r]}
                                </DropdownMenuItem>
                              ))}
                            <DropdownMenuItem onClick={() => handleToggleDisable(u.uid, !u.disabled)}>
                              {u.disabled ? (
                                <><CheckCircle2 className="mr-2 h-4 w-4" /> Aktiver</>
                              ) : (
                                <><Ban className="mr-2 h-4 w-4" /> Deaktiver</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setConfirmDelete(u.uid)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Slett (GDPR Art. 17)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Ingen brukere funnet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "inviter" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Inviter nye brukere
            </CardTitle>
            <CardDescription>
              Skriv inn e-postadresser for å sende invitasjoner. Mottakerne får en lenke for å registrere seg.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[120px] resize-y"
              placeholder="E-postadresser (én per linje eller kommaseparert)"
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {inviteEmails.split(/[,;\n]/).filter((e) => e.trim().includes("@")).length} adresser
              </p>
              <Button onClick={handleSendInvites} disabled={sending} className="gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send invitasjoner
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "import" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Bulk-import fra CSV
            </CardTitle>
            <CardDescription>
              Last opp en CSV-fil med kolonner: <code>navn, epost, rolle</code> (rolle er valgfri, standard: elev).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileSelect}
              className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />

            {csvPreview.length > 0 && (
              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-sm font-medium mb-2">
                    Forhåndsvisning ({csvPreview.length} brukere)
                  </p>
                  <div className="max-h-[200px] overflow-y-auto space-y-1">
                    {csvPreview.slice(0, 20).map((u, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs">
                        <span className="font-medium min-w-[100px] truncate">{u.name || "—"}</span>
                        <span className="text-muted-foreground truncate">{u.email}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {ROLE_LABELS[u.role] || u.role}
                        </Badge>
                      </div>
                    ))}
                    {csvPreview.length > 20 && (
                      <p className="text-xs text-muted-foreground">...og {csvPreview.length - 20} til</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <AlertTriangle className="h-3 w-3" />
                    Invitasjoner sendes til alle importerte e-poster
                  </div>
                  <Button onClick={handleBulkImport} disabled={importing} className="ml-auto gap-2">
                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Importer {csvPreview.length} brukere
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
