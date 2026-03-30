import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ledige stillinger",
  description: "Se relevante stillinger fra NAV basert på din profil",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
