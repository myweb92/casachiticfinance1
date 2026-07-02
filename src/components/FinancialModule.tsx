import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { Invoice, PaymentTransaction, OperationalLog, FinancialTransaction, Language, Company, CostCenter } from '../types';
import { translations } from '../translations';
import { 
  Landmark, 
  Calendar, 
  Printer, 
  DollarSign, 
  PlusCircle, 
  CheckCircle2, 
  TrendingUp, 
  Info, 
  Trash2,
  Filter, 
  Download, 
  Users, 
  Percent, 
  Key, 
  Coffee, 
  TrendingDown,
  LayoutGrid,
  SlidersHorizontal
} from 'lucide-react';

interface FinancialModuleProps {
  invoices: Invoice[];
  transactions: PaymentTransaction[];
  onAddPayment: (invoiceId: string, amount: number, method: string, ref: string) => void;
  view: 'hotelDashboard' | 'transactions' | 'dailyData' | 'monthlyReport' | 'financialReports';
  operationalLogs: OperationalLog[];
  setOperationalLogs: React.Dispatch<React.SetStateAction<OperationalLog[]>>;
  manualTransactions: FinancialTransaction[];
  setManualTransactions: React.Dispatch<React.SetStateAction<FinancialTransaction[]>>;
  lang?: Language;
  companies: Company[];
  costCenters: CostCenter[];
  bsBaseCash?: number;
  bsFixedAssets?: number;
  bsEquitySocial?: number;
  globalDate?: string;
  onToggleTransactionStatus?: (txId: string, newStatus: 'paid' | 'unpaid') => void;
}

// 12 precise categories as listed in Management.xlsx
const EXCEL_CATEGORIES = [
  'UTILITATI',
  "D'ALE STATULUI",
  'MANCARE & APROVIZIONARE',
  'CONSUMABILE',
  'CONTABILITATE',
  'BANCI & ASIGURARI',
  'DIVERSE 1',
  'DIGITAL',
  'PARTENERI',
  'MENTENANTA',
  'COMISIOANE',
  'SRI LANKA'
];

// Exact supplier mapping defined in Management.xlsx
export const CATEGORY_SUPPLIER_MAP: { [category: string]: string[] } = {
  'UTILITATI': [
    'COMPANIA APA BRASOV S.A.', 'ENGIE ROMANIA S.A.', 
    'SOCIETATEA ELECTRICA FURNIZARE S.A.', 'VODAFONE ROMANIA S.A.', 
    'DIGI ROMANIA S.A.'
  ],
  "D'ALE STATULUI": [
    'SALARII', 'MUNICIPIUL BRASOV - TAXA SALVAMONT', 
    'MUNICIPIUL BRASOV', 'IMPOZIT PROFIT', 'TVA', 'BS+BASS', 'CAM'
  ],
  'MANCARE & APROVIZIONARE': [
    'CARREFOUR ROMANIA SA', 'SELGROS CASH & CARRY SRL', 
    'S.C. GENERAL AGRO COM SERVICE S.R.L.', 'AUCHAN ROMANIA SA', 
    'RPL SRL', 'S.C. MIRALI BAZZAR SRL', 'UNIVERSUL CAFELEI SRL', 
    'LIDL DISCOUNT S.R.L.', 'METRO CASH & CARRY ROMANIA SRL', 
    'SENIC COM SRL', 'WEB COFFEE SRL', 'MEGA IMAGE S.R.L.'
  ],
  'CONSUMABILE': [
    'IMMACULATE LAUNDRY SERVICES SRL', 'DHARMA CONSTRUCT SRL', 
    'COSMETICE HOTEL S.R.L.', 'SC SANITO DISTRIBUTION SRL', 'SC SIDE GRUP SRL'
  ],
  'CONTABILITATE': [
    'S.C. THE ONE FIN CONSULT SRL'
  ],
  'BANCI & ASIGURARI': [
    'OMNIASIG VIENNA INSURANCE GROUP', 'SC VIVA WALLET SRL'
  ],
  'DIVERSE 1': [
    'ASOCIATIA CENTRUL ROMAN PENTRU ADMINISTRAREA DREPTURILOR ARTISTILOR INTERPRETI (CREDIDAM)', 
    'BRAI CATA SRL', 'UPFR', 'ALTEX ROMANIA SRL', 'TIMEGA DESIGN SRL', 
    'ALDUS & PRINT & SERV SRL', 'DIVERSE', 'CEZAR GHEORGHE INTERNATIONAL S.R.L.', 
    'OMV PETROM MARKETING SRL', 'OLX ONLINE SERVICES SRL', 'LUKOIL ROMANIA SRL', 
    'DANTE INTERNATIONAL SA', 'D.O. SECURITY GRUP PAZA SI PROTECTIE SRL', 'P & P SRL', 'CREDIDAM'
  ],
  'DIGITAL': [
    'OPENAI LLC', 'FB & MARKETING', 'INTELLIGENT IT SRL', 'SWEEPLY', 'DIGITAL ARBITRAGE INC. '
  ],
  'PARTENERI': [
    'CUCININO PASTA BAR SRL', 'AIM IMAGE PERFECT SRL', 'TRUS HORECA SERVICES S.R.L.', 'MAX RESTO S.R.L.'
  ],
  'MENTENANTA': [
    'ALFA PREVENT SRL', 'SAFE ECHITECH S.R.L.', 'KORONA N.G.S.', 
    'S.C. LEROY MERLIN ROMANIA S.R.L.', 'DEDEMAN SRL', 'BRICOSTORE ROMANIA SA', 
    'JYSK ROMANIA S.R.L.', 'IKEA ROMANIA SA', 'BOGDAN T. LUCIAN PFA'
  ],
  'COMISIOANE': [
    'BOOKING.COM B.V.', 'EDENRED ROMANIA SRL', 'UP ROMANIA SRL', 
    'TRAVELMINIT INTERNATIONAL S.R.L.', 'EXPEDIA LODGING PARTNER SERVICES'
  ],
  'SRI LANKA': [
    'Apartament', 'Apa', 'Gaz', 'Curent', 'Rds'
  ]
};

export default function FinancialModule({
  invoices,
  transactions,
  onAddPayment,
  view,
  operationalLogs,
  setOperationalLogs,
  manualTransactions,
  setManualTransactions,
  lang = 'RO',
  companies,
  costCenters,
  bsBaseCash = 185000,
  bsFixedAssets = 1450000,
  bsEquitySocial = 1400000,
  globalDate,
  onToggleTransactionStatus
  }: FinancialModuleProps) {
  const t = translations[lang];

  // Helper to safely execute confirm dialog without crashing sandboxed preview iframes
  const safeConfirm = (message: string): boolean => {
    try {
      return window.confirm(message);
    } catch (e) {
      console.warn("window.confirm blocked in sandbox iframe, auto-confirming:", e);
      return true;
    }
  };

  // Global month & year filter state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (globalDate) {
      const parts = globalDate.split('-');
      if (parts.length === 3) return parts[1];
    }
    return '06';
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    if (globalDate) {
      const parts = globalDate.split('-');
      if (parts.length === 3) return parts[0];
    }
    return '2026';
  });

  // Month-over-Month Comparison states
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [compareMonth, setCompareMonth] = useState('05');
  const [compareYear, setCompareYear] = useState('2026');

  // Month Names mapping
  const monthNamesRO = [
    { value: '01', label: 'Ianuarie' },
    { value: '02', label: 'Februarie' },
    { value: '03', label: 'Martie' },
    { value: '04', label: 'Aprilie' },
    { value: '05', label: 'Mai' },
    { value: '06', label: 'Iunie' },
    { value: '07', label: 'Iulie' },
    { value: '08', label: 'August' },
    { value: '09', label: 'Septembrie' },
    { value: '10', label: 'Octombrie' },
    { value: '11', label: 'Noiembrie' },
    { value: '12', label: 'Decembrie' }
  ];

  const yearsRO = ['2024', '2025', '2026', '2027'];

  // Robust date format matcher helper
  const isSameMonthAndYear = (dateStr: string, monthVal: string, yearVal: string) => {
    if (!dateStr) return false;
    
    // YYYY-MM-DD
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return parts[1] === monthVal && parts[0] === yearVal;
      }
    }
    // DD/MM/YYYY
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return parts[1] === monthVal && parts[2] === yearVal;
      }
    }
    // DD.MM.YYYY
    if (dateStr.includes('.')) {
      const parts = dateStr.split('.');
      if (parts.length === 3) {
        return parts[1] === monthVal && parts[2] === yearVal;
      }
    }
    return false;
  };

  // --- 1. FILTER DATA FOR THE SELECTED MONTH/YEAR ---
  
  // Daily operational logs
  const filteredLogs = operationalLogs.filter(log => isSameMonthAndYear(log.date, selectedMonth, selectedYear));
  
  // Invoices (filtered) - Accrual basis: filter by invoice issue date 'inv.date' so all uploaded facturi appear
  const filteredInvoices = invoices.filter(inv => {
    return isSameMonthAndYear(inv.date, selectedMonth, selectedYear);
  });
  
  // Manual transactions (filtered)
  const filteredManualTransactions = manualTransactions.filter(tx => isSameMonthAndYear(tx.date, selectedMonth, selectedYear));

  // --- 2. COMPILE CUMULATIVE METRICS IN REALTIME ---
  
  // Realized Income (Did Inc / Incasari)
  const totalDailyRevenue = filteredLogs.reduce((sum, log) => sum + log.dailyRevenue, 0);
  const totalManualIncome = filteredManualTransactions
    .filter(tx => tx.type === 'Venit')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalIncome = totalDailyRevenue + totalManualIncome;

  // Realized Expenses (Did Exp / Cheltuieli) - Count all invoices regardless of payment status
  const totalInvoicedExpenses = filteredInvoices
    .reduce((sum, inv) => sum + inv.total, 0);
  const totalManualExpenses = filteredManualTransactions
    .filter(tx => tx.type === 'Cheltuiala' && !tx.invoiceNumber && tx.status !== 'unpaid')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpenses = totalInvoicedExpenses + totalManualExpenses;

  // Expected figures / forecasts (Prevu)
  // Average from logs or defaults if logs empty
  const expectedIncome = filteredLogs.length > 0 
    ? filteredLogs.reduce((sum, log) => sum + log.targetRevenue, 0)
    : 3500;

  const expectedExpenses = filteredLogs.length > 0
    ? filteredLogs.reduce((sum, log) => sum + log.budgetExpenses, 0)
    : 2500;

  // Differentials
  const diffExpenses = expectedExpenses - totalExpenses; // positive is favorable (under budget)
  const diffIncome = expectedIncome - totalIncome; // negative is favorable? No, target - actual is shortfall

  // Profit net
  const netProfit = totalIncome - totalExpenses;

  // Tourists and overnights
  const totalTourists = filteredLogs.reduce((sum, log) => sum + log.touristsCount, 0);
  const totalOvernights = filteredLogs.reduce((sum, log) => sum + log.overnights, 0);

  // Room Occupancy calculations
  const avgOccupancy = filteredLogs.length > 0
    ? filteredLogs.reduce((sum, log) => sum + (log.totalRooms > 0 ? (log.occupiedRooms / log.totalRooms * 100) : 0), 0) / filteredLogs.length
    : 0;

  // ADR (Average Daily Rate): Revenue / Innoptari as structured in Excel
  const adrRate = totalOvernights > 0 ? totalIncome / totalOvernights : 0;

  // Cost per Tourist
  const costPerTourist = totalTourists > 0 ? totalExpenses / totalTourists : 0;

  // Cost MCDEJ (Mancare & Aprovizionare specific total)
  // 1. Invoices mapped to Mancare & Aprovizionare
  const getSupplierCategory = (suppName: string): string => {
    const cleanSupp = suppName.trim().toUpperCase();
    if (cleanSupp.includes('SELGROS')) return 'MANCARE & APROVIZIONARE';
    for (const [cat, suppliers] of Object.entries(CATEGORY_SUPPLIER_MAP)) {
      if (suppliers.some(s => {
        const cleanS = s.trim().toUpperCase();
        if (cleanS.includes(cleanSupp) || cleanSupp.includes(cleanS)) return true;
        
        // Alphanumeric words check (at least one matching word of >= 4 letters)
        const wordsS = cleanS.split(/[^A-Z0-5]/).filter(w => w.length >= 4);
        const wordsSupp = cleanSupp.split(/[^A-Z0-5]/).filter(w => w.length >= 4);
        return wordsS.some(ws => wordsSupp.includes(ws));
      })) {
        return cat;
      }
    }
    return '';
  };

  const invoiceCateringCosts = filteredInvoices
    .filter(inv => getSupplierCategory(inv.company) === 'MANCARE & APROVIZIONARE' || inv.costCenter === 'MANCARE & APROVIZIONARE')
    .reduce((sum, inv) => sum + inv.total, 0);

  const manualCateringCosts = filteredManualTransactions
    .filter(tx => !tx.invoiceNumber && tx.status !== 'unpaid' && tx.category === 'MANCARE & APROVIZIONARE')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const costMcdej = invoiceCateringCosts + manualCateringCosts;
  const costMcdejPerPers = totalTourists > 0 ? costMcdej / totalTourists : 0;

  // OTA and Direct bookings distribution defaults or averages
  const avgOta = filteredLogs.length > 0
    ? filteredLogs.reduce((sum, log) => sum + log.otaPercentage, 0) / filteredLogs.length
    : 83;

  const avgDirect = filteredLogs.length > 0
    ? filteredLogs.reduce((sum, log) => sum + log.directPercentage, 0) / filteredLogs.length
    : 17;

  // Calculate detailed items hierarchically
  const compileCategoryDetails = () => {
    return EXCEL_CATEGORIES.map(category => {
      const standardSuppliers = CATEGORY_SUPPLIER_MAP[category] || [];
      
      // Let's gather all invoices (both paid and unpaid) for this category in the current month in real-time
      const paidInvoicesInCat = filteredInvoices.filter(inv => 
        getSupplierCategory(inv.company) === category || inv.costCenter === category
      );

      // Let's gather active manual transactions for this category in the current month
      const activeTxInCat = filteredManualTransactions.filter(tx => 
        !tx.invoiceNumber && 
        tx.status !== 'unpaid' && 
        tx.category === category
      );

      // Map predefined standard suppliers of this category first
      const standardList = standardSuppliers.map(supp => {
        let displayName = supp;
        if (displayName.toUpperCase().includes('SELGROS')) {
          displayName = 'S.C. Selgros';
        }

        const invSum = paidInvoicesInCat
          .filter(inv => {
            const cleanInv = inv.company.trim().toUpperCase();
            const cleanSupp = supp.trim().toUpperCase();
            return cleanInv.includes(cleanSupp) || cleanSupp.includes(cleanInv) ||
                   (cleanInv.includes('SELGROS') && cleanSupp.includes('SELGROS'));
          })
          .reduce((sum, inv) => sum + inv.total, 0);

        const txSum = activeTxInCat
          .filter(tx => {
            const cleanTx = tx.partner.trim().toUpperCase();
            const cleanSupp = supp.trim().toUpperCase();
            return cleanTx.includes(cleanSupp) || cleanSupp.includes(cleanTx) ||
                   (cleanTx.includes('SELGROS') && cleanSupp.includes('SELGROS'));
          })
          .reduce((sum, tx) => sum + tx.amount, 0);

        return {
          name: displayName,
          total: invSum + txSum
        };
      });

      // Collect non-standard/unmapped suppliers with paid invoices or active transactions belonging to this category
      const extraSuppliers: { name: string; total: number }[] = [];

      paidInvoicesInCat.forEach(inv => {
        const alreadyMatched = standardSuppliers.some(supp => {
          const cleanInv = inv.company.trim().toUpperCase();
          const cleanSupp = supp.trim().toUpperCase();
          return cleanInv.includes(cleanSupp) || cleanSupp.includes(cleanInv) ||
                 (cleanInv.includes('SELGROS') && cleanSupp.includes('SELGROS'));
        });
        if (!alreadyMatched) {
          let displayName = inv.company;
          if (displayName.toUpperCase().includes('SELGROS')) {
            displayName = 'S.C. Selgros';
          }
          const existing = extraSuppliers.find(x => x.name.trim().toUpperCase() === displayName.trim().toUpperCase());
          if (existing) {
            existing.total += inv.total;
          } else {
            extraSuppliers.push({ name: displayName, total: inv.total });
          }
        }
      });

      activeTxInCat.forEach(tx => {
        const alreadyMatched = standardSuppliers.some(supp => {
          const cleanTx = tx.partner.trim().toUpperCase();
          const cleanSupp = supp.trim().toUpperCase();
          return cleanTx.includes(cleanSupp) || cleanSupp.includes(cleanTx) ||
                 (cleanTx.includes('SELGROS') && cleanSupp.includes('SELGROS'));
        });
        if (!alreadyMatched) {
          let displayName = tx.partner;
          if (displayName.toUpperCase().includes('SELGROS')) {
            displayName = 'S.C. Selgros';
          }
          const existing = extraSuppliers.find(x => x.name.trim().toUpperCase() === displayName.trim().toUpperCase());
          if (existing) {
            existing.total += tx.amount;
          } else {
            extraSuppliers.push({ name: displayName, total: tx.amount });
          }
        }
      });

      const supplierBreakdown = [...standardList, ...extraSuppliers];

      const totalCategoryCost = supplierBreakdown.reduce((sum, b) => sum + b.total, 0);
      const percentage = totalExpenses > 0 ? (totalCategoryCost / totalExpenses) * 100 : 0;

      return {
        name: category,
        total: totalCategoryCost,
        percentage,
        suppliers: supplierBreakdown
      };
    });
  };

  const categoriesWithExpenses = compileCategoryDetails();

  // Helper to compile all metadata, metrics & categories for any elected month/year for side-by-side comparisons
  const compileMonthlyData = (monthVal: string, yearVal: string) => {
    const fLogs = operationalLogs.filter(log => isSameMonthAndYear(log.date, monthVal, yearVal));
    const fInvoices = invoices.filter(inv => {
      return isSameMonthAndYear(inv.date, monthVal, yearVal);
    });
    const fManualTx = manualTransactions.filter(tx => isSameMonthAndYear(tx.date, monthVal, yearVal));

    const totDailyRev = fLogs.reduce((sum, log) => sum + log.dailyRevenue, 0);
    const totManualInc = fManualTx
      .filter(tx => tx.type === 'Venit')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totIncome = totDailyRev + totManualInc;

    const totInvoicedExp = fInvoices
      .reduce((sum, inv) => sum + inv.total, 0);
    const totManualExp = fManualTx
      .filter(tx => tx.type === 'Cheltuiala' && !tx.invoiceNumber && tx.status !== 'unpaid')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totExpenses = totInvoicedExp + totManualExp;

    const expIncome = fLogs.length > 0 
      ? fLogs.reduce((sum, log) => sum + log.targetRevenue, 0)
      : 3500;
    const expExpenses = fLogs.length > 0
      ? fLogs.reduce((sum, log) => sum + log.budgetExpenses, 0)
      : 2500;

    const netProf = totIncome - totExpenses;
    const totTourists = fLogs.reduce((sum, log) => sum + log.touristsCount, 0);
    const totOvernights = fLogs.reduce((sum, log) => sum + log.overnights, 0);
    const costPerTour = totTourists > 0 ? totExpenses / totTourists : 0;

    const invCateringCosts = fInvoices
      .filter(inv => getSupplierCategory(inv.company) === 'MANCARE & APROVIZIONARE' || inv.costCenter === 'MANCARE & APROVIZIONARE')
      .reduce((sum, inv) => sum + inv.total, 0);
    const manCateringCosts = fManualTx
      .filter(tx => !tx.invoiceNumber && tx.status !== 'unpaid' && tx.category === 'MANCARE & APROVIZIONARE')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const cMcdej = invCateringCosts + manCateringCosts;
    const cMcdejPerPers = totTourists > 0 ? cMcdej / totTourists : 0;

    const catsData = EXCEL_CATEGORIES.map(category => {
      const standardSuppliers = CATEGORY_SUPPLIER_MAP[category] || [];
      const paidInvs = fInvoices.filter(inv => 
        (getSupplierCategory(inv.company) === category || inv.costCenter === category)
      );
      const actTx = fManualTx.filter(tx => 
        !tx.invoiceNumber && 
        tx.status !== 'unpaid' && 
        tx.category === category
      );

      const standardList = standardSuppliers.map(supp => {
        let dispName = supp;
        if (dispName.toUpperCase().includes('SELGROS')) dispName = 'S.C. Selgros';
        const iSum = paidInvs
          .filter(inv => {
            const cleanInv = inv.company.trim().toUpperCase();
            const cleanSupp = supp.trim().toUpperCase();
            return cleanInv.includes(cleanSupp) || cleanSupp.includes(cleanInv) ||
                   (cleanInv.includes('SELGROS') && cleanSupp.includes('SELGROS'));
          })
          .reduce((sum, inv) => sum + inv.total, 0);

        const tSum = actTx
          .filter(tx => {
            const cleanTx = tx.partner.trim().toUpperCase();
            const cleanSupp = supp.trim().toUpperCase();
            return cleanTx.includes(cleanSupp) || cleanSupp.includes(cleanTx) ||
                   (cleanTx.includes('SELGROS') && cleanSupp.includes('SELGROS'));
          })
          .reduce((sum, tx) => sum + tx.amount, 0);

        return { name: dispName, total: iSum + tSum };
      });

      const extraSupps: { name: string; total: number }[] = [];
      paidInvs.forEach(inv => {
        const alreadyMatched = standardSuppliers.some(supp => {
          const cleanInv = inv.company.trim().toUpperCase();
          const cleanSupp = supp.trim().toUpperCase();
          return cleanInv.includes(cleanSupp) || cleanSupp.includes(cleanInv) ||
                 (cleanInv.includes('SELGROS') && cleanSupp.includes('SELGROS'));
        });
        if (!alreadyMatched) {
          let dispName = inv.company;
          if (dispName.toUpperCase().includes('SELGROS')) dispName = 'S.C. Selgros';
          const existing = extraSupps.find(x => x.name.trim().toUpperCase() === dispName.trim().toUpperCase());
          if (existing) {
            existing.total += inv.total;
          } else {
            extraSupps.push({ name: dispName, total: inv.total });
          }
        }
      });

      actTx.forEach(tx => {
        const alreadyMatched = standardSuppliers.some(supp => {
          const cleanTx = tx.partner.trim().toUpperCase();
          const cleanSupp = supp.trim().toUpperCase();
          return cleanTx.includes(cleanSupp) || cleanSupp.includes(cleanTx) ||
                 (cleanTx.includes('SELGROS') && cleanSupp.includes('SELGROS'));
        });
        if (!alreadyMatched) {
          let dispName = tx.partner;
          if (dispName.toUpperCase().includes('SELGROS')) dispName = 'S.C. Selgros';
          const existing = extraSupps.find(x => x.name.trim().toUpperCase() === dispName.trim().toUpperCase());
          if (existing) {
            existing.total += tx.amount;
          } else {
            extraSupps.push({ name: dispName, total: tx.amount });
          }
        }
      });

      const supplierBreakdown = [...standardList, ...extraSupps];
      const totalCategoryCost = supplierBreakdown.reduce((sum, b) => sum + b.total, 0);
      const percentage = totExpenses > 0 ? (totalCategoryCost / totExpenses) * 100 : 0;

      return {
        name: category,
        total: totalCategoryCost,
        percentage,
        suppliers: supplierBreakdown
      };
    });

    return {
      totalIncome: totIncome,
      totalExpenses: totExpenses,
      expectedIncome: expIncome,
      expectedExpenses: expExpenses,
      netProfit: netProf,
      totalTourists: totTourists,
      totalOvernights: totOvernights,
      costPerTourist: costPerTour,
      costMcdejPerPers: cMcdejPerPers,
      categories: catsData
    };
  };


  // --- TRANSACTIONS FORM LOCAL STATES ---
  const [txType, setTxType] = useState<'Venit' | 'Cheltuiala'>('Cheltuiala');
  const [txDate, setTxDate] = useState('2026-06-02');
  const [txCategory, setTxCategory] = useState('UTILITATI');
  const [txPartner, setTxPartner] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txMethod, setTxMethod] = useState('BANK');
  const [txInvoiceNum, setTxInvoiceNum] = useState('');
  const [txNote, setTxNote] = useState('');
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [txCategoryFilter, setTxCategoryFilter] = useState('ALL');
  const [txTypeFilter, setTxTypeFilter] = useState('ALL');
  const [txCompany, setTxCompany] = useState(companies[0]?.name || '');
  const [txCostCenter, setTxCostCenter] = useState(costCenters[0]?.name || '');
  const [txCompanyFilter, setTxCompanyFilter] = useState('ALL');
  const [txCostCenterFilter, setTxCostCenterFilter] = useState('ALL');
  const [txDateFilter, setTxDateFilter] = useState('');

  // --- ADVANCED REPORTS LOCAL STATES ---
  const [reportPeriodType, setReportPeriodType] = useState<'daily' | 'monthly' | 'yearly' | 'custom'>('monthly');
  const [reportSelectedDay, setReportSelectedDay] = useState(globalDate || '2026-06-02');
  const [reportSelectedMonth, setReportSelectedMonth] = useState(() => {
    if (globalDate) {
      const parts = globalDate.split('-');
      if (parts.length === 3) return parts[1];
    }
    return '06';
  });
  const [reportSelectedYear, setReportSelectedYear] = useState(() => {
    if (globalDate) {
      const parts = globalDate.split('-');
      if (parts.length === 3) return parts[0];
    }
    return '2026';
  });
  const [reportCustomStart, setReportCustomStart] = useState(() => {
    if (globalDate) {
      const parts = globalDate.split('-');
      if (parts.length === 3) return `${parts[0]}-${parts[1]}-01`;
    }
    return '2026-06-02';
  });
  const [reportCustomEnd, setReportCustomEnd] = useState(() => {
    if (globalDate) {
      const parts = globalDate.split('-');
      if (parts.length === 3) {
        const daysInMonth = new Date(Number(parts[0]), Number(parts[1]), 0).getDate();
        return `${parts[0]}-${parts[1]}-${daysInMonth}`;
      }
    }
    return '2026-06-30';
  });
  const [activeReportTab, setActiveReportTab] = useState<'daily' | 'pnl' | 'balance' | 'cashflow'>('pnl');

  // Synchronize state values automatically when global selection changes
  useEffect(() => {
    if (globalDate) {
      setTxDate(globalDate);
      setTxDateFilter(globalDate);
      setReportSelectedDay(globalDate);
      const parts = globalDate.split('-');
      if (parts.length === 3) {
        setSelectedMonth(parts[1]);
        setSelectedYear(parts[0]);
        setReportSelectedMonth(parts[1]);
        setReportSelectedYear(parts[0]);
        setReportCustomStart(`${parts[0]}-${parts[1]}-01`);
        const daysInMonth = new Date(Number(parts[0]), Number(parts[1]), 0).getDate();
        setReportCustomEnd(`${parts[0]}-${parts[1]}-${daysInMonth}`);
      }
    }
  }, [globalDate]);

  // --- ADVANCED REPORTS LOGIC & HELPERS ---
  const parseToStandardDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const cleanStr = dateStr.trim();
    if (cleanStr.includes('-')) {
      const parts = cleanStr.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        } else {
          return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
      }
    }
    if (cleanStr.includes('.')) {
      const parts = cleanStr.split('.');
      if (parts.length === 3) {
        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }
    }
    if (cleanStr.includes('/')) {
      const parts = cleanStr.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        } else {
          return new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
        }
      }
    }
    const d = new Date(cleanStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const getFilteredDataForReport = () => {
    let start: Date | null = null;
    let end: Date | null = null;

    if (reportPeriodType === 'daily') {
      const target = parseToStandardDate(reportSelectedDay);
      if (target) {
        start = new Date(target.getFullYear(), target.getMonth(), target.getDate());
        end = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59, 999);
      }
    } else if (reportPeriodType === 'monthly') {
      const m = Number(reportSelectedMonth) - 1;
      const y = Number(reportSelectedYear);
      start = new Date(y, m, 1);
      end = new Date(y, m + 1, 0, 23, 59, 59, 999);
    } else if (reportPeriodType === 'yearly') {
      const y = Number(reportSelectedYear);
      start = new Date(y, 0, 1);
      end = new Date(y, 11, 31, 23, 59, 59, 999);
    } else if (reportPeriodType === 'custom') {
      const s = parseToStandardDate(reportCustomStart);
      const e = parseToStandardDate(reportCustomEnd);
      if (s) start = new Date(s.getFullYear(), s.getMonth(), s.getDate());
      if (e) end = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
    }

    let logs = operationalLogs;
    let invs = invoices;
    let txs = manualTransactions;
    let pmts = transactions;

    if (start && end) {
      const startTime = start.getTime();
      const endTime = end.getTime();

      logs = operationalLogs.filter(log => {
        const d = parseToStandardDate(log.date);
        if (!d) return false;
        const t = d.getTime();
        return t >= startTime && t <= endTime;
      });

      invs = invoices.filter(inv => {
        const d = parseToStandardDate(inv.date);
        if (!d) return false;
        const t = d.getTime();
        return t >= startTime && t <= endTime;
      });

      txs = manualTransactions.filter(tx => {
        const d = parseToStandardDate(tx.date);
        if (!d) return false;
        const t = d.getTime();
        return t >= startTime && t <= endTime;
      });

      pmts = transactions.filter(p => {
        const d = parseToStandardDate(p.date);
        if (!d) return false;
        const t = d.getTime();
        return t >= startTime && t <= endTime;
      });
    }

    return { logs, invs, txs, pmts };
  };

  const getReportPeriodLabel = () => {
    if (reportPeriodType === 'daily') {
      return reportSelectedDay;
    } else if (reportPeriodType === 'monthly') {
      const foundMonth = monthNamesRO.find(m => m.value === reportSelectedMonth);
      return `${foundMonth ? foundMonth.label : reportSelectedMonth} ${reportSelectedYear}`;
    } else if (reportPeriodType === 'yearly') {
      return `${reportSelectedYear}`;
    } else {
      return `${reportCustomStart} ➔ ${reportCustomEnd}`;
    }
  };

  const getReportPeriodFileLabel = () => {
    return getReportPeriodLabel().replace(/[^a-zA-Z0-9]/g, "_");
  };

  // --- DAILY OPERATION FORM LOCAL STATES ---
  const [opDate, setOpDate] = useState('28.05.2026');
  const [opOccupiedRooms, setOpOccupiedRooms] = useState('25');
  const [opTotalRooms, setOpTotalRooms] = useState('29');
  const [opTourists, setOpTourists] = useState('266');
  const [opOvernights, setOpOvernights] = useState('668');
  const [opRevenue, setOpRevenue] = useState('160');
  const [opOta, setOpOta] = useState('83');
  const [opDirect, setOpDirect] = useState('17');
  const [opTargetRevenue, setOpTargetRevenue] = useState('3500');
  const [opBudgetExp, setOpBudgetExp] = useState('2500');
  const [opNote, setOpNote] = useState('');


  // Form submission: New manual transaction
  const handleAddManualTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(txAmount);
    if (isNaN(qty) || qty <= 0) {
      alert('Vă rugăm să introduceți o sumă validă.');
      return;
    }

    const newTx: FinancialTransaction = {
      id: `mtx-${Date.now()}`,
      type: txType,
      date: txDate,
      category: txCategory,
      partner: txPartner || 'Diverse',
      description: txDescription,
      amount: qty,
      paymentMethod: txMethod,
      invoiceNumber: txInvoiceNum,
      note: txNote,
      company: txCompany,
      costCenter: txCostCenter,
      status: 'paid'
    };

    setManualTransactions(prev => [newTx, ...prev]);
    fetch('/api/manualTransactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTx)
    }).catch(e => console.error(e));

    // reset fields gracefully
    setTxPartner('');
    setTxDescription('');
    setTxAmount('');
    setTxInvoiceNum('');
    setTxNote('');
  };

  const handleDeleteManualTransaction = (id: string) => {
    if (safeConfirm('Sigur doriți să ștergeți această tranzacție?')) {
      setManualTransactions(prev => prev.filter(t => t.id !== id));
      fetch(`/api/manualTransactions/${id}`, { method: 'DELETE' }).catch(e => console.error(e));
    }
  };


  // Form submission: New daily operational log
  const handleAddOperationalLog = (e: React.FormEvent) => {
    e.preventDefault();
    const occupied = parseInt(opOccupiedRooms) || 0;
    const totalR = parseInt(opTotalRooms) || 0;
    const tourists = parseInt(opTourists) || 0;
    const overnights = parseInt(opOvernights) || 0;
    const rev = parseFloat(opRevenue) || 0;
    const otaVal = parseFloat(opOta) || 0;
    const directVal = parseFloat(opDirect) || 0;
    const target = parseFloat(opTargetRevenue) || 0;
    const budget = parseFloat(opBudgetExp) || 0;

    const newLog: OperationalLog = {
      id: `oplog-${Date.now()}`,
      date: opDate,
      occupiedRooms: occupied,
      totalRooms: totalR,
      touristsCount: tourists,
      overnights,
      dailyRevenue: rev,
      otaPercentage: otaVal,
      directPercentage: directVal,
      targetRevenue: target,
      budgetExpenses: budget,
      note: opNote
    };

    setOperationalLogs(prev => [newLog, ...prev]);
    fetch('/api/operationalLogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog)
    }).catch(e => console.error(e));

    // fields reset
    setOpNote('');
  };

  const handleDeleteOperationalLog = (id: string) => {
    if (safeConfirm('Sigur doriți să ștergeți această înregistrare zilnică?')) {
      setOperationalLogs(prev => prev.filter(l => l.id !== id));
      fetch(`/api/operationalLogs/${id}`, { method: 'DELETE' }).catch(e => console.error(e));
    }
  };

  // CSV Generator action
  const handleExportCSV = () => {
    const headers = ['Categorie', 'Furnizor/Partner', 'Cost (RON)', 'Pondere din Cost Total (%)'];
    const rows: string[][] = [];
    
    categoriesWithExpenses.forEach(cat => {
      rows.push([cat.name, 'SUBTOTAL CATEGORIE', cat.total.toFixed(2), cat.percentage.toFixed(2) + '%']);
      cat.suppliers.forEach(supp => {
        if (supp.total > 0) {
          rows.push(['', supp.name, supp.total.toFixed(2), '']);
        }
      });
    });
    
    rows.push([]);
    rows.push(['TOTAL CHELTUIELI', '', totalExpenses.toFixed(2), '100%']);
    rows.push(['TOTAL VENITURI', '', totalIncome.toFixed(2), '']);
    rows.push(['PROFIT NET', '', netProfit.toFixed(2), '']);
    rows.push([]);
    rows.push(['DATE OPERATIONALE HOTEL', '', '---', '']);
    rows.push(['Innoptari total', '', String(totalOvernights), '']);
    rows.push(['Număr Turiști total', '', String(totalTourists), '']);
    rows.push(['Rata Ocupare (OCC%)', '', avgOccupancy.toFixed(2) + '%', '']);
    rows.push(['ADR Mediu (RON)', '', adrRate.toFixed(2), '']);
    rows.push(['Cost / Turist (RON)', '', costPerTourist.toFixed(2), '']);
    rows.push(['Cost MCDEJ (RON)', '', costMcdej.toFixed(2), '']);
    rows.push(['Cost MCDEJ / Persoană (RON)', '', costMcdejPerPers.toFixed(2), '']);
    rows.push(['OTA Distribution (%)', '', avgOta.toFixed(2) + '%', '']);
    rows.push(['Direct Distribution (%)', '', avgDirect.toFixed(2) + '%', '']);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `management_raport_${selectedMonth}_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div id="financial-module-root" className="space-y-8 font-sans">
      
      {/* GLOBAL HEADER BAR WITH FILTERING OF MONTH/YEAR */}
      <div id="hotel-period-filter" className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-3xs select-none">
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <LayoutGrid className="w-4.5 h-4.5 text-slate-400" />
            CONTROL OPERATIUNI HOTELIERE
          </h2>
          <span className="text-xl font-extrabold tracking-tight text-slate-900 block mt-1">
            Gestiune Economica & Indicatori Reali (Management.xlsx)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 font-mono">Luna:</span>
            <select
              aria-label="Alege luna"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-750 focus:bg-white focus:outline-none"
            >
              {monthNamesRO.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 font-mono">An:</span>
            <select
              aria-label="Alege anul"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-750 focus:bg-white focus:outline-none"
            >
              {yearsRO.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>
        </div>
      </div>


      {/* VIEW 1: HOTEL DASHBOARD */}
      {view === 'hotelDashboard' && (
        <div id="hotel-dashboard-view" className="space-y-8">
          
          {/* Main KPI Dashboard Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* Total Sales (Venituri Realizate) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-start justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Venituri Luna ({filteredLogs.length} Zile)</span>
                <div className="text-2xl font-black text-blue-600 block">{totalIncome.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</div>
                <div className="text-[10px] text-slate-450 flex items-center gap-1 font-mono">Target: {expectedIncome.toLocaleString('ro-RO')} RON</div>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            {/* Total Expenses (Cheltuieli Realizate) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-start justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Cheltuieli Luna (Consolidat)</span>
                <div className="text-2xl font-black text-rose-600 block">{totalExpenses.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</div>
                <div className="text-[10px] text-slate-450 flex items-center gap-1 font-mono">Buget prevăzut: {expectedExpenses.toLocaleString('ro-RO')} RON</div>
              </div>
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>

            {/* Net Profit */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-start justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Profit Net calculat</span>
                <div className={`text-2xl font-black block ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {netProfit.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                </div>
                <div className="text-[10px] text-slate-450 font-mono">Margine: {totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) + '%' : '0%'}</div>
              </div>
              <div className={`p-2.5 rounded-lg ${netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            {/* Occupying Rooms rate */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-start justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-sans">Grad de Ocupare (OCC)</span>
                <div className="text-2xl font-black text-purple-600 block">{avgOccupancy.toFixed(2)} %</div>
                <p className="text-[10px] text-slate-450 font-sans tracking-tight">Capacitate optimizată</p>
              </div>
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
                <Percent className="w-5 h-5" />
              </div>
            </div>
          </div>


          {/* Double Column Bento Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Graph: Venituri vs Cheltuieli */}
            <div className="lg:col-span-2 bg-white p-6 border border-slate-200 rounded-xl shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Raporat Lună: Venituri vs Cheltuieli</h3>
                  <p className="text-xs text-slate-500 font-sans">Comparație vizuală între încasări și cashflow consumat</p>
                </div>
                <span className="text-xs font-mono bg-slate-50 border px-2.5 py-1 rounded font-bold text-slate-500">Luna {selectedMonth}</span>
              </div>

              {/* Responsive SVG Double Bar graph */}
              <div className="flex justify-center border border-slate-100 rounded-lg p-4 bg-slate-50/50">
                <div className="w-full h-48 flex items-end justify-around relative pt-8">
                  {/* Revenue Bar */}
                  <div className="flex flex-col items-center gap-2 group w-1/4">
                    <span className="text-[11px] font-bold text-blue-600 font-mono tracking-wider">
                      {totalIncome.toLocaleString('ro-RO')} L
                    </span>
                    <div 
                      className="w-12 bg-blue-500 hover:bg-blue-400 rounded-t-lg transition-all duration-500 shadow-sm"
                      style={{ height: `${Math.max(10, Math.min(130, (totalIncome / Math.max(totalIncome, totalExpenses, 1000)) * 130))}px` }}
                    />
                    <span className="text-[10px] font-bold text-slate-550 block">Venituri</span>
                  </div>

                  {/* Expense Bar */}
                  <div className="flex flex-col items-center gap-2 group w-1/4">
                    <span className="text-[11px] font-bold text-rose-600 font-mono tracking-wider">
                      {totalExpenses.toLocaleString('ro-RO')} L
                    </span>
                    <div 
                      className="w-12 bg-rose-500 hover:bg-rose-400 rounded-t-lg transition-all duration-500 shadow-sm"
                      style={{ height: `${Math.max(10, Math.min(130, (totalExpenses / Math.max(totalIncome, totalExpenses, 1000)) * 130))}px` }}
                    />
                    <span className="text-[10px] font-bold text-slate-550 block">Cheltuieli</span>
                  </div>

                  {/* Profit Bar */}
                  <div className="flex flex-col items-center gap-2 group w-1/4">
                    <span className={`text-[11px] font-bold font-mono tracking-wider ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {Math.abs(netProfit).toLocaleString('ro-RO')} L
                    </span>
                    <div 
                      className={`w-12 rounded-t-lg transition-all duration-500 shadow-sm ${netProfit >= 0 ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-red-400 hover:bg-red-300'}`}
                      style={{ height: `${Math.max(10, Math.min(130, (Math.abs(netProfit) / Math.max(totalIncome, totalExpenses, 1000)) * 130))}px` }}
                    />
                    <span className="text-[10px] font-bold text-slate-550 block">Profit Net</span>
                  </div>
                </div>
              </div>
            </div>


            {/* Right statistics scorecard */}
            <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                METRICI DE PERFORMANTA
              </h3>
              <p className="text-xs text-slate-500">Indicatori adiționali conform managementului hotelier</p>

              <div className="space-y-3 pt-2 text-xs">
                
                {/* Innoptari */}
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Nopți cazare (Înnoptări):</span>
                  <span className="font-extrabold text-slate-900 font-mono">{totalOvernights}</span>
                </div>

                {/* Tourists */}
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Număr Turiști sosiți:</span>
                  <span className="font-extrabold text-slate-900 font-mono">{totalTourists} pers</span>
                </div>

                {/* ADR rate */}
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">ADR (Average Daily Rate):</span>
                  <span className="font-extrabold text-blue-600 font-mono">
                    {adrRate.toLocaleString('ro-RO', { maximumFractionDigits: 2 })} RON
                  </span>
                </div>

                {/* Cost/Turist */}
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Cost operațional / Turist:</span>
                  <span className="font-extrabold text-rose-500 font-mono">
                    {costPerTourist.toLocaleString('ro-RO', { maximumFractionDigits: 2 })} RON
                  </span>
                </div>

                {/* Cost MCDEJ */}
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-550 font-semibold flex items-center gap-1">
                    <Coffee className="w-3.5 h-3.5 text-orange-500" /> Cost Mic Dejun:
                  </span>
                  <span className="font-extrabold text-amber-700 font-mono">
                    {costMcdej.toLocaleString('ro-RO', { maximumFractionDigits: 2 })} RON
                  </span>
                </div>

                {/* Cost MCDEJ / Pers */}
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-550 font-semibold">Cost Mic Dejun/Persoană:</span>
                  <span className="font-extrabold text-orange-600 font-mono">
                    {costMcdejPerPers.toLocaleString('ro-RO', { maximumFractionDigits: 2 })} RON
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* VIEW 2: TRANSACTIONS (New Transaction & cash book) */}
      {view === 'transactions' && (
        <div id="transactions-view" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 id="tx-headline" className="text-3xl font-bold tracking-tight text-slate-900 font-sans">
                Tranzacții Financiare / Cashflow Ledger
              </h1>
              <p id="tx-summary" className="text-slate-550 mt-1">
                Efectuează intrări de venit, deconturi sau costuri direct asociate fluxului de numerar hotelier.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left FORM: Adauga Tranzacție */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2 border-b pb-2">
                <PlusCircle className="w-5 h-5 text-emerald-500" />
                Înregistrare Tranzacție Nouă
              </h3>

              {/* Tabs for Venit vs Cheltuiala */}
              <div className="flex rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => { setTxType('Venit'); setTxCategory('ALTELE'); }}
                  className={`flex-1 text-center py-1.5 text-xs font-bold rounded-md transition ${txType === 'Venit' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Venit (Încasări)
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('Cheltuiala')}
                  className={`flex-1 text-center py-1.5 text-xs font-bold rounded-md transition ${txType === 'Cheltuiala' ? 'bg-white text-rose-500 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Cheltuială (Plăți)
                </button>
              </div>

              <form onSubmit={handleAddManualTransaction} className="space-y-3 text-xs">
                {/* Data */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block">Dată Tranzacție</label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="bg-slate-50 border rounded-lg p-2 w-full focus:bg-white text-xs font-mono focus:outline-none text-slate-800"
                    required
                  />
                </div>

                {/* Companie & Centru de Cost */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold block bg-white">{lang === 'RO' ? 'Companie' : 'Company'}</label>
                    <select
                      aria-label={lang === 'RO' ? 'Companie' : 'Company'}
                      value={txCompany}
                      onChange={(e) => setTxCompany(e.target.value)}
                      className="bg-slate-50 border rounded-lg p-2 w-full focus:outline-none text-xs text-slate-800 focus:bg-white"
                      required
                    >
                      {companies.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold block bg-white">{lang === 'RO' ? 'Centru Cost' : 'Cost Center'}</label>
                    <select
                      aria-label={lang === 'RO' ? 'Centru Cost' : 'Cost Center'}
                      value={txCostCenter}
                      onChange={(e) => setTxCostCenter(e.target.value)}
                      className="bg-slate-50 border rounded-lg p-2 w-full focus:outline-none text-xs text-slate-800 focus:bg-white"
                      required
                    >
                      {costCenters.map(cc => (
                        <option key={cc.id} value={cc.name}>{cc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Categorii (Cheltuieli standard) */}
                {txType === 'Cheltuiala' && (
                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold block">Categorie Cost (12 categorii Excel)</label>
                    <select
                      aria-label="Categorie cost"
                      value={txCategory}
                      onChange={(e) => setTxCategory(e.target.value)}
                      className="bg-slate-50 border rounded-lg p-2 w-full focus:outline-none text-xs text-slate-800"
                    >
                      {EXCEL_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Furnizor / Beneficiar */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block">
                    {txType === 'Cheltuiala' ? 'Furnizor / Beneficiar' : 'Client / Sursă Venit'}
                  </label>
                  <input
                    type="text"
                    value={txPartner}
                    onChange={(e) => setTxPartner(e.target.value)}
                    placeholder={txType === 'Cheltuiala' ? 'Ex: ENGIE ROMANIA S.A.' : 'Ex: Clienti receptie'}
                    className="bg-slate-50 border rounded-lg p-2 w-full focus:bg-white text-xs text-slate-850"
                    list="partner-suggestions"
                    required
                  />
                  <datalist id="partner-suggestions">
                    {txType === 'Cheltuiala' && 
                      Object.values(CATEGORY_SUPPLIER_MAP).flat().map((supp, i) => (
                        <option key={i} value={supp} />
                      ))
                    }
                  </datalist>
                </div>

                {/* Descriere */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block bg-white">Descriere</label>
                  <input
                    type="text"
                    value={txDescription}
                    onChange={(e) => setTxDescription(e.target.value)}
                    placeholder="Ex: Achizitii consumabile curatenie"
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2 w-full text-xs text-slate-800"
                    required
                  />
                </div>

                {/* Suma in RON */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block">Sumă (RON)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      placeholder="Ex: 125.00"
                      className="bg-slate-50 border rounded-lg p-2 w-full font-mono text-xs text-slate-800"
                      required
                    />
                    <span className="absolute right-3 top-2 text-[10px] font-bold text-slate-400">RON</span>
                  </div>
                </div>

                {/* Metoda plata */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block">Metodă de Plată</label>
                  <select
                    aria-label="Metoda de plata"
                    value={txMethod}
                    onChange={(e) => setTxMethod(e.target.value)}
                    className="bg-slate-50 border rounded-lg p-2 w-full text-xs text-slate-800"
                  >
                    <option value="BANK">Ordin de Plată / Transfer Bancar</option>
                    <option value="CARD">Card Bancar / POS</option>
                    <option value="CASH">Numerar / Cash</option>
                    <option value="CHITANȚĂ">Chitanță / Bon fiscal</option>
                  </select>
                </div>

                {/* Invoice Number */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block bg-white">Număr Factură (Scadent)</label>
                  <input
                    type="text"
                    value={txInvoiceNum}
                    onChange={(e) => setTxInvoiceNum(e.target.value)}
                    placeholder="Ex: ENG-3829"
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2 w-full text-xs text-slate-800"
                  />
                </div>

                {/* Note */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block bg-white">Note interne</label>
                  <textarea
                    value={txNote}
                    onChange={(e) => setTxNote(e.target.value)}
                    placeholder="Detalii suplimentare..."
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2 w-full text-xs text-slate-800"
                    rows={2}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 rounded-lg transition-transform active:scale-98 flex items-center justify-center gap-1 shadow-sm mt-4 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  Săvează Tranzacție
                </button>
              </form>
            </div>


            {/* Right COLUMN: Istoric Tranzacții */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border border-slate-250 rounded-xl overflow-hidden shadow-2xs">
                
                {/* Search and Filters bar */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/60 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <span className="font-extrabold text-slate-800 text-xs">Registru Tranzacții înregistrate</span>
                    
                    <input
                      type="text"
                      value={txSearchQuery}
                      onChange={(e) => setTxSearchQuery(e.target.value)}
                      placeholder="Căutare după partener, descriere..."
                      className="border border-slate-200 rounded-lg p-1.5 w-full md:w-64 focus:outline-none focus:bg-white text-[11px] text-slate-800 bg-white"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-1 text-[11px]">
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-400 font-semibold">Tip:</span>
                      <select
                        aria-label="Filtru tip"
                        value={txTypeFilter}
                        onChange={(e) => setTxTypeFilter(e.target.value)}
                        className="bg-white border rounded px-2 py-1 text-slate-700"
                      >
                        <option value="ALL">Toate</option>
                        <option value="Venit">Venituri (Incasari)</option>
                        <option value="Cheltuiala">Cheltuieli (Plati)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-slate-400 font-semibold">Categorie:</span>
                      <select
                        aria-label="Filtru categorie"
                        value={txCategoryFilter}
                        onChange={(e) => setTxCategoryFilter(e.target.value)}
                        className="bg-white border rounded px-2 py-1 text-slate-700"
                      >
                        <option value="ALL">Toate categoriile</option>
                        {EXCEL_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-slate-400 font-semibold">{lang === 'RO' ? 'Firmă:' : 'Company:'}</span>
                      <select
                        aria-label="Filtru firma"
                        value={txCompanyFilter}
                        onChange={(e) => setTxCompanyFilter(e.target.value)}
                        className="bg-white border rounded px-2 py-1 text-slate-700 font-sans"
                      >
                        <option value="ALL">{lang === 'RO' ? 'Toate firmele' : 'All Companies'}</option>
                        {companies.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-slate-400 font-semibold">{lang === 'RO' ? 'Centru:' : 'Cost Center:'}</span>
                      <select
                        aria-label="Filtru centru cost"
                        value={txCostCenterFilter}
                        onChange={(e) => setTxCostCenterFilter(e.target.value)}
                        className="bg-white border rounded px-2 py-1 text-slate-700 font-sans"
                      >
                        <option value="ALL">{lang === 'RO' ? 'Toate centrele' : 'All Centers'}</option>
                        {costCenters.map(cc => (
                          <option key={cc.id} value={cc.name}>{cc.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Date filter selector field */}
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-slate-400 font-semibold">{lang === 'RO' ? 'Dată:' : 'Date:'}</span>
                      <input
                        type="date"
                        value={txDateFilter}
                        onChange={(e) => setTxDateFilter(e.target.value)}
                        className="bg-white border rounded px-1.5 py-0.5 text-slate-700 font-mono text-[11px] h-[26px] focus:outline-none"
                      />
                      {txDateFilter && (
                        <button
                          type="button"
                          onClick={() => setTxDateFilter('')}
                          className="text-slate-400 hover:text-rose-500 font-bold ml-1 px-1"
                          title={lang === 'RO' ? 'Arată toate datele' : 'Show all dates'}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Table list of manual transactions */}
                <div className="overflow-x-auto text-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 font-extrabold border-b text-slate-500 uppercase tracking-widest text-[9px]">
                        <th className="p-3">Data</th>
                        <th className="p-3">Tip</th>
                        <th className="p-3">{lang === 'RO' ? "Asociat (Firma/Centru)" : "Assigned (Company/Center)"}</th>
                        <th className="p-3">Categorie</th>
                        <th className="p-3">Beneficiar / Partener</th>
                        <th className="p-3">Descriere</th>
                        <th className="p-3 text-right font-sans">Sumă</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Acțiuni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {manualTransactions
                        .filter(tx => {
                          const matchesQuery = tx.partner.toLowerCase().includes(txSearchQuery.toLowerCase()) || 
                                               tx.description.toLowerCase().includes(txSearchQuery.toLowerCase());
                          const matchesType = txTypeFilter === 'ALL' || tx.type === txTypeFilter;
                          const matchesCat = txCategoryFilter === 'ALL' || tx.category === txCategoryFilter || tx.type === 'Venit';
                          const matchesCompany = txCompanyFilter === 'ALL' || tx.company === txCompanyFilter;
                          const matchesCostCenter = txCostCenterFilter === 'ALL' || tx.costCenter === txCostCenterFilter;
                          const matchesDate = !txDateFilter || tx.date === txDateFilter;
                          const matchesPeriod = isSameMonthAndYear(tx.date, selectedMonth, selectedYear);
                          return matchesPeriod && matchesQuery && matchesType && matchesCat && matchesCompany && matchesCostCenter && matchesDate;
                        })
                        .map(tx => (
                          <tr key={tx.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{tx.date}</td>
                            <td className="p-3 whitespace-nowrap">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded ${tx.type === 'Venit' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-500'}`}>
                                {tx.type === 'Venit' ? 'VENIT' : 'CHELTUIALĂ'}
                              </span>
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span className="text-[10px] font-black text-slate-800 block truncate max-w-[130px]" title={tx.company}>
                                {tx.company || 'N/A'}
                              </span>
                              <span className="text-[9px] text-slate-450 block italic mt-0.5">
                                {tx.costCenter || 'N/A'}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-[10px] uppercase font-bold text-slate-500">{tx.category || 'N/A'}</td>
                            <td className="p-3 font-bold text-slate-900">{tx.partner}</td>
                            <td className="p-3 text-slate-550 leading-relaxed max-w-xs truncate">{tx.description}</td>
                            <td className={`p-3 text-right font-bold font-mono text-xs ${tx.type === 'Venit' ? 'text-blue-600' : 'text-slate-800'}`}>
                              {tx.amount.toFixed(2)} RON
                            </td>
                            {/* Status badge cell */}
                            <td className="p-3 text-center whitespace-nowrap">
                              {tx.type === 'Cheltuiala' ? (
                                <span className={`inline-flex items-center gap-1.5 text-[9.5px] font-black px-2 py-0.5 rounded-full ${
                                  tx.status === 'paid' 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${tx.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`}></span>
                                  {tx.status === 'paid' 
                                    ? (lang === 'RO' ? 'PLĂTIT' : 'PAID') 
                                    : (lang === 'RO' ? 'NEACHITAT' : 'UNPAID')
                                  }
                                </span>
                              ) : (
                                <span className="text-slate-400 font-medium text-[10px]">—</span>
                              )}
                            </td>
                            {/* Actions cell */}
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {tx.type === 'Cheltuiala' && onToggleTransactionStatus && (
                                  <button
                                    onClick={() => {
                                      const nextStatus = tx.status === 'paid' ? 'unpaid' : 'paid';
                                      onToggleTransactionStatus(tx.id, nextStatus);
                                    }}
                                    className={`p-1 rounded transition text-xs font-bold flex items-center gap-1 cursor-pointer ${
                                      tx.status === 'paid'
                                        ? 'text-amber-600 hover:text-amber-705 hover:bg-amber-50'
                                        : 'text-emerald-600 hover:text-emerald-705 hover:bg-emerald-50'
                                    }`}
                                    title={tx.status === 'paid' 
                                      ? (lang === 'RO' ? 'Marchează ca Neachitată' : 'Mark as Unpaid') 
                                      : (lang === 'RO' ? 'Marchează ca Plătită' : 'Mark as Paid')
                                    }
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span className="hidden xl:inline text-[9px] font-bold">
                                      {tx.status === 'paid' 
                                        ? (lang === 'RO' ? 'Revocă' : 'Unpay') 
                                        : (lang === 'RO' ? 'Plătește' : 'Pay')
                                      }
                                    </span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteManualTransaction(tx.id)}
                                  className="text-slate-400 hover:text-red-500 p-1 rounded transition hover:bg-red-50 inline-block cursor-pointer"
                                  title="Șterge tranzacția"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      }
                      {manualTransactions.length === 0 && (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-slate-400 italic">
                            Nu există nicio tranzacție de casă înregistrată în această lună.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}


      {/* VIEW 3: DATE ZILNICE (DAILY OPERATIONAL HOTEL DATA) */}
      {view === 'dailyData' && (
        <div id="daily-ledger-view" className="space-y-6">
          <div>
            <h1 id="daily-headline" className="text-3xl font-bold tracking-tight text-slate-900 font-sans">
              Performanță Zilnică / Hotel Operational Metrics
            </h1>
            <p id="daily-summary" className="text-slate-550 mt-1">
              Înregistrează starea fizică a proprietății (camere ocupate, turiști, înnoptări și volumul de vânzări zilnice în RON).
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left FORM: Introducere Date */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-2xs space-y-4">
              <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2 border-b pb-2">
                <Calendar className="w-5 h-5 text-purple-650" />
                Introducere Date Operaționale
              </h3>

              <form onSubmit={handleAddOperationalLog} className="space-y-3 text-xs">
                {/* Data */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block">Ziua (Zi/Lună/An)</label>
                  <input
                    type="text"
                    value={opDate}
                    onChange={(e) => setOpDate(e.target.value)}
                    placeholder="Ex: 28.05.2026"
                    className="bg-slate-50 border rounded-lg p-2.5 w-full font-mono text-xs text-slate-850"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Camere Ocupate */}
                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold block">Camere Ocupate</label>
                    <input
                      type="number"
                      value={opOccupiedRooms}
                      onChange={(e) => setOpOccupiedRooms(e.target.value)}
                      placeholder="Ex: 25"
                      className="bg-slate-50 border rounded-lg p-2.5 w-full text-xs"
                      required
                    />
                  </div>

                  {/* Total Camere */}
                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold block">Capacitate (Total)</label>
                    <input
                      type="number"
                      value={opTotalRooms}
                      onChange={(e) => setOpTotalRooms(e.target.value)}
                      placeholder="Ex: 29"
                      className="bg-slate-50 border rounded-lg p-2.5 w-full text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Turisti Sosiți */}
                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold block">Turiști sosiți</label>
                    <input
                      type="number"
                      value={opTourists}
                      onChange={(e) => setOpTourists(e.target.value)}
                      placeholder="Ex: 266"
                      className="bg-slate-50 border rounded-lg p-2.5 w-full text-xs"
                      required
                    />
                  </div>

                  {/* Innoptari */}
                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold block">Nopți (Înnoptări)</label>
                    <input
                      type="number"
                      value={opOvernights}
                      onChange={(e) => setOpOvernights(e.target.value)}
                      placeholder="Ex: 668"
                      className="bg-slate-50 border rounded-lg p-2.5 w-full text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Venituri Zilnice */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block">Încasări / Venit Zilnic (RON)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={opRevenue}
                      onChange={(e) => setOpRevenue(e.target.value)}
                      placeholder="Ex: 160.00"
                      className="bg-slate-50 border rounded-lg p-2.5 w-full font-mono text-xs"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] font-bold text-slate-400">RON</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* OTA Booking */}
                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold block">OTA Booking %</label>
                    <input
                      type="number"
                      value={opOta}
                      onChange={(e) => setOpOta(e.target.value)}
                      placeholder="83"
                      className="bg-slate-50 border rounded-lg p-2.5 w-full text-xs font-mono"
                    />
                  </div>

                  {/* Direct Booking */}
                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold block">Direct %</label>
                    <input
                      type="number"
                      value={opDirect}
                      onChange={(e) => setOpDirect(e.target.value)}
                      placeholder="17"
                      className="bg-slate-50 border rounded-lg p-2.5 w-full text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Target Venituri */}
                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold block">Target Venit (RON)</label>
                    <input
                      type="number"
                      value={opTargetRevenue}
                      onChange={(e) => setOpTargetRevenue(e.target.value)}
                      placeholder="3500.00"
                      className="bg-slate-50 border rounded-lg p-2.5 w-full text-xs font-mono"
                    />
                  </div>

                  {/* Buget Cheltuieli */}
                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold block">Buget Exp (RON)</label>
                    <input
                      type="number"
                      value={opBudgetExp}
                      onChange={(e) => setOpBudgetExp(e.target.value)}
                      placeholder="2500.00"
                      className="bg-slate-50 border rounded-lg p-2.5 w-full text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Note */}
                <div className="space-y-1 bg-white">
                  <label className="text-slate-500 font-bold block bg-white">Observații</label>
                  <input
                    type="text"
                    value={opNote}
                    onChange={(e) => setOpNote(e.target.value)}
                    placeholder="Note..."
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 w-full text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 rounded-lg active:scale-98 transition shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  Săvează indicatori zi
                </button>
              </form>
            </div>


            {/* Right Column Table: Istoric Date Operaționale */}
            <div className="lg:col-span-2 space-y-4 text-xs">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="p-4 border-b font-extrabold text-slate-800 flex justify-between items-center bg-slate-50/50">
                  <span>Istoric Date Operaționale ({operationalLogs.length} înregistrări)</span>
                  <span className="text-[10px] text-slate-400 font-mono">CCB Management</span>
                </div>

                <div className="overflow-x-auto text-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 font-bold border-b text-slate-500 text-[10px] uppercase">
                        <th className="p-3">Data</th>
                        <th className="p-3 text-center">Cam. Ocp.</th>
                        <th className="p-3 text-center">OCC%</th>
                        <th className="p-3 text-center">Turiști</th>
                        <th className="p-3 text-center">Înnoptări</th>
                        <th className="p-3 text-right">Vânzări (RON)</th>
                        <th className="p-3 text-right">ADR</th>
                        <th className="p-3 text-center">Distribuție (OTA/Dir)</th>
                        <th className="p-3 text-center">Acț.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {operationalLogs.map((log) => {
                        const rate = log.totalRooms > 0 ? (log.occupiedRooms / log.totalRooms * 100) : 0;
                        const adrVal = log.overnights > 0 ? log.dailyRevenue / log.overnights : 0;
                        return (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="p-3 font-semibold text-slate-900">{log.date}</td>
                            <td className="p-3 text-center">{log.occupiedRooms} / {log.totalRooms}</td>
                            <td className="p-3 text-center font-bold text-purple-600">{rate.toFixed(1)}%</td>
                            <td className="p-3 text-center font-sans">{log.touristsCount} pers</td>
                            <td className="p-3 text-center font-sans">{log.overnights}</td>
                            <td className="p-3 text-right font-bold text-slate-900">{log.dailyRevenue.toFixed(2)} RON</td>
                            <td className="p-3 text-right font-bold text-blue-600 font-mono">{adrVal.toFixed(2)} RON</td>
                            <td className="p-3 text-center text-[10px] text-slate-500 font-sans">
                              {log.otaPercentage}% / {log.directPercentage}%
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleDeleteOperationalLog(log.id)}
                                className="text-slate-400 hover:text-red-500 p-1 rounded transition hover:bg-red-50"
                                title="Șterge rând zilnic"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {operationalLogs.length === 0 && (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400 italic font-sans bg-white">
                            Nu există date operaționale adăugate în registru.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* VIEW 4: RAPORT LUNAR CONSOLIDAT (THE MANAGEMENT SPREADSHEET LOOKALIKES) WITH MONTH-OVER-MONTH COMPARISON OPTION */}
      {view === 'monthlyReport' && (() => {
        const monthA = compileMonthlyData(selectedMonth, selectedYear);
        const monthB = compileMonthlyData(compareMonth, compareYear);

        const diffExpenses = monthA.expectedExpenses - monthA.totalExpenses;
        const diffIncome = monthA.expectedIncome - monthA.totalIncome;

        const getAlignedSuppliersForCategory = (catIdx: number) => {
          const catA = monthA.categories[catIdx];
          const catB = monthB.categories[catIdx];

          const names = new Set<string>();
          catA.suppliers.forEach(s => names.add(s.name));
          catB.suppliers.forEach(s => names.add(s.name));

          return Array.from(names).map(name => {
            const suppA = catA.suppliers.find(s => s.name === name);
            const suppB = catB.suppliers.find(s => s.name === name);
            return {
              name,
              totalA: suppA ? suppA.total : 0,
              totalB: suppB ? suppB.total : 0
            };
          });
        };

        return (
          <div id="monthly-report-view" className="space-y-6">
            
            {/* Header row with Print & Excel Action Buttons */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
              <div>
                <h1 id="monthly-headline" className="text-3xl font-black tracking-tight text-slate-900 font-sans">
                  {isComparisonMode ? (
                    <>
                      {lang === 'RO' ? 'Analiză Comparativă' : 'Comparative Analysis'} — {monthNamesRO.find(m => m.value === selectedMonth)?.label} {selectedYear} vs {monthNamesRO.find(m => m.value === compareMonth)?.label} {compareYear}
                    </>
                  ) : (
                    <>
                      Raport Lunar — {monthNamesRO.find(m => m.value === selectedMonth)?.label} {selectedYear}
                    </>
                  )}
                </h1>
                <p id="monthly-summary" className="text-slate-550 mt-1 font-sans">
                  {lang === 'RO' 
                    ? 'Consolidarea globală a profitabilității, datoriilor comerciale și categoriilor de costuri (Management.xlsx template).'
                    : 'Global consolidation of profitability, commercial trade payables and cost categories (Management.xlsx template).'
                  }
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  id="excel-export-btn"
                  onClick={handleExportCSV} 
                  className="flex items-center gap-1.5 border border-slate-250 bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold px-3.5 py-2 rounded-lg text-xs transition active:scale-95 shadow-2xs cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Export CSV (Excel)
                </button>
                
                <button 
                  id="print-report-btn"
                  onClick={() => {
                    window.focus();
                    window.print();
                  }} 
                  className="flex items-center gap-1.5 border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 font-extrabold px-3.5 py-2 rounded-lg text-xs transition active:scale-95 shadow-2xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Printează Raport
                </button>
              </div>
            </div>

            {/* COMPARATIVE MONTH SELECTOR PANEL */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                  <SlidersHorizontal className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                    {lang === 'RO' ? 'Analiză Comparativă Lunară' : 'Monthly Comparative Analysis'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                    {lang === 'RO' ? 'Activează compararea a două luni diferite din an' : 'Activate the side-by-side comparison of two distinct periods'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                {/* Switch / Toggle */}
                <label className="inline-flex items-center gap-2 cursor-pointer bg-white px-3 py-1.8 border rounded-lg shadow-3xs hover:bg-slate-50 transition select-none">
                  <input 
                    type="checkbox" 
                    checked={isComparisonMode}
                    onChange={(e) => setIsComparisonMode(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-black text-slate-700">
                    {lang === 'RO' ? 'Activează Comparație' : 'Enable Comparison'}
                  </span>
                </label>

                {/* Second Month Selectors */}
                {isComparisonMode && (
                  <div className="flex items-center gap-2 bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 shadow-3xs">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{lang === 'RO' ? 'Compară cu:' : 'Compare with:'}</span>
                    
                    <select
                      value={compareMonth}
                      onChange={(e) => setCompareMonth(e.target.value)}
                      className="bg-transparent border-0 text-xs font-bold text-slate-755 focus:ring-x focus:outline-none p-0 cursor-pointer"
                    >
                      {monthNamesRO.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>

                    <select
                      value={compareYear}
                      onChange={(e) => setCompareYear(e.target.value)}
                      className="bg-transparent border-0 text-xs font-bold text-slate-755 focus:ring-x focus:outline-none p-0 cursor-pointer"
                    >
                      {yearsRO.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>


            {/* 1. TOP P&L SCORECARDS PANEL (Adaptive to Comparison Mode) */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b pb-3 mb-4 font-mono">
                {isComparisonMode 
                  ? (lang === 'RO' ? 'SINTEZĂ COMPARATIVĂ GENERALĂ' : 'GENERAL COMPARATIVE SUMMARY')
                  : (lang === 'RO' ? 'REZUMAT FINANCIAR LUNĂ ELECTIVĂ (Did vs Prevu)' : 'ELECTIVE MONTH FINANCIAL SUMMARY (Did vs Prevu)')
                }
              </h3>

              {!isComparisonMode ? (
                /* Single month view card grid */
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-xs font-sans">
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px]">Cheltuieli canonică (Did Exp)</span>
                    <span className="text-lg font-black text-slate-900 block mt-1">{monthA.totalExpenses.toLocaleString('ro-RO')} RON</span>
                    <span className="text-[10px] text-slate-450 block font-mono">Prevu: {monthA.expectedExpenses.toLocaleString('ro-RO')} RON</span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px]">Caseră Venituri (Did Inc)</span>
                    <span className="text-lg font-black text-slate-900 block mt-1">{monthA.totalIncome.toLocaleString('ro-RO')} RON</span>
                    <span className="text-[10px] text-slate-450 block font-mono">Prevu: {monthA.expectedIncome.toLocaleString('ro-RO')} RON</span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px] bg-white">Diferențial EXP</span>
                    <span className={`text-lg font-black block mt-1 ${diffExpenses >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {diffExpenses.toLocaleString('ro-RO')} RON
                    </span>
                    <span className="text-[10px] text-slate-450 block">Utilizat din Buget</span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px]">Diferențial INC</span>
                    <span className="text-lg font-black text-slate-800 block mt-1">{diffIncome.toLocaleString('ro-RO')} RON</span>
                    <span className="text-[10px] text-slate-450 block whitespace-nowrap">Shortfall la target</span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px]">Capacitate Înnoptări</span>
                    <span className="text-lg font-black text-slate-850 block mt-1">{monthA.totalOvernights}</span>
                    <span className="text-[10px] text-slate-450 block font-sans">Turiști: {monthA.totalTourists} pers</span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px] bg-white">Cost / Turist</span>
                    <span className="text-lg font-extrabold text-orange-600 block mt-1">{monthA.costPerTourist.toFixed(2)} RON</span>
                    <span className="text-[10px] text-slate-450 block font-sans">MCDEJ/Pers: {monthA.costMcdejPerPers.toFixed(2)} RON</span>
                  </div>
                </div>
              ) : (
                /* Side by side Comparison grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-sans">
                  {/* CARD 1: EXPENSES COMPARISON */}
                  <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-200/60 flex flex-col justify-between">
                    <div>
                      <span className="text-slate-450 font-bold block uppercase text-[10px] tracking-wider">
                        {lang === 'RO' ? 'CHELTUIELI TOTALE (EXP)' : 'TOTAL EXPENSES'}
                      </span>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between items-center text-slate-800">
                          <span className="font-semibold text-xs truncate max-w-[150px]">
                            {monthNamesRO.find(m => m.value === selectedMonth)?.label} {selectedYear} (A):
                          </span>
                          <span className="font-black text-right font-mono text-xs">{monthA.totalExpenses.toLocaleString('ro-RO')} RON</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span className="font-semibold text-xs truncate max-w-[150px]">
                            {monthNamesRO.find(m => m.value === compareMonth)?.label} {compareYear} (B):
                          </span>
                          <span className="font-extrabold text-right font-mono text-xs">{monthB.totalExpenses.toLocaleString('ro-RO')} RON</span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-slate-250 mt-4 pt-3 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{lang === 'RO' ? 'Variație' : 'Variance'}:</span>
                      <span className={`font-black text-right font-mono text-xs ${monthA.totalExpenses <= monthB.totalExpenses ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {monthA.totalExpenses > monthB.totalExpenses ? '+' : ''}
                        {(monthA.totalExpenses - monthB.totalExpenses).toLocaleString('ro-RO')} RON 
                        <span className="text-[10px] font-semibold ml-1.5 bg-slate-100 px-1 py-0.5 rounded">
                          {monthB.totalExpenses > 0 ? `${(((monthA.totalExpenses - monthB.totalExpenses) / monthB.totalExpenses) * 100).toFixed(1)}%` : '—'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* CARD 2: REVENUE COMPARISON */}
                  <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-200/60 flex flex-col justify-between">
                    <div>
                      <span className="text-slate-450 font-bold block uppercase text-[10px] tracking-wider">
                        {lang === 'RO' ? 'VENITURI REALIZATE (INC)' : 'REVENUE'}
                      </span>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between items-center text-slate-800">
                          <span className="font-semibold text-xs truncate max-w-[150px]">
                            {monthNamesRO.find(m => m.value === selectedMonth)?.label} {selectedYear} (A):
                          </span>
                          <span className="font-black text-right font-mono text-xs">{monthA.totalIncome.toLocaleString('ro-RO')} RON</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span className="font-semibold text-xs truncate max-w-[150px]">
                            {monthNamesRO.find(m => m.value === compareMonth)?.label} {compareYear} (B):
                          </span>
                          <span className="font-extrabold text-right font-mono text-xs">{monthB.totalIncome.toLocaleString('ro-RO')} RON</span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-slate-250 mt-4 pt-3 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{lang === 'RO' ? 'Variație' : 'Variance'}:</span>
                      <span className={`font-black text-right font-mono text-xs ${monthA.totalIncome >= monthB.totalIncome ? 'text-emerald-650' : 'text-rose-600'}`}>
                        {monthA.totalIncome > monthB.totalIncome ? '+' : ''}
                        {(monthA.totalIncome - monthB.totalIncome).toLocaleString('ro-RO')} RON 
                        <span className="text-[10px] font-semibold ml-1.5 bg-slate-100 px-1 py-0.5 rounded">
                          {monthB.totalIncome > 0 ? `${(((monthA.totalIncome - monthB.totalIncome) / monthB.totalIncome) * 100).toFixed(1)}%` : '—'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* CARD 3: NET PROFIT COMPARISON */}
                  <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-200/60 flex flex-col justify-between">
                    <div>
                      <span className="text-slate-450 font-bold block uppercase text-[10px] tracking-wider">
                        {lang === 'RO' ? 'PROFIT NET CONSOLIDAT' : 'NET PROFIT'}
                      </span>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between items-center text-slate-800">
                          <span className="font-semibold text-xs truncate max-w-[150px]">
                            {monthNamesRO.find(m => m.value === selectedMonth)?.label} {selectedYear} (A):
                          </span>
                          <span className="font-black text-right font-mono text-xs">{monthA.netProfit.toLocaleString('ro-RO')} RON</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span className="font-semibold text-xs truncate max-w-[150px]">
                            {monthNamesRO.find(m => m.value === compareMonth)?.label} {compareYear} (B):
                          </span>
                          <span className="font-extrabold text-right font-mono text-xs">{monthB.netProfit.toLocaleString('ro-RO')} RON</span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-slate-250 mt-4 pt-3 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{lang === 'RO' ? 'Variație' : 'Variance'}:</span>
                      <span className={`font-black text-right font-mono text-xs ${monthA.netProfit >= monthB.netProfit ? 'text-emerald-650' : 'text-rose-600'}`}>
                        {monthA.netProfit > monthB.netProfit ? '+' : ''}
                        {(monthA.netProfit - monthB.netProfit).toLocaleString('ro-RO')} RON 
                        <span className="text-[10px] font-semibold ml-1.5 bg-slate-100 px-1 py-0.5 rounded">
                          {monthB.netProfit !== 0 ? `${(((monthA.netProfit - monthB.netProfit) / Math.abs(monthB.netProfit)) * 100).toFixed(1)}%` : '—'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* CARD 4: AD-HOC OPERATIONAL COST INDICES */}
                  <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-200/60 flex flex-col justify-between">
                    <div>
                      <span className="text-slate-450 font-bold block uppercase text-[10px] tracking-wider">
                        {lang === 'RO' ? 'INDICATORI ȘI COST / TURIST' : 'COSTS PER TOURIST'}
                      </span>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between items-center text-slate-800">
                          <span className="font-semibold text-xs">
                            Cost/Turist (A):
                          </span>
                          <span className="font-extrabold text-right font-mono text-xs">{monthA.costPerTourist.toFixed(2)} RON</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span className="font-semibold text-xs">
                            Cost/Turist (B):
                          </span>
                          <span className="font-extrabold text-right font-mono text-xs">{monthB.costPerTourist.toFixed(2)} RON</span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-slate-250 mt-4 pt-3 flex items-center justify-between text-[11px]">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Turiști (A vs B):</span>
                      <span className="font-bold font-mono text-slate-700">
                        {monthA.totalTourists} <span className="text-slate-400 font-normal">vs</span> {monthB.totalTourists}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>


            {/* 2. THE EXCEL LAYOUT: DETAILED EXPENSES HIERARCHY BY CATEGORIES AND SUPPLIERS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left large section: The nested Table sheet mapping exactly to Management.xlsx */}
              <div className={`${isComparisonMode ? 'lg:col-span-3' : 'lg:col-span-2'} bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs text-slate-800 font-sans`}>
                <div className="p-4 border-b border-slate-200 font-extrabold text-slate-900 bg-slate-50/60 flex justify-between items-center">
                  <span>
                    {isComparisonMode 
                      ? `${lang === 'RO' ? 'Centralizator Comparativ Detaliat de Costuri' : 'Detailed Comparative Expense Breakdown'}` 
                      : `${lang === 'RO' ? 'Centralizator de Costuri Detaliat (Categorii & Furnizor)' : 'Detailed Cost Summary (Categories & Suppliers)'}`
                    }
                  </span>
                  <span className="text-[10px] bg-slate-900 text-white font-mono font-bold px-2.5 py-0.5 rounded uppercase">RON CURRENCY</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 font-extrabold text-slate-500 uppercase text-[9px] border-b">
                        <th className="p-3">{lang === 'RO' ? 'Categorie / Furnizor Servicii' : 'Category / Utility Supplier'}</th>
                        <th className="p-3 text-right">
                          {isComparisonMode ? `Cost ${monthNamesRO.find(m => m.value === selectedMonth)?.label} (A)` : `${lang === 'RO' ? 'Cost Înregistrat (RON)' : 'Recorded Cost (RON)'}`}
                        </th>
                        {isComparisonMode && (
                          <>
                            <th className="p-3 text-right bg-slate-50/40">Cost {monthNamesRO.find(m => m.value === compareMonth)?.label} (B)</th>
                            <th className="p-3 text-right">{lang === 'RO' ? 'Variație Absolută (RON)' : 'Variance (RON)'}</th>
                            <th className="p-3 text-right">{lang === 'RO' ? 'Evoluție (%)' : 'Evolution (%)'}</th>
                          </>
                        )}
                        {!isComparisonMode && <th className="p-3 text-right w-36">{lang === 'RO' ? 'Pondere TC' : 'TC Weight'}</th>}
                      </tr>
                    </thead>
                    
                    {(!isComparisonMode ? categoriesWithExpenses : monthA.categories).map((catA, idx) => {
                      const catB = isComparisonMode ? monthB.categories[idx] : null;
                      const alignedSuppliers = isComparisonMode ? getAlignedSuppliersForCategory(idx) : [];
                      
                      const diffCat = isComparisonMode && catB ? (catA.total - catB.total) : 0;
                      
                      return (
                        <tbody key={idx} className="divide-y divide-slate-100 border-b border-slate-200">
                          {/* Subtotal Category Header Row */}
                          <tr className="bg-slate-50/75 hover:bg-slate-50 font-extrabold text-neutral-905">
                            <td className="p-3 text-xs md:text-sm font-sans tracking-wide uppercase text-slate-700 flex items-center gap-1.5">
                              <Landmark className="w-4 h-4 text-slate-500" />
                              {catA.name}
                            </td>
                            <td className="p-3 text-right font-mono text-xs md:text-sm">
                              {catA.total.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            
                            {isComparisonMode && catB ? (
                              <>
                                <td className="p-3 text-right font-mono text-xs md:text-sm bg-slate-50/40">
                                  {catB.total.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className={`p-3 text-right font-mono text-xs font-black ${diffCat <= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                  {diffCat > 0 ? '+' : ''}{diffCat.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className={`p-3 text-right font-mono text-xs font-black ${diffCat <= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                  {catB.total > 0 
                                    ? `${diffCat > 0 ? '+' : ''}${((diffCat / catB.total) * 100).toFixed(1)}%` 
                                    : catA.total > 0 ? '+100%' : '0%'
                                  }
                                </td>
                              </>
                            ) : (
                              <td className="p-3 text-right font-mono text-xs text-blue-600 font-black">
                                {catA.percentage.toFixed(2)} %
                              </td>
                            )}
                          </tr>

                          {/* Supplier Rows */}
                          {(!isComparisonMode ? catA.suppliers : alignedSuppliers).map((supp, sidx) => {
                            if (!isComparisonMode) {
                              const s = supp as any;
                              return (
                                <tr key={sidx} className={`hover:bg-slate-50/30 ${s.total > 0 ? 'bg-white' : 'opacity-40 bg-slate-50/20'}`}>
                                  <td className="p-2.5 pl-8 font-medium text-slate-650 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full inline-block" />
                                    {s.name}
                                  </td>
                                  <td className="p-2.5 text-right font-mono text-slate-700">
                                    {s.total > 0 
                                      ? s.total.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                                      : '—'
                                    }
                                  </td>
                                  <td className="p-2.5 text-right font-mono text-slate-400 text-[10px]">
                                    {catA.total > 0 && s.total > 0 
                                      ? `${((s.total / catA.total) * 100).toFixed(1)}% din CC`
                                      : ''
                                    }
                                  </td>
                                </tr>
                              );
                            } else {
                              const s = supp as { name: string; totalA: number; totalB: number };
                              const diffSupp = s.totalA - s.totalB;
                              const hasActivity = s.totalA > 0 || s.totalB > 0;
                              return (
                                <tr key={sidx} className={`hover:bg-slate-50/35 text-slate-750 ${hasActivity ? 'bg-white' : 'opacity-35 bg-slate-50/10'}`}>
                                  <td className="p-2 pl-8 font-medium text-slate-650 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full inline-block" />
                                    {s.name}
                                  </td>
                                  <td className="p-2 text-right font-mono text-xs">
                                    {s.totalA > 0 ? s.totalA.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                                  </td>
                                  <td className="p-2 text-right font-mono text-xs bg-slate-50/20">
                                    {s.totalB > 0 ? s.totalB.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                                  </td>
                                  <td className={`p-2 text-right font-mono text-2xs ${diffSupp === 0 ? 'text-slate-450' : diffSupp < 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}`}>
                                    {diffSupp === 0 ? '—' : `${diffSupp > 0 ? '+' : ''}${diffSupp.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                  </td>
                                  <td className={`p-2 text-right font-mono text-2xs ${diffSupp === 0 ? 'text-slate-450' : diffSupp < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {s.totalB > 0 
                                      ? `${diffSupp > 0 ? '+' : ''}${((diffSupp / s.totalB) * 100).toFixed(1)}%`
                                      : s.totalA > 0 ? '+100%' : '—'
                                    }
                                  </td>
                                </tr>
                              );
                            }
                          })}
                        </tbody>
                      );
                    })}

                    {/* Operational totals and aggregates footer rows */}
                    <tfoot>
                      {/* TOTAL EXPENSES IN RON */}
                      <tr className="bg-slate-900 text-white font-black text-xs border-t">
                        <td className="p-3 uppercase">TOTAL CHELTUIELI RON</td>
                        <td className="p-3 text-right font-mono">
                          {monthA.totalExpenses.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                        </td>
                        {isComparisonMode && (
                          <>
                            <td className="p-3 text-right font-mono bg-slate-800">
                              {monthB.totalExpenses.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </td>
                            <td className={`p-3 text-right font-mono font-black ${monthA.totalExpenses <= monthB.totalExpenses ? 'text-emerald-400' : 'text-rose-405'}`}>
                              {monthA.totalExpenses > monthB.totalExpenses ? '+' : ''}
                              {(monthA.totalExpenses - monthB.totalExpenses).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-right font-mono">
                              {monthB.totalExpenses > 0 
                                ? `${monthA.totalExpenses > monthB.totalExpenses ? '+' : ''}${(((monthA.totalExpenses - monthB.totalExpenses) / monthB.totalExpenses) * 100).toFixed(1)}%` 
                                : '—'
                              }
                            </td>
                          </>
                        )}
                        {!isComparisonMode && <td className="p-3 text-right font-mono">100.00 %</td>}
                      </tr>

                      {/* TOTAL EXPENSES IN EURO */}
                      <tr className="bg-slate-800 text-white font-extrabold text-2xs">
                        <td className="p-3 pl-6 uppercase">TOTAL CHELTUIELI EURO (rata 5.0)</td>
                        <td className="p-3 text-right font-mono">
                          {(monthA.totalExpenses / 5.0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                        </td>
                        {isComparisonMode && (
                          <>
                            <td className="p-3 text-right font-mono bg-slate-700">
                              {(monthB.totalExpenses / 5.0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-right font-mono">
                              {((monthA.totalExpenses - monthB.totalExpenses) / 5.0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-right font-mono">EUR</td>
                          </>
                        )}
                        {!isComparisonMode && <td className="p-3 text-right">EUR</td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>


              {/* Right column: Categories budget charts and indicators bento (Hidden in Comparison Mode to allow wide layout) */}
              {!isComparisonMode && (
                <div className="space-y-6">
                  
                  {/* Category Breakdown list */}
                  <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-2xs space-y-4">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                      <Percent className="w-4.5 h-4.5 text-blue-600" />
                      GRAFIC PONDERE COSTURI
                    </h3>
                    <p className="text-xs text-slate-550">Distribuția cheltuielilor totale pe categoriile de bază</p>

                    <div className="space-y-3.5 pt-2">
                      {monthA.categories
                        .filter(cat => cat.total > 0)
                        .sort((a,b) => b.total - a.total)
                        .map((cat, i) => (
                          <div key={i} className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between font-semibold">
                              <span className="text-slate-700 truncate max-w-[160px]">{cat.name}</span>
                              <span className="font-mono text-slate-900">{cat.percentage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                              <div 
                                className="bg-blue-600 h-full rounded-full transition-all"
                                style={{ width: `${cat.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* VIEW 5: RAPOARTE FINANCIARE AVANSATE */}
      {view === 'financialReports' && (() => {
        // Compute metrics inside an IIFE to keep it isolated and self-contained!
        const reportData = getFilteredDataForReport();
        
        // 1. Profit & Loss computation
        const pnlRevenueHotel = reportData.logs.reduce((sum, l) => sum + l.dailyRevenue, 0);
        const pnlRevenueManual = reportData.txs.filter(t => t.type === 'Venit').reduce((sum, t) => sum + t.amount, 0);
        const pnlTotalRevenue = pnlRevenueHotel + pnlRevenueManual;

        const pnlCategoriesBreakdown = EXCEL_CATEGORIES.map(category => {
          // Invoices sum (all invoices regardless of payment status)
          const invSum = reportData.invs
            .filter(inv => getSupplierCategory(inv.company) === category || inv.costCenter === category)
            .reduce((sum, inv) => sum + inv.total, 0);

          // Manual tx sum (ONLY standard non-invoice transactions that are PAID/Active!)
          const txSum = reportData.txs
            .filter(tx => !tx.invoiceNumber && tx.status !== 'unpaid' && tx.category === category)
            .reduce((sum, tx) => sum + tx.amount, 0);

          const totalCatCost = invSum + txSum;
          const percentageCat = pnlTotalRevenue > 0 ? (totalCatCost / pnlTotalRevenue) * 105 : 0; // wait, let's keep standard 100% logic

          return {
            name: category,
            total: totalCatCost,
            percentage: pnlTotalRevenue > 0 ? (totalCatCost / pnlTotalRevenue) * 100 : 0
          };
        });

        const pnlTotalExpenses = pnlCategoriesBreakdown.reduce((sum, c) => sum + c.total, 0);
        const pnlNetProfit = pnlTotalRevenue - pnlTotalExpenses;
        const pnlOperatingMargin = pnlTotalRevenue > 0 ? (pnlNetProfit / pnlTotalRevenue) * 100 : 0;

        // 2. Balance sheet computation
        const bsCashValue = bsBaseCash + pnlTotalRevenue - pnlTotalExpenses; 
        const bsArValue = pnlTotalRevenue * 0.15; 
        const bsFixedAssetsVal = bsFixedAssets; 
        const bsTotalAssets = bsCashValue + bsArValue + bsFixedAssetsVal;

        const bsApValue = reportData.invs.reduce((sum, inv) => {
          const isPaid = transactions.filter(t => t.invoiceId === inv.id).reduce((sum, t) => sum + t.amount, 0);
          return sum + Math.max(0, inv.total - isPaid);
        }, 0);
        const bsTaxesEstimated = pnlTotalRevenue * 0.03; 
        const bsEquitySocialVal = bsEquitySocial; 
        const bsRemainingNetProfit = bsTotalAssets - (bsApValue + bsTaxesEstimated + bsEquitySocialVal);
        const bsTotalLiabilitiesAndEquity = bsApValue + bsTaxesEstimated + bsEquitySocialVal + bsRemainingNetProfit;

        // 3. Daily Operational KPI calculations
        const totalReportRoomsOccupied = reportData.logs.reduce((sum, l) => sum + l.occupiedRooms, 0);
        const totalReportRoomsAvailable = reportData.logs.reduce((sum, l) => sum + l.totalRooms, 0);
        const reportAvgOccupancy = totalReportRoomsAvailable > 0 ? (totalReportRoomsOccupied / totalReportRoomsAvailable) * 100 : 0;
        const reportTouristsCount = reportData.logs.reduce((sum, l) => sum + l.touristsCount, 0);
        const reportOvernightsCount = reportData.logs.reduce((sum, l) => sum + l.overnights, 0);
        const reportAdrValue = reportOvernightsCount > 0 ? pnlRevenueHotel / reportOvernightsCount : 0;
        const reportRevParValue = totalReportRoomsAvailable > 0 ? pnlRevenueHotel / totalReportRoomsAvailable : 0;

        const exportToCSV = () => {
          let csvContent = "";
          if (activeReportTab === 'pnl') {
            csvContent += "CONT DE PROFIT SI PIERDERE (P&L)\n";
            csvContent += `Perioada: ${getReportPeriodLabel()}\n\n`;
            csvContent += "Indicator;Suma (RON);Procent\n";
            csvContent += `VENITURI TOTALE Cazari & Operatiuni;${pnlTotalRevenue.toFixed(2)};100%\n`;
            csvContent += `  - Venituri Hotel (Cazari);${pnlRevenueHotel.toFixed(2)};${pnlTotalRevenue > 0 ? (pnlRevenueHotel / pnlTotalRevenue * 100).toFixed(1) : '0.0'}%\n`;
            csvContent += `  - Venituri Directe / Diverse;${pnlRevenueManual.toFixed(2)};${pnlTotalRevenue > 0 ? (pnlRevenueManual / pnlTotalRevenue * 100).toFixed(1) : '0.0'}%\n`;
            csvContent += `CHELTUIELI DE EXPLOATARE;${pnlTotalExpenses.toFixed(2)};${pnlTotalRevenue > 0 ? (pnlTotalExpenses / pnlTotalRevenue * 100).toFixed(1) : '0.0'}%\n`;
            pnlCategoriesBreakdown.forEach(cat => {
              csvContent += `  - ${cat.name};${cat.total.toFixed(2)};${pnlTotalRevenue > 0 ? (cat.total / pnlTotalRevenue * 100).toFixed(1) : '0.0'}%\n`;
            });
            csvContent += `PROFIT NET (Net Earnings);${pnlNetProfit.toFixed(2)};${pnlTotalRevenue > 0 ? (pnlNetProfit / pnlTotalRevenue * 100).toFixed(1) : '0.0'}%\n`;
          } else if (activeReportTab === 'balance') {
            csvContent += "BILANT FINANCIAR SIMPLIFICAT\n";
            csvContent += `Perioada de referinta: ${getReportPeriodLabel()}\n\n`;
            csvContent += "ELEMENTE DE ACTIV (ASSETS);Suma (RON);;ELEMENTE DE PASIV (LIABILITIES & EQUITY);Suma (RON)\n";
            csvContent += `Numerar si Disponibilitati;${bsCashValue.toFixed(2)};;Furnizori de plata (Accounts Payable);${bsApValue.toFixed(2)}\n`;
            csvContent += `Creante Clienti pending;${bsArValue.toFixed(2)};;Obligatii Fiscale (Taxes);${bsTaxesEstimated.toFixed(2)}\n`;
            csvContent += `Mijloace Fixe si Echipamente;${bsFixedAssetsVal.toFixed(2)};;Capital Social;${bsEquitySocialVal.toFixed(2)}\n`;
            csvContent += `;;;Profit Curent / Reportat;${bsRemainingNetProfit.toFixed(2)}\n`;
            csvContent += `TOTAL ACTIVE;${bsTotalAssets.toFixed(2)};;TOTAL PASIVE SI CAPITALURI PROPRII;${bsTotalLiabilitiesAndEquity.toFixed(2)}\n`;
          } else if (activeReportTab === 'cashflow') {
            const cfOpenCash = bsBaseCash;
            const cfPaidInvs = reportData.pmts.reduce((sum, p) => sum + p.amount, 0);
            const cfExpManual = reportData.txs.filter(t => t.type === 'Cheltuiala' && !t.invoiceNumber && t.status !== 'unpaid').reduce((sum, t) => sum + t.amount, 0);
            const cfTotalOut = cfPaidInvs + cfExpManual;
            const cfNet = pnlTotalRevenue - cfTotalOut;
            const cfCloseCash = cfOpenCash + cfNet;

            csvContent += "FLUX DE NUMERAR (CASH FLOW STATEMENT)\n";
            csvContent += `Perioada: ${getReportPeriodLabel()}\n\n`;
            csvContent += "Categorie / Tranzactie;Incasari (RON);Plati (RON);Net (RON)\n";
            csvContent += `SOLD INITIAL (Opening Balance);;;${cfOpenCash.toFixed(2)}\n`;
            csvContent += "\n1. INTRARI DE NUMERAR (CASH RECEIPTS)\n";
            csvContent += `Venituri Operationale Receptie (Hotel);${pnlRevenueHotel.toFixed(2)};;\n`;
            csvContent += `Alte Venituri Directe / Incasari;${pnlRevenueManual.toFixed(2)};;\n`;
            csvContent += `TOTAL INTRARI DE NUMERAR;${pnlTotalRevenue.toFixed(2)};;\n`;
            csvContent += "\n2. IESIRI DE NUMERAR (CASH DISBURSEMENTS)\n";
            csvContent += `Plati Facturi Furnizori;;${cfPaidInvs.toFixed(2)};\n`;
            csvContent += `Alte Plati / Cheltuieli Directe;;${cfExpManual.toFixed(2)};\n`;
            csvContent += `TOTAL IESIRI DE NUMERAR;;${cfTotalOut.toFixed(2)};\n`;
            csvContent += `\nFLUX DE NUMERAR NET (Net Period Cash Flow);;;${cfNet.toFixed(2)}\n`;
            csvContent += `SOLD FINAL (Closing Balance);;;${cfCloseCash.toFixed(2)}\n`;
          } else {
            csvContent += "RAPORT OPERATIONAL ZILNIC\n";
            csvContent += `Data de referinta: ${getReportPeriodLabel()}\n\n`;
            csvContent += "Parametru;Valoare\n";
            csvContent += `Total Venituri Inregistrate;${pnlTotalRevenue.toFixed(2)} RON\n`;
            csvContent += `Total Cheltuieli Inregistrate;${pnlTotalExpenses.toFixed(2)} RON\n`;
            csvContent += `Camere Ocupate;${totalReportRoomsOccupied} din ${totalReportRoomsAvailable}\n`;
            csvContent += `Rata de Ocupare;${reportAvgOccupancy.toFixed(1)}%\n`;
            csvContent += `Numar Turisti;${reportTouristsCount}\n`;
            csvContent += `Numar Innoptari;${reportOvernightsCount}\n`;
            csvContent += `ADR (Average Daily Rate);${reportAdrValue.toFixed(2)} RON\n`;
            csvContent += `RevPAR;${reportRevParValue.toFixed(2)} RON\n`;
          }

          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", `CCB_Raport_${activeReportTab}_${getReportPeriodFileLabel()}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        const exportToPDF = () => {
          const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
          });

          let pageNum = 1;

          // HELPER 1: Draw global document header
          const drawHeader = (titleStr: string) => {
            // CCB Header Left
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text('CCB Hotels Management SRL', 15, 18);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(100, 116, 139); // slate-500
            doc.text(lang === 'RO' ? 'Sistem de Raportare Financiară "Ashi"' : 'Ashi Reporting Compliance Engine', 15, 23);
            doc.text('CUI: RO39255651 • Str. Poiana Soarelui nr. 12, Brașov', 15, 27);

            // Right-aligned report header tag block
            doc.setFillColor(15, 23, 42); // Dark slate
            doc.rect(120, 13, 75, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.text(titleStr.toUpperCase(), 157.5, 18.2, { align: 'center' });

            doc.setTextColor(30, 41, 59); // slate-800
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text(`${lang === 'RO' ? 'PERIOADĂ:' : 'INTERVAL:'} ${getReportPeriodLabel().toUpperCase()}`, 195, 26, { align: 'right' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184); // slate-400
            doc.text(`${lang === 'RO' ? 'Generat la:' : 'Generated At:'} ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO', {hour: '2-digit', minute:'2-digit'})}`, 195, 31, { align: 'right' });

            // Decorative separator line
            doc.setDrawColor(203, 213, 225); // slate-300
            doc.setLineWidth(0.4);
            doc.line(15, 34, 195, 34);
          };

          // HELPER 2: Draw card summary boxes
          const drawSummaryCard = (x: number, y: number, w: number, h: number, label: string, value: string, subText: string, isAccent = false) => {
            if (isAccent) {
              doc.setFillColor(240, 253, 244); // light emerald-50
              doc.setDrawColor(187, 247, 208); // emerald-200
            } else {
              doc.setFillColor(248, 250, 252); // slate-50
              doc.setDrawColor(226, 232, 240); // slate-220
            }
            doc.rect(x, y, w, h, 'FD');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139); // slate-500
            doc.text(label.toUpperCase(), x + 4, y + 5);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text(value, x + 4, y + 11);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(148, 163, 184); // slate-400
            doc.text(subText, x + 4, y + 16);
          };

          // HELPER 3: Global Footer
          const drawFooter = () => {
            const y = 282;
            doc.setDrawColor(226, 232, 240); // slate-200
            doc.setLineWidth(0.4);
            doc.line(15, y, 195, y);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(100, 116, 139); // slate-500
            doc.text('ASHI COMPLIANCE SYSTEMS (REPORTING ENGINE)', 15, y + 4);
            doc.setFont('helvetica', 'normal');
            doc.text('Document generat automat, securizat electronic în timp real.', 15, y + 7.5);

            doc.text('CCB HOTELS MANAGEMENT SRL', 195, y + 4, { align: 'right' });
            doc.text(`${lang === 'RO' ? 'Pagina' : 'Page'} ${pageNum}`, 195, y + 7.5, { align: 'right' });
          };

          if (activeReportTab === 'pnl') {
            // ================== P&L STATEMENT ==================
            drawHeader(lang === 'RO' ? 'Profit & Pierderi (P&L)' : 'Profit & Loss (P&L)');

            // Summary cards row
            drawSummaryCard(15, 38, 56, 19, 
              lang === 'RO' ? 'Venituri Brute' : 'Gross Revenue', 
              `${pnlTotalRevenue.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`, 
              lang === 'RO' ? 'Financiar consolidat' : 'Consolidated cash & ota'
            );
            drawSummaryCard(77, 38, 56, 19, 
              lang === 'RO' ? 'Cheltuieli Totale' : 'Total Expenses', 
              `${pnlTotalExpenses.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`, 
              lang === 'RO' ? 'Facturi stinse + manuale' : 'Direct outputs + invoices'
            );
            drawSummaryCard(139, 38, 56, 19, 
              lang === 'RO' ? 'Rezultat Net (Profit)' : 'Net Profit / Loss', 
              `${pnlNetProfit.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`, 
              lang === 'RO' ? 'Excedent din exploatare' : 'Net cycle performance margin',
              pnlNetProfit >= 0
            );

            // Table Header Title
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(30, 41, 59);
            doc.text(lang === 'RO' ? 'INDICATORI FINANCIARI PENTRU PERIOADĂ' : 'FINANCIAL INDICATORS DETAILED SPREAD', 15, 64);

            // Table headers
            doc.setFillColor(15, 23, 42); // slate-900
            doc.rect(15, 68, 180, 6, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(255, 255, 255);
            doc.text(lang === 'RO' ? 'CONT CONTABILITATE / REPARTIZARE' : 'ACCOUNT ENTRY NAME / EXPLANATION', 17, 72);
            doc.text(lang === 'RO' ? 'SUMĂ (RON)' : 'VALUE (RON)', 160, 72, { align: 'right' });
            doc.text(lang === 'RO' ? 'PROCENT VENIT' : '% REVENUE', 190, 72, { align: 'right' });

            let currentY = 79;
            const drawRow = (title: string, val: number, pctStr: string, isHeader = false, isLast = false) => {
              if (isHeader) {
                doc.setFillColor(241, 245, 249); // slate-100
                doc.rect(15, currentY - 4, 180, 6, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(15, 23, 42);
              } else if (isLast) {
                doc.setFillColor(15, 23, 42); // slate-900
                doc.rect(15, currentY - 4.5, 180, 7.5, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8.5);
                doc.setTextColor(255, 255, 255);
              } else {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(71, 85, 105);
              }

              const valText = val.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' RON';
              doc.text(title, isHeader || isLast ? 17 : 21, currentY);
              doc.text(valText, 160, currentY, { align: 'right' });
              doc.text(pctStr, 190, currentY, { align: 'right' });

              if (!isHeader && !isLast) {
                doc.setDrawColor(241, 245, 249);
                doc.setLineWidth(0.3);
                doc.line(15, currentY + 1.8, 195, currentY + 1.8);
              }
              currentY += isLast ? 9 : 6;
            };

            // Revenues Block
            drawRow(lang === 'RO' ? '1. Venituri Operaționale Totale' : '1. Total Operating Income', pnlTotalRevenue, '100.0%', true);
            drawRow(lang === 'RO' ? '   ➔ Venituri din Cazare (Hotel Reception)' : '   ➔ Room Booking Income', pnlRevenueHotel, `${pnlTotalRevenue > 0 ? (pnlRevenueHotel / pnlTotalRevenue * 100).toFixed(1) : '0.0'}%`);
            drawRow(lang === 'RO' ? '   ➔ Venituri Directe din Casă / Diverse' : '   ➔ Direct Cash Revenues / Miscellaneous', pnlRevenueManual, `${pnlTotalRevenue > 0 ? (pnlRevenueManual / pnlTotalRevenue * 100).toFixed(1) : '0.0'}%`);

            // Expenses Block
            drawRow(lang === 'RO' ? '2. Cheltuieli de Exploatare Totale' : '2. Total Operating Outflows', pnlTotalExpenses, `${pnlTotalRevenue > 0 ? (pnlTotalExpenses / pnlTotalRevenue * 100).toFixed(1) : '0.0'}%`, true);
            pnlCategoriesBreakdown.forEach(cat => {
              drawRow(`   ➔ ${cat.name}`, cat.total, `${cat.percentage.toFixed(1)}%`);
            });

            // Spacing before grand total
            currentY += 4;
            drawRow(lang === 'RO' ? 'REZULTATUL FINANCIAR NET' : 'REZULTATUL FINANCIAR NET', pnlNetProfit, `${pnlOperatingMargin.toFixed(1)}%`, false, true);

            drawFooter();
          } 
          else if (activeReportTab === 'balance') {
            // ================== BALANCE SHEET ==================
            drawHeader(lang === 'RO' ? 'Bilanț Patrimonial' : 'Balance Sheet');

            // Notice block
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.rect(15, 38, 180, 10, 'FD');
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(6.5);
            doc.setTextColor(100, 116, 139);
            const noticeText = lang === 'RO'
              ? '*Bilanțul reflectă activele estimate (Numerar pornind de la un depozit istoric consolidat de 185.000 RON), creanțe comerciale și datorii provenind din facturi.*'
              : '*Estimated balance reflects 185,000 RON registered equity cash deposits integrated with realtime accounts payable and outstanding timelines.*';
            doc.text(noticeText, 18, 44);

            // Left Side Header (Active)
            doc.setFillColor(15, 23, 42);
            doc.rect(15, 52, 85, 6, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(255, 255, 255);
            doc.text(lang === 'RO' ? 'ACTIV (ASSETS)' : 'ACTIV (ASSETS)', 17, 56);
            doc.text(lang === 'RO' ? 'VALOARE (RON)' : 'VALUE (RON)', 96, 56, { align: 'right' });

            // Right Side Header (Pasive)
            doc.setFillColor(15, 23, 42);
            doc.rect(110, 52, 85, 6, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(255, 255, 255);
            doc.text(lang === 'RO' ? 'PASIV (LIABILITIES & EQUITY)' : 'PASIV (LIABILITIES & EQUITY)', 112, 56);
            doc.text(lang === 'RO' ? 'VALOARE (RON)' : 'VALUE (RON)', 191, 56, { align: 'right' });

            // Side-by-side row drawing helper
            let bsY = 64;
            const drawBsRow = (leftTitle: string, leftVal: number, rightTitle: string, rightVal: number, isLast = false) => {
              if (isLast) {
                doc.setFillColor(241, 245, 249);
                doc.rect(15, bsY - 4, 85, 6.5, 'F');
                doc.rect(110, bsY - 4, 85, 6.5, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.5);
                doc.setTextColor(15, 23, 42);
              } else {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(71, 85, 105);
              }

              // Left items
              if (leftTitle) {
                const valStr = leftVal.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' RON';
                doc.text(leftTitle, 17, bsY);
                doc.text(valStr, 96, bsY, { align: 'right' });
                if (!isLast) {
                  doc.setDrawColor(241, 245, 249);
                  doc.setLineWidth(0.3);
                  doc.line(15, bsY + 1.8, 100, bsY + 1.8);
                }
              }

              // Right items
              if (rightTitle) {
                const valStr = rightVal.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' RON';
                doc.text(rightTitle, 112, bsY);
                doc.text(valStr, 191, bsY, { align: 'right' });
                if (!isLast) {
                  doc.setDrawColor(241, 245, 249);
                  doc.setLineWidth(0.3);
                  doc.line(110, bsY + 1.8, 195, bsY + 1.8);
                }
              }

              bsY += 7.5;
            };

            drawBsRow(
              lang === 'RO' ? 'Disponibilități Bănești (Numerar & Conturi)' : 'Cash and Equivalents', bsCashValue,
              lang === 'RO' ? 'Datorii către Furnizori (Accounts Payable)' : 'Accounts Payable', bsApValue
            );

            drawBsRow(
              lang === 'RO' ? 'Creanțe Comerciale (Pending Receipts)' : 'Accounts Receivable', bsArValue,
              lang === 'RO' ? 'Obligații Fiscale la Bugetul de Stat' : 'Taxes and Social Charges', bsTaxesEstimated
            );

            drawBsRow(
              lang === 'RO' ? 'Mijloace Fixe, Clădiri & Amenajări' : 'Tangible Fixed Assets', bsFixedAssets,
              lang === 'RO' ? 'Capital Social Înregistrat' : 'Share Capital', bsEquitySocial
            );

            // Row 4 (Spacer on left to match retaining earnings on right)
            drawBsRow(
              '', 0,
              lang === 'RO' ? 'Excedent curent / Profit raportat' : 'Retained Earnings / Ledger Net', bsRemainingNetProfit
            );

            // Subtotals
            bsY += 2;
            drawBsRow(
              lang === 'RO' ? 'TOTAL ACTIVE (TOTAL ASSETS)' : 'TOTAL ASSETS', bsTotalAssets,
              lang === 'RO' ? 'TOTAL PASIVE / EQUITY' : 'TOTAL OUTSTANDING & EQUITY', bsTotalLiabilitiesAndEquity,
              true
            );

            // Balancing verification badge
            doc.setFillColor(240, 253, 244); // light emerald-50
            doc.setDrawColor(187, 247, 208); // emerald-200
            doc.rect(15, bsY + 4, 180, 10, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(21, 115, 71); // emerald-700
            const balanceText = lang === 'RO'
              ? `✓ VERIFICARE BILANȚIERĂ: ACTIVE = PASIVE (${bsTotalAssets.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON) - Bilanțul reflectă echilibru patrimonial perfect.`
              : `✓ LEDGER AUDIT BALANCE: ASSETS = LIABILITIES (${bsTotalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })} RON) - Accounting balanced perfectly.`;
            doc.text(balanceText, 19, bsY + 10);

            drawFooter();
          } 
          else if (activeReportTab === 'cashflow') {
            // ================== CASH FLOW STATEMENT ==================
            drawHeader(lang === 'RO' ? 'Flux de Numerar (Cash Flow)' : 'Cash Flow Statement');

            const cfOpenCash = bsBaseCash;
            const cfPaidInvs = reportData.pmts.reduce((sum, p) => sum + p.amount, 0);
            const cfExpManual = reportData.txs.filter(t => t.type === 'Cheltuiala' && !t.invoiceNumber && t.status !== 'unpaid').reduce((sum, t) => sum + t.amount, 0);
            const cfTotalOut = cfPaidInvs + cfExpManual;
            const cfTotalIn = pnlTotalRevenue;
            const cfNet = cfTotalIn - cfTotalOut;
            const cfCloseCash = cfOpenCash + cfNet;

            // Summary 1st row cards (Width: 85, X=15, 110)
            drawSummaryCard(15, 38, 85, 17, 
              lang === 'RO' ? 'Sold Inițial (Cash Open)' : 'Opening Cash position', 
              `${cfOpenCash.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`, 
              lang === 'RO' ? 'Lichidități în conturi la început' : 'Opening available balance'
            );
            drawSummaryCard(110, 38, 85, 17, 
              lang === 'RO' ? 'Sold Final (Cash Close)' : 'Closing Cash balance', 
              `${cfCloseCash.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`, 
              lang === 'RO' ? 'Disponibilități preconizate' : 'Ending cash position',
              true
            );

            // Summary 2nd row cards (Width: 56, X=15, 77, 139)
            drawSummaryCard(15, 58, 56, 17, 
              lang === 'RO' ? 'Total Încasări' : 'Total Inflows', 
              `+${cfTotalIn.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`, 
              `${pnlRevenueHotel > 0 ? pnlRevenueHotel.toLocaleString('ro-RO') : '0'} lodging + ${pnlRevenueManual > 0 ? pnlRevenueManual.toLocaleString('ro-RO') : '0'} manual`
            );
            drawSummaryCard(77, 58, 56, 17, 
              lang === 'RO' ? 'Total Plăți' : 'Total Outflows', 
              `-${cfTotalOut.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`, 
              `${cfPaidInvs > 0 ? cfPaidInvs.toLocaleString('ro-RO') : '0'} bills + ${cfExpManual > 0 ? cfExpManual.toLocaleString('ro-RO') : '0'} manual`
            );
            drawSummaryCard(139, 58, 56, 17, 
              lang === 'RO' ? 'Flux Net' : 'Net Cash Flow', 
              `${cfNet >= 0 ? '+' : ''}${cfNet.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`, 
              lang === 'RO' ? 'Variația monetară netă' : 'Net liquidity change during period'
            );

            // Transactions Table Title
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(30, 41, 59);
            doc.text(lang === 'RO' ? 'REGISTRU FLUX DE NUMERAR DETALIAT' : 'DETAILED TRANSACTIONAL CASH LEDGER', 15, 83);

            // Header row for Transaction list
            doc.setFillColor(15, 23, 42); // slate-900
            doc.rect(15, 87, 180, 6, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(255, 255, 255);
            doc.text(lang === 'RO' ? 'DATA' : 'DATE', 17, 91);
            doc.text(lang === 'RO' ? 'FLOW (TIP)' : 'FLOW TYPE', 37, 91);
            doc.text(lang === 'RO' ? 'DESCRIERE PARTENER / SURSĂ' : 'DESCRIPTION & DETAILS', 75, 91);
            doc.text(lang === 'RO' ? 'METODĂ' : 'METHOD', 145, 91);
            doc.text(lang === 'RO' ? 'SUMĂ (RON)' : 'AMOUNT (RON)', 191, 91, { align: 'right' });

            const compileCashEvents = () => {
              const events: {
                date: string;
                flow: string;
                description: string;
                details: string;
                method: string;
                amount: number;
                isIn: boolean;
              }[] = [];

              // Reception revenues
              reportData.logs.filter(l => l.dailyRevenue > 0).forEach(l => {
                events.push({
                  date: l.date,
                  flow: lang === 'RO' ? 'Încadrare recepție' : 'INFLOW (lodge)',
                  description: lang === 'RO' ? 'Încasat Recepție Cazări Hotel' : 'Reception Lodging Revenue',
                  details: lang === 'RO' ? `Grad ocupare: ${((l.occupiedRooms/l.totalRooms)*100).toFixed(0)}% • ${l.touristsCount} turiști` : `Occupancy: ${((l.occupiedRooms/l.totalRooms)*100).toFixed(0)}% • ${l.touristsCount} guests`,
                  method: lang === 'RO' ? 'Split (Cash/Card/OTA)' : 'Direct Reception Split',
                  amount: l.dailyRevenue,
                  isIn: true
                });
              });

              // Manual incomes
              reportData.txs.filter(t => t.type === 'Venit').forEach(t => {
                events.push({
                  date: t.date,
                  flow: lang === 'RO' ? 'Venit Direct' : 'DIRECT INCOME',
                  description: t.partner || '',
                  details: t.description || t.category || '',
                  method: t.paymentMethod || '',
                  amount: t.amount,
                  isIn: true
                });
              });

              // Supplier payments
              reportData.pmts.forEach(p => {
                events.push({
                  date: p.date,
                  flow: lang === 'RO' ? 'Plată Furnizor' : 'SUPPLIER PMT',
                  description: lang === 'RO' ? `Factură nr. ${p.invoiceNumber}` : `Invoice bill #${p.invoiceNumber}`,
                  details: lang === 'RO' ? `Referință OP/Ref: ${p.reference || 'N/A'}` : `Reference: ${p.reference || 'N/A'}`,
                  method: p.method || '',
                  amount: p.amount,
                  isIn: false
                });
              });

              // Manual expense payments
              reportData.txs.filter(t => t.type === 'Cheltuiala').forEach(t => {
                events.push({
                  date: t.date,
                  flow: lang === 'RO' ? 'Plată ledger' : 'MANUAL OUTFLOW',
                  description: t.partner || '',
                  details: t.description || t.category || '',
                  method: t.paymentMethod || '',
                  amount: t.amount,
                  isIn: false
                });
              });

              events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              return events;
            };

            const events = compileCashEvents();
            let currentY = 97;

            events.forEach((ev) => {
              if (currentY > 268) {
                // Paginate!
                drawFooter();
                doc.addPage();
                pageNum++;
                drawHeader(lang === 'RO' ? 'Flux de Numerar (Cash Flow)' : 'Cash Flow Statement');
                
                // Redraw table headers on new page
                doc.setFillColor(15, 23, 42); 
                doc.rect(15, 38, 180, 6, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.5);
                doc.setTextColor(255, 255, 255);
                doc.text(lang === 'RO' ? 'DATA' : 'DATE', 17, 42);
                doc.text(lang === 'RO' ? 'FLOW (TIP)' : 'FLOW TYPE', 37, 42);
                doc.text(lang === 'RO' ? 'DESCRIERE PARTENER / SURSĂ' : 'DESCRIPTION & DETAILS', 75, 42);
                doc.text(lang === 'RO' ? 'METODĂ' : 'METHOD', 145, 42);
                doc.text(lang === 'RO' ? 'SUMĂ (RON)' : 'AMOUNT (RON)', 191, 42, { align: 'right' });
                
                currentY = 48;
              }

              doc.setFont('helvetica', 'normal');
              doc.setFontSize(7.5);
              doc.setTextColor(71, 85, 105);

              // Date
              doc.text(ev.date, 17, currentY);

              // Flow Badge
              doc.setFont('helvetica', 'bold');
              if (ev.isIn) {
                doc.setTextColor(21, 115, 71);
              } else {
                doc.setTextColor(185, 28, 28);
              }
              doc.text(ev.flow.toUpperCase(), 37, currentY);

              // Description Info
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(15, 23, 42);
              doc.text(ev.description.substring(0, 36), 75, currentY - 1);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(148, 163, 184);
              doc.setFontSize(6.5);
              doc.text(ev.details.substring(0, 48), 75, currentY + 2.2);

              // Payment Method
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(7.5);
              doc.setTextColor(100, 116, 139);
              doc.text(ev.method.substring(0, 16), 145, currentY);

              // Amount
              const sign = ev.isIn ? '+' : '-';
              const amtText = `${sign}${ev.amount.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`;
              doc.setFont('helvetica', 'bold');
              if (ev.isIn) {
                doc.setTextColor(21, 115, 71);
              } else {
                doc.setTextColor(185, 28, 28);
              }
              doc.text(amtText, 191, currentY, { align: 'right' });

              // Split line
              doc.setDrawColor(241, 245, 249);
              doc.setLineWidth(0.3);
              doc.line(15, currentY + 3.8, 195, currentY + 3.8);

              currentY += 8;
            });

            if (events.length === 0) {
              doc.setFont('helvetica', 'italic');
              doc.setFontSize(8);
              doc.setTextColor(100, 116, 139);
              doc.text(lang === 'RO' ? 'Nicio tranzacție de numerar înregistrată.' : 'No cash transactions found.', 90, currentY + 10, { align: 'center' });
            }

            drawFooter();
          } 
          else {
            // ================== DAILY OPERATIONALS ==================
            drawHeader(lang === 'RO' ? 'Raport Operațional Zilnic' : 'Daily Operations Performance');

            // Summary cards row (occupancy, tourists, ADR, RevPAR)
            drawSummaryCard(15, 38, 42, 18, 
              lang === 'RO' ? 'Rată Medie Ocupare' : 'Occupancy Rate', 
              `${reportAvgOccupancy.toFixed(1)}%`, 
              `${totalReportRoomsOccupied} din ${totalReportRoomsAvailable} camere`
            );
            drawSummaryCard(60, 38, 42, 18, 
              lang === 'RO' ? 'Total Turiști Găzduiți' : 'Total Tourists', 
              `${reportTouristsCount.toLocaleString('ro-RO')}`, 
              lang === 'RO' ? 'înregistrați în total' : 'total checked-in guests'
            );
            drawSummaryCard(105, 38, 42, 18, 
              lang === 'RO' ? 'Preț Mediu / Cameră ADR' : 'ADR (Average Rate)', 
              `${reportAdrValue.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON`, 
              lang === 'RO' ? 'per noapte totală' : 'per overnights booking'
            );
            drawSummaryCard(150, 38, 42, 18, 
              lang === 'RO' ? 'RevPAR' : 'RevPAR Performance', 
              `${reportRevParValue.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON`, 
              lang === 'RO' ? 'per cameră totală' : 'per available inventory'
            );

            // Detailed operating logs table title
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(30, 41, 59);
            doc.text(lang === 'RO' ? 'JURNAL EXPLOATARE OPERATIV DETALIAT' : 'DETAILED OPERATIONAL PERFORMANCE JOURNAL LOG', 15, 64);

            // Table headers
            doc.setFillColor(15, 23, 42); // slate-900
            doc.rect(15, 68, 180, 6, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(255, 255, 255);
            doc.text(lang === 'RO' ? 'DATĂ JURNAL' : 'LOG DATE', 17, 72);
            doc.text(lang === 'RO' ? 'OCCUPANȚĂ CAMERE' : 'OCCUPIED ROOMS', 65, 72);
            doc.text(lang === 'RO' ? 'TURIȘTI SPRE' : 'GUESTS CHECKED-IN', 105, 72);
            doc.text(lang === 'RO' ? 'ÎNNOPTĂRI' : 'OVERNIGHTS', 140, 72);
            doc.text(lang === 'RO' ? 'VENITURI RECEPȚIE' : 'ACCOMMODATION SALES', 191, 72, { align: 'right' });

            let currentY = 78;
            reportData.logs.forEach((log) => {
              if (currentY > 268) {
                // Paginate!
                drawFooter();
                doc.addPage();
                pageNum++;
                drawHeader(lang === 'RO' ? 'Raport Operațional' : 'Daily Operations Performance');
                
                // Redraw table headers on new page
                doc.setFillColor(15, 23, 42); 
                doc.rect(15, 38, 180, 6, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.5);
                doc.setTextColor(255, 255, 255);
                doc.text(lang === 'RO' ? 'DATĂ JURNAL' : 'LOG DATE', 17, 42);
                doc.text(lang === 'RO' ? 'OCCUPANȚĂ CAMERE' : 'OCCUPIED ROOMS', 65, 42);
                doc.text(lang === 'RO' ? 'TURIȘTI SPRE' : 'GUESTS CHECKED-IN', 105, 42);
                doc.text(lang === 'RO' ? 'ÎNNOPTĂRI' : 'OVERNIGHTS', 140, 42);
                doc.text(lang === 'RO' ? 'VENITURI RECEPȚIE' : 'ACCOMMODATION SALES', 191, 42, { align: 'right' });
                
                currentY = 48;
              }

              doc.setFont('helvetica', 'normal');
              doc.setFontSize(7.5);
              doc.setTextColor(71, 85, 105);

              doc.text(log.date, 17, currentY);
              doc.text(`${log.occupiedRooms} / ${log.totalRooms}`, 65, currentY);
              doc.text(String(log.touristsCount), 105, currentY);
              doc.text(String(log.overnights), 140, currentY);

              doc.setFont('helvetica', 'bold');
              doc.setTextColor(15, 23, 42);
              doc.text(`${log.dailyRevenue.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`, 191, currentY, { align: 'right' });

              // Divider
              doc.setDrawColor(241, 245, 249);
              doc.setLineWidth(0.3);
              doc.line(15, currentY + 1.8, 195, currentY + 1.8);

              currentY += 6;
            });

            if (reportData.logs.length === 0) {
              doc.setFont('helvetica', 'italic');
              doc.setFontSize(8);
              doc.setTextColor(100, 116, 139);
              doc.text(lang === 'RO' ? 'Nu există intrări operative în această perioadă.' : 'No operational logs found in this period.', 90, currentY + 10, { align: 'center' });
            }

            drawFooter();
          }

          doc.save(`Raport_CCB_Hotel_${activeReportTab}_${getReportPeriodFileLabel()}.pdf`);
        };

        return (
          <div id="financial-reports-view" className="space-y-6">
            <style>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                #printable-report-area, #printable-report-area * {
                  visibility: visible;
                }
                #printable-report-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  background: white !important;
                  color: black !important;
                  padding: 20px !important;
                  box-shadow: none !important;
                  border: none !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}</style>

            {/* Title Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print border-b border-slate-100 pb-5">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-sans">
                  {lang === 'RO' ? 'Rapoarte Contabile Avansate' : 'Advanced Financial Statements'}
                </h1>
                <p className="text-slate-550 mt-1">
                  {lang === 'RO' 
                    ? 'Generați rapoarte zilnice, bilanțuri patrimoniale și contul de profit și pierdere (P&L) în timp real.' 
                    : 'Compile live daily reports, balance sheets, and profit & loss (P&L) statements.'}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={exportToPDF}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold py-2 px-3.5 rounded-lg flex items-center gap-2 text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  {lang === 'RO' ? 'Printează Raport' : 'Print Statement'}
                </button>
                <button
                  onClick={exportToCSV}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3.5 rounded-lg flex items-center gap-2 text-xs shadow-md shadow-blue-50 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {lang === 'RO' ? 'Salvează Fișier' : 'Save Local File'}
                </button>
              </div>
            </div>

            {/* Parameter & Filter controls card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 no-print">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                {lang === 'RO' ? 'Configurare Perioadă de Raportare' : 'Reporting Window Parameters'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Period Mode Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-750">{lang === 'RO' ? 'Tip Perioadă' : 'Interval Type'}</label>
                  <select
                    aria-label="Filter report period type"
                    value={reportPeriodType}
                    onChange={(e) => setReportPeriodType(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 w-full text-xs text-slate-800 font-sans focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="daily">{lang === 'RO' ? 'Zilnic (Single Day)' : 'Daily (Single Day)'}</option>
                    <option value="monthly">{lang === 'RO' ? 'Lunar (Month-to-Date)' : 'Monthly (Month-to-Date)'}</option>
                    <option value="yearly">{lang === 'RO' ? 'Anual (Yearly)' : 'Yearly (Full Year)'}</option>
                    <option value="custom">{lang === 'RO' ? 'Perioadă identificată (Custom)' : 'Custom Period Range'}</option>
                  </select>
                </div>

                {/* Dynamic parameter inputs based on type */}
                {reportPeriodType === 'daily' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-750">{lang === 'RO' ? 'Selectează Ziua' : 'Pick Date'}</label>
                    <input
                      aria-label="Select dynamic day"
                      type="date"
                      value={reportSelectedDay}
                      onChange={(e) => setReportSelectedDay(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2 w-full text-xs text-slate-800 font-sans focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}

                {reportPeriodType === 'monthly' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-750">{lang === 'RO' ? 'Selectează Luna' : 'Pick Month'}</label>
                      <select
                        aria-label="Pick report month"
                        value={reportSelectedMonth}
                        onChange={(e) => setReportSelectedMonth(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 w-full text-xs text-slate-800 font-sans focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                      >
                        {monthNamesRO.map(mo => (
                          <option key={mo.value} value={mo.value}>{lang === 'RO' ? mo.label : mo.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-750">{lang === 'RO' ? 'Selectează Anul' : 'Pick Year'}</label>
                      <select
                        aria-label="Pick report year"
                        value={reportSelectedYear}
                        onChange={(e) => setReportSelectedYear(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 w-full text-xs text-slate-800 font-sans focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                      >
                        {yearsRO.map(yr => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {reportPeriodType === 'yearly' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-750">{lang === 'RO' ? 'An' : 'Year'}</label>
                    <select
                      aria-label="Pick report year only"
                      value={reportSelectedYear}
                      onChange={(e) => setReportSelectedYear(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 w-full text-xs text-slate-800 font-sans focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                    >
                      {yearsRO.map(yr => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>
                )}

                {reportPeriodType === 'custom' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-750">{lang === 'RO' ? 'Data Început' : 'Start Date'}</label>
                      <input
                        aria-label="Pick custom start date"
                        type="date"
                        value={reportCustomStart}
                        onChange={(e) => setReportCustomStart(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-2 w-full text-xs text-slate-800 font-sans focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-750">{lang === 'RO' ? 'Data Sfârșit' : 'End Date'}</label>
                      <input
                        aria-label="Pick custom end date"
                        type="date"
                        value={reportCustomEnd}
                        onChange={(e) => setReportCustomEnd(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-2 w-full text-xs text-slate-800 font-sans focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex border-b border-slate-200 space-x-6 no-print">
              <button
                onClick={() => setActiveReportTab('pnl')}
                className={`py-3 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  activeReportTab === 'pnl' ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {lang === 'RO' ? 'Profit & Pierderi (P&L)' : 'Profit & Loss (P&L)'}
              </button>
              <button
                onClick={() => setActiveReportTab('balance')}
                className={`py-3 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  activeReportTab === 'balance' ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {lang === 'RO' ? 'Bilanț Financiar (Balance Sheet)' : 'Balance Sheet'}
              </button>
              <button
                onClick={() => setActiveReportTab('cashflow')}
                className={`py-3 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  activeReportTab === 'cashflow' ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {lang === 'RO' ? 'Flux de Numerar (Cash Flow)' : 'Cash Flow Statement'}
              </button>
              <button
                onClick={() => setActiveReportTab('daily')}
                className={`py-3 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  activeReportTab === 'daily' ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {lang === 'RO' ? 'Raport Operațional Zilnic' : 'Daily Operations Performance'}
              </button>
            </div>

            {/* THE PRINTABLE PREVIEW SHEET */}
            <div id="printable-report-area" className="bg-white rounded-xl border border-slate-250 p-8 shadow-sm space-y-6">
              
              {/* Report Document Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-950 font-sans tracking-wide uppercase">
                    CCB Hotels Management SRL
                  </h2>
                  <p className="text-xs font-mono font-bold text-slate-500 mt-1 uppercase">
                    {lang === 'RO' ? 'Sistem de Raportare Financiară "Ashi"' : 'Ashi Reporting compliance Engine'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    CUI: RO39255651 • Sediu: Str. Poiana Soarelui nr. 12, Brașov
                  </p>
                </div>
                <div className="text-right md:border-l md:pl-6 border-slate-200">
                  <div className="inline-block bg-slate-900 text-white text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded">
                    {activeReportTab === 'pnl' && (lang === 'RO' ? 'P&L STATEMENT' : 'P&L STATEMENT')}
                    {activeReportTab === 'balance' && (lang === 'RO' ? 'BALANCE SHEET' : 'BALANCE SHEET')}
                    {activeReportTab === 'cashflow' && (lang === 'RO' ? 'CASH FLOW STATEMENT' : 'CASH FLOW STATEMENT')}
                    {activeReportTab === 'daily' && (lang === 'RO' ? 'DAILY METRICS' : 'DAILY METRICS')}
                  </div>
                  <p className="text-xs font-bold text-slate-800 mt-2 font-mono">
                    {lang === 'RO' ? 'PERIOADĂ:' : 'INTERVAL:'} {getReportPeriodLabel()}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {lang === 'RO' ? 'Generat la:' : 'Generated At:'} {new Date().toLocaleDateString('ro-RO')}
                  </p>
                </div>
              </div>

              {/* REPORT 1: PROFIT & LOSS */}
              {activeReportTab === 'pnl' && (
                <div className="space-y-6">
                  {/* Summary row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-150">
                      <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">
                        {lang === 'RO' ? 'VENITURI BRUTE' : 'TOTAL SALES'}
                      </span>
                      <span className="text-xl font-black text-slate-900 block font-sans mt-0.5 font-mono">
                        {pnlTotalRevenue.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                      </span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-150">
                      <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">
                        {lang === 'RO' ? 'CHELTUIELI TOTALE' : 'TOTAL OUTFLOWS'}
                      </span>
                      <span className="text-xl font-black text-slate-900 block font-sans mt-0.5 font-mono">
                        {pnlTotalExpenses.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                      </span>
                    </div>
                    <div className={`p-4 rounded-lg border ${pnlNetProfit >= 0 ? 'bg-emerald-50/50 border-emerald-150' : 'bg-red-50/50 border-red-150'}`}>
                      <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">
                        {lang === 'RO' ? 'REZULTAT NET (PROFIT / PIERDERE)' : 'NET EARNINGS'}
                      </span>
                      <span className={`text-xl font-black block font-sans mt-0.5 font-mono ${pnlNetProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {pnlNetProfit.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                      </span>
                    </div>
                  </div>

                  {/* Detailed Table */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-white font-sans uppercase text-[10px] tracking-wider">
                            <th className="p-3">{lang === 'RO' ? 'INDICATOR FINANCIAR' : 'ACCOUNT ENTRY'}</th>
                            <th className="p-3 text-right">{lang === 'RO' ? 'SUMĂ (RON)' : 'VALUE (RON)'}</th>
                            <th className="p-3 text-right">{lang === 'RO' ? 'PROCENT VENIT' : '% REVENUE'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Revenues section */}
                          <tr className="border-b border-slate-200 font-extrabold bg-slate-50 text-slate-800">
                            <td className="p-3 uppercase tracking-wider">{lang === 'RO' ? '1. Venituri Operaționale Totale' : '1. Total Operating Income'}</td>
                            <td className="p-3 text-right font-mono">{pnlTotalRevenue.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</td>
                            <td className="p-3 text-right font-mono">100.0%</td>
                          </tr>
                          <tr className="border-b border-slate-100 text-slate-600 font-medium">
                            <td className="p-3 pl-8"> ➔ {lang === 'RO' ? 'Venituri din Cazare (Hotel Reception)' : 'Room Booking Income'}</td>
                            <td className="p-3 text-right font-mono">{pnlRevenueHotel.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</td>
                            <td className="p-3 text-right font-mono text-slate-450">
                              {pnlTotalRevenue > 0 ? (pnlRevenueHotel / pnlTotalRevenue * 100).toFixed(1) : '0.0'}%
                            </td>
                          </tr>
                          <tr className="border-b border-slate-100 text-slate-650 font-medium">
                            <td className="p-3 pl-8"> ➔ {lang === 'RO' ? 'Venituri Directe din Casă / Diverse' : 'Direct Cash Revenues / Miscellaneous'}</td>
                            <td className="p-3 text-right font-mono">{pnlRevenueManual.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</td>
                            <td className="p-3 text-right font-mono text-slate-450">
                              {pnlTotalRevenue > 0 ? (pnlRevenueManual / pnlTotalRevenue * 100).toFixed(1) : '0.0'}%
                            </td>
                          </tr>

                          {/* Expenses section */}
                          <tr className="border-b border-slate-200 font-extrabold bg-slate-50 text-slate-800 mt-2">
                            <td className="p-3 uppercase tracking-wider">{lang === 'RO' ? '2. Cheltuieli de Exploatare Totale' : '2. Total Operating Outflows'}</td>
                            <td className="p-3 text-right font-mono">{pnlTotalExpenses.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</td>
                            <td className="p-3 text-right font-mono">{pnlTotalRevenue > 0 ? (pnlTotalExpenses / pnlTotalRevenue * 100).toFixed(1) : '0.0'}%</td>
                          </tr>
                          {pnlCategoriesBreakdown.map((cat, idx) => (
                            <tr key={idx} className="border-b border-slate-100 text-slate-600 font-medium">
                              <td className="p-2.5 pl-8"> ➔ {cat.name}</td>
                              <td className="p-2.5 text-right font-mono">{cat.total.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</td>
                              <td className="p-2.5 text-right font-mono text-slate-450">
                                {cat.percentage.toFixed(1)}%
                              </td>
                            </tr>
                          ))}

                          {/* Net section */}
                          <tr className="bg-slate-900 border-t border-slate-950 font-black text-white text-sm">
                            <td className="p-3.5 uppercase tracking-wide">{lang === 'RO' ? 'REZULTATUL FINANCIAR NET' : 'NET OPERATING MARGIN / INCOME'}</td>
                            <td className="p-3.5 text-right font-mono">{pnlNetProfit.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</td>
                            <td className="p-3.5 text-right font-mono">{pnlOperatingMargin.toFixed(1)}%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* REPORT 2: BALANCE SHEET */}
              {activeReportTab === 'balance' && (
                <div className="space-y-6">
                  <p className="text-[10px] text-slate-500 italic">
                    {lang === 'RO' 
                      ? '*Bilanțul reflectă activele lichide estimate (Pornind de la un istoric de 185.000 RON consolidat din depozite), creanțe comerciale estimate și passive curente conform facturilor active.*'
                      : '*Estimated balance reflects 185,000 RON registered equity cash deposits integrated with realtime accounts payable and outstanding timelines.*'}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* ASSETS (ACTIV) */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-900 text-white p-3 text-xs font-black tracking-wider uppercase">
                        {lang === 'RO' ? 'ACTIV (ASSETS)' : 'ACTIV (ASSETS)'}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 font-sans">
                              <th className="p-3">{lang === 'RO' ? 'Active Circulante & Imobilizate' : 'Asset item'}</th>
                              <th className="p-3 text-right">{lang === 'RO' ? 'Valoare (RON)' : 'Value (RON)'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-slate-100 text-slate-700">
                              <td className="p-3 font-semibold">{lang === 'RO' ? 'Disponibilități Bănești (Numerar & Conturi)' : 'Cash and Equivalents'}</td>
                              <td className="p-3 text-right font-mono font-bold">{bsCashValue.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</td>
                            </tr>
                            <tr className="border-b border-slate-100 text-slate-700">
                              <td className="p-3 font-semibold">{lang === 'RO' ? 'Creanțe Comerciale (Pending Receipts)' : 'Accounts Receivable'}</td>
                              <td className="p-3 text-right font-mono font-bold">{bsArValue.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</td>
                            </tr>
                            <tr className="border-b border-slate-100 text-slate-700">
                              <td className="p-3 font-semibold">{lang === 'RO' ? 'Mijloace Fixe, Clădiri & Amenajări' : 'Tangible Fixed Assets'}</td>
                              <td className="p-3 text-right font-mono font-bold">{bsFixedAssets.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</td>
                            </tr>
                            <tr className="bg-slate-100 border-t border-slate-250 font-black text-slate-900 text-sm">
                              <td className="p-3.5 uppercase">{lang === 'RO' ? 'TOTAL ACTIVE' : 'TOTAL ASSETS'}</td>
                              <td className="p-3.5 text-right font-mono">{bsTotalAssets.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* LIABILITIES & EQUITIES (PASIV) */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-900 text-white p-3 text-xs font-black tracking-wider uppercase">
                        {lang === 'RO' ? 'PASIV (LIABILITIES & EQUITY)' : 'PASIV (LIABILITIES & EQUITY)'}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 font-sans">
                              <th className="p-3">{lang === 'RO' ? 'Obligații și Capitaluri Proprii' : 'Liability & Equity item'}</th>
                              <th className="p-3 text-right">{lang === 'RO' ? 'Valoare (RON)' : 'Value (RON)'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-slate-100 text-slate-700">
                              <td className="p-3 font-semibold">{lang === 'RO' ? 'Datorii către Furnizori (Accounts Payable)' : 'Accounts Payable'}</td>
                              <td className="p-3 text-right font-mono font-bold">{bsApValue.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</td>
                            </tr>
                            <tr className="border-b border-slate-100 text-slate-700">
                              <td className="p-3 font-semibold">{lang === 'RO' ? 'Obligații Fiscale la Bugetul de Stat' : 'Taxes and Social Charges'}</td>
                              <td className="p-3 text-right font-mono font-bold">{bsTaxesEstimated.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</td>
                            </tr>
                            <tr className="border-b border-slate-100 text-slate-700">
                              <td className="p-3 font-semibold">{lang === 'RO' ? 'Capital Social Înregistrat' : 'Share Capital'}</td>
                              <td className="p-3 text-right font-mono font-bold">{bsEquitySocial.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</td>
                            </tr>
                            <tr className="border-b border-slate-100 text-slate-700">
                              <td className="p-3 font-semibold italic">{lang === 'RO' ? 'Excedent curent / Profit raportat' : 'Retained Earnings / Ledger Net'}</td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-700">{bsRemainingNetProfit.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</td>
                            </tr>
                            <tr className="bg-slate-100 border-t border-slate-250 font-black text-slate-900 text-sm font-sans">
                              <td className="p-3.5 uppercase">{lang === 'RO' ? 'TOTAL PASIVE / EQUITY' : 'TOTAL OUTSTANDING & EQUITY'}</td>
                              <td className="p-3.5 text-right font-mono">{bsTotalLiabilitiesAndEquity.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Balancing confirmation notice */}
                  <div className="bg-emerald-50 border border-emerald-155 text-emerald-800 text-xs font-semibold p-3.5 rounded-lg text-center font-mono">
                    {lang === 'RO' 
                     ? `✓ VERIFICARE BILANȚIERĂ: ACTIVE = PASIVE (${bsTotalAssets.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) } RON) - Bilanțul reflectă echilibru patrimonial.`
                     : `✓ LEDGER AUDIT BALANCE: ASSETS = LIABILITIES (${bsTotalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 }) } RON) - Accounting balanced perfectly.`
                    }
                  </div>
                </div>
              )}

              {/* REPORT: FLUX DE NUMERAR (CASH FLOW) */}
              {activeReportTab === 'cashflow' && (() => {
                const cfOpenCash = bsBaseCash;
                
                // Receipts (Inflows):
                // 1. Hotel Reception (Operational Logs) Revenue
                const cfRevHotel = reportData.logs.reduce((sum, l) => sum + l.dailyRevenue, 0);
                // 2. Manual Transactions of type 'Venit'
                const cfRevManual = reportData.txs.filter(t => t.type === 'Venit').reduce((sum, t) => sum + t.amount, 0);
                const cfTotalIn = cfRevHotel + cfRevManual;

                // Disbursements (Outflows):
                // 1. Actual invoice payment transactions (Plati Facturi)
                const cfPaidInvs = reportData.pmts.reduce((sum, p) => sum + p.amount, 0);
                // 2. Manual Transactions of type 'Cheltuiala' (ONLY standard non-invoice transactions that are PAID!)
                const cfExpManual = reportData.txs.filter(t => t.type === 'Cheltuiala' && !t.invoiceNumber && t.status !== 'unpaid').reduce((sum, t) => sum + t.amount, 0);
                const cfTotalOut = cfPaidInvs + cfExpManual;

                // Net
                const cfNet = cfTotalIn - cfTotalOut;
                const cfCloseCash = cfOpenCash + cfNet;

                return (
                  <div className="space-y-6">
                    {/* Summary cards row */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                      
                      <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg text-slate-800">
                        <span className="text-[10px] text-slate-500 font-extrabold block tracking-wider uppercase">
                          {lang === 'RO' ? 'Sold Inițial (Cash Open)' : 'Period Opening Cash'}
                        </span>
                        <span className="text-sm font-black text-slate-900 mt-1 block font-mono">
                          {cfOpenCash.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                        </span>
                        <span className="text-[9px] text-slate-450 mt-1 block italic leading-tight">
                          {lang === 'RO' ? 'Lichidități în conturi la început' : 'Opening available balance'}
                        </span>
                      </div>

                      <div className="bg-emerald-50/55 p-4 border border-emerald-100 rounded-lg text-emerald-950">
                        <span className="text-[10px] text-emerald-600 font-extrabold block tracking-wider uppercase">
                          {lang === 'RO' ? 'Total Încasări (Receipts)' : 'Total Inflows / Receipts'}
                        </span>
                        <span className="text-sm font-black text-emerald-800 mt-1 block font-mono">
                          +{cfTotalIn.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                        </span>
                        <span className="text-[9px] text-emerald-600 mt-1 block italic leading-tight">
                          {cfRevHotel > 0 ? `${cfRevHotel.toLocaleString('ro-RO')} inn` : '0 inn'} + {cfRevManual > 0 ? `${cfRevManual.toLocaleString('ro-RO')} tx` : '0 tx'}
                        </span>
                      </div>

                      <div className="bg-rose-50/55 p-4 border border-rose-100 rounded-lg text-rose-950">
                        <span className="text-[10px] text-rose-600 font-extrabold block tracking-wider uppercase">
                          {lang === 'RO' ? 'Total Plăți (Payments)' : 'Total Outflows / Payments'}
                        </span>
                        <span className="text-sm font-black text-rose-800 mt-1 block font-mono">
                          -{cfTotalOut.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                        </span>
                        <span className="text-[9px] text-rose-600 mt-1 block italic leading-tight">
                          {cfPaidInvs > 0 ? `${cfPaidInvs.toLocaleString('ro-RO')} furn` : '0 furn'} + {cfExpManual > 0 ? `${cfExpManual.toLocaleString('ro-RO')} tx` : '0 tx'}
                        </span>
                      </div>

                      <div className="bg-blue-50/55 p-4 border border-blue-100 rounded-lg text-blue-950">
                        <span className="text-[10px] text-blue-600 font-extrabold block tracking-wider uppercase">
                          {lang === 'RO' ? 'Flux Net de Numerar' : 'Net Cash Flow'}
                        </span>
                        <span className={`text-sm font-black mt-1 block font-mono ${cfNet >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                          {cfNet >= 0 ? "+" : ""}{cfNet.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                        </span>
                        <span className="text-[9px] text-blue-600 mt-1 block italic leading-tight">
                          {lang === 'RO' ? 'Modificare lichidități perioadă' : 'Net changes in liquid assets'}
                        </span>
                      </div>

                      <div className="bg-slate-900 p-4 border border-slate-950 rounded-lg text-slate-100 col-span-2 lg:col-span-1">
                        <span className="text-[10px] text-slate-400 font-bold block tracking-wider uppercase">
                          {lang === 'RO' ? 'Sold Final (Cash End)' : 'Closing Cash Balance'}
                        </span>
                        <span className="text-sm font-black text-white mt-1 block font-mono">
                          {cfCloseCash.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                        </span>
                        <span className="text-[9px] text-slate-400 mt-1 block italic leading-tight">
                          {lang === 'RO' ? 'Disponibilități preconizate' : 'Ending cash position'}
                        </span>
                      </div>

                    </div>

                    {/* Explanatory banner */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 leading-relaxed font-sans">
                      <p>
                        💡 <strong>{lang === 'RO' ? 'Informație Flux de Numerar:' : 'Cash Flow Detail:'}</strong>{' '}
                        {lang === 'RO' 
                          ? 'Spre deosebire de Raportul de Profit & Pierdere (P&L) bazat pe facturare (contabilitate de angajament), Fluxul de Numerar analizează exclusiv tranzacțiile financiare de încasare și plată monetară. Vă arată exact lichiditatea din conturi.'
                          : 'Unlike the Profit & Loss statement which reports accrued income/expenses, the Cash Flow analysis tracks only actual receipts and disbursements. This keeps management informed of real hotel liquidity.'}
                      </p>
                    </div>

                    {/* Structure of receipts & payments */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      {/* Cash Receipts Area */}
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-emerald-900 text-white p-3 text-xs font-black tracking-wider uppercase flex items-center justify-between">
                          <span>{lang === 'RO' ? '1. INTRĂRI DE NUMERAR (CASH RECEIPTS)' : '1. CASH INFLOW / RECEIPTS'}</span>
                          <span className="font-mono">{cfTotalIn.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</span>
                        </div>
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                              <th className="p-3">{lang === 'RO' ? 'Sursa de Finanțare / Încasare' : 'Receipt Category'}</th>
                              <th className="p-3 text-right">{lang === 'RO' ? 'Suma Încasată' : 'Amount Received'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-slate-100 text-slate-700 hover:bg-slate-50/50">
                              <td className="p-3">
                                <div className="font-semibold text-slate-900">{lang === 'RO' ? 'Încasări Operaționale Recepție (Cazări)' : 'Hotel Reception Operational Revenue'}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{lang === 'RO' ? 'Suma agregată din raportările zilnice' : 'Aggregated from hotel logs'}</div>
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-700">+{cfRevHotel.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                            </tr>
                            <tr className="border-b border-slate-100 text-slate-700 hover:bg-slate-50/50">
                              <td className="p-3">
                                <div className="font-semibold text-slate-900">{lang === 'RO' ? 'Alte Venituri Directe / Directe' : 'Other Manual Inputs / General Inflows'}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{lang === 'RO' ? 'Tranzacții manuale înregistrate ca venituri direct' : 'Manually input revenues'}</div>
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-700">+{cfRevManual.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                            </tr>
                            <tr className="bg-slate-100 font-black text-slate-900">
                              <td className="p-3.5 uppercase">{lang === 'RO' ? 'TOTAL ÎNCASĂRI CURENTE' : 'TOTAL PERIOD INFLOW'}</td>
                              <td className="p-3.5 text-right font-mono text-emerald-850">+{cfTotalIn.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Cash Payments Area */}
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-rose-900 text-white p-3 text-xs font-black tracking-wider uppercase flex items-center justify-between">
                          <span>{lang === 'RO' ? '2. IEȘIRI DE NUMERAR (CASH DISBURSEMENTS)' : '2. CASH OUTFLOW / PAYMENTS'}</span>
                          <span className="font-mono">{cfTotalOut.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</span>
                        </div>
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                              <th className="p-3">{lang === 'RO' ? 'Destinație Plată / Beneficiar' : 'Payment Category'}</th>
                              <th className="p-3 text-right">{lang === 'RO' ? 'Suma Plătită' : 'Amount Paid'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-slate-100 text-slate-700 hover:bg-slate-50/50">
                              <td className="p-3">
                                <div className="font-semibold text-slate-900">{lang === 'RO' ? 'Plăți către Furnizori (Facturi stinse)' : 'Supplier Invoice Payments'}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{lang === 'RO' ? 'Plăți efectuate către furnizori de facturi' : 'Settled balances on supplier bills'}</div>
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-rose-700">-{cfPaidInvs.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                            </tr>
                            <tr className="border-b border-slate-100 text-slate-700 hover:bg-slate-50/50">
                              <td className="p-3">
                                <div className="font-semibold text-slate-900">{lang === 'RO' ? 'Alte Plăți / Cheltuieli Directe' : 'Other Direct Expenses / Cash Ledger'}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{lang === 'RO' ? 'Cheltuieli înregistrate direct în registru' : 'Direct manual expenses'}</div>
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-rose-700">-{cfExpManual.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                            </tr>
                            <tr className="bg-slate-100 font-black text-slate-900">
                              <td className="p-3.5 uppercase">{lang === 'RO' ? 'TOTAL PLĂȚI CURENTE' : 'TOTAL PERIOD OUTFLOW'}</td>
                              <td className="p-3.5 text-right font-mono text-rose-850">-{cfTotalOut.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                    </div>

                    {/* Detailed Transactions ledger for the selected dates */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-900 text-white p-3 text-xs font-black tracking-wider uppercase">
                        {lang === 'RO' ? 'REGISTRU FLUX DE NUMERAR DETALIAT PENTRU PERIOADĂ' : 'PERIOD CASH FLOW REGISTER LIST'}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-55 border-b border-slate-200 font-bold text-slate-600">
                              <th className="p-3">{lang === 'RO' ? 'Dată' : 'Date'}</th>
                              <th className="p-3">{lang === 'RO' ? 'Tip Flux' : 'Cash Flow Type'}</th>
                              <th className="p-3">{lang === 'RO' ? 'Descriere Detaliată / Sursă' : 'Detailed Source / Description'}</th>
                              <th className="p-3">{lang === 'RO' ? 'Canal / Metodă' : 'Payment Method'}</th>
                              <th className="p-3 text-right">{lang === 'RO' ? 'Sumă (RON)' : 'Amount (RON)'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Operational Bookings */}
                            {reportData.logs.filter(l => l.dailyRevenue > 0).map(l => (
                              <tr key={`log-${l.id}`} className="border-b border-slate-100 text-slate-700 hover:bg-slate-50/50">
                                <td className="p-3 font-mono text-[11px] whitespace-nowrap">{l.date}</td>
                                <td className="p-3">
                                  <span className="inline-block bg-emerald-100 text-emerald-800 font-extrabold text-[9px] px-2 py-0.5 rounded leading-tight">
                                    {lang === 'RO' ? 'ÎNCASARE recepție' : 'INFLOW (accommodation)'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="font-semibold text-slate-900">{lang === 'RO' ? 'Încasat Recepție Cazare Hotel' : 'Reception Lodging Revenue'}</div>
                                  <div className="text-[10px] text-slate-400">{lang === 'RO' ? `Grad ocupare: ${((l.occupiedRooms/l.totalRooms)*100).toFixed(0)}% • ${l.touristsCount} turiști` : `Occupancy: ${((l.occupiedRooms/l.totalRooms)*100).toFixed(0)}% • ${l.touristsCount} guests`}</div>
                                </td>
                                <td className="p-3 text-slate-500 font-medium">{lang === 'RO' ? 'Split (Cash/Card/OTA)' : 'Direct Reception Split'}</td>
                                <td className="p-3 text-right font-mono font-bold text-emerald-700">+{l.dailyRevenue.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                              </tr>
                            ))}

                            {/* Manual Inflows / receipts */}
                            {reportData.txs.filter(t => t.type === 'Venit').map(t => (
                              <tr key={`tx-in-${t.id}`} className="border-b border-slate-100 text-slate-700 hover:bg-slate-50/50">
                                <td className="p-3 font-mono text-[11px] whitespace-nowrap">{t.date}</td>
                                <td className="p-3">
                                  <span className="inline-block bg-emerald-100 text-emerald-800 font-extrabold text-[9px] px-2 py-0.5 rounded leading-tight">
                                    {lang === 'RO' ? 'VENIT DIRECT' : 'MANUAL INFLOW'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="font-semibold text-slate-900">{t.partner}</div>
                                  <div className="text-[10px] text-slate-400">{t.description || t.category}</div>
                                </td>
                                <td className="p-3 text-slate-500 font-mono text-[11px]">{t.paymentMethod}</td>
                                <td className="p-3 text-right font-mono font-bold text-emerald-700">+{t.amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                              </tr>
                            ))}

                            {/* Supplier payments */}
                            {reportData.pmts.map(p => (
                              <tr key={`pmt-${p.id}`} className="border-b border-slate-100 text-slate-700 hover:bg-slate-50/50">
                                <td className="p-3 font-mono text-[11px] whitespace-nowrap">{p.date}</td>
                                <td className="p-3">
                                  <span className="inline-block bg-rose-100 text-rose-800 font-extrabold text-[9px] px-2 py-0.5 rounded leading-tight">
                                    {lang === 'RO' ? 'PLATĂ FURNIZOR' : 'SUPPLIER DISBURSEMENT'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="font-semibold text-slate-900">{lang === 'RO' ? `Factură nr. ${p.invoiceNumber}` : `Invoice bill #${p.invoiceNumber}`}</div>
                                  <div className="text-[10px] text-slate-400">{lang === 'RO' ? `Referință OP/Ref: ${p.reference || 'N/A'}` : `Reference: ${p.reference || 'N/A'}`}</div>
                                </td>
                                <td className="p-3 text-slate-500 font-sans text-[11px]">{p.method}</td>
                                <td className="p-3 text-right font-mono font-bold text-rose-700">-{p.amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                              </tr>
                            ))}

                            {/* Manual Disbursements / direct payments */}
                            {reportData.txs.filter(t => t.type === 'Cheltuiala').map(t => (
                              <tr key={`tx-out-${t.id}`} className="border-b border-slate-100 text-slate-700 hover:bg-slate-50/50">
                                <td className="p-3 font-mono text-[11px] whitespace-nowrap">{t.date}</td>
                                <td className="p-3">
                                  <span className="inline-block bg-rose-100 text-rose-800 font-extrabold text-[9px] px-2 py-0.5 rounded leading-tight">
                                    {lang === 'RO' ? 'PLATĂ ledger' : 'MANUAL OUTFLOW'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="font-semibold text-slate-900">{t.partner}</div>
                                  <div className="text-[10px] text-slate-400">{t.description || t.category}</div>
                                </td>
                                <td className="p-3 text-slate-500 font-mono text-[11px]">{t.paymentMethod}</td>
                                <td className="p-3 text-right font-mono font-bold text-rose-700">-{t.amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                              </tr>
                            ))}

                            {/* Empty state conditional */}
                            {reportData.logs.filter(l => l.dailyRevenue > 0).length === 0 &&
                             reportData.txs.length === 0 &&
                             reportData.pmts.length === 0 && (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                                  {lang === 'RO' ? 'Nicio tranzacție monetară identificată în perioada selectată.' : 'No monetary transactions found for the selected period.'}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* REPORT 3: DAILY OPERATIONAL REPORT */}
              {activeReportTab === 'daily' && (
                <div className="space-y-6">
                  {/* Grid layout stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-4 border rounded-lg">
                      <span className="text-[10px] text-slate-450 font-black block tracking-wider uppercase">
                        {lang === 'RO' ? 'Rată de Ocupare' : 'Occupancy Rate'}
                      </span>
                      <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
                        {reportAvgOccupancy.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 block font-medium">
                        {totalReportRoomsOccupied} {lang === 'RO' ? 'camere ocupate' : 'rooms rented'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-4 border rounded-lg">
                      <span className="text-[10px] text-slate-450 font-black block tracking-wider uppercase">
                        {lang === 'RO' ? 'Număr Turiști' : 'Tourists Count'}
                      </span>
                      <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
                        {reportTouristsCount}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 block font-medium">
                        {lang === 'RO' ? 'înregistrați în total' : 'total visitors'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-4 border rounded-lg">
                      <span className="text-[10px] text-slate-450 font-black block tracking-wider uppercase">
                        {lang === 'RO' ? 'ADR (Preț Mediu / Cameră)' : 'ADR (Avg Daily Rate)'}
                      </span>
                      <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
                        {reportAdrValue.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 block font-medium">
                        {lang === 'RO' ? 'per noapte rezervată' : 'per bookings nights'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-4 border rounded-lg">
                      <span className="text-[10px] text-slate-450 font-black block tracking-wider uppercase">
                        {lang === 'RO' ? 'RevPAR' : 'RevPAR'}
                      </span>
                      <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
                        {reportRevParValue.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 block font-medium">
                        {lang === 'RO' ? 'per cameră disponibilă' : 'per available room'}
                      </span>
                    </div>
                  </div>

                  {/* Complete tabular review of filtered logs for clarity */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-900 text-white p-3 text-xs font-black tracking-wider uppercase">
                      {lang === 'RO' ? 'Jurnal Detaliat de Exploatare' : 'Detailed Operating Journal'}
                    </div>
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <th className="p-3">Data</th>
                          <th className="p-3 text-center">Camere Ocupate</th>
                          <th className="p-3 text-center">Turiști</th>
                          <th className="p-3 text-center">Înnoptări</th>
                          <th className="p-3 text-right">Venituri (RON)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.logs.map((log, lidx) => (
                          <tr key={lidx} className="border-b border-slate-100 text-slate-700 hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-slate-800">{log.date}</td>
                            <td className="p-3 text-center font-semibold">{log.occupiedRooms} / {log.totalRooms}</td>
                            <td className="p-3 text-center">{log.touristsCount}</td>
                            <td className="p-3 text-center">{log.overnights}</td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900">{log.dailyRevenue.toFixed(2)} RON</td>
                          </tr>
                        ))}
                        {reportData.logs.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-450 italic">
                              Nu există intrări operative înregistrate în această perioadă. Instroduceți date în 'Date Zilnice'.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Signature / Footer Block on printed copy */}
              <div className="pt-8 border-t border-dashed border-slate-300 grid grid-cols-2 text-[10px] text-slate-400">
                <div>
                  <p className="font-bold uppercase text-slate-600 font-mono">Ashi Compliance Systems</p>
                  <p>Document generat securizat prin intermediul contului Administrator</p>
                </div>
                <div className="text-right">
                  <p className="font-bold uppercase text-slate-600 font-mono">CCB Hotels Management SRL</p>
                  <p>Copyright © 2026. Standalone Compliance Systems v2.5</p>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
