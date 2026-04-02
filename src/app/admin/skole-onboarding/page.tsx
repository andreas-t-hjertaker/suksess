"use client";

/**
 * B2B Skole-onboarding — self-service oppsett for skoler (#127).
 *
 * Flerstegs-wizard for skoler:
 * 1. Skoleinformasjon (navn, org.nr, kontakt)
 * 2. Velg plan og antall elever
 * 3. Feide-integrasjon (valgfritt)
 * 4. Bekreftelse og aktivering
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { showToast } from "@/lib/toast";
import { apiPost } from "@/lib/api-client";
import {
  schoolLicensePlans,
  calculateLicenseCost,
  validateOrganizationNumber,
  formatOrganizationNumber,
  type B2BCustomer,
} from "@/lib/stripe/b2b-billing";
import {
  Building2,
  Users,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  School,
  Shield,
  Globe,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Steg-definisjon
// ---------------------------------------------------------------------------

const STEPS = [
  { id: "info", label: "Skoleinformasjon", icon: Building2 },
  { id: "plan", label: "Velg plan", icon: CreditCard },
  { id: "feide", label: "Feide-integrasjon", icon: Shield },
  { id: "confirm", label: "Bekreftelse", icon: CheckCircle2 },
] as const;

type StepId = (typeof STEPS)[number]["id"];

// ---------------------------------------------------------------------------
// Side
// ---------------------------------------------------------------------------

export default function SchoolOnboardingPage() {
  const [step, setStep] = useState<StepId>("info");
  const [submitting, setSubmitting] = useState(false);

  // Steg 1: Skoleinformasjon
  const [schoolName, setSchoolName] = useState("");
  const [orgNumber, setOrgNumber] = useState("");
  const [orgNumberError, setOrgNumberError] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [address, setAddress] = useState({ line1: "", postalCode: "", city: "" });

  // Steg 2: Plan
  const [selectedPlan, setSelectedPlan] = useState("school");
  const [studentCount, setStudentCount] = useState("200");
  const [invoiceReference, setInvoiceReference] = useState("");

  // Steg 3: Feide
  const [feideOrgId, setFeideOrgId] = useState("");
  const [enableFeide, setEnableFeide] = useState(false);

  const currentStepIndex = STEPS.findIndex((s) => s.id === step);
  const plan = schoolLicensePlans.find((p) => p.id === selectedPlan)!;
  const cost = calculateLicenseCost(plan, parseInt(studentCount) || 0);

  function validateOrgNumber(value: string) {
    setOrgNumber(value);
    const digits = value.replace(/\s/g, "");
    if (digits.length === 9) {
      setOrgNumberError(
        validateOrganizationNumber(digits) ? "" : "Ugyldig organisasjonsnummer"
      );
    } else if (digits.length > 0) {
      setOrgNumberError("Må være 9 siffer");
    } else {
      setOrgNumberError("");
    }
  }

  function canProceed(): boolean {
    switch (step) {
      case "info":
        return !!(
          schoolName.trim() &&
          orgNumber.replace(/\s/g, "").length === 9 &&
          !orgNumberError &&
          contactEmail.trim() &&
          contactName.trim() &&
          address.line1.trim() &&
          address.postalCode.trim() &&
          address.city.trim()
        );
      case "plan":
        return selectedPlan !== "" && parseInt(studentCount) > 0;
      case "feide":
        return true; // Feide er valgfritt
      case "confirm":
        return true;
    }
  }

  function nextStep() {
    const idx = STEPS.findIndex((s) => s.id === step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].id);
  }

  function prevStep() {
    const idx = STEPS.findIndex((s) => s.id === step);
    if (idx > 0) setStep(STEPS[idx - 1].id);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      // Generer tenant-slug
      const tenantSlug = schoolName
        .toLowerCase()
        .replace(/[^a-zæøå0-9\s-]/gi, "")
        .replace(/\s+/g, "-")
        .replace(/[æ]/g, "ae")
        .replace(/[ø]/g, "oe")
        .replace(/[å]/g, "aa")
        .slice(0, 30);

      // 1. Opprett tenant
      const tenantRes = await apiPost("/admin/tenants", {
        name: schoolName,
        slug: tenantSlug,
        contactEmail,
        maxStudents: parseInt(studentCount),
        plan: selectedPlan,
        feideOrgId: enableFeide ? feideOrgId : null,
      });

      if (!tenantRes.success) {
        showToast.error("Kunne ikke opprette skole");
        setSubmitting(false);
        return;
      }

      const tenantId = tenantSlug;

      // 2. Opprett B2B-kunde i Stripe
      const customerData: B2BCustomer = {
        organizationName: schoolName,
        organizationNumber: orgNumber.replace(/\s/g, ""),
        contactEmail,
        contactName,
        address: {
          line1: address.line1,
          postalCode: address.postalCode,
          city: address.city,
          country: "NO",
        },
        tenantId,
        invoiceReference,
      };

      const customerRes = await apiPost("/stripe/b2b/customer", customerData);
      if (!customerRes.success) {
        showToast.error("Kunde opprettet, men Stripe-kobling feilet. Kontakt support.");
        setSubmitting(false);
        return;
      }

      // 3. Opprett abonnement (kun for betalte planer)
      if (selectedPlan !== "pilot") {
        const subRes = await apiPost("/stripe/b2b/subscription", {
          tenantId,
          planId: selectedPlan,
          studentCount: parseInt(studentCount),
          invoiceReference,
        });
        if (!subRes.success) {
          showToast.error("Skole opprettet, men abonnement-oppsett feilet. Kontakt support.");
          setSubmitting(false);
          return;
        }
      }

      // 4. Send velkomst-e-post
      await apiPost("/email/send", {
        to: [{ email: contactEmail, name: contactName }],
        subject: `Velkommen til Suksess — ${schoolName}`,
        html: `<p>Hei ${contactName},</p><p>${schoolName} er nå satt opp i Suksess. Du kan logge inn og begynne å invitere elever.</p>`,
        text: `Hei ${contactName}, ${schoolName} er satt opp i Suksess.`,
      });

      showToast.success(`${schoolName} er opprettet og klar!`);
      setStep("confirm");
    } catch {
      showToast.error("Noe gikk galt. Prøv igjen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Skole-onboarding</h1>
        <p className="text-muted-foreground">
          Sett opp en ny skole i Suksess — self-service wizard.
        </p>
      </div>

      {/* Fremdriftsindikator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = s.id === step;
          const isDone = i < currentStepIndex;
          return (
            <div key={s.id} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-8 ${isDone ? "bg-primary" : "bg-border"}`} />}
              <button
                onClick={() => (isDone ? setStep(s.id) : undefined)}
                disabled={!isDone}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isDone
                      ? "bg-primary/10 text-primary cursor-pointer"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Steg 1: Skoleinformasjon */}
      {step === "info" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              Skoleinformasjon
            </CardTitle>
            <CardDescription>
              Fyll ut grunnleggende informasjon om skolen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="school-name">Skolenavn *</Label>
                <Input
                  id="school-name"
                  placeholder="f.eks. Nydalen videregående skole"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-number">Organisasjonsnummer *</Label>
                <Input
                  id="org-number"
                  placeholder="123 456 789"
                  value={orgNumber}
                  onChange={(e) => validateOrgNumber(e.target.value)}
                  className={orgNumberError ? "border-destructive" : ""}
                />
                {orgNumberError && (
                  <p className="text-xs text-destructive">{orgNumberError}</p>
                )}
                {orgNumber.replace(/\s/g, "").length === 9 && !orgNumberError && (
                  <p className="text-xs text-green-600">
                    {formatOrganizationNumber(orgNumber)} ✓
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-name">Kontaktperson *</Label>
                <Input
                  id="contact-name"
                  placeholder="Navn på rådgiver / IT-ansvarlig"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">E-post *</Label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="kontakt@skole.no"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="address">Adresse *</Label>
                <Input
                  id="address"
                  placeholder="Gateadresse"
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal-code">Postnummer *</Label>
                <Input
                  id="postal-code"
                  placeholder="0484"
                  maxLength={4}
                  value={address.postalCode}
                  onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Sted *</Label>
                <Input
                  id="city"
                  placeholder="Oslo"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Steg 2: Velg plan */}
      {step === "plan" && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {schoolLicensePlans.map((p) => (
              <Card
                key={p.id}
                className={`cursor-pointer transition-all ${
                  selectedPlan === p.id
                    ? "ring-2 ring-primary"
                    : "hover:ring-1 hover:ring-border"
                }`}
                onClick={() => setSelectedPlan(p.id)}
              >
                <CardHeader>
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <CardDescription className="text-xs">{p.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    {p.pricePerStudentPerMonth === 0 ? (
                      <span className="text-2xl font-bold">Gratis</span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold">{p.pricePerStudentPerMonth} kr</span>
                        <span className="text-sm text-muted-foreground">/elev/mnd</span>
                      </>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {p.features.slice(0, 5).map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs">
                        <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                    {p.features.length > 5 && (
                      <li className="text-xs text-muted-foreground">
                        +{p.features.length - 5} flere funksjoner
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="student-count">Antall elever *</Label>
                  <Input
                    id="student-count"
                    type="number"
                    min={1}
                    value={studentCount}
                    onChange={(e) => setStudentCount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice-ref">Fakturareferanse / bestillingsnr.</Label>
                  <Input
                    id="invoice-ref"
                    placeholder="Valgfritt"
                    value={invoiceReference}
                    onChange={(e) => setInvoiceReference(e.target.value)}
                  />
                </div>
              </div>

              {plan.pricePerStudentPerMonth > 0 && (
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <p className="text-sm font-medium">Prissammendrag</p>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <span className="text-muted-foreground">{cost.studentCount} elever × {cost.pricePerStudent} kr</span>
                    <span className="text-right">{cost.monthlyExVat.toLocaleString("nb-NO")} kr/mnd</span>
                    <span className="text-muted-foreground">MVA (25%)</span>
                    <span className="text-right">{cost.monthlyVat.toLocaleString("nb-NO")} kr/mnd</span>
                    <span className="font-medium">Totalt inkl. MVA</span>
                    <span className="text-right font-bold">{cost.monthlyTotal.toLocaleString("nb-NO")} kr/mnd</span>
                    <span className="text-muted-foreground">Årsbeløp inkl. MVA</span>
                    <span className="text-right">{cost.yearlyTotal.toLocaleString("nb-NO")} kr/år</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Steg 3: Feide */}
      {step === "feide" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Feide-integrasjon
            </CardTitle>
            <CardDescription>
              Koble skolen til Feide for enkel pålogging og automatisk elevregistrering. Dette er valgfritt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEnableFeide(!enableFeide)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enableFeide ? "bg-primary" : "bg-muted"
                }`}
                role="switch"
                aria-checked={enableFeide}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enableFeide ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm font-medium">
                {enableFeide ? "Feide aktivert" : "Feide deaktivert"}
              </span>
            </div>

            {enableFeide && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="feide-org-id">Feide organisasjons-ID</Label>
                  <Input
                    id="feide-org-id"
                    placeholder="f.eks. nydalen.vgs.no"
                    value={feideOrgId}
                    onChange={(e) => setFeideOrgId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Organisasjons-ID fra Feide. Kontakt Sikt om du ikke vet denne.
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <p className="text-sm font-medium">Hva Feide-integrasjonen gir:</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Elever logger inn med skolekontoen sin
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Automatisk opprettelse av elevkontoer
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Gruppesynkronisering fra Feide
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Automatisk deaktivering ved utmelding
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Steg 4: Bekreftelse */}
      {step === "confirm" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Bekreft oppsett
            </CardTitle>
            <CardDescription>Gjennomgå informasjonen før aktivering.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg bg-muted p-4">
                <p className="text-xs text-muted-foreground">Skole</p>
                <p className="font-medium">{schoolName}</p>
                <p className="text-sm text-muted-foreground">Org.nr: {formatOrganizationNumber(orgNumber)}</p>
                <p className="text-sm text-muted-foreground">{address.line1}, {address.postalCode} {address.city}</p>
              </div>
              <div className="space-y-2 rounded-lg bg-muted p-4">
                <p className="text-xs text-muted-foreground">Kontaktperson</p>
                <p className="font-medium">{contactName}</p>
                <p className="text-sm text-muted-foreground">{contactEmail}</p>
              </div>
              <div className="space-y-2 rounded-lg bg-muted p-4">
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="font-medium">{plan.name}</p>
                <p className="text-sm text-muted-foreground">{studentCount} elever</p>
                {plan.pricePerStudentPerMonth > 0 && (
                  <p className="text-sm font-medium">{cost.monthlyTotal.toLocaleString("nb-NO")} kr/mnd inkl. MVA</p>
                )}
              </div>
              <div className="space-y-2 rounded-lg bg-muted p-4">
                <p className="text-xs text-muted-foreground">Integrasjoner</p>
                <div className="flex items-center gap-2">
                  <Badge variant={enableFeide ? "default" : "outline"}>
                    <Shield className="mr-1 h-3 w-3" />
                    Feide {enableFeide ? "aktivert" : "deaktivert"}
                  </Badge>
                </div>
                {enableFeide && feideOrgId && (
                  <p className="text-sm text-muted-foreground">{feideOrgId}</p>
                )}
              </div>
            </div>

            {invoiceReference && (
              <p className="text-sm text-muted-foreground">
                Fakturareferanse: <strong>{invoiceReference}</strong>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigasjon */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStepIndex === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Forrige
        </Button>

        {step === "confirm" ? (
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="gap-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {submitting ? "Oppretter..." : "Aktiver skole"}
          </Button>
        ) : (
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
            className="gap-2"
          >
            Neste
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
