/*
  Single source of truth for displaying the Andiamo logo.
  Every place the logo appears uses this component, so when the final logo is
  ready we only replace /public/logo.svg and /public/logo-icon.svg (Section 6.4.1).
*/

type LogoProps = {
  variant?: "full" | "icon";
  width?: number;
  height?: number;
  className?: string;
};

export function Logo({ variant = "full", width, height, className }: LogoProps) {
  const isIcon = variant === "icon";
  const src = isIcon ? "/logo-icon.png" : "/logo.svg";
  const w = width ?? (isIcon ? 40 : 152);
  const h = height ?? (isIcon ? 40 : 36);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- plain <img> renders the swappable placeholder SVG most reliably
    <img src={src} alt="Andiamo" width={w} height={h} className={className} />
  );
}
