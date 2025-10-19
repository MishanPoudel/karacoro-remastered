"use client";

import { useState } from 'react';

export default function AdBanner() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    // Backdrop covers whole viewport; card is centered
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden
        onClick={() => setVisible(false)}
      />

      <div className="relative z-10 mx-4 w-full max-w-2xl rounded-lg bg-white shadow-xl ring-1 ring-gray-200">
        <div className="flex items-start justify-between gap-4 p-6">
          <div>
            <div className="text-lg font-semibold text-gray-900">Your ad here</div>
            <p className="mt-1 text-sm text-gray-600">Sponsor a room or feature — contact us at <a className="underline" href="mailto:sponsor@karaoke-party.com">sponsor@karaoke-party.com</a></p>
          </div>

          <div className="flex items-start gap-2">
            <a
              href="/sponsor"
              className="inline-flex items-center rounded-md bg-rose-600 px-3 py-1 text-sm font-medium text-white hover:bg-rose-700"
            >
              Sponsor
            </a>
            <button
              aria-label="close banner"
              onClick={() => setVisible(false)}
              className="rounded-md bg-transparent px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
