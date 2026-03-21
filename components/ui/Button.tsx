import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-ink text-paper hover:bg-neutral-800 border border-ink px-5 py-3 text-sm font-medium tracking-wide transition-colors",
  secondary:
    "bg-transparent text-ink border border-ink hover:bg-ink hover:text-paper px-5 py-3 text-sm font-medium tracking-wide transition-colors",
  ghost: "text-ink underline-offset-4 hover:underline px-2 py-2 text-sm",
};

export function Button({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <Link href={href} className={`inline-flex items-center justify-center text-center ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}
