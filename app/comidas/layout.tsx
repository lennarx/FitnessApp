import type { Metadata } from "next";

export const metadata: Metadata = { title: "Comidas" };

export default function ComidasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
