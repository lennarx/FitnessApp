import { SyncStatusBadge } from "@/components/sync/SyncStatusBadge";
import { TestRecordForm } from "@/components/dev/TestRecordForm";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center gap-8 p-6">
      <div className="flex w-full max-w-md items-center justify-between">
        <h1 className="text-lg font-semibold">Fitness Tracker</h1>
        <SyncStatusBadge />
      </div>
      <TestRecordForm />
    </main>
  );
}
