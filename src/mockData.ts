import { Invoice, CostCenter, Company, PaymentTransaction } from './types';

export const initialCostCenters: CostCenter[] = [
  { id: 'cc1', name: 'Restaurant Nord', code: 'RN-01', budget: 15000 },
  { id: 'cc2', name: 'Bucătărie Centrală', code: 'BC-02', budget: 35000 },
  { id: 'cc3', name: 'Catering Sud', code: 'CS-03', budget: 12000 },
  { id: 'cc4', name: 'Bar & Lounge', code: 'BL-04', budget: 8000 },
];

export const initialCompanies: Company[] = [
  { id: 'comp1', name: 'Beta Catering SRL', cui: 'RO38291032', address: 'Bulevardul Pipera nr. 1B, Voluntari, Ilfov' },
  { id: 'comp2', name: 'Selgros Cash & Carry SRL', cui: 'RO11938221', address: 'Calea București nr. 231, Brașov' },
  { id: 'comp3', name: 'CCB Hotels Management SRL', cui: 'RO41029381', address: 'Aleea Trandafirilor nr. 5, Sector 1, București' },
];

export const initialInvoices: Invoice[] = [];

export const initialTransactions: PaymentTransaction[] = [];
