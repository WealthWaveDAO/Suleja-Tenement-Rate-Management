/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Landmark, Search, Calculator, ShieldAlert, HeartHandshake, CheckCircle2, CreditCard, ChevronRight, BarChart3, HelpCircle, MapPin, Compass, MessageSquare, Send, X, Sparkles } from 'lucide-react';
import { Property, Invoice } from '../types';
import ZumaRockBanner from './ZumaRockBanner';

interface LandingPageProps {
  properties: Property[];
  invoices: Invoice[];
  onOpenLogin: () => void;
  onQuickPay: (propertyId: string) => void;
}

export default function LandingPage({ properties, invoices, onOpenLogin, onQuickPay }: LandingPageProps) {
  // State managers for AI Taxpayer chatbot
  const [isOpenChat, setIsOpenChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: 'Peace be upon you! Greetings. I am your Suleja LGA Taxpayer Assistant. Ask me anything about rate percentages, property codes, or Kuda Bank transfer procedures.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSendChatMessage = async (presetText?: string) => {
    const textToSend = presetText || chatInput;
    if (!textToSend.trim()) return;

    const userMsg = {
      sender: 'user' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setChatMessages(prev => [...prev, userMsg]);
    if (!presetText) setChatInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: textToSend,
          history: chatMessages.map(m => ({ sender: m.sender === 'bot' ? 'model' : 'user', text: m.text }))
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Connection breakdown talking to Suleja Assistant.');
      }

      setChatMessages(prev => [...prev, {
        sender: 'bot',
        text: data.reply || "Representative query logged but reply returned blank.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (err: any) {
      console.error("Suleja Bot exception:", err);
      setChatMessages(prev => [...prev, {
        sender: 'bot',
        text: `Assistant reflecting: ${err?.message || 'Check your workspace connection. Verify that GEMINI_API_KEY is active.'}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickPrompts = [
    "What are the rate percentages?",
    "Where do I pay my tenement rates?",
    "Is my property code tax active?"
  ];

  const [calcType, setCalcType] = useState<'Residential' | 'Commercial' | 'Industrial'>('Residential');
  const [calcValue, setCalcValue] = useState<string>('500000');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Property[]>([]);
  const [searched, setSearched] = useState(false);

  // Quick Rate calculation
  const getRatePercent = (type: string) => {
    if (type === 'Residential') return 2;
    if (type === 'Commercial') return 4;
    return 5;
  };

  const valuationVal = parseFloat(calcValue) || 0;
  const calculatedTax = valuationVal * (getRatePercent(calcType) / 100);

  // Search property bill public-facing
  const handlePublicSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const query = searchQuery.toLowerCase().trim();
    const matches = properties.filter(
      p => 
        p.id.toLowerCase().includes(query) || 
        p.ownerName.toLowerCase().includes(query) ||
        p.ownerPhone.toLowerCase().includes(query)
    ).slice(0, 5);
    setSearchResults(matches);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-sans text-[#0A1F44]">
      {/* Top Navbar */}
      <nav id="landing-nav" className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg bg-[#0A1F44] p-1.5 shadow-md border border-white/10 shrink-0">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/b/bc/Coat_of_arms_of_Nigeria.svg" 
                alt="Nigerian Coat of Arms Logo" 
                className="h-8 w-8 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="block font-display text-lg font-bold tracking-tight text-[#0A1F44]">SULEJA LGA</span>
              <span className="block text-xs font-semibold tracking-widest text-[#38BDF8]">REVENUE PORTAL</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <a href="#features" className="hidden text-sm font-medium text-gray-600 hover:text-[#0A1F44] md:inline">Benefits</a>
            <a href="#calculator" className="hidden text-sm font-medium text-gray-600 hover:text-[#0A1F44] md:inline">Rate Calculator</a>
            <a href="#bill-search" className="hidden text-sm font-medium text-gray-600 hover:text-[#0A1F44] md:inline">Quick Bill Search</a>
            <button 
              id="btn-nav-login"
              onClick={onOpenLogin}
              className="rounded-lg bg-[#0A1F44] px-5 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-opacity-90 hover:text-[#38BDF8]"
            >
              Staff & Taxpayer Login
            </button>
          </div>
        </div>
      </nav>

      {/* Zuma Rock Atmospheric Banner Hero Section */}
      <ZumaRockBanner onOpenLogin={onOpenLogin} />

      {/* Feature Section */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-16">
            <span className="text-sm font-bold tracking-widest text-[#38BDF8] uppercase">Platform Framework</span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#0A1F44] sm:text-4xl">
              Modernizing Suleja Local Revenue Management
            </h2>
            <p className="mx-auto max-w-2xl text-gray-600 text-sm sm:text-base">
              A transparent, high-performance digitized workflow eliminating leakages, boosting local compliance, and granting taxpayers absolute peace of mind.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1 */}
            <div className="rounded-xl bg-white p-6 shadow-xs border border-gray-100 space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#F5F7FA] text-[#0A1F44]">
                <Calculator className="h-6 w-6 text-[#38BDF8]" />
              </div>
              <h3 className="font-display font-semibold text-lg text-[#0A1F44]">Valuation & Digital Assessing</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Seamless assessment calculations mapping rental value and property size using legislated percentages. Completely auditable engine.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-xl bg-white p-6 shadow-xs border border-gray-100 space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#F5F7FA] text-[#0A1F44]">
                <BarChart3 className="h-6 w-6 text-[#38BDF8]" />
              </div>
              <h3 className="font-display font-semibold text-lg text-[#0A1F44]">GIS Mapping & Intelligence</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Every property logged with accurate GPS coordinates within ward bounds. Color-coded pinpoint status indicates payment status instantly.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-xl bg-white p-6 shadow-xs border border-gray-100 space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#F5F7FA] text-[#0A1F44]">
                <CreditCard className="h-6 w-6 text-[#38BDF8]" />
              </div>
              <h3 className="font-display font-semibold text-lg text-[#0A1F44]">Direct Bank Transfer Settle</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Ditch complex online gateways. Settle billed tenement rates by direct wire transfer to Kuda MFB account and upload transfer receipts for auditing.
              </p>
            </div>

            {/* Card 4 */}
            <div className="rounded-xl bg-white p-6 shadow-xs border border-gray-100 space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#F5F7FA] text-[#0A1F44]">
                <ShieldAlert className="h-6 w-6 text-[#38BDF8]" />
              </div>
              <h3 className="font-display font-semibold text-lg text-[#0A1F44]">Enforcement & Remonstrance</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Automated outstanding tracking with multi-stage legal notice generation. Provides photo evidence lockers for sealed properties.
              </p>
            </div>

            {/* Card 5 */}
            <div className="rounded-xl bg-white p-6 shadow-xs border border-gray-100 space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#F5F7FA] text-[#0A1F44]">
                <CheckCircle2 className="h-6 w-6 text-[#38BDF8]" />
              </div>
              <h3 className="font-display font-semibold text-lg text-[#0A1F44]">Systemic Audit Trails</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Role-based logins trigger complete system recording. Every reassessment, manual ledger balance, or bill modification logs timestamp and IP.
              </p>
            </div>

            {/* Card 6 */}
            <div className="rounded-xl bg-white p-6 shadow-xs border border-gray-100 space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#F5F7FA] text-[#0A1F44]">
                <HeartHandshake className="h-6 w-6 text-[#38BDF8]" />
              </div>
              <h3 className="font-display font-semibold text-lg text-[#0A1F44]">AI Compliance Diagnostic</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Predict expected revenue targets, pinpoint low-compliance neighborhoods, and formulate dynamic tax decisions with direct advice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tax Quick Calculator & Public Search Portal Grid */}
      <section className="py-16 bg-white border-y border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            
            {/* Interactive Calculator Portal */}
            <div id="calculator" className="bg-[#F5F7FA] rounded-xl p-8 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="h-5 w-5 text-[#38BDF8]" />
                <h3 className="font-display text-xl font-bold">Tenement Rate Assessor Calculator</h3>
              </div>
              <p className="text-xs text-gray-500 mb-6 font-medium">
                Estimate your rate. The Suleja Local Government Tenement rate is calculated as: Annual Rental Value × Category Rate %
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Property Category</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['Residential', 'Commercial', 'Industrial'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCalcType(t)}
                        className={`rounded-lg py-2.5 text-xs font-bold border transition-all ${
                          calcType === t 
                            ? 'bg-[#0A1F44] border-[#0A1F44] text-white' 
                            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {t} ({getRatePercent(t)}%)
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Annual Rental Value (₦)</label>
                  <input
                    type="number"
                    value={calcValue}
                    onChange={(e) => setCalcValue(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0A1F44] font-mono"
                    placeholder="Enter Annual rental estimate"
                  />
                </div>

                {valuationVal > 0 && (
                  <div className="p-4 rounded-lg bg-sky-50 border border-[#38BDF8]/20 mt-6 space-y-1">
                    <span className="block text-xs uppercase font-bold tracking-wider text-gray-500">Estimated Tenement Rate (Annual)</span>
                    <span className="block text-3xl font-extrabold text-[#0A1F44] font-mono">
                      ₦{calculatedTax.toLocaleString()}
                    </span>
                    <span className="block text-[10px] text-gray-500">
                      Formulated at {getRatePercent(calcType)}% rate percentage of ₦{valuationVal.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Bill Search (Real Mock System Search of properties) */}
            <div id="bill-search" className="bg-white p-2 sm:p-4 rounded-xl border border-gray-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Search className="h-5 w-5 text-[#38BDF8]" />
                  <h3 className="font-display text-xl font-bold">Public Taxpayer Billing Lookup</h3>
                </div>
                <p className="text-xs text-gray-500 mb-6 font-medium">
                  Search the official registry using your Owner Name, Phone, or Property ID (e.g. search <code className="bg-gray-100 rounded px-1 text-[#0A1F44] font-mono">SLG-2026-00001</code> or <code className="bg-gray-100 rounded px-1 text-[#0A1F44] font-mono">Bello</code>) to check dues and pay instantly.
                </p>

                <form onSubmit={handlePublicSearch} className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter Property ID or Owner Name..."
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm outline-none focus:border-[#0A1F44]"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-[#0A1F44] px-4 py-2 text-sm font-semibold text-white hover:bg-opacity-90 flex items-center gap-1.5"
                  >
                    <Search className="h-4 w-4" />
                    Query
                  </button>
                </form>

                {searched && (
                  <div className="mt-6 space-y-3">
                    {searchResults.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                        No property found matching "{searchQuery}". Try "Bello" or "Musa".
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        <span className="block text-xs font-bold text-gray-400">Match Found</span>
                        {searchResults.map((property) => {
                          const isPaid = property.paymentStatus === 'Paid';
                          return (
                            <div 
                              key={property.id} 
                              className="rounded-lg border border-gray-200 p-3 sm:p-4 bg-gray-50 flex items-center justify-between gap-4 transition-all hover:border-[#38BDF8]"
                            >
                              <div className="min-w-0">
                                <span className="inline-block rounded-md bg-[#0A1F44]/5 px-2 py-0.5 text-[10px] font-bold font-mono text-[#0A1F44] mb-1">
                                  {property.id}
                                </span>
                                <h4 className="font-semibold text-sm text-gray-900 truncate">{property.ownerName}</h4>
                                <p className="text-xs text-gray-500 truncate">{property.address}</p>
                                <span className="block text-xs font-bold text-gray-600 mt-1 font-mono">
                                  Tenement Rate: ₦{property.tenementRate.toLocaleString()}
                                </span>
                              </div>

                              <div className="flex flex-col items-end shrink-0 gap-2">
                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                  isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {property.paymentStatus}
                                </span>
                                {!isPaid && (
                                  <button
                                    onClick={() => onQuickPay(property.id)}
                                    className="rounded-lg bg-[#38BDF8] hover:bg-opacity-95 text-[#0A1F44] px-4 py-1.5 text-xs font-bold shadow-xs transition-transform hover:scale-103"
                                  >
                                    Pay Bill
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Citizen assistance disclaimer */}
              <div className="mt-6 flex items-start gap-2 text-xs text-gray-500 border-t border-gray-100 pt-4">
                <HelpCircle className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                <span>
                  For corrections of property assessment values or physical assessment requests, please visit the Suleja LGA Secretariat, Niger State. Working hours: Monday to Friday, 8:00 AM — 4:00 PM.
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Official Footer Banner */}
      <footer className="bg-[#0A1F44] text-white py-12 border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/10 pb-8 mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white/10 p-1.5 shadow-md border border-white/10 shrink-0">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/b/bc/Coat_of_arms_of_Nigeria.svg" 
                  alt="Nigerian Coat of Arms Logo" 
                  className="h-10 w-10 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <span className="block font-display text-lg font-bold">SULEJA LOCAL GOVERNMENT AREA</span>
                <span className="block text-xs uppercase tracking-widest text-[#38BDF8] font-semibold">Niger State, Nigeria</span>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={onOpenLogin} className="text-xs text-gray-300 hover:text-[#38BDF8]">Dashboard Portal</button>
              <span className="text-gray-500">•</span>
              <a href="#features" className="text-xs text-gray-300 hover:text-[#38BDF8]">Service Features</a>
              <span className="text-gray-500">•</span>
              <a href="#calculator" className="text-xs text-gray-300 hover:text-[#38BDF8]">Estimator</a>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <span>© 2026 Suleja Local Government Digital Revenue Platform. All Rights Reserved.</span>
            <span>Powered by Niger State Board of Internal Revenue & Ministry of Local Government.</span>
          </div>
        </div>
      </footer>

      {/* Floating Chatbot Widget Button and Interactive Dialog */}
      <div className="fixed bottom-6 right-6 z-50 font-sans">
        {isOpenChat ? (
          <div className="w-[350px] sm:w-[400px] h-[500px] rounded-2xl bg-white border border-gray-150 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
            {/* Header section with Nigerian context styling */}
            <div className="p-4 bg-[#0A1F44] text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/20">
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/b/bc/Coat_of_arms_of_Nigeria.svg" 
                    alt="LGA crest" 
                    className="h-6 w-6 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-xs leading-none flex items-center gap-1.5">
                    Suleja Assistant <Sparkles className="h-3 w-3 text-sky-400 animate-pulse animate-duration-1000" />
                  </h4>
                  <span className="text-[9px] text-[#38BDF8] tracking-widest font-mono font-semibold">ONLINE REVENUE ADVICE</span>
                </div>
              </div>
              <button 
                onClick={() => setIsOpenChat(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Conversation Log Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#F8FAFC]">
              {chatMessages.map((m, idx) => {
                const isBot = m.sender === 'bot';
                return (
                  <div key={idx} className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs ${
                      isBot 
                        ? 'bg-white border border-gray-100 text-gray-800 rounded-tl-none shadow-xs leading-normal' 
                        : 'bg-[#0A1F44] text-white rounded-tr-none shadow-sm leading-normal'
                    }`}>
                      <p className="whitespace-pre-line">{m.text}</p>
                    </div>
                    <span className="text-[8px] text-gray-400 mt-1 font-mono">{m.time}</span>
                  </div>
                );
              })}
              
              {isTyping && (
                <div className="flex items-start gap-2">
                  <div className="bg-white border rounded-full px-3 py-2 text-xs text-gray-500 rounded-tl-none flex items-center gap-1.5 shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* suggestion quick action options */}
            <div className="p-2 border-t bg-[#F1F5F9] flex gap-1.5 overflow-x-auto scrollbar-none shrink-0">
              {quickPrompts.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendChatMessage(p)}
                  className="rounded-full bg-white border border-gray-200 text-slate-700 text-[10px] font-bold px-3 py-1 hover:border-[#38BDF8] hover:text-[#0A1F44] transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Input typing section */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChatMessage();
              }}
              className="p-3 border-t bg-white flex gap-2 items-center shrink-0"
            >
              <input
                type="text"
                placeholder="Ask our virtual tax assistant..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isTyping}
                className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2 text-xs outline-none focus:border-[#0A1F44]"
              />
              <button
                type="submit"
                disabled={isTyping || !chatInput.trim()}
                className="rounded-xl bg-[#0A1F44] hover:bg-opacity-95 text-[#38BDF8] p-2 transition-all cursor-pointer shadow-md disabled:bg-slate-100 disabled:text-slate-300"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        ) : (
          <button
            onClick={() => setIsOpenChat(true)}
            className="flex items-center gap-2 rounded-full bg-[#0A1F44] hover:bg-[#0A1F44]/95 text-white shadow-2xl px-4 py-3.5 border-2 border-white/20 transition-all hover:scale-105 active:scale-95 group font-bold tracking-tight text-xs cursor-pointer"
          >
            <MessageSquare className="h-5 w-5 text-[#38BDF8] transition-transform group-hover:rotate-12" />
            <span>Suleja Tax Assistant</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
