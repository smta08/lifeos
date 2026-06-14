/** @type {import('next').NextConfig} */

// Content-Security-Policy. Scoped to the origins this app actually talks to:
// Fontshare (web fonts), Supabase (data + auth), the Gmail API (browser-side read-only
// scan), and blob/wasm for the in-browser pdf.js + Tesseract OCR workers. 'unsafe-inline'
// covers Next's hydration bootstrap and injected styles; 'wasm-unsafe-eval' is required by
// Tesseract's WebAssembly core. Tighten to a nonce-based policy if those constraints change.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline' https://api.fontshare.com",
  "font-src 'self' https://cdn.fontshare.com https://api.fontshare.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co https://*.fontshare.com https://gmail.googleapis.com https://www.googleapis.com https://accounts.google.com blob: data:",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), payment=(), usb=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

const nextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
