/**
 * EHF/Peppol Cloud Functions-modul (#110).
 *
 * Server-side EHF-generering og Peppol-sending for B2B-fakturaer.
 * Trigges av Stripe webhook ved invoice.finalized for B2B-kunder.
 */

import * as admin from "firebase-admin";

function getDb() {
  return admin.firestore();
}

// ---------------------------------------------------------------------------
// XML-generering (UBL 2.1 / Peppol BIS Billing 3.0)
// ---------------------------------------------------------------------------

function escXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function amt(n: number): string {
  return n.toFixed(2);
}

type EhfLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxPercent: number;
};

type EhfInvoiceParams = {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  periodStart?: string;
  periodEnd?: string;
  sellerName: string;
  sellerOrgNr: string;
  sellerVatNr: string;
  sellerAddress: { street: string; city: string; postalCode: string };
  sellerEmail: string;
  sellerPhone?: string;
  buyerName: string;
  buyerOrgNr: string;
  buyerGln?: string;
  buyerAddress: { street: string; city: string; postalCode: string };
  buyerEmail: string;
  buyerReference: string;
  lines: EhfLineItem[];
  bankAccount?: string;
  bankIban?: string;
  bankBic?: string;
  stripeInvoiceId?: string;
  note?: string;
};

function generateEhfXml(p: EhfInvoiceParams): string {
  const lineTotal = p.lines.reduce((s, l) => s + l.amount, 0);
  const taxTotal = p.lines.reduce((s, l) => s + l.amount * (l.taxPercent / 100), 0);
  const payableAmount = lineTotal + taxTotal;

  const buyerEndpointId = p.buyerGln || p.buyerOrgNr;
  const buyerEndpointScheme = p.buyerGln ? "0088" : "0192";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${escXml(p.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${escXml(p.issueDate)}</cbc:IssueDate>
  <cbc:DueDate>${escXml(p.dueDate)}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>NOK</cbc:DocumentCurrencyCode>${p.note ? `
  <cbc:Note>${escXml(p.note)}</cbc:Note>` : ""}
  <cbc:BuyerReference>${escXml(p.buyerReference)}</cbc:BuyerReference>${p.stripeInvoiceId ? `
  <cac:OrderReference>
    <cbc:ID>${escXml(p.stripeInvoiceId)}</cbc:ID>
  </cac:OrderReference>` : ""}${p.periodStart && p.periodEnd ? `
  <cac:InvoicePeriod>
    <cbc:StartDate>${escXml(p.periodStart)}</cbc:StartDate>
    <cbc:EndDate>${escXml(p.periodEnd)}</cbc:EndDate>
  </cac:InvoicePeriod>` : ""}
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:EndpointID schemeID="0192">${escXml(p.sellerOrgNr)}</cbc:EndpointID>
      <cac:PartyIdentification><cbc:ID schemeID="0192">${escXml(p.sellerOrgNr)}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${escXml(p.sellerName)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escXml(p.sellerAddress.street)}</cbc:StreetName>
        <cbc:CityName>${escXml(p.sellerAddress.city)}</cbc:CityName>
        <cbc:PostalZone>${escXml(p.sellerAddress.postalCode)}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>NO</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escXml(p.sellerVatNr)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escXml(p.sellerName)}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="0192">${escXml(p.sellerOrgNr)}</cbc:CompanyID>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:ElectronicMail>${escXml(p.sellerEmail)}</cbc:ElectronicMail>${p.sellerPhone ? `
        <cbc:Telephone>${escXml(p.sellerPhone)}</cbc:Telephone>` : ""}
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cbc:EndpointID schemeID="${buyerEndpointScheme}">${escXml(buyerEndpointId)}</cbc:EndpointID>
      <cac:PartyIdentification><cbc:ID schemeID="0192">${escXml(p.buyerOrgNr)}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${escXml(p.buyerName)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escXml(p.buyerAddress.street)}</cbc:StreetName>
        <cbc:CityName>${escXml(p.buyerAddress.city)}</cbc:CityName>
        <cbc:PostalZone>${escXml(p.buyerAddress.postalCode)}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>NO</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escXml(p.buyerName)}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="0192">${escXml(p.buyerOrgNr)}</cbc:CompanyID>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:ElectronicMail>${escXml(p.buyerEmail)}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>
    <cbc:PaymentID>${escXml(p.invoiceNumber)}</cbc:PaymentID>${p.bankIban ? `
    <cac:PayeeFinancialAccount>
      <cbc:ID>${escXml(p.bankIban)}</cbc:ID>${p.bankBic ? `
      <cac:FinancialInstitutionBranch><cbc:ID>${escXml(p.bankBic)}</cbc:ID></cac:FinancialInstitutionBranch>` : ""}
    </cac:PayeeFinancialAccount>` : p.bankAccount ? `
    <cac:PayeeFinancialAccount>
      <cbc:ID>${escXml(p.bankAccount)}</cbc:ID>
    </cac:PayeeFinancialAccount>` : ""}
  </cac:PaymentMeans>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="NOK">${amt(taxTotal)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="NOK">${amt(lineTotal)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="NOK">${amt(taxTotal)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>25.00</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="NOK">${amt(lineTotal)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="NOK">${amt(lineTotal)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="NOK">${amt(payableAmount)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="NOK">${amt(payableAmount)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${p.lines.map((l) => `  <cac:InvoiceLine>
    <cbc:ID>${escXml(l.id)}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="EA">${l.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="NOK">${amt(l.amount)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${escXml(l.description)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${amt(l.taxPercent)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="NOK">${amt(l.unitPrice)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`).join("\n")}
</Invoice>`;
}

// ---------------------------------------------------------------------------
// Peppol-sending
// ---------------------------------------------------------------------------

type PeppolResult = {
  success: boolean;
  method: "peppol" | "email" | "stored";
  messageId?: string;
  error?: string;
};

async function sendViaPeppolAP(xml: string, buyerEndpoint: string): Promise<PeppolResult> {
  const apUrl = process.env.PEPPOL_AP_URL;
  const apKey = process.env.PEPPOL_AP_KEY;
  const senderId = process.env.PEPPOL_SENDER_ID;

  if (!apUrl || !apKey || !senderId) {
    return { success: false, method: "peppol", error: "Peppol AP ikke konfigurert" };
  }

  const docType = "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2::Invoice##urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0::2.1";
  const processId = "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0";

  const response = await fetch(`${apUrl}/api/v1/outbox/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/xml",
      "Authorization": `Bearer ${apKey}`,
      "X-Sender-Id": senderId,
      "X-Receiver-Id": buyerEndpoint,
      "X-Document-Type": docType,
      "X-Process-Id": processId,
    },
    body: xml,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Ukjent feil");
    return { success: false, method: "peppol", error: `AP svarte ${response.status}: ${errorText}` };
  }

  const result = await response.json().catch(() => ({})) as { messageId?: string };
  return { success: true, method: "peppol", messageId: result.messageId };
}

// ---------------------------------------------------------------------------
// Hoved-eksport: prosesser Stripe-faktura til EHF
// ---------------------------------------------------------------------------

/** Selger-info for KETL */
const SELLER = {
  name: "KETL",
  orgNr: process.env.KETL_ORG_NUMBER || "933054880",
  vatNr: `NO${process.env.KETL_ORG_NUMBER || "933054880"}MVA`,
  address: { street: "Storgata 1", city: "Oslo", postalCode: "0155" },
  email: "faktura@suksess.no",
  phone: "+47 400 00 000",
  bankAccount: process.env.KETL_BANK_ACCOUNT,
  bankIban: process.env.KETL_BANK_IBAN,
  bankBic: process.env.KETL_BANK_BIC,
};

/**
 * Prosesser en Stripe-faktura til EHF og send via Peppol.
 * Kalles fra webhook-handler ved invoice.finalized for B2B-kunder.
 *
 * Flyt:
 * 1. Sjekk at kunden er B2B (har organizationNumber i metadata)
 * 2. Generer EHF XML (Peppol BIS 3.0)
 * 3. Lagre XML i Firestore (ehfInvoices/{invoiceId})
 * 4. Send via Peppol AP (med e-post fallback)
 * 5. Oppdater ehfStatus i Firestore og Stripe
 */
export async function processStripeInvoiceForEhf(
  stripeInvoice: {
    id: string;
    number: string | null;
    created: number;
    due_date: number | null;
    amount_due: number;
    tax: number | null;
    customer: string;
    metadata: Record<string, string>;
    lines: { data: Array<{ description: string | null; quantity: number | null; amount: number; price?: { unit_amount: number | null } }> };
    period_start?: number;
    period_end?: number;
  },
  stripe: { invoices: { update: (id: string, params: { metadata: Record<string, string> }) => Promise<unknown> } }
): Promise<{ ehfStatus: string; method?: string; error?: string }> {
  const meta = stripeInvoice.metadata || {};

  // Sjekk om dette er en B2B-kunde
  if (meta.customerType !== "b2b_school" || !meta.organizationNumber) {
    return { ehfStatus: "not_applicable" };
  }

  const tenantId = meta.tenantId;
  if (!tenantId) {
    return { ehfStatus: "not_applicable" };
  }

  // Hent tenant-data for adresse
  const tenantDoc = await getDb().collection("tenants").doc(tenantId).get();
  const tenantData = tenantDoc.data() || {};

  const invoiceNumber = stripeInvoice.number || `INV-${stripeInvoice.id.slice(-8)}`;
  const formatDate = (ts: number) => new Date(ts * 1000).toISOString().split("T")[0];

  // Generer EHF XML
  const xml = generateEhfXml({
    invoiceNumber,
    issueDate: formatDate(stripeInvoice.created),
    dueDate: stripeInvoice.due_date
      ? formatDate(stripeInvoice.due_date)
      : formatDate(stripeInvoice.created + 30 * 86400),
    periodStart: stripeInvoice.period_start ? formatDate(stripeInvoice.period_start) : undefined,
    periodEnd: stripeInvoice.period_end ? formatDate(stripeInvoice.period_end) : undefined,
    sellerName: SELLER.name,
    sellerOrgNr: SELLER.orgNr,
    sellerVatNr: SELLER.vatNr,
    sellerAddress: SELLER.address,
    sellerEmail: SELLER.email,
    sellerPhone: SELLER.phone,
    buyerName: (tenantData.name as string) || meta.organizationName || "Ukjent",
    buyerOrgNr: meta.organizationNumber,
    buyerGln: meta.glnNumber || undefined,
    buyerAddress: {
      street: (tenantData.address as string) || "Ukjent adresse",
      city: (tenantData.city as string) || "Ukjent",
      postalCode: (tenantData.postalCode as string) || "0000",
    },
    buyerEmail: (tenantData.billingEmail as string) || meta.contactEmail || "",
    buyerReference: meta.invoiceReference || invoiceNumber,
    lines: stripeInvoice.lines.data.map((line, i) => ({
      id: String(i + 1),
      description: line.description || "Suksess skolelisens",
      quantity: line.quantity || 1,
      unitPrice: (line.price?.unit_amount || line.amount) / 100,
      amount: line.amount / 100,
      taxPercent: 25,
    })),
    bankAccount: SELLER.bankAccount,
    bankIban: SELLER.bankIban,
    bankBic: SELLER.bankBic,
    stripeInvoiceId: stripeInvoice.id,
    note: "Faktura generert av Suksess karriereplattform. Ved spørsmål: faktura@suksess.no",
  });

  // Lagre EHF XML i Firestore
  const buyerEndpoint = meta.glnNumber || meta.organizationNumber;
  await getDb().collection("ehfInvoices").doc(stripeInvoice.id).set({
    stripeInvoiceId: stripeInvoice.id,
    invoiceNumber,
    tenantId,
    organizationNumber: meta.organizationNumber,
    xml,
    buyerEndpoint,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ehfStatus: "pending",
  });

  // Send via Peppol
  const result = await sendViaPeppolAP(xml, buyerEndpoint);

  const ehfStatus = result.success ? "sent" : "failed";

  // Oppdater Firestore
  await getDb().collection("ehfInvoices").doc(stripeInvoice.id).update({
    ehfStatus,
    deliveryMethod: result.method,
    deliveryMessageId: result.messageId || null,
    deliveryError: result.error || null,
    sentAt: result.success ? admin.firestore.FieldValue.serverTimestamp() : null,
  });

  // Oppdater Stripe-faktura metadata
  try {
    await stripe.invoices.update(stripeInvoice.id, {
      metadata: { ...stripeInvoice.metadata, ehfStatus, ehfSentAt: new Date().toISOString() },
    });
  } catch (err) {
    console.error("[EHF] Kunne ikke oppdatere Stripe-metadata:", err);
  }

  // Logg til audit
  await getDb().collection("consentAudit").add({
    type: "ehf_invoice_sent",
    tenantId,
    invoiceId: stripeInvoice.id,
    invoiceNumber,
    ehfStatus,
    deliveryMethod: result.method,
    error: result.error || null,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ehfStatus, method: result.method, error: result.error };
}

/**
 * Hent EHF-status for en faktura.
 */
export async function getEhfStatus(stripeInvoiceId: string): Promise<{
  ehfStatus: string;
  xml?: string;
  deliveryMethod?: string;
  sentAt?: string;
  error?: string;
} | null> {
  const doc = await getDb().collection("ehfInvoices").doc(stripeInvoiceId).get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    ehfStatus: data.ehfStatus,
    xml: data.xml,
    deliveryMethod: data.deliveryMethod,
    sentAt: data.sentAt?.toDate?.()?.toISOString() || null,
    error: data.deliveryError,
  };
}

/**
 * Prøv å sende en feilet EHF-faktura på nytt.
 */
export async function retryEhfDelivery(stripeInvoiceId: string): Promise<PeppolResult> {
  const doc = await getDb().collection("ehfInvoices").doc(stripeInvoiceId).get();
  if (!doc.exists) {
    return { success: false, method: "stored", error: "EHF-faktura ikke funnet" };
  }

  const data = doc.data()!;
  const xml = data.xml as string;
  const buyerEndpoint = data.buyerEndpoint as string;

  const result = await sendViaPeppolAP(xml, buyerEndpoint);

  await doc.ref.update({
    ehfStatus: result.success ? "sent" : "failed",
    deliveryMethod: result.method,
    deliveryMessageId: result.messageId || null,
    deliveryError: result.error || null,
    lastRetryAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return result;
}
