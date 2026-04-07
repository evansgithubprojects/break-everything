"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/tools", label: "Tools" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-card-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg gradient-border flex items-center justify-center bg-background">
            <span className="text-sm font-bold gradient-text">B</span>
          </div>
          <span className="text-lg font-bold tracking-tight">
            <span className="gradient-text">Break</span>{" "}
            <span className="text-foreground/80">Everything</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent-purple/10 text-accent-purple"
                    : "text-foreground/60 hover:text-foreground hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 px-4 py-2 rounded-lg text-sm font-medium text-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
