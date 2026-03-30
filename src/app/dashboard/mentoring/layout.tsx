import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentoring",
  description: "Koble med mentorer innen din karriereinteresse",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
