/**
 * Cost Anomaly Alerting — daglig kostnadskontroll for LLM-bruk (Issue #25)
 *
 * Cloud Scheduler-funksjon som kjører daglig kl 08:00 Oslo-tid.
 * Leser llmLogs fra siste 24h og siste 7 dager, beregner daglig
 * gjennomsnittskostnad. Varsler via e-post dersom:
 *   - Dagens kostnad > 3× 7-dagers snitt
 *   - Totalt daglig token-forbruk > 100 000 tokens
 *
 * Lagrer varslingshistorikk i costAlerts/{date} for å unngå duplikater.
 */

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as nodemailer from "nodemailer";

const db = admin.firestore();

// ─── SMTP-transport (samme mønster som notifications.ts) ─────────────────────

function createTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn("[cost-alerts] SMTP ikke konfigurert — e-post vil ikke sendes");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const FROM_ADDRESS = process.env.SMTP_FROM ?? "Suksess <noreply@suksess.no>";

function getAlertRecipient(): string {
  return process.env.ALERT_EMAIL ?? FROM_ADDRESS;
}

// ─── Hjelpefunksjoner ─────────────────────────────────────────────────────────

/** Henter aggregerte metrics fra llmLogs innenfor et gitt tidsrom */
async function fetchMetrics(since: Date): Promise<{ totalCostNok: number; totalTokens: number }> {
  const snap = await db
    .collection("llmLogs")
    .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(since))
    .get();

  let totalCostNok = 0;
  let totalTokens = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    totalCostNok += (data.costNok as number) ?? 0;
    const inputTokens = (data.inputTokens as number) ?? 0;
    const outputTokens = (data.outputTokens as number) ?? 0;
    totalTokens += inputTokens + outputTokens;
  }

  return { totalCostNok, totalTokens };
}

/** Sender varsel-e-post */
async function sendAlertEmail(subject: string, body: string): Promise<void> {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn("[cost-alerts] Ingen SMTP-konfigurasjon — varsel ikke sendt");
    return;
  }

  const recipient = getAlertRecipient();

  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to: recipient,
      subject,
      text: body,
      html: `<pre style="font-family: monospace; white-space: pre-wrap;">${body}</pre>`,
    });
    console.log(`[cost-alerts] Varsel sendt til ${recipient}: ${subject}`);
  } catch (err) {
    console.error("[cost-alerts] Feil ved sending av varsel-e-post:", err);
  }
}

// ─── Cloud Scheduler-funksjon ─────────────────────────────────────────────────

/**
 * Kjører daglig kl 08:00 Oslo-tid (Europe/Oslo = UTC+1 / UTC+2 ved sommertid).
 * Cron: "0 8 * * *" med timeZone "Europe/Oslo"
 */
export const checkCostAnomalies = onSchedule(
  {
    schedule: "0 8 * * *",
    timeZone: "Europe/Oslo",
    region: "europe-west1",
  },
  async () => {
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10); // YYYY-MM-DD

    // Sjekk om vi allerede har sendt varsel i dag
    const alertDocRef = db.collection("costAlerts").doc(dateKey);
    const existingAlert = await alertDocRef.get();

    if (existingAlert.exists) {
      console.log(`[cost-alerts] Varsel for ${dateKey} allerede sendt — hopper over`);
      return;
    }

    // Beregn tidsgrenser
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Hent metrics
    const [metrics24h, metrics7d] = await Promise.all([
      fetchMetrics(since24h),
      fetchMetrics(since7d),
    ]);

    const todayCostNok = metrics24h.totalCostNok;
    const todayTokens = metrics24h.totalTokens;

    // Beregn 7-dagers daglig snitt (unngå divisjon på null)
    const avgDailyCostNok = metrics7d.totalCostNok / 7;

    const alerts: string[] = [];

    // Anomali 1: Dagens kostnad > 3× 7-dagers snitt
    const costThresholdMultiplier = 3;
    if (avgDailyCostNok > 0 && todayCostNok > costThresholdMultiplier * avgDailyCostNok) {
      alerts.push(
        `KOSTNAD ANOMALI: Dagens LLM-kostnad er ${todayCostNok.toFixed(4)} NOK, ` +
        `som er ${(todayCostNok / avgDailyCostNok).toFixed(1)}× det 7-dagers snittet ` +
        `(${avgDailyCostNok.toFixed(4)} NOK/dag).`
      );
    }

    // Anomali 2: Totalt daglig token-forbruk > 100 000
    const tokenThreshold = 100_000;
    if (todayTokens > tokenThreshold) {
      alerts.push(
        `TOKEN ANOMALI: Dagens token-forbruk er ${todayTokens.toLocaleString("nb-NO")} tokens, ` +
        `som overstiger grensen på ${tokenThreshold.toLocaleString("nb-NO")} tokens/dag.`
      );
    }

    // Lagre i Firestore uansett (for historikk og for å markere at sjekk er kjørt)
    await alertDocRef.set({
      date: dateKey,
      checkedAt: admin.firestore.FieldValue.serverTimestamp(),
      todayCostNok,
      avgDailyCostNok,
      todayTokens,
      alertsSent: alerts.length > 0,
      alerts,
    });

    if (alerts.length === 0) {
      console.log(`[cost-alerts] ${dateKey}: Ingen anomalier funnet. ` +
        `Kostnad: ${todayCostNok.toFixed(4)} NOK, Tokens: ${todayTokens}`);
      return;
    }

    // Send varsel-e-post
    const subject = `[Suksess] Kostnadsvarsel ${dateKey} — ${alerts.length} anomali${alerts.length > 1 ? "er" : ""} funnet`;

    const body = [
      `Suksess LLM Cost Alert — ${dateKey}`,
      "=".repeat(50),
      "",
      ...alerts.map((a, i) => `${i + 1}. ${a}`),
      "",
      "─".repeat(50),
      "Detaljer:",
      `  Dagens kostnad (siste 24h):  ${todayCostNok.toFixed(4)} NOK`,
      `  7-dagers daglig snitt:       ${avgDailyCostNok.toFixed(4)} NOK`,
      `  Dagens token-forbruk:        ${todayTokens.toLocaleString("nb-NO")} tokens`,
      `  Token-grense:                ${tokenThreshold.toLocaleString("nb-NO")} tokens/dag`,
      "",
      "Sjekk Firebase Console → Firestore → llmLogs for detaljer.",
      `Tidspunkt: ${now.toISOString()}`,
    ].join("\n");

    await sendAlertEmail(subject, body);
  }
);
