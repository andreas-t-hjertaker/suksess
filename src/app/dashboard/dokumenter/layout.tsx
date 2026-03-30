import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dokumenter",
  description: "Administrer og organiser dine dokumenter",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
