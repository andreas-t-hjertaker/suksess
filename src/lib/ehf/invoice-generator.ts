/**
 * EHF fakturagenerator — Peppol BIS Billing 3.0 (UBL 2.1) (#110).
 *
 * Genererer EHF-kompatible fakturaer i UBL 2.1 XML-format for norsk
 * offentlig sektor. Påkrevd iht. forskrift om IT-standarder i offentlig
 * forvaltning for leverandører til kommunale skoler.
 *
 * Standard: PEPPOL-EN16931-UBL (Peppol BIS Billing 3.0)
 * Profil: urn:fdc:peppol.eu:2017:poacc:billing:01:1.0
 * Tilpasning: urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0
 */

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type EhfSellerParty = {
  name: string;
  organizationNumber: string;
  vatNumber: string; // MVA-nummer: "NO" + orgNr + "MVA"
  address: {
    streetName: string;
    cityName: string;
    postalZone: string;
    countryCode: "NO";
  };
  contact: {
    name: string;
    email: string;
    phone?: string;
  };
  /** Peppol endpoint (0192:orgNr) */
  endpointId: string;
  endpointSchemeId: "0192"; // Norwegian org number scheme
};

export type EhfBuyerParty = {
  name: string;
  organizationNumber: string;
  /** GLN for Peppol-ruting (valgfritt, bruker orgNr om mangler) */
  glnNumber?: string;
  address: {
    streetName: string;
    cityName: string;
    postalZone: string;
    countryCode: "NO";
  };
  contact: {
    name: string;
    email: string;
  };
  /** Peppol endpoint */
  endpointId: string;
  endpointSchemeId: "0192" | "0088"; // 0192=orgNr, 0088=GLN
  /** Kjøpers referanse (påkrevd i BIS 3.0) */
  buyerReference: string;
};

export type EhfInvoiceLine = {
  id: string;
  description: string;
  quantity: number;
  unitCode: string; // "EA" (each), "MON" (month)
  unitPrice: number; // Pris eks. MVA per enhet i NOK
  lineExtensionAmount: number; // quantity * unitPrice
  taxCategory: "S" | "Z" | "E"; // Standard=25%, Zero=0%, Exempt
  taxPercent: number;
};

export type EhfInvoiceData = {
  invoiceNumber: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  /** Faktureringsperiode */
  periodStart?: string;
  periodEnd?: string;
  seller: EhfSellerParty;
  buyer: EhfBuyerParty;
  lines: EhfInvoiceLine[];
  /** Betalingsinformasjon */
  paymentMeansCode: "30" | "58"; // 30=bankoverføring, 58=SEPA
  paymentId: string; // KID-nummer eller referanse
  bankAccountIban?: string;
  bankAccountBic?: string;
  bankAccountNumber?: string; // Norsk kontonummer
  /** Merknad / notat */
  note?: string;
  /** Valutakode */
  currencyCode: "NOK";
  /** Stripe-referanse */
  stripeInvoiceId?: string;
};

export type EhfGenerationResult = {
  xml: string;
  invoiceNumber: string;
  buyerEndpoint: string;
  sellerEndpoint: string;
};

// ---------------------------------------------------------------------------
// KETL selger-info (hardkodet for Suksess/KETL)
// ---------------------------------------------------------------------------

export const KETL_SELLER: EhfSellerParty = {
  name: "KETL",
  organizationNumber: "933054880", // Placeholder — sett ekte orgNr i prod
  vatNumber: "NO933054880MVA",
  address: {
    streetName: "Storgata 1",
    cityName: "Oslo",
    postalZone: "0155",
    countryCode: "NO",
  },
  contact: {
    name: "Andreas T. Hjertaker",
    email: "faktura@suksess.no",
    phone: "+47 400 00 000",
  },
  endpointId: "0192:933054880",
  endpointSchemeId: "0192",
};

// ---------------------------------------------------------------------------
// XML-generering
// ---------------------------------------------------------------------------

/** Escape XML special characters */
function escXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Format number with 2 decimals */
function amt(n: number): string {
  return n.toFixed(2);
}

/**
 * Generer EHF-faktura i UBL 2.1 XML-format (Peppol BIS Billing 3.0).
 */
export function generateEhfInvoice(data: EhfInvoiceData): EhfGenerationResult {
  const { seller, buyer, lines } = data;

  // Beregn totaler
  const lineExtensionTotal = lines.reduce((sum, l) => sum + l.lineExtensionAmount, 0);

  // Grupper avgift per kategori
  const taxGroups = new Map<string, { taxableAmount: number; taxAmount: number; percent: number; category: string }>();
  for (const line of lines) {
    const key = `${line.taxCategory}-${line.taxPercent}`;
    const existing = taxGroups.get(key) || { taxableAmount: 0, taxAmount: 0, percent: line.taxPercent, category: line.taxCategory };
    existing.taxableAmount += line.lineExtensionAmount;
    existing.taxAmount += line.lineExtensionAmount * (line.taxPercent / 100);
    taxGroups.set(key, existing);
  }

  const totalTax = [...taxGroups.values()].reduce((sum, g) => sum + g.taxAmount, 0);
  const taxInclusiveAmount = lineExtensionTotal + totalTax;

  // Generer XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${escXml(data.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${escXml(data.issueDate)}</cbc:IssueDate>
  <cbc:DueDate>${escXml(data.dueDate)}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${data.currencyCode}</cbc:DocumentCurrencyCode>${data.note ? `
  <cbc:Note>${escXml(data.note)}</cbc:Note>` : ""}
  <cbc:BuyerReference>${escXml(buyer.buyerReference)}</cbc:BuyerReference>${data.stripeInvoiceId ? `
  <cac:OrderReference>
    <cbc:ID>${escXml(data.stripeInvoiceId)}</cbc:ID>
  </cac:OrderReference>` : ""}${data.periodStart && data.periodEnd ? `
  <cac:InvoicePeriod>
    <cbc:StartDate>${escXml(data.periodStart)}</cbc:StartDate>
    <cbc:EndDate>${escXml(data.periodEnd)}</cbc:EndDate>
  </cac:InvoicePeriod>` : ""}

  <!-- Selger -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:EndpointID schemeID="${seller.endpointSchemeId}">${escXml(seller.organizationNumber)}</cbc:EndpointID>
      <cac:PartyIdentification>
        <cbc:ID schemeID="0192">${escXml(seller.organizationNumber)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${escXml(seller.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escXml(seller.address.streetName)}</cbc:StreetName>
        <cbc:CityName>${escXml(seller.address.cityName)}</cbc:CityName>
        <cbc:PostalZone>${escXml(seller.address.postalZone)}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${seller.address.countryCode}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escXml(seller.vatNumber)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escXml(seller.name)}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="0192">${escXml(seller.organizationNumber)}</cbc:CompanyID>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:Name>${escXml(seller.contact.name)}</cbc:Name>
        <cbc:ElectronicMail>${escXml(seller.contact.email)}</cbc:ElectronicMail>${seller.contact.phone ? `
        <cbc:Telephone>${escXml(seller.contact.phone)}</cbc:Telephone>` : ""}
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Kjøper -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cbc:EndpointID schemeID="${buyer.endpointSchemeId}">${escXml(buyer.endpointId)}</cbc:EndpointID>
      <cac:PartyIdentification>
        <cbc:ID schemeID="0192">${escXml(buyer.organizationNumber)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${escXml(buyer.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escXml(buyer.address.streetName)}</cbc:StreetName>
        <cbc:CityName>${escXml(buyer.address.cityName)}</cbc:CityName>
        <cbc:PostalZone>${escXml(buyer.address.postalZone)}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${buyer.address.countryCode}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escXml(buyer.name)}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="0192">${escXml(buyer.organizationNumber)}</cbc:CompanyID>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:Name>${escXml(buyer.contact.name)}</cbc:Name>
        <cbc:ElectronicMail>${escXml(buyer.contact.email)}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- Betalingsinformasjon -->
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>${data.paymentMeansCode}</cbc:PaymentMeansCode>
    <cbc:PaymentID>${escXml(data.paymentId)}</cbc:PaymentID>${data.bankAccountIban ? `
    <cac:PayeeFinancialAccount>
      <cbc:ID>${escXml(data.bankAccountIban)}</cbc:ID>${data.bankAccountBic ? `
      <cac:FinancialInstitutionBranch>
        <cbc:ID>${escXml(data.bankAccountBic)}</cbc:ID>
      </cac:FinancialInstitutionBranch>` : ""}
    </cac:PayeeFinancialAccount>` : data.bankAccountNumber ? `
    <cac:PayeeFinancialAccount>
      <cbc:ID>${escXml(data.bankAccountNumber)}</cbc:ID>
    </cac:PayeeFinancialAccount>` : ""}
  </cac:PaymentMeans>

  <!-- Avgift (MVA-sammendrag) -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${data.currencyCode}">${amt(totalTax)}</cbc:TaxAmount>
${[...taxGroups.values()].map((g) => `    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${data.currencyCode}">${amt(g.taxableAmount)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${data.currencyCode}">${amt(g.taxAmount)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${g.category}</cbc:ID>
        <cbc:Percent>${amt(g.percent)}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`).join("\n")}
  </cac:TaxTotal>

  <!-- Fakturatotaler -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${data.currencyCode}">${amt(lineExtensionTotal)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${data.currencyCode}">${amt(lineExtensionTotal)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${data.currencyCode}">${amt(taxInclusiveAmount)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${data.currencyCode}">${amt(taxInclusiveAmount)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- Fakturalinjer -->
${lines.map((line) => `  <cac:InvoiceLine>
    <cbc:ID>${escXml(line.id)}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${escXml(line.unitCode)}">${line.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${data.currencyCode}">${amt(line.lineExtensionAmount)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${escXml(line.description)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${line.taxCategory}</cbc:ID>
        <cbc:Percent>${amt(line.taxPercent)}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${data.currencyCode}">${amt(line.unitPrice)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`).join("\n")}
</Invoice>`;

  return {
    xml,
    invoiceNumber: data.invoiceNumber,
    buyerEndpoint: buyer.endpointId,
    sellerEndpoint: seller.endpointId,
  };
}

// ---------------------------------------------------------------------------
// Stripe → EHF konvertering
// ---------------------------------------------------------------------------

export type StripeInvoiceForEhf = {
  id: string;
  number: string;
  created: number; // Unix timestamp
  dueDate: number | null;
  periodStart?: number;
  periodEnd?: number;
  amountDue: number; // i øre
  tax: number; // i øre
  customerName: string;
  customerEmail: string;
  metadata: {
    tenantId?: string;
    organizationNumber?: string;
    glnNumber?: string;
    invoiceReference?: string;
    contactName?: string;
  };
  lines: Array<{
    description: string;
    quantity: number;
    unitAmount: number; // i øre
    amount: number; // i øre
  }>;
};

/**
 * Konverter en Stripe-faktura til EHF-invoicedata.
 * Brukes av webhook-handler for å generere EHF ved invoice.finalized.
 */
export function stripeInvoiceToEhf(
  stripeInvoice: StripeInvoiceForEhf,
  buyerAddress: { streetName: string; cityName: string; postalZone: string },
  paymentInfo: { bankAccountNumber?: string; bankAccountIban?: string; bankAccountBic?: string }
): EhfInvoiceData {
  const meta = stripeInvoice.metadata;
  const orgNr = meta.organizationNumber || "";
  const glnNumber = meta.glnNumber || "";

  const formatDate = (ts: number) => new Date(ts * 1000).toISOString().split("T")[0];

  // Bestem kjøpers Peppol-endpoint
  const buyerEndpointId = glnNumber || orgNr;
  const buyerEndpointScheme: "0192" | "0088" = glnNumber ? "0088" : "0192";

  return {
    invoiceNumber: stripeInvoice.number || `INV-${stripeInvoice.id}`,
    issueDate: formatDate(stripeInvoice.created),
    dueDate: stripeInvoice.dueDate
      ? formatDate(stripeInvoice.dueDate)
      : formatDate(stripeInvoice.created + 30 * 24 * 3600),
    periodStart: stripeInvoice.periodStart ? formatDate(stripeInvoice.periodStart) : undefined,
    periodEnd: stripeInvoice.periodEnd ? formatDate(stripeInvoice.periodEnd) : undefined,
    seller: KETL_SELLER,
    buyer: {
      name: stripeInvoice.customerName,
      organizationNumber: orgNr,
      glnNumber: glnNumber || undefined,
      address: { ...buyerAddress, countryCode: "NO" },
      contact: {
        name: meta.contactName || stripeInvoice.customerName,
        email: stripeInvoice.customerEmail,
      },
      endpointId: buyerEndpointId,
      endpointSchemeId: buyerEndpointScheme,
      buyerReference: meta.invoiceReference || stripeInvoice.number || stripeInvoice.id,
    },
    lines: stripeInvoice.lines.map((line, i) => {
      const unitPrice = line.unitAmount / 100;
      const quantity = line.quantity || 1;
      return {
        id: String(i + 1),
        description: line.description || "Suksess skolelisens",
        quantity,
        unitCode: "EA",
        unitPrice,
        lineExtensionAmount: (line.amount / 100),
        taxCategory: "S" as const,
        taxPercent: 25,
      };
    }),
    paymentMeansCode: "30",
    paymentId: stripeInvoice.number || stripeInvoice.id,
    bankAccountNumber: paymentInfo.bankAccountNumber,
    bankAccountIban: paymentInfo.bankAccountIban,
    bankAccountBic: paymentInfo.bankAccountBic,
    currencyCode: "NOK",
    stripeInvoiceId: stripeInvoice.id,
    note: "Faktura generert fra Suksess karriereplattform. Ved spørsmål kontakt faktura@suksess.no.",
  };
}
