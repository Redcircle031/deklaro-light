/**
 * KSeF (Krajowy System e-Faktur) API Types
 * Polish National e-Invoice System
 */

export type KSeFEnvironment = 'test' | 'production';

export interface KSeFConfig {
  environment: KSeFEnvironment;
  apiUrl: string;
  certificatePath?: string;
  certificatePassword?: string;
  nip: string; // Company's tax ID
}

export interface KSeFSessionToken {
  token: string;
  expiresAt: Date;
  sessionId: string;
}

export interface KSeFInvoiceSubmission {
  invoiceId: string;
  fa3Xml: string;
  metadata?: Record<string, unknown>;
}

export interface KSeFSubmissionResponse {
  success: boolean;
  ksefNumber?: string;
  referenceNumber?: string;
  timestamp?: Date;
  error?: KSeFError;
}

export interface KSeFError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface KSeFInvoiceStatus {
  ksefNumber: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  upoUrl?: string;
  processingDate?: Date;
  error?: KSeFError;
}

export interface KSeFUPODocument {
  ksefNumber: string;
  content: Buffer;
  contentType: string;
  fileName: string;
}

// FA(3) Invoice Structure
export interface FA3Invoice {
  header: FA3Header;
  parties: FA3Parties;
  lineItems: FA3LineItem[];
  summary: FA3Summary;
}

export interface FA3Header {
  invoiceNumber: string;
  issueDate: string; // ISO date
  sellDate?: string; // ISO date
  dueDate?: string; // ISO date
  currency: string; // ISO currency code (e.g., PLN)
  invoiceType: 'VAT' | 'CORRECTIVE' | 'PROFORMA';
}

export interface FA3Parties {
  seller: FA3Party;
  buyer: FA3Party;
}

export interface FA3Party {
  nip: string;
  name: string;
  address: FA3Address;
}

export interface FA3Address {
  street: string;
  houseNumber: string;
  apartmentNumber?: string;
  city: string;
  postalCode: string;
  country: string; // ISO country code (e.g., PL)
}

export interface FA3LineItem {
  lineNumber: number;
  description: string;
  quantity: number;
  unitOfMeasure: string; // e.g., 'szt', 'kg', 'godz'
  unitPrice: number;
  netAmount: number;
  vatRate: number; // Percentage (e.g., 23 for 23%)
  vatAmount: number;
  grossAmount: number;
}

export interface FA3Summary {
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  currency: string;
  paymentMethod?: string;
  bankAccount?: string;
}
