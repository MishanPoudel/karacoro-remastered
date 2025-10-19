"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MarqueeBanner from '@/components/MarqueeBanner';
import { ArrowLeft, Send } from 'lucide-react';

export default function SponsorPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-900 text-white">
      <MarqueeBanner text={`Sponsor KaraCoro — sponsor a room, feature, or event · Contact: sponsor@karaoke-party.com`} />

      {/* HERO */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Partner with KaraCoro</h1>
          <p className="text-white max-w-3xl mx-auto mb-8">Put your brand in front of active music fans. Our sponsorships include in-room promotion, home page placement, and analytics so you can measure impact.</p>
          <div className="flex justify-center gap-3">
            <a href="mailto:sponsor@karaoke-party.com?subject=Sponsorship%20Inquiry" className="inline-block">
              <Button className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 px-6 py-3">Contact Sales</Button>
            </a>
            <Link href="/rooms" className="inline-block">
              <Button variant="outline" className="text-black border-red-500/30 hover:bg-red-500/10 hover:text-white">Browse Rooms</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-12 bg-gradient-to-br from-black/10 to-transparent">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid sm:grid-cols-3 gap-6">
            <Card className="p-5 bg-gray-900/80 border-red-500/10">
              <h4 className="font-semibold mb-2 text-white">High Visibility</h4>
              <p className="text-white text-sm">Feature placement in-room and on the home page to maximize impressions.</p>
            </Card>
            <Card className="p-5 bg-gray-900/80 border-red-500/10">
              <h4 className="font-semibold mb-2 text-white">Targeted Audiences</h4>
              <p className="text-white text-sm">Sponsor rooms by genre, region, or event to reach the right listeners.</p>
            </Card>
            <Card className="p-5 bg-gray-900/80 border-red-500/10">
              <h4 className="font-semibold mb-2 text-white">Actionable Analytics</h4>
              <p className="text-white text-sm">Get impression, click, and engagement metrics for every sponsorship.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">Sponsorship Packages</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 bg-gray-900/80 border-red-500/10">
              <h3 className="text-lg font-semibold mb-2 text-white">Starter</h3>
              <p className="text-white mb-4">Room-level sponsorships for single events or short campaigns.</p>
              <div className="mb-4 text-white">Starting at — contact us for a quote</div>
              <a href="mailto:sponsor@karaoke-party.com?subject=Starter%20Package" className="inline-block">
                <Button className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700">Inquire</Button>
              </a>
            </Card>

            <Card className="p-6 bg-gray-900/80 border-red-500/10">
              <h3 className="text-lg font-semibold mb-2 text-white">Growth</h3>
              <p className="text-white mb-4">Feature sponsorships and homepage promotion for sustained campaigns.</p>
              <div className="mb-4 text-white">Starting at — contact us for pricing</div>
              <a href="mailto:sponsor@karaoke-party.com?subject=Growth%20Package" className="inline-block">
                <Button className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700">Inquire</Button>
              </a>
            </Card>

            <Card className="p-6 bg-gray-900/80 border-red-500/10">
              <h3 className="text-lg font-semibold mb-2 text-white">Enterprise</h3>
              <p className="text-white mb-4">Custom integrations, co-branding, and dedicated analytics.</p>
              <div className="mb-4 text-white">Custom pricing</div>
              <a href="mailto:sponsor@karaoke-party.com?subject=Enterprise%20Package" className="inline-block">
                <Button className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700">Contact Sales</Button>
              </a>
            </Card>
          </div>
        </div>
      </section>

      {/* CONTACT / FAQ */}
      <section className="py-12 bg-gradient-to-br from-black/10 to-transparent">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <div>
              <h3 className="text-xl font-semibold mb-3">Ready to sponsor?</h3>
              <p className="text-white mb-4">Email us and include your goals (branding, event, or feature). We’ll reply with tailored options and sample creatives.</p>
              <a href="mailto:sponsor@karaoke-party.com?subject=Sponsorship%20Inquiry" className="inline-block">
                <Button className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"><Send className="w-4 h-4 mr-2"/> Email Sponsor Team</Button>
              </a>
            </div>

            <div>
              <h4 className="font-semibold mb-2">FAQ</h4>
              <div className="text-sm text-white">
                <p className="mb-2"><strong>How long do campaigns run?</strong> Typically 1–4 weeks depending on package.</p>
                <p className="mb-2"><strong>Do you provide creative specs?</strong> Yes — we provide image/text specs and can assist with creative placement.</p>
                <p><strong>Can I measure ROI?</strong> Absolutely — we provide impressions, clicks, and engagement metrics for each campaign.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
