export default function AbstractBg() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden>
      {/* Large gradient orb - top right */}
      <div
        className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full animate-pulse-glow"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.05) 50%, transparent 70%)",
        }}
      />

      {/* Gradient orb - bottom left */}
      <div
        className="absolute -bottom-60 -left-40 w-[500px] h-[500px] rounded-full animate-pulse-glow"
        style={{
          background:
            "radial-gradient(circle, rgba(6,182,212,0.12) 0%, rgba(59,130,246,0.04) 50%, transparent 70%)",
          animationDelay: "2s",
        }}
      />

      {/* Floating geometric shapes */}
      <div
        className="absolute top-1/4 left-1/4 w-32 h-32 border border-accent-purple/10 rotate-45 animate-float"
      />
      <div
        className="absolute top-2/3 right-1/4 w-24 h-24 border border-accent-blue/10 rotate-12 animate-float-delayed"
      />
      <div
        className="absolute top-1/2 left-1/6 w-16 h-16 border border-accent-cyan/10 rotate-[30deg] animate-float"
        style={{ animationDelay: "4s" }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}
