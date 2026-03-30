import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CV-builder",
  description: "Bygg og last ned en profesjonell CV tilpasset dine styrker",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
