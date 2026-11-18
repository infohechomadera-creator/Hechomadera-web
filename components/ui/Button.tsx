import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "neutral" | "light";

/** Variantes del sistema de diseño (ver app/globals.css). */
const variants: Record<Variant, string> = {
  primary: "boton-primario",
  secondary: "boton-borde",
  neutral: "boton-neutro",
  light: "boton-claro",
  ghost: "inline-flex items-center text-sm text-ink underline-offset-4 hover:underline px-2 py-2",
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
    <Link href={href} className={`text-center ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}
