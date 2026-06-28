/** @type {import('next').NextConfig} */
const allowedDevOrigins = ["127.0.0.1"];

if (process.env.NEXT_PUBLIC_APP_URL) {
  try {
    const appHost = new URL(process.env.NEXT_PUBLIC_APP_URL).hostname;
    if (appHost && appHost !== "localhost" && !allowedDevOrigins.includes(appHost)) {
      allowedDevOrigins.push(appHost);
    }
  } catch {
    // Keep the default localhost origin when NEXT_PUBLIC_APP_URL is incomplete.
  }
}

const nextConfig = {
  allowedDevOrigins,
  typedRoutes: false
};

export default nextConfig;
