import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Karrierestier",
  description: "Utforsk karriereveier basert på din RIASEC-profil",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
