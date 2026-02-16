"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Clock, Home, Moon, Sun, Trophy, UserRound } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/history", label: "History", icon: Clock },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="nav-theme-toggle" style={{ visibility: "hidden" }} />;

  return (
    <button
      type="button"
      className="nav-theme-toggle"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export function NavBar() {
  const pathname = usePathname();

  return (
    <>
      <nav className="nav-desktop">
        <div className="nav-desktop-inner">
          <Link href="/" className="nav-wordmark">Knot</Link>
          <div className="nav-desktop-links">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`nav-desktop-link${pathname === href ? " active" : ""}`}
              >
                {label}
              </Link>
            ))}
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <nav className="nav-mobile">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`nav-mobile-tab${pathname === href ? " active" : ""}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
        <ThemeToggle />
      </nav>
    </>
  );
}
