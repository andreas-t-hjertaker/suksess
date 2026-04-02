import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type { DocumentReference } from "firebase-admin/firestore";
import * as crypto from "crypto";
import Stripe from "stripe";
import { z } from "zod";
import { success, fail, withAuth, withAdmin, withValidation, rateLimit, validateCsrf, withRateLimit, withTenantAdmin, type RouteContext } from "./middleware";
import { sendEmail } from "./email";

admin.initializeApp();

const db = admin.firestore();

// Tillatte CORS-origins (produksjon + dev)
const ALLOWED_ORIGINS = [
  "https://suksess.no",
  "https://www.suksess.no",
  "https://suksess-842ed.web.app",
  "https://suksess-842ed.firebaseapp.com",
  /^http:\/\/localhost(:\d+)?$/,
];

// ============================================================
// Zod-skjemaer
// ============================================================

const createNoteSchema = z.object({
  title: z.string().min(1, "Tittel er påkrevd").max(200),
  content: z.string().max(10000).optional().default(""),
});

// ============================================================
// Rute-handlers
// ============================================================

/** GET / — API-info (offentlig) */
const getRoot = ({ res }: RouteContext) => {
  success(res, { message: "Suksess API", version: "1.0.0" });
};

/** GET /collections — List Firestore-samlinger (kun admin) */
const getCollections = withAdmin(async ({ res }) => {
  const collections = await db.listCollections();
  success(res, { collections: collections.map((c) => c.id) });
});

/** GET /me — Brukerinfo (krever auth) */
const getMe = withAuth(async ({ user, res }) => {
  success(res, {
    uid: user.uid,
    email: user.email,
    name: user.name,
    picture: user.picture,
  });
});

/** POST /notes — Opprett notat (krever auth + validering) */
const createNote = withValidation(createNoteSchema, async ({ user, data, res }) => {
  const note = await db.collection("notes").add({
    ...data,
    userId: user.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  success(res, { id: note.id, ...data }, 201);
});

/** GET /notes — Hent brukerens notater (krever auth) */
const getNotes = withAuth(async ({ user, res }) => {
  const snapshot = await db
    .collection("notes")
    .where("userId", "==", user.uid)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const notes = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

  success(res, notes);
});

// ============================================================
// Stripe-konfigurasjon
// ============================================================

/** Lazy Stripe-initialisering — unngår krasj når env-variabelen mangler (f.eks. i CI deploy-analyse) */
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY er ikke konfigurert");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

// ============================================================
// Stripe-handlers
// ============================================================

/** POST /stripe/checkout — Opprett Stripe Checkout-sesjon */
const createCheckout = withAuth(async ({ user, res, req }) => {
  const { priceId } = req.body as { priceId?: string };
  if (!priceId) {
    fail(res, "priceId er påkrevd");
    return;
  }

  // Hent eller opprett Stripe-kunde
  let customerId: string;
  const subDoc = await db.collection("subscriptions").doc(user.uid).get();

  if (subDoc.exists && subDoc.data()?.stripeCustomerId) {
    customerId = subDoc.data()!.stripeCustomerId;
  } else {
    const customer = await getStripe().customers.create({
      email: user.email ?? undefined,
      metadata: { firebaseUid: user.uid },
    });
    customerId = customer.id;
    await db.collection("subscriptions").doc(user.uid).set(
      { stripeCustomerId: customerId, status: "none" },
      { merge: true }
    );
  }

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${req.headers.origin || "https://suksess.no"}/dashboard/abonnement?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${req.headers.origin || "https://suksess.no"}/pricing`,
    metadata: { firebaseUid: user.uid },
  });

  success(res, { url: session.url });
});

/** POST /stripe/portal — Opprett Stripe kundeportal-sesjon */
const createPortal = withAuth(async ({ user, res, req }) => {
  const subDoc = await db.collection("subscriptions").doc(user.uid).get();
  const customerId = subDoc.data()?.stripeCustomerId;

  if (!customerId) {
    fail(res, "Ingen Stripe-kunde funnet", 404);
    return;
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${req.headers.origin || "https://suksess.no"}/dashboard/abonnement`,
  });

  success(res, { url: session.url });
});

/** POST /stripe/webhook — Stripe webhook-handler (offentlig, men verifisert) */
const handleWebhook = async ({ req, res }: RouteContext) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET er ikke konfigurert");
    fail(res, "Webhook-konfigurasjon mangler", 500);
    return;
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    fail(res, `Webhook-signatur ugyldig: ${err instanceof Error ? err.message : "ukjent feil"}`, 400);
    return;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const uid = session.metadata?.firebaseUid;
      if (uid && session.subscription) {
        const sub = await getStripe().subscriptions.retrieve(
          session.subscription as string,
          { expand: ["latest_invoice"] }
        );
        const invoice = sub.latest_invoice as Stripe.Invoice | null;
        const periodEnd = invoice?.period_end
          ? new Date(invoice.period_end * 1000)
          : null;
        await db.collection("subscriptions").doc(uid).set({
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: sub.id,
          stripePriceId: sub.items.data[0]?.price.id ?? null,
          status: sub.status,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        }, { merge: true });
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerSnap = await db.collection("subscriptions")
        .where("stripeCustomerId", "==", sub.customer as string)
        .limit(1).get();
      if (!customerSnap.empty) {
        // Beregn neste faktureringsperiode fra billing_cycle_anchor
        const periodEnd = sub.cancel_at
          ? new Date(sub.cancel_at * 1000)
          : new Date(sub.billing_cycle_anchor * 1000);
        await customerSnap.docs[0].ref.update({
          stripeSubscriptionId: sub.id,
          stripePriceId: sub.items.data[0]?.price.id ?? null,
          status: sub.status,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const snap = await db.collection("subscriptions")
        .where("stripeCustomerId", "==", sub.customer as string)
        .limit(1).get();
      if (!snap.empty) {
        await snap.docs[0].ref.update({
          status: "canceled",
          cancelAtPeriodEnd: false,
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const custSnap = await db.collection("subscriptions")
        .where("stripeCustomerId", "==", invoice.customer as string)
        .limit(1).get();
      if (!custSnap.empty) {
        await custSnap.docs[0].ref.update({ status: "past_due" });
      }
      break;
    }
  }

  success(res, { received: true });
};

// ============================================================
// Stripe B2B — skolelisenser og EHF/Peppol (#110)
// ============================================================

/** POST /stripe/b2b/customer — Opprett B2B-kunde med EHF/Peppol-metadata */
const createB2BCustomer = withAdmin(async ({ req, res }) => {
  const {
    organizationName, organizationNumber, glnNumber,
    contactEmail, contactName, address, tenantId, invoiceReference,
  } = req.body as {
    organizationName?: string; organizationNumber?: string; glnNumber?: string;
    contactEmail?: string; contactName?: string; tenantId?: string;
    invoiceReference?: string;
    address?: { line1: string; line2?: string; postalCode: string; city: string; country: string };
  };

  if (!organizationName || !organizationNumber || !contactEmail || !tenantId || !address) {
    fail(res, "organizationName, organizationNumber, contactEmail, tenantId og address er påkrevd");
    return;
  }

  // Valider organisasjonsnummer (9 siffer)
  const orgDigits = organizationNumber.replace(/\s/g, "");
  if (!/^\d{9}$/.test(orgDigits)) {
    fail(res, "Ugyldig organisasjonsnummer (må være 9 siffer)");
    return;
  }

  const customer = await getStripe().customers.create({
    name: organizationName,
    email: contactEmail,
    metadata: {
      tenantId,
      organizationNumber: orgDigits,
      glnNumber: glnNumber || "",
      invoiceReference: invoiceReference || "",
      contactName: contactName || "",
      customerType: "b2b_school",
      country: "NO",
    },
    address: {
      line1: address.line1,
      line2: address.line2 || "",
      postal_code: address.postalCode,
      city: address.city,
      country: "NO",
    },
    tax_exempt: "none", // Norsk MVA gjelder
    invoice_settings: {
      custom_fields: [
        { name: "Organisasjonsnr", value: orgDigits },
        ...(glnNumber ? [{ name: "GLN (Peppol)", value: glnNumber }] : []),
        ...(invoiceReference ? [{ name: "Deres ref", value: invoiceReference }] : []),
      ],
    },
  });

  // Oppdater tenant med Stripe-kunde
  await db.collection("tenants").doc(tenantId).update({
    stripeCustomerId: customer.id,
    organizationNumber: orgDigits,
    glnNumber: glnNumber || null,
    billingEmail: contactEmail,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  success(res, { customerId: customer.id, tenantId }, 201);
});

/** POST /stripe/b2b/subscription — Opprett skolelisens-abonnement */
const createB2BSubscription = withAdmin(async ({ req, res }) => {
  const { tenantId, planId, studentCount, invoiceReference } = req.body as {
    tenantId?: string; planId?: string; studentCount?: number; invoiceReference?: string;
  };

  if (!tenantId || !planId || !studentCount) {
    fail(res, "tenantId, planId og studentCount er påkrevd");
    return;
  }

  // Hent Stripe-kunde fra tenant
  const tenantDoc = await db.collection("tenants").doc(tenantId).get();
  if (!tenantDoc.exists || !tenantDoc.data()?.stripeCustomerId) {
    fail(res, "Tenant har ingen Stripe-kunde. Opprett kunde først.", 400);
    return;
  }

  const customerId = tenantDoc.data()!.stripeCustomerId as string;

  // Velg pris basert på plan
  const priceEnvMap: Record<string, string | undefined> = {
    school: process.env.STRIPE_PRICE_B2B_SCHOOL,
    municipality: process.env.STRIPE_PRICE_B2B_MUNICIPALITY,
  };

  const priceId = priceEnvMap[planId];
  if (!priceId) {
    fail(res, `Ugyldig plan-ID eller pris ikke konfigurert: ${planId}`);
    return;
  }

  const subscription = await getStripe().subscriptions.create({
    customer: customerId,
    items: [{ price: priceId, quantity: studentCount }],
    collection_method: "send_invoice",
    days_until_due: 30,
    metadata: {
      tenantId,
      planId,
      studentCount: String(studentCount),
      invoiceReference: invoiceReference || "",
    },
    payment_settings: {
      payment_method_types: ["card"],
    },
  });

  // Lagre abonnement-info på tenant
  await db.collection("tenants").doc(tenantId).update({
    subscriptionId: subscription.id,
    plan: planId,
    maxStudents: studentCount,
    subscriptionStatus: subscription.status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  success(res, {
    subscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodEnd: subscription.current_period_end,
  }, 201);
});

/** GET /stripe/b2b/invoices — Hent fakturaer for en tenant */
const getB2BInvoices = withAdmin(async ({ req, res }) => {
  const tenantId = req.query.tenantId as string;
  if (!tenantId) {
    fail(res, "tenantId er påkrevd");
    return;
  }

  const tenantDoc = await db.collection("tenants").doc(tenantId).get();
  const customerId = tenantDoc.data()?.stripeCustomerId as string | undefined;
  if (!customerId) {
    success(res, []);
    return;
  }

  const invoices = await getStripe().invoices.list({
    customer: customerId,
    limit: 24,
  });

  const mapped = invoices.data.map((inv) => ({
    id: inv.id,
    stripeInvoiceId: inv.id,
    tenantId,
    organizationNumber: tenantDoc.data()?.organizationNumber || "",
    status: inv.status || "draft",
    amountDue: inv.amount_due / 100,
    amountPaid: inv.amount_paid / 100,
    tax: (inv.tax || 0) / 100,
    currency: "NOK",
    dueDate: inv.due_date ? new Date(inv.due_date * 1000).toISOString() : null,
    invoiceNumber: inv.number || inv.id,
    pdfUrl: inv.invoice_pdf || null,
    ehfStatus: inv.metadata?.ehfStatus || "not_applicable",
    createdAt: new Date(inv.created * 1000).toISOString(),
  }));

  success(res, mapped);
});

// ============================================================
// API-nøkkel-handlers
// ============================================================

/** GET /api-keys — List brukerens API-nøkler */
const listApiKeys = withAuth(async ({ user, res }) => {
  const snapshot = await db.collection("apiKeys")
    .where("userId", "==", user.uid)
    .orderBy("createdAt", "desc")
    .get();

  const keys = snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      prefix: data.prefix,
      createdAt: data.createdAt?.toDate() ?? null,
      lastUsedAt: data.lastUsedAt?.toDate() ?? null,
      expiresAt: data.expiresAt?.toDate() ?? null,
      revoked: data.revoked,
    };
  });

  success(res, keys);
});

/** POST /api-keys — Opprett ny API-nøkkel */
const createApiKey = withAuth(async ({ user, req, res }) => {
  const { name } = req.body as { name?: string };
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    fail(res, "Navn er påkrevd");
    return;
  }

  // Generer nøkkel
  const rawKey = crypto.randomBytes(32).toString("hex");
  const fullKey = `sk_live_${rawKey}`;
  const hashedKey = crypto.createHash("sha256").update(fullKey).digest("hex");
  const prefix = fullKey.substring(0, 16);

  const docRef = await db.collection("apiKeys").add({
    name: name.trim(),
    prefix,
    hashedKey,
    userId: user.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastUsedAt: null,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    revoked: false,
  });

  success(res, {
    key: fullKey,
    apiKey: {
      id: docRef.id,
      name: name.trim(),
      prefix,
      createdAt: new Date(),
      lastUsedAt: null,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      revoked: false,
    },
  }, 201);
});

/** DELETE /api-keys/:id — Tilbakekall en API-nøkkel */
const revokeApiKey = withAuth(async ({ user, req, res }) => {
  // Hent ID fra siste del av stien: /api-keys/abc123
  const parts = req.path.split("/");
  const keyId = parts[parts.length - 1];

  if (!keyId) {
    fail(res, "Nøkkel-ID er påkrevd");
    return;
  }

  const keyDoc = await db.collection("apiKeys").doc(keyId).get();

  if (!keyDoc.exists) {
    fail(res, "API-nøkkel ikke funnet", 404);
    return;
  }

  // Sikre at nøkkelen tilhører brukeren
  if (keyDoc.data()?.userId !== user.uid) {
    fail(res, "Ikke autorisert", 403);
    return;
  }

  await keyDoc.ref.update({ revoked: true });
  success(res, { id: keyId, revoked: true });
});

// ============================================================
// Admin-handlers
// ============================================================

/** POST /admin/set-role — Sett rolle og tenant på en bruker */
const setAdminRole = withAdmin(async ({ req, res }) => {
  const { uid, role, tenantId, admin: isAdmin } = req.body as {
    uid?: string;
    role?: string;
    tenantId?: string;
    admin?: boolean;
  };

  if (!uid) {
    fail(res, "uid er påkrevd");
    return;
  }

  // Støtte for både nytt rolle-system og gammelt admin-bool
  const existingUser = await admin.auth().getUser(uid);
  const existingClaims = (existingUser.customClaims as Record<string, unknown>) || {};

  const newClaims: Record<string, unknown> = { ...existingClaims };

  if (role !== undefined) {
    const validRoles = ["student", "counselor", "admin", "superadmin"];
    if (!validRoles.includes(role)) {
      fail(res, `Ugyldig rolle. Tillatte verdier: ${validRoles.join(", ")}`);
      return;
    }
    newClaims.role = role;
    newClaims.admin = ["admin", "superadmin"].includes(role);
  } else if (isAdmin !== undefined) {
    // Bakoverkompatibel boolean-admin-flag
    newClaims.admin = !!isAdmin;
    newClaims.role = isAdmin ? "admin" : "student";
  }

  if (tenantId !== undefined) {
    newClaims.tenantId = tenantId || null;
  }

  await admin.auth().setCustomUserClaims(uid, newClaims);
  success(res, { uid, ...newClaims });
});

/** GET /admin/users — List alle brukere */
const listAdminUsers = withAdmin(async ({ req, res }) => {
  const pageToken = req.query.pageToken as string | undefined;
  const result = await admin.auth().listUsers(100, pageToken || undefined);

  const users = result.users.map((u) => ({
    uid: u.uid,
    email: u.email ?? null,
    displayName: u.displayName ?? null,
    photoURL: u.photoURL ?? null,
    disabled: u.disabled,
    creationTime: u.metadata.creationTime,
    lastSignInTime: u.metadata.lastSignInTime,
    customClaims: u.customClaims ?? {},
  }));

  success(res, { users, pageToken: result.pageToken ?? null });
});

/** GET /admin/users/:uid — Hent brukerdetaljer med abonnement og API-nøkler */
const getAdminUser = withAdmin(async ({ req, res }) => {
  const parts = req.path.split("/");
  const uid = parts[parts.length - 1];

  if (!uid) {
    fail(res, "uid er påkrevd");
    return;
  }

  try {
    const userRecord = await admin.auth().getUser(uid);
    const subDoc = await db.collection("subscriptions").doc(uid).get();
    const keysSnap = await db.collection("apiKeys")
      .where("userId", "==", uid)
      .get();

    success(res, {
      user: {
        uid: userRecord.uid,
        email: userRecord.email ?? null,
        displayName: userRecord.displayName ?? null,
        photoURL: userRecord.photoURL ?? null,
        disabled: userRecord.disabled,
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime,
        customClaims: userRecord.customClaims ?? {},
      },
      subscription: subDoc.exists ? subDoc.data() : null,
      apiKeyCount: keysSnap.size,
    });
  } catch {
    fail(res, "Bruker ikke funnet", 404);
  }
});

/** POST /admin/users/:uid/disable — Aktiver/deaktiver bruker */
const disableAdminUser = withAdmin(async ({ req, res }) => {
  const parts = req.path.split("/");
  // Sti: /admin/users/:uid/disable — uid er nest siste
  const uid = parts[parts.length - 2];
  const { disabled } = req.body as { disabled?: boolean };

  if (!uid) {
    fail(res, "uid er påkrevd");
    return;
  }

  await admin.auth().updateUser(uid, { disabled: !!disabled });
  success(res, { uid, disabled: !!disabled });
});

/** DELETE /admin/users/:uid — Slett bruker og all data (kun superadmin) */
const deleteAdminUser = withAdmin(async ({ user, req, res }) => {
  // Kun superadmin kan slette brukere
  const callerRecord = await admin.auth().getUser(user.uid);
  const callerRole = callerRecord.customClaims?.role;
  if (callerRole !== "superadmin") {
    fail(res, "Kun superadmin kan slette brukere", 403);
    return;
  }

  const parts = req.path.split("/");
  const uid = parts[parts.length - 1];

  if (!uid) {
    fail(res, "uid er påkrevd");
    return;
  }

  // Forhindre at man sletter seg selv
  if (uid === user.uid) {
    fail(res, "Du kan ikke slette din egen konto via admin", 400);
    return;
  }

  // Slett Suksess subcollections
  const userRef = db.collection("users").doc(uid);
  const subcollections = [
    "personalityProfile", "grades", "xp", "achievements",
    "notifications", "aiCache", "documents", "soknader",
  ];
  await Promise.all(subcollections.map((s) => deleteSubcollection(userRef, s)));

  // Slett Firestore toppnivå-data
  const batch = db.batch();
  batch.delete(userRef);
  batch.delete(db.collection("subscriptions").doc(uid));

  const keysSnap = await db.collection("apiKeys").where("userId", "==", uid).get();
  keysSnap.docs.forEach((d) => batch.delete(d.ref));

  const notesSnap = await db.collection("notes").where("userId", "==", uid).get();
  notesSnap.docs.forEach((d) => batch.delete(d.ref));

  await batch.commit();

  // Slett Firebase Auth-bruker
  await admin.auth().deleteUser(uid);

  success(res, { uid, deleted: true });
});

/** GET /admin/stats — Aggregerte statistikker */
const getAdminStats = withAdmin(async ({ res }) => {
  const [usersResult, subsSnap, keysSnap] = await Promise.all([
    admin.auth().listUsers(1000),
    db.collection("subscriptions").where("status", "==", "active").get(),
    db.collection("apiKeys").where("revoked", "==", false).get(),
  ]);

  success(res, {
    totalUsers: usersResult.users.length,
    activeSubscriptions: subsSnap.size,
    totalApiKeys: keysSnap.size,
  });
});

/** GET /admin/feature-flags — List alle feature flags (offentlig) */
const listFeatureFlags = async ({ res }: RouteContext) => {
  const snap = await db.collection("featureFlags").orderBy("createdAt", "desc").get();
  const flags = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
  success(res, flags);
};

/** POST /admin/feature-flags — Opprett ny feature flag */
const createFeatureFlag = withAdmin(async ({ req, res }) => {
  const { key, label, description, enabled, plans, tenantIds, excludedTenantIds, rolloutPercentage } = req.body as {
    key?: string; label?: string; description?: string; enabled?: boolean; plans?: string[];
    tenantIds?: string[]; excludedTenantIds?: string[]; rolloutPercentage?: number;
  };

  if (!key || !label) {
    fail(res, "key og label er påkrevd");
    return;
  }

  const docRef = await db.collection("featureFlags").add({
    key,
    label,
    description: description || "",
    enabled: !!enabled,
    plans: plans || [],
    tenantIds: tenantIds || [],
    excludedTenantIds: excludedTenantIds || [],
    rolloutPercentage: typeof rolloutPercentage === "number" ? Math.max(0, Math.min(100, rolloutPercentage)) : 100,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  success(res, { id: docRef.id, key, label }, 201);
});

/** PUT /admin/feature-flags/:id — Oppdater en feature flag */
const updateFeatureFlag = withAdmin(async ({ req, res }) => {
  const parts = req.path.split("/");
  const flagId = parts[parts.length - 1];

  if (!flagId) {
    fail(res, "Flag-ID er påkrevd");
    return;
  }

  const docRef = db.collection("featureFlags").doc(flagId);
  const doc = await docRef.get();
  if (!doc.exists) {
    fail(res, "Feature flag ikke funnet", 404);
    return;
  }

  const { key, label, description, enabled, plans, tenantIds, excludedTenantIds, rolloutPercentage } = req.body as {
    key?: string; label?: string; description?: string; enabled?: boolean; plans?: string[];
    tenantIds?: string[]; excludedTenantIds?: string[]; rolloutPercentage?: number;
  };

  const updates: Record<string, unknown> = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (key !== undefined) updates.key = key;
  if (label !== undefined) updates.label = label;
  if (description !== undefined) updates.description = description;
  if (enabled !== undefined) updates.enabled = enabled;
  if (plans !== undefined) updates.plans = plans;
  if (tenantIds !== undefined) updates.tenantIds = tenantIds;
  if (excludedTenantIds !== undefined) updates.excludedTenantIds = excludedTenantIds;
  if (rolloutPercentage !== undefined) updates.rolloutPercentage = Math.max(0, Math.min(100, rolloutPercentage));

  await docRef.update(updates);
  success(res, { id: flagId, ...updates });
});

// ============================================================
// E-post (#111)
// ============================================================

/** POST /email/send — Send transaksjonell e-post (krever auth) */
const sendEmailHandler = withAuth(async ({ req, res }) => {
  const { to, subject, html, text, replyTo } = req.body as {
    to?: { email: string; name?: string }[];
    subject?: string;
    html?: string;
    text?: string;
    replyTo?: string;
  };

  if (!to || !Array.isArray(to) || to.length === 0 || !subject || !html) {
    fail(res, "to, subject og html er påkrevd");
    return;
  }

  // Begrens antall mottakere per kall
  if (to.length > 50) {
    fail(res, "Maks 50 mottakere per sending");
    return;
  }

  try {
    const result = await sendEmail({ to, subject, html, text: text || "", replyTo });
    success(res, { messageId: result.messageId, provider: result.provider });
  } catch (err) {
    console.error("[email] Sending feilet:", err);
    fail(res, "E-postsending feilet", 500);
  }
});

/** POST /email/invite — Send skoleinvitasjon (kun admin) */
const sendInviteEmail = withAdmin(async ({ req, res }) => {
  const { emails, schoolName, tenantId } = req.body as {
    emails?: string[];
    schoolName?: string;
    tenantId?: string;
  };

  if (!emails || !Array.isArray(emails) || emails.length === 0 || !schoolName || !tenantId) {
    fail(res, "emails, schoolName og tenantId er påkrevd");
    return;
  }

  if (emails.length > 200) {
    fail(res, "Maks 200 invitasjoner per kall");
    return;
  }

  const baseUrl = process.env.APP_URL || "https://suksess.no";
  const results: { email: string; success: boolean; error?: string }[] = [];

  for (const email of emails) {
    const inviteToken = crypto.randomBytes(16).toString("hex");
    const inviteUrl = `${baseUrl}/login?invite=${inviteToken}&tenant=${tenantId}`;

    // Lagre invitasjon i Firestore
    await db.collection("invites").add({
      email,
      tenantId,
      token: inviteToken,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dager
    });

    try {
      await sendEmail({
        to: [{ email }],
        subject: `Invitasjon fra ${schoolName} — Suksess`,
        html: `<!DOCTYPE html>
<html lang="nb"><head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f4f4f5;padding:32px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
<div style="background:#18181b;padding:24px;text-align:center"><span style="color:#fff;font-size:20px;font-weight:700">Suksess</span></div>
<div style="padding:32px">
<h1 style="font-size:22px">Du er invitert! 🏫</h1>
<p>${schoolName} har gitt deg tilgang til Suksess — en AI-drevet karriereveiledningsplattform.</p>
<a href="${inviteUrl}" style="display:inline-block;background:#18181b;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Aksepter invitasjon</a>
<p style="font-size:12px;color:#71717a;margin-top:24px">Invitasjonen utløper om 7 dager.</p>
</div></div></body></html>`,
        text: `${schoolName} har invitert deg til Suksess!\n\nAksepter: ${inviteUrl}`,
      });
      results.push({ email, success: true });
    } catch (err) {
      results.push({ email, success: false, error: err instanceof Error ? err.message : "Ukjent feil" });
    }
  }

  success(res, { sent: results.filter((r) => r.success).length, failed: results.filter((r) => !r.success).length, results });
});

// ============================================================
// Konto-sletting
// ============================================================

/** Hjelpefunksjon: slett en hel subcollection */
async function deleteSubcollection(parentRef: DocumentReference, subcollectionName: string) {
  const snap = await parentRef.collection(subcollectionName).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

/** DELETE /account — Slett alt brukerdata fra Firestore (GDPR-rett til sletting) */
const deleteAccount = withAuth(async ({ user, res }) => {
  const uid = user.uid;
  const userRef = db.collection("users").doc(uid);

  // Slett subcollections under users/{uid}
  const subcollections = [
    "personalityProfile",
    "grades",
    "xp",
    "achievements",
    "notifications",
    "aiCache",
    "documents",
    "soknader",
  ];

  await Promise.all(subcollections.map((s) => deleteSubcollection(userRef, s)));

  // Slett bruker-dokumentet selv
  const batch = db.batch();
  batch.delete(userRef);

  // Slett abonnement og API-nøkler
  batch.delete(db.collection("subscriptions").doc(uid));

  const keysSnap = await db.collection("apiKeys").where("userId", "==", uid).get();
  keysSnap.docs.forEach((d) => batch.delete(d.ref));

  const notesSnap = await db.collection("notes").where("userId", "==", uid).get();
  notesSnap.docs.forEach((d) => batch.delete(d.ref));

  await batch.commit();
  success(res, { deleted: true });
});

// ============================================================
// XP-system
// ============================================================

/** Gyldige XP-kildetyper med maksimalt antall poeng per handling */
const XP_SOURCES: Record<string, number> = {
  profile_complete: 50,
  grade_added: 10,
  daily_login: 5,
  career_explored: 5,
  test_taken: 30,
  cv_downloaded: 20,
  job_applied: 25,
  coach_session: 15,
};

/** POST /xp/award — Tildel XP server-side (forhindrer klient-manipulasjon) */
const awardXp = withAuth(async ({ user, req, res }) => {
  const { source, amount } = req.body as { source?: string; amount?: number };

  if (!source || !(source in XP_SOURCES)) {
    fail(res, `Ugyldig XP-kilde. Tillatte: ${Object.keys(XP_SOURCES).join(", ")}`);
    return;
  }

  const maxXp = XP_SOURCES[source];
  const xpToAward = Math.min(Math.max(1, Number(amount) || maxXp), maxXp);

  const userRef = db.collection("users").doc(user.uid);
  // Bruker samme sti som klient-hooken: users/{uid}/gamification/xp
  const xpRef = userRef.collection("gamification").doc("xp");

  const xpDoc = await xpRef.get();
  const currentXp = (xpDoc.data()?.totalXp as number) || 0;
  const newTotal = currentXp + xpToAward;

  await xpRef.set({
    totalXp: newTotal,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  success(res, { awarded: xpToAward, total: newTotal });
});

/** GET /xp — Hent brukerens XP-status */
const getXp = withAuth(async ({ user, res }) => {
  const xpRef = db.collection("users").doc(user.uid).collection("gamification").doc("xp");
  const snap = await xpRef.get();

  success(res, {
    totalXp: (snap.data()?.totalXp as number) || 0,
    streak: (snap.data()?.streak as number) || 0,
    lastUpdated: snap.data()?.updatedAt ?? null,
  });
});

// ============================================================
// Foresatt / samtykke (#106)
// ============================================================

/** POST /email/parent-consent — Send samtykkeforespørsel til foresatt (krever auth) */
const sendParentConsentEmail = withAuth(async ({ user, req, res }) => {
  const { parentEmail, studentName } = req.body as {
    parentEmail?: string;
    studentName?: string;
  };

  if (!parentEmail || !studentName) {
    fail(res, "parentEmail og studentName er påkrevd");
    return;
  }

  // Generer unik token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dager

  // Lagre token i Firestore
  await db.collection("parentConsentTokens").doc(token).set({
    studentUid: user.uid,
    parentEmail,
    token,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    used: false,
  });

  // Bygg samtykke-URL
  const baseUrl = process.env.APP_URL || "https://suksess.no";
  const consentUrl = `${baseUrl}/samtykke-bekreftelse?token=${token}`;

  try {
    await sendEmail({
      to: [{ email: parentEmail }],
      subject: "Samtykke påkrevd — Suksess karriereveiledning",
      html: `<p>${studentName} har opprettet en konto på Suksess. Siden eleven er under 16 år, krever GDPR samtykke fra foresatte.</p><p><a href="${consentUrl}">Godkjenn samtykke</a></p><p>Lenken er gyldig i 7 dager.</p>`,
      text: `${studentName} har opprettet en konto på Suksess. Godkjenn samtykke: ${consentUrl} (gyldig i 7 dager)`,
    });
    success(res, { sent: true });
  } catch (err) {
    console.error("[parent-consent] E-post feilet:", err);
    fail(res, "E-postsending feilet", 500);
  }
});

/** POST /parent/unlink — Fjern foresatt-kobling (krever auth) */
const unlinkParent = withAuth(async ({ user, req, res }) => {
  const { studentUid } = req.body as { studentUid?: string };

  if (!studentUid) {
    fail(res, "studentUid er påkrevd");
    return;
  }

  const linkId = `${user.uid}_${studentUid}`;
  const linkRef = db.collection("parentLinks").doc(linkId);
  const linkDoc = await linkRef.get();

  if (!linkDoc.exists) {
    fail(res, "Kobling ikke funnet", 404);
    return;
  }

  // Sett status til revoked
  await linkRef.update({
    status: "revoked",
    revokedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Logg i consentAudit
  await db.collection("consentAudit").add({
    type: "link_removed",
    parentUid: user.uid,
    studentUid,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    source: "server",
  });

  success(res, { unlinked: true });
});

// ============================================================
// School-admin endepunkter (#134)
// ============================================================

/** GET /school-admin/users — List brukere i tenant */
const listSchoolUsers = withTenantAdmin(async ({ tenantId, req, res }) => {
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
const setSchoolUserRole = withTenantAdmin(async ({ tenantId, req, res }) => {
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

  // Oppdater Firestore
  await db.collection("users").doc(uid).update({ role });

  // Oppdater Firebase Auth custom claims
  const currentUser = await admin.auth().getUser(uid);
  const currentClaims = currentUser.customClaims || {};
  await admin.auth().setCustomUserClaims(uid, { ...currentClaims, role });

  success(res, { uid, role });
});

/** POST /school-admin/users/:uid/disable — Deaktiver/aktiver bruker i tenant */
const disableSchoolUser = withTenantAdmin(async ({ tenantId, req, res }) => {
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

  success(res, { uid, disabled: !!disabled });
});

/** DELETE /school-admin/users/:uid — Slett brukerdata (GDPR Art. 17) innen tenant */
const deleteSchoolUser = withTenantAdmin(async ({ user, tenantId, req, res }) => {
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
const bulkImportSchoolUsers = withTenantAdmin(async ({ tenantId, req, res }) => {
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
const getSchoolStats = withTenantAdmin(async ({ tenantId, res }) => {
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
const getSchoolGdprConsents = withTenantAdmin(async ({ tenantId, res }) => {
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

  // Hent samtykke for hver elev
  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data();
    const consentSnap = await db.collection("users").doc(userDoc.id)
      .collection("consent").limit(1).get();

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
const exportSchoolGdprConsents = withTenantAdmin(async ({ tenantId, res }) => {
  // Gjenbruk samtykke-hentingen
  const usersSnap = await db.collection("users")
    .where("tenantId", "==", tenantId)
    .where("role", "==", "student")
    .get();

  const rows: string[] = [
    "Navn,E-post,Samtykkestatus,Kategorier,Alderskategori,Foresatt-epost,Samtykke-dato",
  ];

  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data();
    const consentSnap = await db.collection("users").doc(userDoc.id)
      .collection("consent").limit(1).get();

    const c = consentSnap.empty ? null : consentSnap.docs[0].data();

    rows.push([
      `"${(userData.displayName ?? "").replace(/"/g, '""')}"`,
      userData.email ?? "",
      c?.status ?? "pending",
      `"${(c?.categories ?? []).join(", ")}"`,
      c?.ageCategory ?? "unknown",
      c?.parentEmail ?? "",
      c?.grantedAt ?? "",
    ].join(","));
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="gdpr-samtykke-${tenantId}.csv"`);
  res.status(200).send("\uFEFF" + rows.join("\n")); // BOM for Excel-kompatibilitet
});

/** GET /school-admin/invoices — Fakturahistorikk for tenant */
const getSchoolInvoices = withTenantAdmin(async ({ tenantId, res }) => {
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

// ============================================================
// Ruter — enkel stibasert ruting
// ============================================================

type Route = {
  method: string;
  path: string;
  handler: (ctx: RouteContext) => Promise<void> | void;
};

// Rate limiter-instans
const apiRateLimit = rateLimit(100, 60_000);

const routes: Route[] = [
  { method: "GET", path: "/", handler: getRoot },
  { method: "GET", path: "/collections", handler: getCollections },
  { method: "GET", path: "/me", handler: getMe },
  { method: "POST", path: "/notes", handler: createNote },
  { method: "GET", path: "/notes", handler: getNotes },
  // Stripe
  { method: "POST", path: "/stripe/checkout", handler: createCheckout },
  { method: "POST", path: "/stripe/portal", handler: createPortal },
  { method: "POST", path: "/stripe/webhook", handler: handleWebhook },
  // Stripe B2B
  { method: "POST", path: "/stripe/b2b/customer", handler: createB2BCustomer },
  { method: "POST", path: "/stripe/b2b/subscription", handler: createB2BSubscription },
  { method: "GET", path: "/stripe/b2b/invoices", handler: getB2BInvoices },
  // API-nøkler
  { method: "GET", path: "/api-keys", handler: listApiKeys },
  { method: "POST", path: "/api-keys", handler: createApiKey },
  // DELETE /api-keys/:id håndteres med startsWith-matching under
  // Admin
  { method: "POST", path: "/admin/set-role", handler: setAdminRole },
  { method: "GET", path: "/admin/users", handler: listAdminUsers },
  { method: "GET", path: "/admin/stats", handler: getAdminStats },
  { method: "GET", path: "/admin/feature-flags", handler: listFeatureFlags },
  { method: "POST", path: "/admin/feature-flags", handler: createFeatureFlag },
  // GET /admin/users/:uid, POST /admin/users/:uid/disable, DELETE /admin/users/:uid,
  // PUT /admin/feature-flags/:id — håndteres med startsWith-matching under
  // E-post
  { method: "POST", path: "/email/send", handler: sendEmailHandler },
  { method: "POST", path: "/email/invite", handler: sendInviteEmail },
  // Foresatt (#106)
  { method: "POST", path: "/email/parent-consent", handler: sendParentConsentEmail },
  { method: "POST", path: "/parent/unlink", handler: unlinkParent },
  // GET /consent/verify/:token — håndteres med startsWith-matching under
  // School-admin (#134)
  { method: "GET", path: "/school-admin/users", handler: listSchoolUsers },
  { method: "GET", path: "/school-admin/stats", handler: getSchoolStats },
  { method: "GET", path: "/school-admin/gdpr/consents", handler: getSchoolGdprConsents },
  { method: "POST", path: "/school-admin/gdpr/export", handler: exportSchoolGdprConsents },
  { method: "POST", path: "/school-admin/users/bulk-import", handler: bulkImportSchoolUsers },
  { method: "GET", path: "/school-admin/invoices", handler: getSchoolInvoices },
  // POST /school-admin/users/:uid/role, /disable, DELETE /school-admin/users/:uid
  // — håndteres med startsWith-matching under
  // Konto
  { method: "DELETE", path: "/account", handler: deleteAccount },
  // XP
  { method: "POST", path: "/xp/award", handler: awardXp },
  { method: "GET", path: "/xp", handler: getXp },
];

// ============================================================
// HTTP Functions
// ============================================================

/**
 * Health check / API-status
 */
export const health = onRequest(
  { region: "europe-west1", cors: ALLOWED_ORIGINS },
  async (_req, res) => {
    const checks: Record<string, "connected" | "error"> = {
      firestore: "error",
      storage: "error",
      functions: "connected",
    };

    // Ekte Firestore-sjekk: les featureFlags-samlingen
    try {
      const snap = await db.collection("featureFlags").limit(1).get();
      checks.firestore = snap !== undefined ? "connected" : "error";
    } catch {
      checks.firestore = "error";
    }

    // Ekte Storage-sjekk: sjekk at bucket eksisterer
    try {
      const bucket = admin.storage().bucket();
      const [exists] = await bucket.exists();
      checks.storage = exists ? "connected" : "error";
    } catch {
      checks.storage = "error";
    }

    const allOk = Object.values(checks).every((v) => v === "connected");

    res.json({
      status: allOk ? "ok" : "degraded",
      project: "suksess-842ed",
      timestamp: new Date().toISOString(),
      services: checks,
    });
  }
);

/**
 * Hoved-API med stibasert ruting og middleware
 */
export const api = onRequest(
  { region: "europe-west1", cors: ALLOWED_ORIGINS, invoker: "public" },
  async (req, res) => {
    // Rate limiting
    if (!apiRateLimit({ req, res })) return;

    // CSRF-validering på muterende forespørsler (#139)
    if (!validateCsrf({ req, res })) return;

    // Eksakt sti-matching
    const route = routes.find(
      (r) => r.method === req.method && r.path === req.path
    );

    if (route) {
      await route.handler({ req, res });
      return;
    }

    // Sti-parameter-matching: DELETE /api-keys/:id
    if (req.method === "DELETE" && req.path.startsWith("/api-keys/")) {
      await revokeApiKey({ req, res });
      return;
    }

    // Admin bruker-ruter: GET/DELETE /admin/users/:uid, POST /admin/users/:uid/disable
    if (req.path.startsWith("/admin/users/")) {
      if (req.method === "GET" && !req.path.endsWith("/disable")) {
        await getAdminUser({ req, res });
        return;
      }
      if (req.method === "POST" && req.path.endsWith("/disable")) {
        await disableAdminUser({ req, res });
        return;
      }
      if (req.method === "DELETE") {
        await deleteAdminUser({ req, res });
        return;
      }
    }

    // Samtykke-verifisering: GET /consent/verify/:token (#106)
    if (req.method === "GET" && req.path.startsWith("/consent/verify/")) {
      const token = req.path.split("/consent/verify/")[1];
      if (!token) {
        fail(res, "Token mangler", 400);
        return;
      }

      const tokenRef = db.collection("parentConsentTokens").doc(token);
      const tokenDoc = await tokenRef.get();

      if (!tokenDoc.exists) {
        fail(res, "Ugyldig token", 404);
        return;
      }

      const tokenData = tokenDoc.data()!;

      // Sjekk om allerede brukt
      if (tokenData.used) {
        fail(res, "Token er allerede brukt", 400);
        return;
      }

      // Sjekk utløp
      const expiresAt = tokenData.expiresAt?.toDate?.() || tokenData.expiresAt;
      if (new Date() > new Date(expiresAt)) {
        res.status(410).json({ error: "Token har utløpt" });
        return;
      }

      // Godkjenn samtykke
      const studentUid = tokenData.studentUid;

      await db.doc(`users/${studentUid}/consent/parental`).set({
        parentalConsentGiven: true,
        parentEmail: tokenData.parentEmail,
        consentedAt: admin.firestore.FieldValue.serverTimestamp(),
        token,
      });

      // Marker token som brukt
      await tokenRef.update({ used: true, usedAt: admin.firestore.FieldValue.serverTimestamp() });

      // Logg i consentAudit
      await db.collection("consentAudit").add({
        type: "consent_given",
        parentUid: tokenData.parentEmail,
        studentUid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        source: "server",
        metadata: { method: "email_link" },
      });

      // Hent elevnavn for respons
      const studentDoc = await db.doc(`users/${studentUid}`).get();
      const studentName = studentDoc.data()?.displayName || null;

      res.json({ success: true, studentName });
      return;
    }

    // Admin feature-flag-ruter: PUT /admin/feature-flags/:id
    if (req.method === "PUT" && req.path.startsWith("/admin/feature-flags/")) {
      await updateFeatureFlag({ req, res });
      return;
    }

    // School-admin bruker-ruter: POST /school-admin/users/:uid/role, /disable, DELETE /school-admin/users/:uid
    if (req.path.startsWith("/school-admin/users/") && req.path !== "/school-admin/users/bulk-import") {
      if (req.method === "POST" && req.path.endsWith("/role")) {
        await setSchoolUserRole({ req, res });
        return;
      }
      if (req.method === "POST" && req.path.endsWith("/disable")) {
        await disableSchoolUser({ req, res });
        return;
      }
      if (req.method === "DELETE") {
        await deleteSchoolUser({ req, res });
        return;
      }
    }

    fail(res, "Ikke funnet", 404);
  }
);
