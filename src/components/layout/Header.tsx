"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/tools", label: "Tools" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b-2 border-card-border bg-background/85 backdrop-blur-xl shadow-[inset_0_-1px_0_rgba(91,143,199,0.12)]">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-none border border-card-border bg-background">
            <Image
              src="/logo-mark.png"
              alt=""
              fill
              className="object-cover object-left"
              sizes="36px"
              priority
            />
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
                className={`pl-3 pr-4 py-2 text-sm font-medium border-l-2 transition-colors ${
                  isActive
                    ? "border-accent-amber text-accent-amber bg-accent-amber/8"
                    : "border-transparent text-foreground/60 hover:text-foreground hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <a
            href="https://github.com/break-everything/break-everything"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 px-4 py-2 text-sm font-medium text-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors border border-transparent hover:border-card-border rounded-none"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
