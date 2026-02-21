'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, ShoppingBag, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center border-b">
        <Link className="flex items-center justify-center" href="/">
          <ShoppingBag className="h-6 w-6 mr-2" />
          <span className="font-bold">Frewsie Shop</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/admin">
            Admin Portal
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Smart Campus Commerce
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Frewsie is your superapp for products, promotions, and branch management.
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/admin/products">
                  <Button size="lg">
                    Manage Products <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/admin/business">
                  <Button variant="outline" size="lg">
                    <ShieldCheck className="mr-2 h-4 w-4" /> Business Hub
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
