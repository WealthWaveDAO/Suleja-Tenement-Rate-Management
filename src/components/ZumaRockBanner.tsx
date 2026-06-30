/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Landmark, ArrowRight, CheckCircle2, MapPin, Compass } from 'lucide-react';
import { User } from '../types';
const zumaRockImage = '/src/assets/images/zuma_rock_atmospheric_1781044432807.png';

interface ZumaRockBannerProps {
  onOpenLogin: () => void;
  onOpenTaxpayerLogin?: () => void;
  currentUser?: User | null;
}

export default function ZumaRockBanner({ onOpenLogin, onOpenTaxpayerLogin, currentUser = null }: ZumaRockBannerProps) {
  return (
    <div id="zuma-rock-banner-hero" className="relative h-[620px] sm:h-[650px] lg:h-[680px] w-full flex items-center justify-center overflow-hidden border-b border-gray-200">
      {/* Background Image with motion styling */}
      <img
        src={zumaRockImage}
        alt="Zuma Rock, Suleja, Niger State at Sunset"
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none scale-102 transition-transform duration-1000"
        referrerPolicy="no-referrer"
      />

      {/* Layered Cinematic Overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0A1F44] via-[#0A1F44]/95 to-[#0A1F44]/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A1F44] via-transparent to-[#0A1F44]/50" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.18),transparent_50%)]" />

      {/* Hero Content Container */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full z-10">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          
          {/* Main textual brief */}
          <div className="lg:col-span-8 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-[#38BDF8] border border-white/10 backdrop-blur-md">
              <CheckCircle2 className="h-4 w-4 animate-pulse text-emerald-400" />
              <span>OFFICIAL NIGER STATE DIGITAL REVENUE INITIATIVE</span>
            </div>

            <h1 className="font-display text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl uppercase leading-none">
              SULEJA LOCAL GOVERNMENT <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38BDF8] via-emerald-300 to-teal-400">
                DIGITAL TENEMENT RATE
              </span> PLATFORM
            </h1>

            <p className="max-w-2xl text-sm sm:text-base md:text-lg text-gray-200 leading-relaxed font-medium">
              A modernized and highly secure digital administrative channel. Fully integrated property registers, real-time rate assessments based on official statutes, fast web-powered payments, and precise coordinate-verified enforcement records.
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-4 pt-2">
              <a
                href="#bill-search"
                className="inline-flex items-center justify-center rounded-xl bg-[#38BDF8] px-6 py-3.5 text-sm font-extrabold text-[#0A1F44] shadow-xl hover:bg-opacity-95 transition-all hover:scale-102"
              >
                <span>Pay Your Bill Online</span>
                <ArrowRight className="ml-2 h-4 w-4 text-[#0A1F44]" />
              </a>
              {!currentUser && onOpenTaxpayerLogin && (
                <button
                  type="button"
                  onClick={onOpenTaxpayerLogin}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-xl hover:bg-emerald-700 transition-all hover:scale-102 cursor-pointer border-none"
                >
                  <span>Taxpayer Access</span>
                  <ArrowRight className="ml-2 h-4 w-4 text-white" />
                </button>
              )}
              <button
                onClick={onOpenLogin}
                className="rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md shadow-md transition-all hover:bg-white/10 cursor-pointer"
              >
                {currentUser ? `Go to Console (${currentUser.name})` : 'Portal Login (Staff)'}
              </button>
            </div>


          </div>

          {/* Majestic Zuma Rock Info Badge on the side */}
          <div className="hidden lg:block lg:col-span-4 justify-self-end">
            <div className="bg-[#0A1F44]/80 backdrop-blur-xl rounded-2xl p-5 border border-white/10 text-white shadow-2xl space-y-4 max-w-sm">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-[10px] font-mono text-gray-400 tracking-wider">LGA SYMBOL</span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#38BDF8] uppercase tracking-wider">
                  <MapPin className="h-3 w-3 animate-pulse" />
                  Suleja Landmark
                </span>
              </div>
              
              <div className="space-y-1.5">
                <h3 className="font-display text-lg font-bold uppercase tracking-wider text-white">
                  Zuma Rock
                </h3>
                <p className="text-[11px] text-gray-300 leading-relaxed font-semibold">
                  Standing proudly at 725 meters, the iconic monolith serves as the glorious gateway to Suleja LGA, symbolizing resilience, unity, and continuous municipal transformation.
                </p>
              </div>

              <div className="border-t border-white/5 pt-3 grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-400">
                <div>
                  <span className="block font-sans text-[8px] uppercase tracking-wider text-gray-500 font-bold">Coordinates</span>
                  <span className="text-gray-300 text-[10px]">9.1292° N, 7.2307° E</span>
                </div>
                <div>
                  <span className="block font-sans text-[8px] uppercase tracking-wider text-gray-500 font-bold">Elevation</span>
                  <span className="text-gray-300 text-[10px]">725m (2,379 ft)</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
