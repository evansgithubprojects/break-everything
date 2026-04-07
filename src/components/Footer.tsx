import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-card-border mt-auto">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Link href="/" className="text-lg font-bold tracking-tight">
              <span className="gradient-text">Break</span>{" "}
              <span className="text-foreground/80">Everything</span>
            </Link>
            <p className="mt-3 text-sm text-foreground/50 max-w-xs">
              Free, open-source tools for students who&apos;d rather build than pay. Every tool is verified safe and transparent.
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
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider mb-3">
              Trust & Safety
            </h4>
            <ul className="space-y-2">
              <li className="text-sm text-foreground/50 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                All tools are open-source
              </li>
              <li className="text-sm text-foreground/50 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                SHA-256 verified builds
              </li>
              <li className="text-sm text-foreground/50 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Safety scanned & certified
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
