import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Personlighetsanalyse",
  description: "Se din Big Five- og RIASEC-profil med detaljerte innsikter",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
