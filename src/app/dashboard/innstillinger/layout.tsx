import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Innstillinger",
  description: "Tilpass dine preferanser og kontoinformasjon",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
