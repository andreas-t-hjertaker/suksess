/**
 * Hjelpefunksjon for nedlasting av CV som HTML-fil.
 * Genererer et print-vennlig HTML-dokument basert på CV-forhåndsvisningen.
 */

export function downloadCv(name: string) {
  const el = document.getElementById("cv-preview");
  if (!el) return;
  const html = `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <title>CV – ${name || "Kandidat"}</title>
  <style>
    body { margin: 0; padding: 2cm; font-family: Georgia, serif; font-size: 12pt; color: #111; }
    h1 { font-size: 20pt; margin-bottom: 4px; }
    h2 { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.1em; color: #666; margin: 16px 0 6px; }
    section { margin-bottom: 16px; }
    .header { border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 16px; }
    .meta { font-size: 9pt; color: #555; margin-top: 6px; }
    span.tag { border: 1px solid #ccc; padding: 2px 6px; margin-right: 4px; font-size: 9pt; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  ${el.innerHTML}
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `CV_${(name || "Kandidat").replace(/\s+/g, "_")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
