"use client";

import gsap from "gsap";

export function animateEntrance(targets: gsap.TweenTarget, delay = 0) {
  return gsap.fromTo(
    targets,
    { autoAlpha: 0, y: 24 },
    { autoAlpha: 1, y: 0, duration: 0.8, delay, ease: "power3.out", stagger: 0.08 },
  );
}

export function registerScrollAnimation(
  targets: gsap.TweenTarget,
  options: gsap.TweenVars = {},
) {
  return gsap.fromTo(
    targets,
    { autoAlpha: 0, y: 32 },
    { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out", ...options },
  );
}
