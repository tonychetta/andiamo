"use client";

import { IconContext } from "@phosphor-icons/react";

/*
  App-wide providers. Right now this sets the global Phosphor icon defaults
  (Thin weight, 32px) per Section 6.4. Individual icons can override these.
  As the app grows, other client-side providers (auth state, etc.) live here too.
*/
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <IconContext.Provider value={{ weight: "thin", size: 32 }}>
      {children}
    </IconContext.Provider>
  );
}
