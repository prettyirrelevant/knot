import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import { ConvexClientProvider } from "./convex-client-provider";
import { IdentityProvider } from "./identity-provider";
import { Footer } from "./footer";
import { NavBar } from "./nav-bar";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Knot",
  description: "A 1v1 strategy game. Variable boards, real-time matches, and a competitive ladder.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f3efe8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hasConvexUrl = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <ConvexClientProvider>
          {hasConvexUrl ? (
            <IdentityProvider>
              <NavBar />
              {children}
              <Footer />
            </IdentityProvider>
          ) : (
            <>
              <NavBar />
              {children}
              <Footer />
            </>
          )}
        </ConvexClientProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--paper-bright)",
              border: "1px solid var(--line)",
              color: "var(--ink-900)",
              fontFamily: "var(--font-body-stack)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-sm)",
            },
          }}
        />
      </body>
    </html>
  );
}
