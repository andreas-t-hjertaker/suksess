import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fremgang",
  description: "Følg din fremgang, XP og oppnådde badges",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
