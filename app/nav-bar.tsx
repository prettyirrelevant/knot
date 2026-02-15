"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, UserRound } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

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
      </nav>
    </>
  );
}
