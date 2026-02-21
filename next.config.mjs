/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Ensure the app starts on the port provided by the environment
  serverRuntimeConfig: {
    port: process.env.PORT || 3000,
  },
};

export default nextConfig;