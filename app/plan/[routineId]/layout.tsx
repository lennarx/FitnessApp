import type { Metadata } from "next";

export const metadata: Metadata = { title: "Rutina" };

export default function RoutineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
