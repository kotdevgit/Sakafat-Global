import type { NextConfig } from "next";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** The Django origin that serves uploaded programme and episode images. */
function djangoOrigin() {
  const value = process.env.DJANGO_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

const django = djangoOrigin();

/**
 * next/image refuses to fetch from a remote host unless it is listed here, and
 * separately refuses hosts that resolve to a private IP as an SSRF guard. Local
 * development runs Django on loopback, so the override is enabled only for a
 * loopback host — a deployed Django on a public address never turns it on.
 */
const nextConfig: NextConfig = {
  images: {
    remotePatterns: django
      ? [
          {
            protocol: django.protocol.replace(":", "") as "http" | "https",
            hostname: django.hostname,
            port: django.port,
            pathname: "/media/**",
            search: "",
          },
        ]
      : [],
    dangerouslyAllowLocalIP: Boolean(django && LOOPBACK_HOSTS.has(django.hostname)),
  },
};

export default nextConfig;
