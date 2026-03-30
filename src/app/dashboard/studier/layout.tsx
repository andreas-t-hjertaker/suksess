import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Studieprogrammer",
  description: "Utforsk studier som passer dine interesser og karakterer",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
