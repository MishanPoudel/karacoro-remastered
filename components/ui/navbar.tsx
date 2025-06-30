"use client";

import { Button } from "@/components/ui/button";
import { Mic2 } from "lucide-react";
import Link from "next/link";

export function Navbar() {
  return (
    <nav className="fixed w-full z-50 bg-black/80 backdrop-blur border-b border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Mic2 className="h-6 w-6 text-red-500" />
            <span className="text-xl font-bold">VirtualKaraoke</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-gray-300 hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</Link>
            <Link href="#faq" className="text-gray-300 hover:text-white transition-colors">FAQ</Link>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" className="text-gray-300 hover:text-white">
              Log In
            </Button>
            <Button className="bg-red-500 hover:bg-red-600 transition-colors">
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}