"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

import { animateEntrance } from "@/lib/animations";

export function AnimatedSection({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const context = gsapContext(ref.current);
    return () => context.revert();
  }, []);

  return <div ref={ref}>{children}</div>;
}

function gsapContext(scope: HTMLDivElement) {
  return gsap.context(() => animateEntrance("[data-animate]"), scope);
}
