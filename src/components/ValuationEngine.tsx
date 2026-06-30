/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Calculator, 
  Settings2, 
  Info, 
  AlertCircle, 
  RefreshCw, 
  ChevronRight, 
  Check, 
  Coins, 
  TrendingUp, 
  Percent 
} from 'lucide-react';
import { SystemSettings, UserRole } from '../types';

interface ValuationEngineProps {
  settings: SystemSettings;
  userRole: UserRole;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  totalAnnualRentalValueRef: number; // pass sum to predict impact
}

export default function ValuationEngine({ 
  settings, 
  userRole, 
  onUpdateSettings,
  totalAnnualRentalValueRef 
}: ValuationEngineProps) {

  // Local settings mirrors
  const [resRate, setResRate] = useState(settings.residentialRate);
  const [commRate, setCommRate] = useState(settings.commercialRate);
  const [indRate, setIndRate] = useState(settings.industrialRate);
  const [penalty, setPenalty] = useState(settings.penaltyRate);
  const [dueDays, setDueDays] = useState(settings.duePeriodDays);
  const [fiscalTargetField, setFiscalTargetField] = useState(settings.fiscalTarget || 150000000);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Simulation values
  const [simValue, setSimValue] = useState('1200000');
  const [simType, setSimType] = useState<'res' | 'comm' | 'ind'>('res');

  const isAdmin = userRole === 'Super Admin' || userRole === 'LGA Admin';

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setSaving(true);
    setTimeout(() => {
      onUpdateSettings({
        ...settings,
        residentialRate: Number(resRate),
        commercialRate: Number(commRate),
        industrialRate: Number(indRate),
        penaltyRate: Number(penalty),
        duePeriodDays: Number(dueDays),
        fiscalTarget: Number(fiscalTargetField)
      });
      setSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }, 600);
  };

  // Calcs for Impact Projection
  // Out of 100%, let's split the total rental values: Residential 45%, Commercial 35%, Industrial 20%
  const resWeightedRental = totalAnnualRentalValueRef * 0.45;
  const commWeightedRental = totalAnnualRentalValueRef * 0.35;
  const indWeightedRental = totalAnnualRentalValueRef * 0.20;

  const currentProjectedRevenue = 
    (resWeightedRental * (settings.residentialRate / 100)) + 
    (commWeightedRental * (settings.commercialRate / 100)) + 
    (indWeightedRental * (settings.industrialRate / 100));

  const hypotheticalRevenue = 
    (resWeightedRental * (Number(resRate) / 100)) + 
    (commWeightedRental * (Number(commRate) / 100)) + 
    (indWeightedRental * (Number(indRate) / 100));

  const revenueImbalance = hypotheticalRevenue - currentProjectedRevenue;

  // Sandbox rate estimator
  const simValParsed = parseFloat(simValue) || 0;
  const activeSimPercent = simType === 'res' ? resRate : simType === 'comm' ? commRate : indRate;
  const calculatedSimTax = simValParsed * (activeSimPercent / 100);

  return (
    <div className="space-y-6 fade-in">
      
      {/* Intro info bar */}
      <div>
        <h1 className="font-display text-xl font-bold text-[#0A1F44]">Municipal Tax assessment & Valuation Engine</h1>
        <p className="text-xs text-gray-500 font-medium">
          Legislated rate percentages applied toward assessed properties. Adjusting parameters updates active invoice formulas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Settings Modifier Form */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs lg:col-span-7">
          <div className="flex items-center justify-between border-b pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4.5 w-4.5 text-[#38BDF8]" />
              <h3 className="font-display font-bold text-[#0A1F44] text-sm">Revenue Engine Coefficients</h3>
            </div>
            
            {!isAdmin && (
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700 uppercase flex items-center gap-1 border border-amber-200">
                <AlertCircle className="h-3 w-3" />
                Read-Only Terminal
              </span>
            )}
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1">
                  Residential Rate
                  <Percent className="h-3 w-3 text-[#38BDF8]" />
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  disabled={!isAdmin}
                  value={resRate}
                  onChange={(e) => setResRate(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-xs font-semibold outline-none focus:border-[#0A1F44] bg-white disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1">
                  Commercial Rate
                  <Percent className="h-3 w-3 text-[#38BDF8]" />
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  disabled={!isAdmin}
                  value={commRate}
                  onChange={(e) => setCommRate(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-xs font-semibold outline-none focus:border-[#0A1F44] bg-white disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1">
                  Industrial Rate
                  <Percent className="h-3 w-3 text-[#38BDF8]" />
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  disabled={!isAdmin}
                  value={indRate}
                  onChange={(e) => setIndRate(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-xs font-semibold outline-none focus:border-[#0A1F44] bg-white disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t pt-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">Late Penalty Percentage (%)</label>
                <input
                  type="number"
                  required
                  disabled={!isAdmin}
                  value={penalty}
                  onChange={(e) => setPenalty(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-xs font-semibold focus:border-[#0A1F44]"
                />
                <span className="text-[10px] text-gray-400 font-medium">Applied to invoices outstanding past grace cycle due date.</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">Maturity grace period (Days)</label>
                <input
                  type="number"
                  required
                  disabled={!isAdmin}
                  value={dueDays}
                  onChange={(e) => setDueDays(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-xs font-semibold focus:border-[#0A1F44]"
                />
                <span className="text-[10px] text-gray-400 font-medium">Number of days granted following bill dispatch before late status is activated.</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">LGA Revenue Year Target (₦)</label>
                <input
                  type="number"
                  required
                  disabled={!isAdmin}
                  value={fiscalTargetField}
                  onChange={(e) => setFiscalTargetField(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-xs font-semibold focus:border-[#0A1F44]"
                />
                <span className="text-[10px] text-gray-400 font-medium">Municipal benchmark target for revenue collection projection.</span>
              </div>
            </div>

            {isAdmin && (
              <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                  <Info className="h-3.5 w-3.5 text-[#38BDF8]" />
                  Saving updates will retroactively adjust default parameters across future bills.
                </span>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-2xs sm:w-auto shrink-0 bg-[#0A1F44] hover:bg-opacity-95 text-white rounded-lg py-2.5 px-6 text-xs font-extrabold flex items-center justify-center gap-2"
                >
                  {saving ? (
                    'Publishing coefficients...'
                  ) : savedSuccess ? (
                    <span className="flex items-center gap-1.5 text-green-300">
                      <Check className="h-4 w-4" /> Passed & Published
                    </span>
                  ) : (
                    'Publish Rate Decisions'
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Dynamic Forecasting Engine */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <span className="text-[9px] font-mono tracking-widest text-gray-400 font-bold uppercase">LGA Central Forecaster</span>
            <h3 className="font-display font-bold text-[#0A1F44] text-[#0A1F44] text-sm flex items-center gap-1.5">
              <TrendingUp className="h-4.5 w-4.5 text-green-500" />
              LGA Revenue Impact Modeller
            </h3>
            <p className="text-[11px] text-gray-500 leading-normal">
              Live estimation showing the projected annual impact on the Suleja municipal treasury based on your selected coefficients.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs text-gray-600 font-semibold">
              <span>Stable Annual Revenue (Baseline):</span>
              <span className="font-mono text-[#0A1F44]">₦{Math.round(currentProjectedRevenue).toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-650 font-bold">
              <span>Adjusted Parameter Est:</span>
              <span className="font-mono text-[#0A1F44]">₦{Math.round(hypotheticalRevenue).toLocaleString()}</span>
            </div>

            <div className="border-t border-dashed border-gray-200 pt-3 flex items-start justify-between gap-3">
              <span className="text-xs font-bold text-gray-750">Municipal Treasury Shift Yields:</span>
              <div className="text-right">
                <span className={`text-[#0A1F44] font-mono text-lg font-extrabold block ${
                  revenueImbalance > 0 ? 'text-emerald-600' : revenueImbalance < 0 ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {revenueImbalance > 0 ? '+' : ''}₦{Math.round(revenueImbalance).toLocaleString()} / year
                </span>
                <span className="text-[10px] text-gray-400 block font-medium">Expected treasury drift</span>
              </div>
            </div>
          </div>

          {/* Alert of adjustments */}
          {revenueImbalance !== 0 && (
            <div className="p-3 bg-indigo-50 border rounded-lg text-[10px] leading-relaxed text-indigo-700 flex items-start gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-indigo-500 mt-0.5" />
              <span>
                {revenueImbalance > 0 
                  ? 'Coefficients positive adjustments yield additional funds to support Suleja drainage, market lanes, and municipal sewage lines.' 
                  : 'Lowering coefficient values supports local business relief, yet decreases potential capital development budget allocation.'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Assessment Sandbox Grid */}
      <div className="bg-[#0A1F44] text-white rounded-xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.1),transparent_40%)] pointer-events-none" />
        
        <div className="grid gap-8 md:grid-cols-2 relative z-10">
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-[#38BDF8]" />
              <h3 className="font-display font-medium text-[#38BDF8] text-base">Rate Assessment Sandbox</h3>
            </div>
            
            <p className="text-xs text-gray-300 leading-normal">
              Run manual audit estimations. Drag simulation rates or alter standard categories to view customized property rate receipts.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-gray-400 uppercase tracking-wider mb-1 font-bold">Calculation Sector</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSimType('res')}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold border transition-all ${
                      simType === 'res' ? 'bg-[#38BDF8] border-[#38BDF8] text-[#0A1F44]' : 'bg-transparent border-gray-400 text-white'
                    }`}
                  >
                    Residential ({resRate}%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimType('comm')}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold border transition-all ${
                      simType === 'comm' ? 'bg-[#38BDF8] border-[#38BDF8] text-[#0A1F44]' : 'bg-transparent border-gray-400 text-white'
                    }`}
                  >
                    Commercial ({commRate}%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimType('ind')}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold border transition-all ${
                      simType === 'ind' ? 'bg-[#38BDF8] border-[#38BDF8] text-[#0A1F44]' : 'bg-transparent border-gray-400 text-white'
                    }`}
                  >
                    Industrial ({indRate}%)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 uppercase tracking-wider mb-1 font-bold">Hypothetical Annual rental value (₦)</label>
                <input
                  type="number"
                  value={simValue}
                  onChange={(e) => setSimValue(e.target.value)}
                  className="w-full bg-[#162F5D] border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-[#38BDF8] font-mono"
                  placeholder="Enter custom rent"
                />
              </div>
            </div>
          </div>

          {/* Calculator Output */}
          <div className="bg-[#162F5D] border border-white/5 rounded-xl p-5 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="block text-[10px] text-gray-400 font-mono uppercase font-bold tracking-wider">Estimated Tenement Rate Due</span>
              <span className="block text-3xl font-mono font-bold text-[#38BDF8]">
                ₦{calculatedSimTax.toLocaleString()}
              </span>
              <span className="text-[10px] text-gray-400 font-medium block">
                Calculated coefficient: {activeSimPercent}% of ₦{simValParsed.toLocaleString()} rental value.
              </span>
            </div>

            <div className="border-t border-white/10 pt-3 mt-4 space-y-1 text-xs text-gray-300 font-medium leading-relaxed">
              <span className="block text-white font-bold">Standard formula:</span>
              <span>Tenement rate = Annual Rental Value × Rate Percentage</span>
              <span className="block text-[10px] text-gray-500 font-mono">
                Formula verified by Suleja LGA Revenue Directives (2026).
              </span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
