/**
 * E-postmaler for transaksjonelle e-poster (#111).
 *
 * Alle maler returnerer { subject, html, text } for bruk med SendGrid/Resend/SMTP.
 * Norsk bokmål som standard.
 */

export type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

// ---------------------------------------------------------------------------
// Hjelpere
// ---------------------------------------------------------------------------

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="nb">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;color:#18181b">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#18181b;padding:24px 32px;text-align:center">
  <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px">Suksess</span>
</td></tr>
<tr><td style="padding:32px">${content}</td></tr>
<tr><td style="padding:16px 32px;background:#fafafa;text-align:center;font-size:12px;color:#71717a">
  <p style="margin:0">Suksess — AI-drevet karriereveiledning for norske elever</p>
  <p style="margin:4px 0 0"><a href="https://suksess.no/personvern" style="color:#71717a">Personvernerklæring</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function button(text: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td>
<a href="${url}" style="display:inline-block;background:#18181b;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${text}</a>
</td></tr></table>`;
}

// ---------------------------------------------------------------------------
// Velkomst-e-post
// ---------------------------------------------------------------------------

export function welcomeEmail(name: string): EmailTemplate {
  const displayName = name || "der";
  return {
    subject: "Velkommen til Suksess!",
    html: baseLayout(`
      <h1 style="margin:0 0 16px;font-size:22px">Hei ${displayName} 👋</h1>
      <p style="line-height:1.6;color:#3f3f46">Velkommen til Suksess — din personlige karriereveileder! Vi hjelper deg med å finne riktig utdanning og karrierevei basert på dine styrker og interesser.</p>
      <p style="line-height:1.6;color:#3f3f46">Her er hva du kan gjøre nå:</p>
      <ul style="line-height:1.8;color:#3f3f46;padding-left:20px">
        <li>Ta personlighetstesten for å oppdage dine styrker</li>
        <li>Utforsk karrierestier som passer deg</li>
        <li>Chat med AI-veilederen for personlige råd</li>
      </ul>
      ${button("Kom i gang", "https://suksess.no/dashboard")}
    `),
    text: `Hei ${displayName}!\n\nVelkommen til Suksess — din personlige karriereveileder!\n\nKom i gang: https://suksess.no/dashboard`,
  };
}

// ---------------------------------------------------------------------------
// Onboarding fullført
// ---------------------------------------------------------------------------

export function onboardingCompleteEmail(name: string): EmailTemplate {
  const displayName = name || "der";
  return {
    subject: "Profilen din er klar!",
    html: baseLayout(`
      <h1 style="margin:0 0 16px;font-size:22px">Flott, ${displayName}! 🎉</h1>
      <p style="line-height:1.6;color:#3f3f46">Du har fullført onboardingen og personlighetsprofilen din er klar. Nå kan du utforske karrierestier og studieprogram som passer akkurat deg.</p>
      ${button("Se mine resultater", "https://suksess.no/dashboard/analyse")}
    `),
    text: `Flott, ${displayName}!\n\nDu har fullført onboardingen. Se resultatene: https://suksess.no/dashboard/analyse`,
  };
}

// ---------------------------------------------------------------------------
// Abonnementsbekreftelse
// ---------------------------------------------------------------------------

export function subscriptionConfirmEmail(name: string, planName: string): EmailTemplate {
  const displayName = name || "der";
  return {
    subject: `Abonnement aktivert — ${planName}`,
    html: baseLayout(`
      <h1 style="margin:0 0 16px;font-size:22px">Abonnementet er aktivert! ✅</h1>
      <p style="line-height:1.6;color:#3f3f46">Hei ${displayName}, du har nå tilgang til <strong>${planName}</strong>. Alle premium-funksjoner er aktivert for kontoen din.</p>
      ${button("Gå til dashboardet", "https://suksess.no/dashboard")}
    `),
    text: `Hei ${displayName}!\n\nAbonnementet ditt (${planName}) er aktivert. Gå til dashboardet: https://suksess.no/dashboard`,
  };
}

// ---------------------------------------------------------------------------
// Betaling feilet
// ---------------------------------------------------------------------------

export function paymentFailedEmail(name: string): EmailTemplate {
  const displayName = name || "der";
  return {
    subject: "Betaling feilet — oppdater betalingsinfo",
    html: baseLayout(`
      <h1 style="margin:0 0 16px;font-size:22px">Betaling feilet ⚠️</h1>
      <p style="line-height:1.6;color:#3f3f46">Hei ${displayName}, vi kunne ikke trekke betalingen for abonnementet ditt. Vennligst oppdater betalingsinformasjonen din for å unngå avbrudd.</p>
      ${button("Oppdater betalingsinfo", "https://suksess.no/dashboard/abonnement")}
    `),
    text: `Hei ${displayName}!\n\nBetalingen feilet. Oppdater betalingsinfo: https://suksess.no/dashboard/abonnement`,
  };
}

// ---------------------------------------------------------------------------
// Skoleinvitasjon (B2B)
// ---------------------------------------------------------------------------

export function schoolInviteEmail(schoolName: string, inviteUrl: string): EmailTemplate {
  return {
    subject: `Invitasjon fra ${schoolName} — Suksess`,
    html: baseLayout(`
      <h1 style="margin:0 0 16px;font-size:22px">Du er invitert! 🏫</h1>
      <p style="line-height:1.6;color:#3f3f46"><strong>${schoolName}</strong> har gitt deg tilgang til Suksess — en AI-drevet karriereveiledningsplattform.</p>
      <p style="line-height:1.6;color:#3f3f46">Klikk på knappen under for å aktivere kontoen din og komme i gang.</p>
      ${button("Aksepter invitasjon", inviteUrl)}
      <p style="font-size:12px;color:#71717a;margin-top:24px">Hvis du ikke forventet denne e-posten, kan du trygt ignorere den.</p>
    `),
    text: `${schoolName} har invitert deg til Suksess!\n\nAksepter invitasjon: ${inviteUrl}`,
  };
}

// ---------------------------------------------------------------------------
// Ukentlig oppsummering
// ---------------------------------------------------------------------------

export function weeklyDigestEmail(
  name: string,
  stats: { xpEarned: number; testsCompleted: number; careersExplored: number }
): EmailTemplate {
  const displayName = name || "der";
  return {
    subject: "Din ukentlige oppsummering fra Suksess",
    html: baseLayout(`
      <h1 style="margin:0 0 16px;font-size:22px">Ukentlig oppsummering 📊</h1>
      <p style="line-height:1.6;color:#3f3f46">Hei ${displayName}, her er hva du oppnådde denne uken:</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">
        <tr>
          <td style="padding:12px;text-align:center;background:#f4f4f5;border-radius:8px">
            <div style="font-size:24px;font-weight:700;color:#18181b">${stats.xpEarned}</div>
            <div style="font-size:12px;color:#71717a">XP opptjent</div>
          </td>
          <td width="12"></td>
          <td style="padding:12px;text-align:center;background:#f4f4f5;border-radius:8px">
            <div style="font-size:24px;font-weight:700;color:#18181b">${stats.testsCompleted}</div>
            <div style="font-size:12px;color:#71717a">Tester fullført</div>
          </td>
          <td width="12"></td>
          <td style="padding:12px;text-align:center;background:#f4f4f5;border-radius:8px">
            <div style="font-size:24px;font-weight:700;color:#18181b">${stats.careersExplored}</div>
            <div style="font-size:12px;color:#71717a">Karrierer utforsket</div>
          </td>
        </tr>
      </table>
      ${button("Fortsett utforskningen", "https://suksess.no/dashboard")}
    `),
    text: `Hei ${displayName}!\n\nDenne uken: ${stats.xpEarned} XP, ${stats.testsCompleted} tester, ${stats.careersExplored} karrierer utforsket.\n\nFortsett: https://suksess.no/dashboard`,
  };
}

// ---------------------------------------------------------------------------
// GDPR dataeksport klar
// ---------------------------------------------------------------------------

export function dataExportReadyEmail(name: string, downloadUrl: string): EmailTemplate {
  const displayName = name || "der";
  return {
    subject: "Dataeksporten din er klar",
    html: baseLayout(`
      <h1 style="margin:0 0 16px;font-size:22px">Dataeksport klar 📦</h1>
      <p style="line-height:1.6;color:#3f3f46">Hei ${displayName}, dataeksporten du ba om er nå klar for nedlasting. Filen inneholder alle dine personopplysninger i JSON-format (GDPR Art. 20).</p>
      ${button("Last ned data", downloadUrl)}
      <p style="font-size:12px;color:#71717a;margin-top:24px">Lenken er gyldig i 24 timer. Etter det må du be om en ny eksport.</p>
    `),
    text: `Hei ${displayName}!\n\nDataeksporten er klar: ${downloadUrl}\n\nLenken er gyldig i 24 timer.`,
  };
}

// ---------------------------------------------------------------------------
// Passord tilbakestilt
// ---------------------------------------------------------------------------

export function passwordResetEmail(name: string, resetUrl: string): EmailTemplate {
  const displayName = name || "der";
  return {
    subject: "Tilbakestill passord — Suksess",
    html: baseLayout(`
      <h1 style="margin:0 0 16px;font-size:22px">Tilbakestill passord 🔒</h1>
      <p style="line-height:1.6;color:#3f3f46">Hei ${displayName}, du har bedt om å tilbakestille passordet ditt. Klikk på knappen under for å velge et nytt passord.</p>
      ${button("Tilbakestill passord", resetUrl)}
      <p style="font-size:12px;color:#71717a;margin-top:24px">Hvis du ikke ba om dette, kan du trygt ignorere denne e-posten. Lenken utløper om 1 time.</p>
    `),
    text: `Hei ${displayName}!\n\nTilbakestill passordet ditt: ${resetUrl}\n\nLenken utløper om 1 time.`,
  };
}
