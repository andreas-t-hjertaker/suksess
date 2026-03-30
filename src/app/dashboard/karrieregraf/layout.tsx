import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Karrieregraf",
  description: "Visualiser karrieremuligheter som et interaktivt nettverk",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
