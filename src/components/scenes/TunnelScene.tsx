"use client";

import dynamic from "next/dynamic";

const TunnelCanvas = dynamic(() => import("./TunnelCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[var(--a)] border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function TunnelScene() {
  return (
    <div className="absolute inset-0 -z-10 opacity-40 pointer-events-none">
      <TunnelCanvas />
    </div>
  );
}
