import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { FirebaseClientProvider } from "@/firebase/client-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Frewsie Shop | Admin",
  description: "Next-generation campus commerce and business management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <FirebaseClientProvider>
          {children}
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
