import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Utviklerverktøy",
  description: "API-tilgang og teknisk informasjon",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
