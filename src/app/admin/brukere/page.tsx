"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiGet, apiPost, apiDelete } from "@/lib/api-client";
import { showToast } from "@/lib/toast";
import { MoreHorizontal, Shield, Ban, Trash2, Loader2, UserCheck } from "lucide-react";

type TenantRole = "student" | "counselor" | "admin" | "superadmin";

type AdminUser = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  disabled: boolean;
  creationTime: string;
  lastSignInTime: string;
  customClaims: { role?: TenantRole; admin?: boolean; tenantId?: string };
};

const ROLE_LABELS: Record<TenantRole, string> = {
  student: "Student",
  counselor: "Rådgiver",
  admin: "Admin",
  superadmin: "Superadmin",
};

const ROLE_VARIANTS: Record<TenantRole, "default" | "secondary" | "destructive"> = {
  student: "secondary",
  counselor: "default",
  admin: "default",
  superadmin: "destructive",
};

export default function BrukerePage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    const res = await apiGet<{ users: AdminUser[] }>("/admin/users");
    if (res.success) {
      setUsers(res.data.users);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleSetRole(uid: string, role: TenantRole) {
    setActionLoading(uid);
    const res = await apiPost("/admin/set-role", { uid, role });
    if (res.success) {
      showToast.success(`Rolle oppdatert: ${ROLE_LABELS[role]}`);
      await loadUsers();
    } else {
      showToast.error("Kunne ikke oppdatere rolle");
    }
    setActionLoading(null);
  }

  async function handleDisable(uid: string, disable: boolean) {
    setActionLoading(uid);
    const res = await apiPost(`/admin/users/${uid}/disable`, { disabled: disable });
    if (res.success) {
      showToast.success(disable ? "Bruker deaktivert" : "Bruker aktivert");
      await loadUsers();
    } else {
      showToast.error("Kunne ikke oppdatere bruker");
    }
    setActionLoading(null);
  }

  async function handleDelete(uid: string) {
    if (!confirm("Er du sikker på at du vil slette denne brukeren? Denne handlingen kan ikke angres.")) {
      return;
    }
    setActionLoading(uid);
    const res = await apiDelete(`/admin/users/${uid}`);
    if (res.success) {
      showToast.success("Bruker slettet");
      await loadUsers();
    } else {
      showToast.error("Kunne ikke slette bruker");
    }
    setActionLoading(null);
  }

  const columns: ColumnDef<AdminUser>[] = [
    {
      key: "displayName",
      header: "Bruker",
      render: (_val, row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.photoURL || undefined} alt={row.displayName || ""} />
            <AvatarFallback className="text-xs">
              {(row.displayName || row.email || "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{row.displayName || "—"}</div>
            <div className="text-xs text-muted-foreground">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "disabled",
      header: "Status",
      render: (val) => (
        <Badge variant={val ? "destructive" : "default"}>
          {val ? "Deaktivert" : "Aktiv"}
        </Badge>
      ),
    },
    {
      key: "customClaims",
      header: "Rolle",
      render: (val) => {
        const claims = val as AdminUser["customClaims"];
        const role = (claims?.role ?? "student") as TenantRole;
        return (
          <div className="flex flex-col gap-0.5">
            <Badge variant={ROLE_VARIANTS[role]}>{ROLE_LABELS[role]}</Badge>
            {claims?.tenantId && (
              <span className="text-xs text-muted-foreground">{claims.tenantId}</span>
            )}
          </div>
        );
      },
    },
    {
      key: "creationTime",
      header: "Opprettet",
      sortable: true,
      render: (val) => val ? new Date(val as string).toLocaleDateString("nb-NO") : "—",
    },
    {
      key: "lastSignInTime",
      header: "Sist innlogget",
      sortable: true,
      render: (val) => val ? new Date(val as string).toLocaleDateString("nb-NO") : "—",
    },
    {
      key: "uid",
      header: "",
      render: (_val, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" disabled={actionLoading === row.uid} />
            }
          >
            {actionLoading === row.uid ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(["student", "counselor", "admin"] as TenantRole[]).map((role) => (
              <DropdownMenuItem
                key={role}
                onClick={() => handleSetRole(row.uid, role)}
                disabled={row.customClaims?.role === role}
              >
                {role === "admin" ? (
                  <Shield className="mr-2 h-4 w-4" />
                ) : (
                  <UserCheck className="mr-2 h-4 w-4" />
                )}
                Sett som {ROLE_LABELS[role]}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => handleDisable(row.uid, !row.disabled)}>
              <Ban className="mr-2 h-4 w-4" />
              {row.disabled ? "Aktiver" : "Deaktiver"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDelete(row.uid)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Slett bruker
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Brukere</h1>
        <p className="text-muted-foreground">
          Administrer brukere, roller og tilganger.
        </p>
      </div>

      <DataTable
        data={users as unknown as Record<string, unknown>[]}
        columns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
        searchable
        searchKey="email"
        pageSize={10}
      />
    </div>
  );
}
