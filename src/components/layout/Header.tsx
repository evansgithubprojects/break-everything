"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/tools", label: "Tools" },
];

const ABOUT_HREF = "https://github.com/break-everything/break-everything";

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    // Close mobile drawer on client navigations (back/forward and in-app links).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync UI to route; no external subscription API
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const inactive = "text-foreground/60 hover:text-foreground hover:bg-white/5";
  const active = "text-accent-amber bg-accent-amber/8";

  function isActiveHref(href: string) {
    return pathname === href;
  }

  const desktopPipe =
    "hidden md:inline-block py-2 pl-3 pr-4 text-sm font-medium border-l-2 border-transparent transition-colors";
  const mobileRow =
    "block w-full px-4 py-3.5 text-left text-sm font-medium transition-colors md:hidden";

  return (
    <header className="sticky top-0 z-50 border-b-2 border-card-border bg-background/85 backdrop-blur-xl shadow-[inset_0_-1px_0_rgba(91,143,199,0.12)]">
      <div className="relative mx-auto max-w-6xl flex items-center justify-between gap-4 px-3 sm:px-6 py-3 sm:py-4">
        <Link
          href="/"
          className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0 group"
          onClick={closeMenu}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-none border border-card-border bg-background">
            <Image
              src="/logo-mark.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 object-contain object-left"
              priority
            />
          </span>
          <span className="text-base sm:text-lg font-bold tracking-tight truncate">
            <span className="gradient-text">Break</span>{" "}
            <span className="text-foreground/80">Everything</span>
          </span>
        </Link>

        <button
          type="button"
          className={`md:hidden inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-none border-2 border-card-border transition-colors ${
            menuOpen
              ? "text-white hover:bg-white/10"
              : "text-foreground hover:bg-white/5"
          }`}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            )}
          </svg>
        </button>

        <nav className="hidden md:flex items-center" aria-label="Main">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${desktopPipe} ${
                isActiveHref(link.href)
                  ? `border-accent-amber ${active}`
                  : inactive
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/tools#request-a-tool"
            className={`${desktopPipe} ${inactive}`}
          >
            Request
          </Link>
          <a
            href={ABOUT_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className={`${desktopPipe} ${inactive}`}
          >
            About
          </a>
        </nav>

        {menuOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
            aria-hidden
            tabIndex={-1}
            onClick={closeMenu}
          />
        )}

        <nav
          id={menuId}
          className={`absolute left-0 right-0 top-full z-50 border-b-2 border-card-border bg-background/95 backdrop-blur-xl shadow-lg md:hidden flex flex-col divide-y divide-card-border ${
            menuOpen ? "" : "hidden"
          }`}
          aria-label="Mobile menu"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${mobileRow} ${isActiveHref(link.href) ? active : inactive}`}
              onClick={closeMenu}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/tools#request-a-tool"
            className={`${mobileRow} ${inactive}`}
            onClick={closeMenu}
          >
            Request
          </Link>
          <a
            href={ABOUT_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className={`${mobileRow} ${inactive}`}
            onClick={closeMenu}
          >
            About
          </a>
        </nav>
      </div>
    </header>
  );
}
