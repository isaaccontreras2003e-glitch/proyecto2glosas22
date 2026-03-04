import type { NextConfig } from "next";

const supabaseHost = "pcnxektqlxplrwanazuw.supabase.co";

const securityHeaders = [
  // ── Strict Transport Security ──────────────────────────────
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // ── Prevent MIME sniffing ──────────────────────────────────
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // ── Block framing (clickjacking) ───────────────────────────
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // ── Referrer Policy ───────────────────────────────────────
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // ── Permissions Policy ────────────────────────────────────
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // ── Content Security Policy ───────────────────────────────
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js scripts + framer-motion inline scripts
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      // Allow inline styles (required by framer-motion and inline style props)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Google Fonts
      "font-src 'self' https://fonts.gstatic.com",
      // Images: self + base64 data URIs
      "img-src 'self' data: blob:",
      // API connections: app itself + Supabase
      `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}`,
      // No frames allowed
      "frame-src 'none'",
      "frame-ancestors 'none'",
      // No object embeds
      "object-src 'none'",
      // Base URI restricted
      "base-uri 'self'",
      // Form submission only to self
      "form-action 'self'",
      // Upgrade insecure requests in production
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to ALL routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // Disable X-Powered-By header (avoids fingerprinting)
  poweredByHeader: false,

  // React strict mode for better dev warnings
  reactStrictMode: true,
};

export default nextConfig;
