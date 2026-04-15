import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-card-border mt-auto">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-3 text-lg font-bold tracking-tight"
            >
              <Image
                src="/logo-lockup.png"
                alt=""
                width={44}
                height={44}
                className="shrink-0"
              />
              <span>
                <span className="gradient-text">Break</span>{" "}
                <span className="text-foreground/80">Everything</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-foreground/50 max-w-xs">
              Break Everything exists to help students break software costs with free tools and clear links to who built them.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider mb-3">
              Navigation
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-foreground/50 hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/tools" className="text-sm text-foreground/50 hover:text-foreground transition-colors">
                  Browse Tools
                </Link>
              </li>
              <li>
                <Link href="/request-tool" className="text-sm text-foreground/50 hover:text-foreground transition-colors">
                  Request a tool
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider mb-3">
              What we list
            </h4>
            <ul className="space-y-2">
              <li className="text-sm text-foreground/50 flex items-center gap-2.5">
                <span className="w-2 h-2 shrink-0 rotate-45 bg-accent-amber/80 border border-accent-steel/40" />
                Free tools with a public project page
              </li>
              <li className="text-sm text-foreground/50 flex items-center gap-2.5">
                <span className="w-2 h-2 shrink-0 rotate-45 bg-accent-steel/70 border border-accent-lime/35" />
                Categories and platforms called out on each card
              </li>
              <li className="text-sm text-foreground/50 flex items-center gap-2.5">
                <span className="w-2 h-2 shrink-0 rotate-45 bg-accent-lime/70 border border-accent-amber/30" />
                Review dates you can see on each tool page
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-card-border flex items-center justify-between">
          <p className="text-xs text-foreground/30">
            &copy; {new Date().getFullYear()} Break Everything. Built for students, by students.
          </p>
          <p className="text-xs text-foreground/30">
            100% free. Always.
          </p>
        </div>
      </div>
    </footer>
  );
}
