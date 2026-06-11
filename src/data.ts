/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Property, Invoice, EnforcementAction, ActivityLog, SystemSettings, User, EnforcementStage, AIInsight } from './types';

// Suleja LGA standard user roles
export const MOCK_USERS: User[] = [
  {
    id: 'USR-001',
    name: 'Ram-Zurat NIG LTD',
    email: 'admin@suleja.gov.ng',
    role: 'Super Admin',
    phone: '+234 803 111 2222',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
    ward: 'Towns Ward'
  },
  {
    id: 'USR-002',
    name: 'Muhammad Zubairu',
    email: 'chairman@suleja.gov.ng',
    role: 'LGA Admin',
    phone: '+234 802 333 4444',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=120',
    ward: 'Bakari Ward'
  },
  {
    id: 'USR-003',
    name: 'Abdulrahman Muhammad',
    email: 'officer@suleja.gov.ng',
    role: 'Tax Officer',
    phone: '+234 816 555 6666',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120',
    ward: 'Sabo Gari'
  },
  {
    id: 'USR-004',
    name: 'Umar Sani',
    email: 'agent@suleja.gov.ng',
    role: 'Field Agent',
    phone: '+234 703 777 8888',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=120',
    ward: 'Kutunbawa'
  },
  {
    id: 'USR-005',
    name: 'Salma Salihu',
    email: 'finance@suleja.gov.ng',
    role: 'Accountant',
    phone: '+234 805 999 0000',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120',
    ward: 'Towns Ward'
  },
  {
    id: 'USR-006',
    name: 'Simon Danjuma',
    email: 'resident@suleja.gov.ng',
    role: 'Taxpayer',
    phone: '+234 809 222 3333',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120',
    ward: 'Maje'
  }
];

export const SULEJA_WARDS = [
  { name: 'Sabo Gari', centerLat: 9.183, centerLng: 7.181 },
  { name: 'Kurmin Sarki', centerLat: 9.176, centerLng: 7.175 },
  { name: 'Iku Ward', centerLat: 9.191, centerLng: 7.188 },
  { name: 'Maje', centerLat: 9.155, centerLng: 7.202 },
  { name: 'Gauraka', centerLat: 9.215, centerLng: 7.234 },
  { name: 'Bakin Iku', centerLat: 9.201, centerLng: 7.212 },
  { name: 'Wambai', centerLat: 9.171, centerLng: 7.170 },
  { name: 'Towns Ward', centerLat: 9.178, centerLng: 7.182 },
  { name: 'Hashimi', centerLat: 9.181, centerLng: 7.177 },
  { name: 'Kaduna Road', centerLat: 9.195, centerLng: 7.168 },
  { name: 'Bagama A', centerLat: 9.168, centerLng: 7.180 },
  { name: 'Bagama B', centerLat: 9.163, centerLng: 7.185 },
  { name: 'Madalla', centerLat: 9.120, centerLng: 7.220 },
  { name: 'Kwamba', centerLat: 9.208, centerLng: 7.195 },
  { name: 'Chaza', centerLat: 9.199, centerLng: 7.205 }
];

export const DEFAULT_SETTINGS: SystemSettings = {
  residentialRate: 2.0, // 2%
  commercialRate: 4.0, // 4%
  industrialRate: 5.0, // 5%
  lgaName: 'Suleja Local Government Area',
  stateName: 'Niger State',
  penaltyRate: 10.0, // 10% formatting
  duePeriodDays: 30
};

// Simple pseudo-random generator to remain deterministic with Suleja data
function createSeededRandom(seed: number) {
  return function() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export function generateSulejaDemoData(): {
  properties: Property[];
  invoices: Invoice[];
  enforcement: EnforcementAction[];
  activityLogs: ActivityLog[];
} {
  const rand = createSeededRandom(12345); // Seeded random for determinism
  const properties: Property[] = [];
  const invoices: Invoice[] = [];
  const enforcement: EnforcementAction[] = [];
  const activityLogs: ActivityLog[] = [];

  const nigerianFirstNames = [
    'Abdullahi', 'Ibrahim', 'Musa', 'Yusuf', 'Amina', 'Fatima', 'Zainab', 'Shehu',
    'Chidi', 'Emeka', 'Ngozi', 'Nkechi', 'Babatunde', 'Olumide', 'Adebayo', 'Mariya',
    'Bashir', 'Sani', 'Aliyu', 'Habiba', 'Ahmed', 'Tunde', 'Kunle', 'Suleiman',
    'Obinna', 'Ifanyi', 'Uche', 'Aisha', 'Hadiza', 'Khadijah', 'Kelechi', 'Joy'
  ];

  const nigerianLastNames = [
    'Bello', 'Musa', 'Usman', 'Dikko', 'Okafor', 'Obi', 'Balogun', 'Adebayo',
    'Umar', 'Gadzama', 'Suleman', 'Nwachukwu', 'Chineye', 'Adewale', 'Alabi', 'Abubakar',
    'Lawan', 'Idris', 'Garba', 'Mohammed', 'Eze', 'Okeke', 'Fagbemi', 'Shittu',
    'Danjuma', 'Bako', 'YarAdua', 'Haruna', 'Sarki', 'Kolo', 'Maiyaki', 'Anka'
  ];

  const streets = [
    'Hassan Dallatu Road', 'Iku Road', 'Jubilee Road', 'Bida Road', 'Kaduna Road',
    'Abuja Road', 'Sarki Street', 'Dikko Close', 'Emir Palace Way', 'General Hospital Link',
    'Sabo Gari Market Road', 'Maje Bypass', 'Gauraka Crescent', 'Federal Housing Link',
    'Bakin Iku Avenue', 'Zuma Rock View Drive', 'LGA Secretariat Road', 'Ahmadu Bello Way'
  ];

  const ownerPics = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150'
  ];

  // Helper to generate a phone number
  const genPhone = () => {
    const prefix = ['0803', '0802', '0816', '0703', '0805', '0809', '0903'];
    const chosenPrefix = prefix[Math.floor(rand() * prefix.length)];
    const body = Math.floor(1000000 + rand() * 9000000).toString();
    return `+234 ${chosenPrefix.substring(1)} ${body.substring(0, 3)} ${body.substring(3)}`;
  };

  // Generate 512 properties (complying with "500+ properties in Suleja")
  for (let i = 1; i <= 512; i++) {
    const propertyId = `SLG-2026-${String(i).padStart(5, '0')}`;
    const first = nigerianFirstNames[Math.floor(rand() * nigerianFirstNames.length)];
    const last = nigerianLastNames[Math.floor(rand() * nigerianLastNames.length)];
    let ownerName = `${first} ${last}`;
    let ownerPhone = genPhone();
    let ownerEmail = `${first.toLowerCase()}.${last.toLowerCase()}@example.com`;

    if (i === 10) {
      ownerName = 'Simon Danjuma';
      ownerPhone = '+234 809 222 3333';
      ownerEmail = 'resident@suleja.gov.ng';
    } else if (i === 50) {
      ownerName = 'Simon Danjuma';
      ownerPhone = '+234 809 222 3333';
      ownerEmail = 'resident@suleja.gov.ng';
    }

    const wardObj = SULEJA_WARDS[Math.floor(rand() * SULEJA_WARDS.length)];
    const street = streets[Math.floor(rand() * streets.length)];
    const num = Math.floor(1 + rand() * 120);
    const address = `No. ${num}, ${street}, ${wardObj.name}`;

    // Property stats
    const propTypes: ('Residential' | 'Commercial' | 'Industrial')[] = ['Residential', 'Commercial', 'Industrial'];
    // 70% Residential, 22% Commercial, 8% Industrial
    const typeRoll = rand();
    const propertyType = typeRoll < 0.7 ? propTypes[0] : typeRoll < 0.92 ? propTypes[1] : propTypes[2];

    const units = propertyType === 'Residential' ? Math.floor(1 + rand() * 12) : propertyType === 'Commercial' ? Math.floor(2 + rand() * 25) : Math.floor(1 + rand() * 5);

    // Geographic jitter within ward center for realistic GIS
    const latJitter = (rand() - 0.5) * 0.015;
    const lngJitter = (rand() - 0.5) * 0.015;
    const latitude = wardObj.centerLat + latJitter;
    const longitude = wardObj.centerLng + lngJitter;

    // Rental value in Naira. Residential: 200k - 2M, Commercial: 1.5M - 15M, Industrial: 8M - 50M
    let annualRentalValue = 0;
    if (propertyType === 'Residential') {
      annualRentalValue = Math.round((250000 + rand() * 1750000) / 10000) * 10000;
    } else if (propertyType === 'Commercial') {
      annualRentalValue = Math.round((1500000 + rand() * 13500000) / 50000) * 50000;
    } else {
      annualRentalValue = Math.round((8000000 + rand() * 42000000) / 100000) * 100000;
    }

    // Rate percentage
    const ratePercentage = propertyType === 'Residential' ? 2.0 : propertyType === 'Commercial' ? 4.0 : 5.0;
    const tenementRate = annualRentalValue * (ratePercentage / 100);

    const occupancyStatuses: ('Occupied' | 'Vacant' | 'Owner Occupied')[] = ['Occupied', 'Vacant', 'Owner Occupied'];
    const occupancyStatus = occupancyStatuses[Math.floor(rand() * occupancyStatuses.length)];

    // Payment statuses: 60% Paid, 25% Unpaid, 15% Pending
    const payRoll = rand();
    const paymentStatus = payRoll < 0.60 ? 'Paid' : payRoll < 0.85 ? 'Unpaid' : 'Pending';

    properties.push({
      id: propertyId,
      ownerName,
      ownerPhone,
      ownerEmail,
      address,
      ward: wardObj.name,
      propertyType,
      units,
      latitude,
      longitude,
      annualRentalValue,
      ratePercentage,
      tenementRate,
      occupancyStatus,
      paymentStatus,
      imageUrl: ownerPics[Math.floor(rand() * ownerPics.length)],
      valuationDate: `2025-${Math.floor(1 + rand() * 12).toString().padStart(2, '0')}-${Math.floor(1 + rand() * 28).toString().padStart(2, '0')}`,
      lastBilledDate: '2026-01-15'
    });

    // Associated Invoice generator for bills history
    const invoiceId = `INV-2026-${String(i).padStart(5, '0')}`;
    const isPaid = paymentStatus === 'Paid';
    const isPending = paymentStatus === 'Pending';

    let invStatus: 'Paid' | 'Unpaid' | 'Overdue' = 'Unpaid';
    if (isPaid) invStatus = 'Paid';
    else if (isPending) invStatus = 'Unpaid';
    else {
      // Unpaid has 60% chance to be strictly overdue
      invStatus = rand() < 0.6 ? 'Overdue' : 'Unpaid';
    }

    const penaltyAmount = invStatus === 'Overdue' ? tenementRate * 0.10 : 0;
    const totalInvoiceAmount = tenementRate + penaltyAmount;

    invoices.push({
      id: invoiceId,
      propertyId,
      ownerName,
      amount: totalInvoiceAmount,
      ratePercentage,
      annualRentalValue,
      issuedDate: '2026-01-15',
      dueDate: '2026-02-15',
      status: invStatus,
      penaltyAmount,
      paymentMethod: isPaid ? (rand() < 0.4 ? 'Paystack' : rand() < 0.7 ? 'Flutterwave' : 'Cash') : undefined,
      paymentDate: isPaid ? `2026-02-${Math.floor(1 + rand() * 14).toString().padStart(2, '0')}` : undefined,
      transactionRef: isPaid ? `REF-${Math.floor(100000000 + rand() * 900000000)}` : undefined
    });

    // Enforcement notice for 8% of the properties (must be overdue unpaid)
    if (invStatus === 'Overdue' && rand() < 0.35 && enforcement.length < 40) {
      const enfStages: EnforcementStage[] = ['Notice Served', 'Final Demand Issued', 'Court Order Filed', 'Property Sealed'];
      const currentStage = enfStages[Math.floor(rand() * enfStages.length)];
      
      const enfId = `ENF-2026-${String(enforcement.length + 1).padStart(4, '0')}`;
      enforcement.push({
        id: enfId,
        propertyId,
        ward: wardObj.name,
        ownerName,
        address,
        stage: currentStage,
        amountOwed: totalInvoiceAmount,
        noticeDate: '2026-03-01',
        lastActionDate: `2026-04-${Math.floor(1 + rand() * 20).toString().padStart(2, '0')}`,
        notes: currentStage === 'Property Sealed' 
          ? 'Passed legal grace period. Property sealed by direct court warrant.' 
          : currentStage === 'Court Order Filed' 
          ? 'Court hearing slated at Magistrate Court Suleja.' 
          : 'Official Tenement Remonstrance notice delivered physically to principal.',
        evidenceUrl: currentStage === 'Property Sealed' ? 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&q=80&w=300' : undefined,
        sealedDate: currentStage === 'Property Sealed' ? '2026-04-10' : undefined,
        officerInCharge: MOCK_USERS[Math.floor(2 + rand() * 3)].name // Tax officers / Field Agents
      });
    }
  }

  // Activity Logs
  const activitiesList = [
    { action: 'Updated system settings', details: 'Residential rate percentage customized.' },
    { action: 'Property Registered', details: 'New commercial property assessed at No 44 Kaduna Road.' },
    { action: 'Payment Reconciled', details: 'Manual CASH payment captured for customer property SLG-2026-00104.' },
    { action: 'Invoice Dispatched', details: 'Annual tenement invoices batched and printed for Gauraka Ward.' },
    { action: 'Enforcement Seal Posted', details: 'Sealed defaulter property SLG-2026-00042 following court order.' },
    { action: 'Exported Revenue Report', details: 'Q1 compliance list serialized to PDF.' }
  ];

  for (let j = 1; j <= 40; j++) {
    const act = activitiesList[Math.floor(rand() * activitiesList.length)];
    const activeStaff = MOCK_USERS[Math.floor(rand() * 5)]; // SuperAdmin down to Accountant
    activityLogs.push({
      id: `LOG-2026-${String(j).padStart(4, '0')}`,
      userId: activeStaff.id,
      userName: activeStaff.name,
      userRole: activeStaff.role,
      action: act.action,
      timestamp: `2026-06-${Math.floor(1 + rand() * 8).toString().padStart(2, '0')}T${Math.floor(8 + rand() * 10).toString().padStart(2, '0')}:${Math.floor(10 + rand() * 49).toString().padStart(2, '0')}:00Z`,
      details: act.details,
      ipAddress: `192.168.10.${Math.floor(11 + rand() * 240)}`
    });
  }

  // Sort logs by timestamp decreasing
  activityLogs.sort((a,b) => b.timestamp.localeCompare(a.timestamp));

  return {
    properties,
    invoices,
    enforcement,
    activityLogs
  };
}

/**
 * Calculates customized client-side AI analysis & smart predictions for Suleja LGA.
 */
export function calculateAIInsights(properties: Property[], invoices: Invoice[]): AIInsight {
  const totalCount = properties.length;
  // Expected rate
  const totalExpectedRevenue = properties.reduce((sum, p) => sum + p.tenementRate, 0);

  // compliance calculation
  const paidProps = properties.filter(p => p.paymentStatus === 'Paid');
  const pathPaidRevenue = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);
  const complianceRate = Math.round((paidProps.length / totalCount) * 100);

  // Group by ward
  const wardBilling: Record<string, { total: number; paidCount: number; totalCount: number; unpaidAmount: number }> = {};
  SULEJA_WARDS.forEach(w => {
    wardBilling[w.name] = { total: 0, paidCount: 0, totalCount: 0, unpaidAmount: 0 };
  });

  properties.forEach(p => {
    const wb = wardBilling[p.ward] || { total: 0, paidCount: 0, totalCount: 0, unpaidAmount: 0 };
    wb.totalCount += 1;
    wb.total += p.tenementRate;
    if (p.paymentStatus === 'Paid') {
      wb.paidCount += 1;
    } else {
      wb.unpaidAmount += p.tenementRate;
    }
  });

  const lowComplianceZones = Object.keys(wardBilling).map(wardName => {
    const wb = wardBilling[wardName];
    const comp = wb.totalCount > 0 ? Math.round((wb.paidCount / wb.totalCount) * 100) : 0;
    return {
      ward: wardName,
      compliance: comp,
      count: wb.totalCount,
      unpaidAmount: Math.round(wb.unpaidAmount)
    };
  })
  .sort((a,b) => a.compliance - b.compliance) // lowest first
  .slice(0, 3); // top 3 low-compliance zones

  const predictedRevenue = Math.round(totalExpectedRevenue * (complianceRate / 100 + 0.08)); // Prediction offset

  return {
    totalExpectedRevenue: Math.round(totalExpectedRevenue),
    predictedRevenue: Math.round(predictedRevenue),
    complianceRate,
    lowComplianceZones,
    growthTrend: 6.8, // % growth estimate
    recommendations: [
      `Enforcement intervention recommended heavily in ${lowComplianceZones[0]?.ward || 'Maje'} due to a compliance rate of ${lowComplianceZones[0]?.compliance || 0}%.`,
      'Mobile collection posts implemented during the Sabo Gari market days are predicted to fetch ₦3.4M in outstanding arrears.',
      'Auto-escalate bills over 90 days past-due in Gauraka to Final Demand stage before Niger State Board of Internal Revenue review.',
      'Slight adjustment of Commercial tenement rates by +0.5% in industrial sectors like Maje could realize an additional ₦8.2M annually without causing business flight.'
    ]
  };
}
