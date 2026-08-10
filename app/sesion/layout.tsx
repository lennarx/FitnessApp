import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sesión" };

export default function SesionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
