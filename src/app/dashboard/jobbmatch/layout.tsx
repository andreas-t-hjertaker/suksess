import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jobbmatch",
  description: "Finn jobber som matcher din profil og kompetanse",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
