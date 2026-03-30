import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Søknadscoach",
  description: "Få AI-hjelp til å skrive søknader og motivasjonsbrev",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
