import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mine data",
  description: "Eksporter eller slett dine personopplysninger (GDPR)",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
