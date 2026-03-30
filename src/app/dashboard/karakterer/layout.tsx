import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Karakterer",
  description: "Registrer og følg med på karakterene dine",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
