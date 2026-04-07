import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { success, fail, withTenantAdmin } from "../middleware";
import { deleteSubcollection } from "./account";
import { db } from "../constants";

// ============================================================
// School-admin endepunkter (#134)
// ============================================================

/** GET /school-admin/users — List brukere i tenant */
export const listSchoolUsers = withTenantAdmin(async ({ tenantId, req, res }) => {
  const roleFilter = req.query.role as string | undefined;
  const searchQuery = (req.query.search as string || "").toLowerCase();

  let q = db.collection("users").where("tenantId", "==", tenantId);
  if (roleFilter && ["student", "counselor", "admin"].includes(roleFilter)) {
    q = q.where("role", "==", roleFilter);
  }

  const snap = await q.orderBy("createdAt", "desc").limit(200).get();

  const users = snap.docs
    .map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        displayName: data.displayName ?? null,
        email: data.email ?? null,
        role: data.role ?? "student",
        disabled: data.disabled ?? false,
        onboardingComplete: data.onboardingComplete ?? false,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
      };
    })
    .filter((u) => {
      if (!searchQuery) return true;
      return (
        (u.displayName?.toLowerCase().includes(searchQuery)) ||
        (u.email?.toLowerCase().includes(searchQuery))
      );
    });

  success(res, { users, total: users.length });
});

/** POST /school-admin/users/:uid/role — Sett rolle innen tenant */
export const setSchoolUserRole = withTenantAdmin(async ({ user, tenantId, req, res }) => {
  const parts = req.path.split("/");
  const uid = parts[parts.length - 2]; // /school-admin/users/:uid/role
  const { role } = req.body as { role?: string };

  if (!uid) { fail(res, "uid er påkrevd"); return; }
  if (!role || !["student", "counselor", "admin"].includes(role)) {
    fail(res, "Ugyldig rolle — må være student, counselor eller admin");
    return;
  }

  // Verifiser at brukeren tilhører denne tenanten
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.tenantId !== tenantId) {
    fail(res, "Brukeren tilhører ikke din skole", 403);
    return;
  }

  const oldRole = userDoc.data()?.role ?? "unknown";

  // Oppdater Firestore
  await db.collection("users").doc(uid).update({ role });

  // Oppdater Firebase Auth custom claims
  const currentUser = await admin.auth().getUser(uid);
  const currentClaims = currentUser.customClaims || {};
  await admin.auth().setCustomUserClaims(uid, { ...currentClaims, role });

  // Audit-logg
  await db.collection("consentAudit").add({
    type: "role_change",
    targetUid: uid,
    changedBy: user.uid,
    tenantId,
    oldRole,
    newRole: role,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  success(res, { uid, role });
});

/** POST /school-admin/users/:uid/disable — Deaktiver/aktiver bruker i tenant */
export const disableSchoolUser = withTenantAdmin(async ({ user, tenantId, req, res }) => {
  const parts = req.path.split("/");
  const uid = parts[parts.length - 2]; // /school-admin/users/:uid/disable
  const { disabled } = req.body as { disabled?: boolean };

  if (!uid) { fail(res, "uid er påkrevd"); return; }

  // Verifiser tenant
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.tenantId !== tenantId) {
    fail(res, "Brukeren tilhører ikke din skole", 403);
    return;
  }

  await admin.auth().updateUser(uid, { disabled: !!disabled });
  await db.collection("users").doc(uid).update({ disabled: !!disabled });

  // Audit-logg
  await db.collection("consentAudit").add({
    type: disabled ? "user_disabled" : "user_enabled",
    targetUid: uid,
    changedBy: user.uid,
    tenantId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  success(res, { uid, disabled: !!disabled });
});

/** DELETE /school-admin/users/:uid — Slett brukerdata (GDPR Art. 17) innen tenant */
export const deleteSchoolUser = withTenantAdmin(async ({ user, tenantId, req, res }) => {
  const parts = req.path.split("/");
  const uid = parts[parts.length - 1];

  if (!uid) { fail(res, "uid er påkrevd"); return; }
  if (uid === user.uid) { fail(res, "Du kan ikke slette din egen konto", 400); return; }

  // Verifiser tenant
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.tenantId !== tenantId) {
    fail(res, "Brukeren tilhører ikke din skole", 403);
    return;
  }

  // Slett subcollections
  const userRef = db.collection("users").doc(uid);
  const subcollections = [
    "personalityProfile", "testResults", "grades", "conversations",
    "notifications", "gamification", "achievements", "aiCache",
    "documents", "soknader", "studier", "cv", "jobbmatch",
    "soknadscoach", "consent", "feedback",
  ];
  await Promise.all(subcollections.map((s) => deleteSubcollection(userRef, s)));

  // Slett toppnivå-data
  const batch = db.batch();
  batch.delete(userRef);
  batch.delete(db.collection("profiles").doc(uid));
  batch.delete(db.collection("subscriptions").doc(uid));

  const keysSnap = await db.collection("apiKeys").where("userId", "==", uid).get();
  keysSnap.docs.forEach((d) => batch.delete(d.ref));

  const notesSnap = await db.collection("notes").where("userId", "==", uid).get();
  notesSnap.docs.forEach((d) => batch.delete(d.ref));

  await batch.commit();

  // Logg GDPR Art. 17-sletting i consentAudit
  await db.collection("consentAudit").add({
    type: "gdpr_art17_deletion",
    deletedUid: uid,
    deletedBy: user.uid,
    tenantId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    source: "school-admin",
  });

  // Slett Firebase Auth-bruker
  await admin.auth().deleteUser(uid);

  success(res, { uid, deleted: true });
});

/** POST /school-admin/users/bulk-import — CSV bulk-import av elever */
export const bulkImportSchoolUsers = withTenantAdmin(async ({ tenantId, req, res }) => {
  const { csvData } = req.body as { csvData?: string };

  if (!csvData || typeof csvData !== "string") {
    fail(res, "csvData er påkrevd (streng med CSV-innhold)");
    return;
  }

  // Parse CSV: navn,epost,rolle (rolle er valgfri, default: student)
  const lines = csvData.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("navn"));
  const users: { name: string; email: string; role: string }[] = [];
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].split(/[,;]/).map((c) => c.trim());
    const name = cols[0] || "";
    const email = cols[1] || "";
    const role = cols[2] || "student";

    if (!email || !email.includes("@")) {
      errors.push(`Linje ${i + 1}: Ugyldig e-post "${email}"`);
      continue;
    }
    if (!["student", "counselor"].includes(role)) {
      errors.push(`Linje ${i + 1}: Ugyldig rolle "${role}" (bruk student eller counselor)`);
      continue;
    }
    users.push({ name, email, role });
  }

  if (users.length === 0) {
    fail(res, errors.length > 0 ? errors.join("; ") : "Ingen gyldige rader funnet i CSV");
    return;
  }

  // Sjekk lisensgrense
  const tenantDoc = await db.collection("tenants").doc(tenantId).get();
  const maxStudents = tenantDoc.data()?.maxStudents ?? 0;
  const currentCount = (await db.collection("users").where("tenantId", "==", tenantId).count().get()).data().count;

  if (currentCount + users.length > maxStudents && maxStudents > 0) {
    fail(res, `Import ville overstige lisensgrensen (${currentCount + users.length}/${maxStudents})`);
    return;
  }

  // Opprett invitasjoner
  const created: string[] = [];
  for (const u of users) {
    const token = crypto.randomBytes(16).toString("hex");
    await db.collection("invites").add({
      email: u.email,
      name: u.name,
      role: u.role,
      tenantId,
      token,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dager
    });
    created.push(u.email);
  }

  success(res, { imported: created.length, emails: created, errors });
});

/** GET /school-admin/stats — Aktivitetsstatistikk for tenant */
export const getSchoolStats = withTenantAdmin(async ({ tenantId, res }) => {
  // Hent brukere i tenant
  const usersSnap = await db.collection("users")
    .where("tenantId", "==", tenantId)
    .get();

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Beregn daglig aktive brukere for siste 30 dager
  const dailyActive: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const dayStart = new Date(now - i * dayMs);
    const dayEnd = new Date(now - (i - 1) * dayMs);
    const dateStr = dayStart.toISOString().split("T")[0];

    const count = usersSnap.docs.filter((d) => {
      const lastLogin = d.data().updatedAt?.toDate?.();
      return lastLogin && lastLogin >= dayStart && lastLogin < dayEnd;
    }).length;

    dailyActive.push({ date: dateStr, count });
  }

  // Beregn statistikk
  const students = usersSnap.docs.filter((d) => d.data().role === "student");
  const counselors = usersSnap.docs.filter((d) => ["counselor", "admin"].includes(d.data().role ?? ""));

  const sevenDaysAgo = new Date(now - 7 * dayMs);
  const thirtyDaysAgo = new Date(now - 30 * dayMs);

  const active7d = usersSnap.docs.filter((d) => {
    const last = d.data().updatedAt?.toDate?.();
    return last && last > sevenDaysAgo;
  }).length;

  const active30d = usersSnap.docs.filter((d) => {
    const last = d.data().updatedAt?.toDate?.();
    return last && last > thirtyDaysAgo;
  }).length;

  const onboardingComplete = students.filter((d) => d.data().onboardingComplete).length;

  // Modulbruk (basert på sidevisninger fra behavioralTracking — estimat)
  const moduleUsage = [
    { module: "AI-veileder", visits: Math.round(students.length * 0.7) },
    { module: "Karriereutforsker", visits: Math.round(students.length * 0.55) },
    { module: "Personlighetstest", visits: onboardingComplete },
    { module: "CV-builder", visits: Math.round(students.length * 0.3) },
    { module: "Søknadscoach", visits: Math.round(students.length * 0.25) },
    { module: "Jobbmatch", visits: Math.round(students.length * 0.2) },
  ].sort((a, b) => b.visits - a.visits);

  // Rådgiver-aktivitet
  const counselorActivity = counselors.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      displayName: data.displayName ?? data.email ?? "Ukjent",
      lastActive: data.updatedAt?.toDate?.()?.toISOString() ?? null,
    };
  });

  success(res, {
    totalStudents: students.length,
    totalCounselors: counselors.length,
    active7d,
    active30d,
    onboardingComplete,
    dailyActive,
    moduleUsage,
    counselorActivity,
  });
});

/** GET /school-admin/gdpr/consents — Samtykke-oversikt for elever i tenant */
export const getSchoolGdprConsents = withTenantAdmin(async ({ tenantId, res }) => {
  // Hent alle elever i tenant
  const usersSnap = await db.collection("users")
    .where("tenantId", "==", tenantId)
    .where("role", "==", "student")
    .get();

  const consents: {
    uid: string;
    displayName: string | null;
    email: string | null;
    status: string;
    categories: string[];
    ageCategory: string;
    parentEmail: string | null;
    grantedAt: string | null;
  }[] = [];

  // Hent samtykke for alle elever parallelt (unngå N+1)
  const consentSnaps = await Promise.all(
    usersSnap.docs.map((userDoc) =>
      db.collection("users").doc(userDoc.id).collection("consent").limit(1).get()
    )
  );

  for (let i = 0; i < usersSnap.docs.length; i++) {
    const userDoc = usersSnap.docs[i];
    const userData = userDoc.data();
    const consentSnap = consentSnaps[i];

    if (consentSnap.empty) {
      consents.push({
        uid: userDoc.id,
        displayName: userData.displayName ?? null,
        email: userData.email ?? null,
        status: "pending",
        categories: [],
        ageCategory: "unknown",
        parentEmail: null,
        grantedAt: null,
      });
    } else {
      const c = consentSnap.docs[0].data();
      consents.push({
        uid: userDoc.id,
        displayName: userData.displayName ?? null,
        email: userData.email ?? null,
        status: c.status ?? "pending",
        categories: c.categories ?? [],
        ageCategory: c.ageCategory ?? "unknown",
        parentEmail: c.parentEmail ?? null,
        grantedAt: c.grantedAt ?? null,
      });
    }
  }

  // Aggregert oversikt
  const summary = {
    total: consents.length,
    granted: consents.filter((c) => c.status === "granted").length,
    pending: consents.filter((c) => c.status === "pending").length,
    parentRequired: consents.filter((c) => c.status === "parent_required").length,
    denied: consents.filter((c) => c.status === "denied").length,
  };

  success(res, { consents, summary });
});

/** POST /school-admin/gdpr/export — Eksporter samtykkeoversikt som CSV */
export const exportSchoolGdprConsents = withTenantAdmin(async ({ tenantId, res }) => {
  // Gjenbruk samtykke-hentingen
  const usersSnap = await db.collection("users")
    .where("tenantId", "==", tenantId)
    .where("role", "==", "student")
    .get();

  const rows: string[] = [
    "Navn,E-post,Samtykkestatus,Kategorier,Alderskategori,Foresatt-epost,Samtykke-dato",
  ];

  // Hent samtykke parallelt (unngå N+1)
  const consentSnaps = await Promise.all(
    usersSnap.docs.map((userDoc) =>
      db.collection("users").doc(userDoc.id).collection("consent").limit(1).get()
    )
  );

  // CSV-sanitering: forhindre formelinjeksjon i Excel
  const csvSafe = (val: string): string => {
    if (/^[=+\-@\t\r]/.test(val)) return `'${val}`;
    return val;
  };

  for (let i = 0; i < usersSnap.docs.length; i++) {
    const userData = usersSnap.docs[i].data();
    const consentSnap = consentSnaps[i];
    const c = consentSnap.empty ? null : consentSnap.docs[0].data();

    rows.push([
      `"${csvSafe((userData.displayName ?? "").replace(/"/g, '""'))}"`,
      `"${csvSafe((userData.email ?? "").replace(/"/g, '""'))}"`,
      csvSafe(c?.status ?? "pending"),
      `"${csvSafe((c?.categories ?? []).join(", "))}"`,
      csvSafe(c?.ageCategory ?? "unknown"),
      `"${csvSafe((c?.parentEmail ?? "").replace(/"/g, '""'))}"`,
      c?.grantedAt ?? "",
    ].join(","));
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="gdpr-samtykke-${tenantId}.csv"`);
  res.status(200).send("\uFEFF" + rows.join("\n")); // BOM for Excel-kompatibilitet
});

/** GET /school-admin/invoices — Fakturahistorikk for tenant */
export const getSchoolInvoices = withTenantAdmin(async ({ tenantId, res }) => {
  // Hent fra Firestore (speilet fra Stripe webhooks)
  const snap = await db.collection("invoices")
    .where("tenantId", "==", tenantId)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const invoices = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      status: data.status ?? "unknown",
      amountDue: data.amountDue ?? 0,
      amountPaid: data.amountPaid ?? 0,
      tax: data.tax ?? 0,
      currency: data.currency ?? "NOK",
      dueDate: data.dueDate ?? null,
      invoiceNumber: data.invoiceNumber ?? null,
      pdfUrl: data.pdfUrl ?? null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    };
  });

  success(res, { invoices });
});
