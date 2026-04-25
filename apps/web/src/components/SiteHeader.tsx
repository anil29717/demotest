import Link from "next/link";

const navItems = [
  { href: "#about", label: "About" },
  { href: "#properties", label: "Properties" },
  { href: "#process", label: "Process" },
  { href: "#contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 h-20 border-b border-[rgba(139,125,107,0.2)] bg-white/95 backdrop-blur-[10px]">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-6 px-6">
        <Link href="/" className="flex items-center gap-3 text-sm font-medium uppercase tracking-[0.28em] text-[#1A1A1A]">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#1A1A1A]" />
          Ar Buildwel
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-underline text-xs font-medium uppercase tracking-[0.24em] text-[#1A1A1A]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="tel:+919876543210"
            className="hidden items-center gap-2 text-sm font-medium text-[#1A1A1A] md:flex"
          >
            <span aria-hidden>☎</span>
            Book a Call
          </Link>
          <Link
            href="/login"
            className="lux-button rounded-[12px] bg-[#1A1A1A] px-6 py-2.5 text-sm font-medium text-white"
          >
            Register
          </Link>
        </div>
      </div>
    </header>
  );
}
