import Link from "next/link";

type Cta = { label: string; href: string } | { label: string; onClick: () => void };

/**
 * Message + optional CTA for a screen with no data yet. Every main screen's
 * empty state was previously a bare <p> with no orientation — this is the
 * one shared shape they all use now.
 */
export function EmptyState({ message, cta }: { message: string; cta?: Cta }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-neutral-800 bg-neutral-900 p-4">
      <p className="text-neutral-500">{message}</p>
      {cta &&
        ("href" in cta ? (
          <Link
            href={cta.href}
            className="rounded-md border border-neutral-700 px-4 py-3 text-base text-neutral-100"
          >
            {cta.label}
          </Link>
        ) : (
          <button
            onClick={cta.onClick}
            className="rounded-md border border-neutral-700 px-4 py-3 text-base text-neutral-100"
          >
            {cta.label}
          </button>
        ))}
    </div>
  );
}
