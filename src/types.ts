/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 
  | 'Super Admin'
  | 'LGA Admin'
  | 'Tax Officer'
  | 'Field Agent'
  | 'Accountant'
  | 'Taxpayer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  ward?: string;
  propertyId?: string;
}

export type PropertyType = 'Residential' | 'Commercial' | 'Industrial';
export type OccupancyStatus = 'Occupied' | 'Vacant' | 'Owner Occupied';
export type TaxPaymentStatus = 'Paid' | 'Unpaid' | 'Pending';

export interface Property {
  id: string; // Format: SLG-2026-XXXXX
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  address: string;
  ward: string; // Suleja wards: Sabo Gari, Kurmin Sarki, Iku, Maje, Gauraka, Hashimi, Bakin Iku, Wambai, Towns Ward, Kaduna Road
  propertyType: PropertyType;
  units: number;
  latitude: number;
  longitude: number;
  annualRentalValue: number;
  ratePercentage: number; // e.g., 2 for 2%, 4 for 4%, 5 for 5%
  tenementRate: number; // annualRentalValue * (ratePercentage / 100)
  occupancyStatus: OccupancyStatus;
  paymentStatus: TaxPaymentStatus;
  imageUrl?: string;
  valuationDate: string;
  lastBilledDate: string;
  inspectorName?: string;
  attachments?: PropertyAttachment[];
}

export interface PropertyAttachment {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
  type: string;
}

export interface Invoice {
  id: string; // Format: INV-2026-XXXXX
  propertyId: string;
  ownerName: string;
  amount: number;
  ratePercentage: number;
  annualRentalValue: number;
  dueDate: string;
  issuedDate: string;
  status: 'Paid' | 'Unpaid' | 'Overdue' | 'Pending Approval';
  penaltyAmount: number;
  paymentMethod?: 'Paystack' | 'Flutterwave' | 'Cash' | 'Bank Transfer';
  paymentDate?: string;
  transactionRef?: string;
  receiptUrl?: string;
  receiptNotes?: string;
}

export type EnforcementStage = 
  | 'Notice Served' 
  | 'Final Demand Issued' 
  | 'Court Order Filed' 
  | 'Property Sealed' 
  | 'Resolved';

export interface EnforcementAction {
  id: string;
  propertyId: string;
  ward: string;
  ownerName: string;
  address: string;
  stage: EnforcementStage;
  amountOwed: number;
  noticeDate: string;
  lastActionDate: string;
  notes: string;
  gpsCoordinates?: string;
  evidenceUrl?: string;
  sealedDate?: string;
  officerInCharge: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  timestamp: string;
  details: string;
  ipAddress?: string;
}

export interface SystemSettings {
  residentialRate: number; // Default 2
  commercialRate: number; // Default 4
  industrialRate: number; // Default 5
  lgaName: string; // Suleja Local Government Area
  stateName: string; // Niger State
  penaltyRate: number; // Default 10% for overdue bills
  duePeriodDays: number; // Default 30 days
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  timestamp: string;
  read: boolean;
}

export interface AIInsight {
  totalExpectedRevenue: number;
  predictedRevenue: number;
  complianceRate: number;
  lowComplianceZones: { ward: string; compliance: number; count: number; unpaidAmount: number }[];
  growthTrend: number; // percentage
  recommendations: string[];
}

export interface AppBackup {
  id: string;
  timestamp: string;
  propertiesCount: number;
  invoicesCount: number;
  enforcementCount: number;
  logsCount: number;
  data: {
    properties: Property[];
    invoices: Invoice[];
    enforcement: EnforcementAction[];
    activityLogs: ActivityLog[];
    settings: SystemSettings;
  };
  sizeKb: number;
  type: 'automatic' | 'manual';
}
