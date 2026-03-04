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
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.vercel.app https://*.supabase.co",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.supabase.com wss://*.supabase.com https://*.vercel.app",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
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
