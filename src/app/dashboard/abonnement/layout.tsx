import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Abonnement",
  description: "Administrer ditt Suksess-abonnement og fakturering",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
