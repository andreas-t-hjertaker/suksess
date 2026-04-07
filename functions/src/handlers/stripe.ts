import * as admin from "firebase-admin";
import Stripe from "stripe";
import { success, fail, withAuth, withAdmin, type RouteContext } from "../middleware";
import { processStripeInvoiceForEhf, getEhfStatus, retryEhfDelivery } from "../ehf";

const db = admin.firestore();

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
export const createCheckout = withAuth(async ({ user, res, req }) => {
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
export const createPortal = withAuth(async ({ user, res, req }) => {
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
export const handleWebhook = async ({ req, res }: RouteContext) => {
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

    case "invoice.finalized": {
      const invoice = event.data.object as Stripe.Invoice;
      // Hent kundemetadata for B2B-sjekk
      const customer = await getStripe().customers.retrieve(invoice.customer as string);
      if (customer && !customer.deleted) {
        const custMeta = customer.metadata || {};
        // Bare prosesser B2B-kunder med organisasjonsnummer
        if (custMeta.customerType === "b2b_school" && custMeta.organizationNumber) {
          try {
            const ehfResult = await processStripeInvoiceForEhf(
              {
                id: invoice.id,
                number: invoice.number,
                created: invoice.created,
                due_date: invoice.due_date,
                amount_due: invoice.amount_due,
                tax: (invoice.total_taxes ?? []).reduce((sum, t) => sum + (t.amount ?? 0), 0),
                customer: invoice.customer as string,
                metadata: { ...invoice.metadata, ...custMeta },
                lines: invoice.lines,
                period_start: invoice.period_start,
                period_end: invoice.period_end,
              },
              { invoices: getStripe().invoices }
            );
            console.log(`[EHF] Faktura ${invoice.id}: ${ehfResult.ehfStatus}`);
          } catch (err) {
            console.error(`[EHF] Feil ved EHF-generering for ${invoice.id}:`, err);
          }
        }
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
export const createB2BCustomer = withAdmin(async ({ req, res }) => {
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
export const createB2BSubscription = withAdmin(async ({ req, res }) => {
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
    currentPeriodEnd: subscription.items.data[0]?.current_period_end ?? null,
  }, 201);
});

/** GET /stripe/b2b/invoices — Hent fakturaer for en tenant */
export const getB2BInvoices = withAdmin(async ({ req, res }) => {
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
    tax: ((inv.total_taxes ?? []).reduce((sum, t) => sum + (t.amount ?? 0), 0)) / 100,
    currency: "NOK",
    dueDate: inv.due_date ? new Date(inv.due_date * 1000).toISOString() : null,
    invoiceNumber: inv.number || inv.id,
    pdfUrl: inv.invoice_pdf || null,
    ehfStatus: inv.metadata?.ehfStatus || "not_applicable",
    createdAt: new Date(inv.created * 1000).toISOString(),
  }));

  success(res, mapped);
});

/** GET /stripe/b2b/ehf-status — Hent EHF-leveringsstatus for en faktura (#110) */
export const getEhfStatusHandler = withAdmin(async ({ req, res }) => {
  const invoiceId = req.query.invoiceId as string;
  if (!invoiceId) {
    fail(res, "invoiceId er påkrevd");
    return;
  }

  const status = await getEhfStatus(invoiceId);
  if (!status) {
    fail(res, "EHF-faktura ikke funnet", 404);
    return;
  }

  success(res, status);
});

/** POST /stripe/b2b/ehf-retry — Prøv å sende en feilet EHF-faktura på nytt (#110) */
export const retryEhfHandler = withAdmin(async ({ req, res }) => {
  const { invoiceId } = req.body as { invoiceId?: string };
  if (!invoiceId) {
    fail(res, "invoiceId er påkrevd");
    return;
  }

  const result = await retryEhfDelivery(invoiceId);
  success(res, result);
});
