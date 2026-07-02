import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { Invoice, CostCenter, Company, PaymentTransaction, OperationalLog, FinancialTransaction, Language, UserProfile, RolePermissions, UserRole } from './types';
import { translations } from './translations';
import {
  initialInvoices,
  initialCostCenters,
  initialCompanies,
  initialTransactions
} from './mockData';

// Subcomponents
import Dashboard from './components/Dashboard';
import PaymentLedger from './components/PaymentLedger';
import InvoiceUploader from './components/InvoiceUploader';
import PriceHistory from './components/PriceHistory';
import Products from './components/Products';
import FinancialModule from './components/FinancialModule';
import TaskModule, { demoTemplateTasks, demoCompletions } from './components/TaskModule';
import Settings from './components/Settings';
import LoginScreen from './components/LoginScreen';

// Icons
import {
  LayoutDashboard,
  BookOpen,
  History,
  Package,
  Settings as SettingsIcon,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Warehouse,
  LogOut,
  FolderOpen,
  Calendar,
  Layers,
  Sparkles,
  ListTodo,
  ClipboardCheck,
  ShieldAlert,
  Menu,
  X
} from 'lucide-react';

// Initial operational data and manual transaction logs representing exact figures in Management.xlsx
const demoOperationalLogs: OperationalLog[] = [
  {
    id: 'op-1',
    date: '28.05.2026',
    occupiedRooms: 25,
    totalRooms: 29,
    touristsCount: 266,
    overnights: 668,
    dailyRevenue: 160,
    otaPercentage: 83,
    directPercentage: 17,
    targetRevenue: 3500,
    budgetExpenses: 2500,
    note: 'Raport consolidat conform Management.xlsx'
  }
];

const initialOperationalLogs: OperationalLog[] = [];

const demoManualTransactions: FinancialTransaction[] = [
  // UTILITATI (Total 61)
  { id: 'mt-1', type: 'Cheltuiala', date: '2026-05-28', category: 'UTILITATI', partner: 'COMPANIA APA BRASOV S.A.', description: 'Consum apa rece', amount: 10, paymentMethod: 'BANK', invoiceNumber: 'APA-05', note: '' },
  { id: 'mt-2', type: 'Cheltuiala', date: '2026-05-28', category: 'UTILITATI', partner: 'ENGIE ROMANIA S.A.', description: 'Consum gaz', amount: 11, paymentMethod: 'BANK', invoiceNumber: 'GAZ-05', note: '' },
  { id: 'mt-3', type: 'Cheltuiala', date: '2026-05-28', category: 'UTILITATI', partner: 'SOCIETATEA ELECTRICA FURNIZARE S.A.', description: 'Consum electricitate', amount: 12, paymentMethod: 'BANK', invoiceNumber: 'EL-05', note: '' },
  { id: 'mt-4', type: 'Cheltuiala', date: '2026-05-28', category: 'UTILITATI', partner: ' VODAFONE ROMANIA S.A. ', description: 'Abonament date mobila si voce', amount: 13, paymentMethod: 'BANK', invoiceNumber: 'VOD-05', note: '' },
  { id: 'mt-5', type: 'Cheltuiala', date: '2026-05-28', category: 'UTILITATI', partner: 'DIGI ROMANIA S.A.', description: 'Fibră optică și servicii cablu', amount: 15, paymentMethod: 'BANK', invoiceNumber: 'DIGI-05', note: '' },

  // D'ALE STATULUI (Total 735)
  { id: 'mt-6', type: 'Cheltuiala', date: '2026-05-28', category: "D'ALE STATULUI", partner: 'SALARII', description: 'Plata salarii nete echipa', amount: 115, paymentMethod: 'BANK', invoiceNumber: 'SAL-05', note: '' },
  { id: 'mt-7', type: 'Cheltuiala', date: '2026-05-28', category: "D'ALE STATULUI", partner: 'MUNICIPIUL BRASOV - TAXA SALVAMONT', description: 'Taxa salvamont hotel', amount: 125, paymentMethod: 'BANK', invoiceNumber: 'SVM-05', note: '' },
  { id: 'mt-8', type: 'Cheltuiala', date: '2026-05-28', category: "D'ALE STATULUI", partner: ' MUNICIPIUL BRASOV ', description: 'Taxe locale municipiu', amount: 122, paymentMethod: 'BANK', invoiceNumber: 'TX-05', note: '' },
  { id: 'mt-9', type: 'Cheltuiala', date: '2026-05-28', category: "D'ALE STATULUI", partner: ' IMPOZIT PROFIT ', description: 'Impozit pe profit trimestrial', amount: 123, paymentMethod: 'BANK', invoiceNumber: 'IMP-05', note: '' },
  { id: 'mt-10', type: 'Cheltuiala', date: '2026-05-28', category: "D'ALE STATULUI", partner: ' TVA ', description: 'Suma dedusa TVA', amount: 0, paymentMethod: 'BANK', invoiceNumber: 'TVA-05', note: '' },
  { id: 'mt-11', type: 'Cheltuiala', date: '2026-05-28', category: "D'ALE STATULUI", partner: ' BS+BASS ', description: 'Asigurare sociala de stat', amount: 125, paymentMethod: 'BANK', invoiceNumber: 'BS-05', note: '' },
  { id: 'mt-12', type: 'Cheltuiala', date: '2026-05-28', category: "D'ALE STATULUI", partner: 'CAM', description: 'Contributie asiguratorie munca', amount: 125, paymentMethod: 'BANK', invoiceNumber: 'CAM-05', note: '' },

  // MANCARE & APROVIZIONARE (Total 60)
  { id: 'mt-13', type: 'Cheltuiala', date: '2026-05-28', category: 'MANCARE & APROVIZIONARE', partner: 'CARREFOUR ROMANIA SA', description: 'Produse proaspete alimentare', amount: 12, paymentMethod: 'CARD', invoiceNumber: 'CRF-05', note: '' },
  { id: 'mt-14', type: 'Cheltuiala', date: '2026-05-28', category: 'MANCARE & APROVIZIONARE', partner: 'SELGROS CASH & CARRY SRL', description: 'Ingrediente si produse Selgros', amount: 11, paymentMethod: 'CASH', invoiceNumber: 'SEL-05', note: '' },
  { id: 'mt-15', type: 'Cheltuiala', date: '2026-05-28', category: 'MANCARE & APROVIZIONARE', partner: 'S.C. GENERAL AGRO COM SERVICE S.R.L.', description: 'Consumabile agroalimentare si paine', amount: 12, paymentMethod: 'BANK', invoiceNumber: 'AGR-05', note: '' },
  { id: 'mt-16', type: 'Cheltuiala', date: '2026-05-28', category: 'MANCARE & APROVIZIONARE', partner: ' AUCHAN ROMANIA SA ', description: 'Consumabile bucatarie', amount: 1, paymentMethod: 'CASH', invoiceNumber: 'AUC-05', note: '' },
  { id: 'mt-17', type: 'Cheltuiala', date: '2026-05-28', category: 'MANCARE & APROVIZIONARE', partner: 'RPL SRL', description: 'Ingrediente catering', amount: 22, paymentMethod: 'BANK', invoiceNumber: 'RPL-05', note: '' },
  { id: 'mt-18', type: 'Cheltuiala', date: '2026-05-28', category: 'MANCARE & APROVIZIONARE', partner: 'LIDL DISCOUNT S.R.L.', description: 'Lactate breakfast', amount: 2, paymentMethod: 'CARD', invoiceNumber: 'LDL-05', note: '' },

  // CONSUMABILE (Total 173)
  { id: 'mt-19', type: 'Cheltuiala', date: '2026-05-28', category: ' CONSUMABILE ', partner: 'IMMACULATE LAUNDRY SERVICES SRL', description: 'Curatare si igienizare lenjerii', amount: 150, paymentMethod: 'BANK', invoiceNumber: 'LAU-05', note: '' },
  { id: 'mt-20', type: 'Cheltuiala', date: '2026-05-28', category: ' CONSUMABILE ', partner: 'COSMETICE HOTEL S.R.L.', description: 'Loturi cosmetice camere', amount: 11, paymentMethod: 'BANK', invoiceNumber: 'COS-05', note: '' },
  { id: 'mt-21', type: 'Cheltuiala', date: '2026-05-28', category: ' CONSUMABILE ', partner: 'SC SANITO DISTRIBUTION SRL', description: 'Consumabile hotel si dispensere', amount: 11, paymentMethod: 'BANK', invoiceNumber: 'SAN-05', note: '' },
  { id: 'mt-22', type: 'Cheltuiala', date: '2026-05-28', category: ' CONSUMABILE ', partner: 'SC SIDE GRUP SRL', description: 'Saci menajeri si solutii', amount: 1, paymentMethod: 'CARD', invoiceNumber: 'SIDE-05', note: '' },

  // CONTABILITATE (Total 122)
  { id: 'mt-23', type: 'Cheltuiala', date: '2026-05-28', category: 'CONTABILITATE', partner: 'S.C. THE ONE FIN CONSULT SRL', description: 'Servicii audit si contabilitate', amount: 122, paymentMethod: 'BANK', invoiceNumber: 'CON-05', note: '' },

  // DIVERSE 1 (Total 244)
  { id: 'mt-24', type: 'Cheltuiala', date: '2026-05-28', category: 'DIVERSE 1', partner: 'ASOCIATIA CENTRUL ROMAN PENTRU ADMINISTRAREA DREPTURILOR ARTISTILOR INTERPRETI (CREDIDAM)', description: 'Suma anuala CREDIDAM fond muzical', amount: 125, paymentMethod: 'BANK', invoiceNumber: 'CRE-05', note: '' },
  { id: 'mt-25', type: 'Cheltuiala', date: '2026-05-28', category: 'DIVERSE 1', partner: 'BRAI CATA SRL', description: 'Colectare si reciclare gunoi', amount: 11, paymentMethod: 'BANK', invoiceNumber: 'BRAI-05', note: '' },
  { id: 'mt-26', type: 'Cheltuiala', date: '2026-05-28', category: 'DIVERSE 1', partner: 'UPFR', description: 'Gestiune drepturi UPFR', amount: 1, paymentMethod: 'BANK', invoiceNumber: 'UPF-05', note: '' },
  { id: 'mt-27', type: 'Cheltuiala', date: '2026-05-28', category: 'DIVERSE 1', partner: 'ALTEX ROMANIA SRL', description: 'Dispozitive electrice hotel', amount: 52, paymentMethod: 'CARD', invoiceNumber: 'ALT-05', note: '' },
  { id: 'mt-28', type: 'Cheltuiala', date: '2026-05-28', category: 'DIVERSE 1', partner: 'ALDUS & PRINT & SERV SRL', description: 'Carduri de acces si print', amount: 21, paymentMethod: 'BANK', invoiceNumber: 'ALD-05', note: '' },
  { id: 'mt-29', type: 'Cheltuiala', date: '2026-05-28', category: 'DIVERSE 1', partner: 'D.O. SECURITY GRUP PAZA SI PROTECTIE SRL', description: 'Paza fizica si sisteme', amount: 22, paymentMethod: 'BANK', invoiceNumber: 'SEC-05', note: '' },
  { id: 'mt-30', type: 'Cheltuiala', date: '2026-05-28', category: 'DIVERSE 1', partner: 'P & P SRL', description: 'Gestiune parcari auto', amount: 12, paymentMethod: 'BANK', invoiceNumber: 'PP-05', note: '' },

  // DIGITAL (Total 239)
  { id: 'mt-31', type: 'Cheltuiala', date: '2026-05-28', category: 'DIGITAL', partner: 'OPENAI LLC', description: 'Abonament platforma AI si API', amount: 215, paymentMethod: 'CARD', invoiceNumber: 'OAI-05', note: '' },
  { id: 'mt-32', type: 'Cheltuiala', date: '2026-05-28', category: 'DIGITAL', partner: 'FB & MARKETING', description: 'Buget Facebook Ads campanie', amount: 21, paymentMethod: 'CARD', invoiceNumber: 'FB-05', note: '' },
  { id: 'mt-33', type: 'Cheltuiala', date: '2026-05-28', category: 'DIGITAL', partner: 'INTELLIGENT IT SRL', description: 'Smartbill facturare si gestiune', amount: 1, paymentMethod: 'CARD', invoiceNumber: 'IT-05', note: '' },
  { id: 'mt-34', type: 'Cheltuiala', date: '2026-05-28', category: 'DIGITAL', partner: 'SWEEPLY', description: 'Platforma management curatenie Sweeply', amount: 1, paymentMethod: 'CARD', invoiceNumber: 'SWP-05', note: '' },
  { id: 'mt-35', type: 'Cheltuiala', date: '2026-05-28', category: 'DIGITAL', partner: 'DIGITAL ARBITRAGE INC. ', description: 'Infrastructura cloud si domeniu internet', amount: 1, paymentMethod: 'CARD', invoiceNumber: 'DAI-05', note: '' },

  // PARTENERI (Total 12)
  { id: 'mt-36', type: 'Cheltuiala', date: '2026-05-28', category: 'PARTENERI', partner: 'AIM IMAGE PERFECT SRL', description: 'Servicii design branding si promovare', amount: 12, paymentMethod: 'BANK', invoiceNumber: 'AIM-05', note: '' },

  // MENTENANTA (Total 137)
  { id: 'mt-37', type: 'Cheltuiala', date: '2026-05-28', category: 'MENTENANTA', partner: 'ALFA PREVENT SRL', description: 'Verificare si mentenanta sprinklere', amount: 12, paymentMethod: 'BANK', invoiceNumber: 'ALF-05', note: '' },
  { id: 'mt-38', type: 'Cheltuiala', date: '2026-05-28', category: 'MENTENANTA', partner: 'SAFE ECHITECH S.R.L.', description: 'Servicii de mentenanta centralizata', amount: 2, paymentMethod: 'BANK', invoiceNumber: 'SAF-05', note: '' },
  { id: 'mt-39', type: 'Cheltuiala', date: '2026-05-28', category: 'MENTENANTA', partner: 'KORONA N.G.S.', description: 'Intretinere lift cabinat', amount: 22, paymentMethod: 'BANK', invoiceNumber: 'KOR-05', note: '' },
  { id: 'mt-40', type: 'Cheltuiala', date: '2026-05-28', category: 'MENTENANTA', partner: 'S.C. LEROY MERLIN ROMANIA S.R.L.', description: 'Dotari gradini si reparatii', amount: 25, paymentMethod: 'CARD', invoiceNumber: 'LER-05', note: '' },
  { id: 'mt-41', type: 'Cheltuiala', date: '2026-05-28', category: 'MENTENANTA', partner: 'DEDEMAN SRL', description: 'Gestiune consumabile tehnice', amount: 26, paymentMethod: 'CARD', invoiceNumber: 'DED-05', note: '' },
  { id: 'mt-42', type: 'Cheltuiala', date: '2026-05-28', category: 'MENTENANTA', partner: 'BRICOSTORE ROMANIA SA', description: 'Garnituri si suruburi usi', amount: 21, paymentMethod: 'CARD', invoiceNumber: 'BRI-05', note: '' },
  { id: 'mt-43', type: 'Cheltuiala', date: '2026-05-28', category: 'MENTENANTA', partner: 'JYSK ROMANIA S.R.L.', description: 'Umerase si pernute decorative', amount: 25, paymentMethod: 'CARD', invoiceNumber: 'JYSK-05', note: '' },
  { id: 'mt-44', type: 'Cheltuiala', date: '2026-05-28', category: 'MENTENANTA', partner: 'IKEA ROMANIA SA', description: 'Lumanari ambientale si textile', amount: 2, paymentMethod: 'CARD', invoiceNumber: 'IKEA-05', note: '' },
  { id: 'mt-45', type: 'Cheltuiala', date: '2026-05-28', category: 'MENTENANTA', partner: 'BOGDAN T. LUCIAN PFA', description: 'Curatare conducte aer conditionat', amount: 2, paymentMethod: 'CASH', invoiceNumber: 'BTL-05', note: '' },

  // COMISIOANE (Total 112)
  { id: 'mt-46', type: 'Cheltuiala', date: '2026-05-28', category: 'COMISIOANE', partner: 'BOOKING.COM B.V.', description: 'Factura comision cazari', amount: 112, paymentMethod: 'BANK', invoiceNumber: 'BKG-05', note: '' },

  // SRI LANKA (Total 67)
  { id: 'mt-47', type: 'Cheltuiala', date: '2026-05-28', category: 'SRI LANKA', partner: 'Apartament', description: 'Chirie apartament Sri Lanka', amount: 12, paymentMethod: 'CASH', invoiceNumber: 'SL-APT', note: '' },
  { id: 'mt-48', type: 'Cheltuiala', date: '2026-05-28', category: 'SRI LANKA', partner: 'Apa', description: 'Suma apa', amount: 22, paymentMethod: 'CASH', invoiceNumber: 'SL-APA', note: '' },
  { id: 'mt-49', type: 'Cheltuiala', date: '2026-05-28', category: 'SRI LANKA', partner: 'Gaz', description: 'Suma butelie gaz', amount: 2, paymentMethod: 'CASH', invoiceNumber: 'SL-GAZ', note: '' },
  { id: 'mt-50', type: 'Cheltuiala', date: '2026-05-28', category: 'SRI LANKA', partner: 'Curent', description: 'Suma electricitate asiat', amount: 15, paymentMethod: 'CASH', invoiceNumber: 'SL-CUR', note: '' },
  { id: 'mt-51', type: 'Cheltuiala', date: '2026-05-28', category: 'SRI LANKA', partner: 'Rds', description: 'Utilitati conexiune internet', amount: 16, paymentMethod: 'CASH', invoiceNumber: 'SL-RDS', note: '' },
];

const initialManualTransactions: FinancialTransaction[] = [];

function formatFriendlyDate(dateStr: string, isRo: boolean) {
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    if (isNaN(d.getTime())) return dateStr;
    const daysRo = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
    const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthsRo = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
    const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = isRo ? daysRo[d.getDay()] : daysEn[d.getDay()];
    const day = d.getDate().toString().padStart(2, '0');
    const monthName = isRo ? monthsRo[d.getMonth()] : monthsEn[d.getMonth()];
    const year = d.getFullYear();
    
    return isRo ? `${dayName}, ${day} ${monthName} ${year}` : `${dayName}, ${monthName} ${day}, ${year}`;
  } catch (e) {
    return dateStr;
  }
}

export default function App() {
  // Synchronous run-once cleanup check to ensure user's screen is completely cleared of any old demo/cached data
  if (typeof window !== 'undefined') {
    const cleared = localStorage.getItem('efactura_cleared_v11');
    if (!cleared) {
      localStorage.removeItem('efactura_invoices');
      localStorage.removeItem('efactura_transactions');
      localStorage.removeItem('efactura_invoices_v2');
      localStorage.removeItem('efactura_transactions_v2');
      localStorage.removeItem('efactura_operational_logs');
      localStorage.removeItem('efactura_manual_transactions');
      localStorage.removeItem('efactura_hotel_tasks');
      localStorage.removeItem('efactura_hotel_completions');
      localStorage.removeItem('efactura_bs_base_cash');
      localStorage.removeItem('efactura_bs_fixed_assets');
      localStorage.removeItem('efactura_bs_equity_social');
      localStorage.removeItem('efactura_global_date');
      localStorage.setItem('efactura_cleared_v11', 'true');
    }
  }

  // Global States backed by localStorage
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('efactura_language');
    return (saved as Language) || 'RO';
  });

  const [activeUser, setActiveUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('efactura_active_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as UserProfile;
        if (parsed && parsed.username && parsed.username.toLowerCase() === '5minsudha@gmail.com') {
          parsed.role = 'Administrator';
        }
        return parsed;
      } catch (e) {
        // ignore
      }
    }
    return null;
  });

  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('efactura_users_list');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(u => {
            if (u.username.toLowerCase() === '5minsudha@gmail.com') {
              return { ...u, role: 'Administrator' as UserRole };
            }
            return u;
          });
        }
        return parsed;
      } catch (e) {
        // ignore
      }
    }
    return [
      { username: '5minsudha@gmail.com', fullName: 'Sudha', role: 'Administrator' },
      { username: 'manager@hotel.com', fullName: 'Radu Crețu', role: 'Manager' },
      { username: 'ops@hotel.com', fullName: 'Mircea Sandu', role: 'Operational Manager' },
      { username: 'staff@hotel.com', fullName: 'Elena Popescu', role: 'Staff' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('efactura_users_list', JSON.stringify(users));
  }, [users]);

  const [firebaseReady, setFirebaseReady] = useState(false);
  const [authUid, setAuthUid] = useState<string | null>(null);

  // Monitor and synchronize Firebase Auth state with our active session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUid(user.uid);
        setFirebaseReady(true);
      } else {
        setAuthUid(null);
        setFirebaseReady(true);
      }
    });

    // Safeguard timeout to prevent getting stuck if network or auth initialization lags
    const timeout = setTimeout(() => {
      setFirebaseReady(true);
      if (auth.currentUser) {
        setAuthUid(auth.currentUser.uid);
      }
    }, 1500);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const defaultRolePermissions: RolePermissions = {
    Administrator: [
      'dashboard', 'ledger', 'upload', 'priceHistory', 'products', 
      'hotelDashboard', 'transactions', 'dailyData', 'monthlyReport', 'financialReports',
      'settings'
    ],
    Manager: [
      'dashboard', 'ledger', 'upload', 'priceHistory', 'products', 
      'hotelDashboard', 'transactions', 'dailyData', 'monthlyReport', 'financialReports',
      'settings'
    ],
    'Operational Manager': [
      'dashboard', 'ledger', 'upload', 'priceHistory', 'products', 
      'hotelDashboard', 'transactions', 'dailyData', 'monthlyReport', 'financialReports',
      'settings'
    ],
    Staff: []
  };

  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(() => {
    const saved = localStorage.getItem('efactura_role_permissions_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as RolePermissions;
        // Automatically append newly added views if missing
        const roles: (keyof RolePermissions)[] = ['Administrator', 'Manager', 'Operational Manager', 'Staff'];
        roles.forEach(role => {
          if (parsed[role]) {
            if (role === 'Administrator' || role === 'Manager') {
              if (!parsed[role].includes('financialReports')) {
                parsed[role].push('financialReports');
              }
            }
          } else {
            parsed[role] = defaultRolePermissions[role];
          }
        });
        return parsed;
      } catch (e) {
        return defaultRolePermissions;
      }
    }
    return defaultRolePermissions;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('efactura_invoices_v2');
    return saved ? JSON.parse(saved) : initialInvoices;
  });

  const [transactions, setTransactions] = useState<PaymentTransaction[]>(() => {
    const saved = localStorage.getItem('efactura_transactions_v2');
    return saved ? JSON.parse(saved) : initialTransactions;
  });

  const [costCenters, setCostCenters] = useState<CostCenter[]>(() => {
    const saved = localStorage.getItem('efactura_cost_centers');
    return saved ? JSON.parse(saved) : initialCostCenters;
  });

  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = localStorage.getItem('efactura_companies');
    return saved ? JSON.parse(saved) : initialCompanies;
  });

  // Unique States for the updated Financial Module mapping to Management.xlsx
  const [operationalLogs, setOperationalLogs] = useState<OperationalLog[]>(() => {
    const saved = localStorage.getItem('efactura_operational_logs');
    return saved ? JSON.parse(saved) : initialOperationalLogs;
  });

  const [globalDate, setGlobalDate] = useState<string>(() => {
    return localStorage.getItem('efactura_global_date') || '2026-06-02';
  });

  const [bsBaseCash, setBsBaseCashState] = useState<number>(() => {
    const saved = localStorage.getItem('efactura_bs_base_cash');
    return saved ? parseFloat(saved) : 185000;
  });

  const [bsFixedAssets, setBsFixedAssetsState] = useState<number>(() => {
    const saved = localStorage.getItem('efactura_bs_fixed_assets');
    return saved ? parseFloat(saved) : 1450000;
  });

  const [bsEquitySocial, setBsEquitySocialState] = useState<number>(() => {
    const saved = localStorage.getItem('efactura_bs_equity_social');
    return saved ? parseFloat(saved) : 1400000;
  });

  const setBsBaseCash = (v: number) => {
    setBsBaseCashState(v);
    localStorage.setItem('efactura_bs_base_cash', v.toString());
    apiPost('/api/config/balanceSheet', { bsBaseCash: v });
  };

  const setBsFixedAssets = (v: number) => {
    setBsFixedAssetsState(v);
    localStorage.setItem('efactura_bs_fixed_assets', v.toString());
    apiPost('/api/config/balanceSheet', { bsFixedAssets: v });
  };

  const setBsEquitySocial = (v: number) => {
    setBsEquitySocialState(v);
    localStorage.setItem('efactura_bs_equity_social', v.toString());
    apiPost('/api/config/balanceSheet', { bsEquitySocial: v });
  };

  useEffect(() => {
    localStorage.setItem('efactura_global_date', globalDate);
  }, [globalDate]);

  const handleAdjustGlobalDate = (days: number) => {
    try {
      const parts = globalDate.split('-');
      if (parts.length !== 3) return;
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      if (isNaN(d.getTime())) return;
      d.setDate(d.getDate() + days);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setGlobalDate(`${yyyy}-${mm}-${dd}`);
    } catch (e) {
      console.error(e);
    }
  };

  const [manualTransactions, setManualTransactions] = useState<FinancialTransaction[]>(() => {
    const saved = localStorage.getItem('efactura_manual_transactions');
    const logs = saved ? JSON.parse(saved) : initialManualTransactions;
    return logs.map((tx: any) => ({
      ...tx,
      date: tx.date === '2026-05-28' ? '2026-06-02' : tx.date,
      company: tx.company || 'CCB Hotels Management SRL',
      costCenter: tx.costCenter || (tx.category === 'MANCARE & APROVIZIONARE' ? 'Bucătărie Centrală' : 'Restaurant Nord'),
      status: tx.status || 'paid'
    }));
  });

  // Navigation states
  // 'ledger' is the default active tab as shown in the screenshot, but if the role is Staff, default to 'tasksDashboard'
  const [currentView, setCurrentView] = useState<string>('ledger');
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]); // started completely empty for user testing!
  
  // Collapsible sidebar menu flags
  const [financialModuleExpanded, setFinancialModuleExpanded] = useState(true); // expanded by default!
  const [tasksModuleExpanded, setTasksModuleExpanded] = useState(true); // expanded by default!
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('efactura_sidebar_collapsed') === 'true';
  });

  // Update currentView if the loaded role doesn't have access to the default 'ledger' view
  useEffect(() => {
    if (activeUser) {
      const allowedViews = rolePermissions[activeUser.role] || [];
      if (allowedViews.length > 0 && !allowedViews.includes(currentView)) {
        // Find the first allowed view and fallback to it
        setCurrentView(allowedViews[0]);
      }
    }
  }, [activeUser, rolePermissions]);

  // Sync state back to localStorage
  useEffect(() => {
    localStorage.setItem('efactura_language', lang);
  }, [lang]);

  useEffect(() => {
    if (activeUser) {
      localStorage.setItem('efactura_active_user', JSON.stringify(activeUser));
    } else {
      localStorage.removeItem('efactura_active_user');
    }
  }, [activeUser]);

  useEffect(() => {
    localStorage.setItem('efactura_role_permissions_v2', JSON.stringify(rolePermissions));
  }, [rolePermissions]);

  useEffect(() => {
    localStorage.setItem('efactura_invoices_v2', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('efactura_transactions_v2', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('efactura_cost_centers', JSON.stringify(costCenters));
  }, [costCenters]);

  useEffect(() => {
    localStorage.setItem('efactura_companies', JSON.stringify(companies));
  }, [companies]);

  // Sync the operational data and manual transactions back to localStorage
  useEffect(() => {
    localStorage.setItem('efactura_operational_logs', JSON.stringify(operationalLogs));
  }, [operationalLogs]);

  useEffect(() => {
    localStorage.setItem('efactura_manual_transactions', JSON.stringify(manualTransactions));
  }, [manualTransactions]);

  // Synchronize and poll data from the custom Express full-stack REST API
  const refreshData = async () => {
    try {
      const [
        resInvoices,
        resTransactions,
        resCostCenters,
        resCompanies,
        resLogs,
        resManual,
        resUsers,
        resPerms,
        resBs
      ] = await Promise.all([
        fetch('/api/invoices').then(r => r.json()),
        fetch('/api/transactions').then(r => r.json()),
        fetch('/api/costCenters').then(r => r.json()),
        fetch('/api/companies').then(r => r.json()),
        fetch('/api/operationalLogs').then(r => r.json()),
        fetch('/api/manualTransactions').then(r => r.json()),
        fetch('/api/users').then(r => r.json()),
        fetch('/api/rolePermissions').then(r => r.json()),
        fetch('/api/config/balanceSheet').then(r => r.json())
      ]);

      if (Array.isArray(resInvoices)) setInvoices(resInvoices);
      if (Array.isArray(resTransactions)) setTransactions(resTransactions);
      if (Array.isArray(resCostCenters)) setCostCenters(resCostCenters);
      if (Array.isArray(resCompanies)) setCompanies(resCompanies);
      if (Array.isArray(resLogs)) setOperationalLogs(resLogs);
      if (Array.isArray(resManual)) setManualTransactions(resManual);
      if (Array.isArray(resUsers)) setUsers(resUsers);
      if (resPerms && typeof resPerms === 'object') setRolePermissions(resPerms);
      if (resBs && typeof resBs === 'object') {
        if (typeof resBs.bsBaseCash === 'number') setBsBaseCashState(resBs.bsBaseCash);
        if (typeof resBs.bsFixedAssets === 'number') setBsFixedAssetsState(resBs.bsFixedAssets);
        if (typeof resBs.bsEquitySocial === 'number') setBsEquitySocialState(resBs.bsEquitySocial);
      }
    } catch (err) {
      console.error('Data sync error from relational database:', err);
    }
  };

  useEffect(() => {
    if (!activeUser) return;

    // Load initial data
    refreshData();

    // Setup periodic polling for data updates (real-time experience)
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, [activeUser]);

  // Centralized POST and DELETE helpers to persist to the backend database
  const apiPost = (url: string, data: any) => {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(() => refreshData())
    .catch(e => console.error(`POST ${url} failed:`, e));
  };

  const apiDelete = (url: string) => {
    fetch(url, { method: 'DELETE' })
      .then(() => refreshData())
      .catch(e => console.error(`DELETE ${url} failed:`, e));
  };


  // State modifiers
  const handleToggleSelectInvoice = (number: string) => {
    setSelectedInvoices(prev => 
      prev.includes(number) 
        ? prev.filter(n => n !== number) 
        : [...prev, number]
    );
  };

  const handleClearSelection = () => {
    setSelectedInvoices([]);
  };

  const handleAddCostCenter = (cc: CostCenter) => {
    setCostCenters(prev => [...prev, cc]);
    apiPost('/api/costCenters', cc);
  };

  const handleDeleteCostCenter = (id: string) => {
    setCostCenters(prev => prev.filter(c => c.id !== id));
    apiDelete(`/api/costCenters/${id}`);
  };

  const handleAddCompany = (comp: Company) => {
    setCompanies(prev => [...prev, comp]);
    apiPost('/api/companies', comp);
  };

  const handleDeleteCompany = (id: string) => {
    setCompanies(prev => prev.filter(c => c.id !== id));
    apiDelete(`/api/companies/${id}`);
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    // 1. Remove from local State and Firestore
    setInvoices(prev => prev.filter(i => i.id !== invoiceId));
    apiDelete(`/api/invoices/${invoiceId}`);

    // 2. Remove the automatically created pending cashflow transaction associated with this invoice
    const autoTxId = `tx-invoice-${invoiceId}`;
    setManualTransactions(prev => prev.filter(tx => tx.id !== autoTxId));
    apiDelete(`/api/manualTransactions/${autoTxId}`);

    // 3. Clean up any related payments logged in the transactions list
    setTransactions(prev => {
      const associatedTx = prev.filter(t => t.invoiceId === invoiceId);
      associatedTx.forEach(t => {
        apiDelete(`/api/transactions/${t.id}`);
      });
      return prev.filter(t => t.invoiceId !== invoiceId);
    });

    // 4. Remove from selectedInvoices tracking if necessary
    setSelectedInvoices(prev => {
      const parentInvoice = invoices.find(inv => inv.id === invoiceId);
      if (parentInvoice) {
        return prev.filter(num => num !== parentInvoice.number);
      }
      return prev;
    });
  };

  const handleAddParsedInvoice = (invoice: Invoice) => {
    setInvoices(prev => [invoice, ...prev]);
    apiPost('/api/invoices', invoice);

    // Construct guessed category for cashflow tracking
    const guessCategory = (partnerName: string): string => {
      const p = partnerName.toLowerCase();
      if (p.includes('apa') || p.includes('engie') || p.includes('electrica') || p.includes('vodafone') || p.includes('orange') || p.includes('digi')) {
        return 'UTILITATI';
      }
      if (p.includes('selgros') || p.includes('carrefour') || p.includes('lidl') || p.includes('auchan') || p.includes('agro') || p.includes('catering')) {
        return 'MANCARE & APROVIZIONARE';
      }
      if (p.includes('laundry') || p.includes('curatare') || p.includes('cosmetice') || p.includes('sanito') || p.includes('side grup')) {
        return ' CONSUMABILE ';
      }
      if (p.includes('contabilitate') || p.includes('audit') || p.includes('one fin')) {
        return 'CONTABILITATE';
      }
      if (p.includes('openai') || p.includes('software') || p.includes('smartbill') || p.includes('sweeply')) {
        return 'DIGITAL';
      }
      return 'DIVERSE 1';
    };

    const parseInvoiceDateToYYYYMMDD = (dateStr: string): string => {
      if (dateStr.includes('-')) return dateStr;
      const parts = dateStr.split(/[./]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      return dateStr;
    };

    // Auto-create a pending cashflow ledger transaction with 'unpaid' status
    const newTx: FinancialTransaction = {
      id: `tx-invoice-${invoice.id}`,
      type: 'Cheltuiala',
      date: parseInvoiceDateToYYYYMMDD(invoice.date),
      category: guessCategory(invoice.company),
      partner: invoice.company,
      description: `Factură e-Factura nr. ${invoice.number}`,
      amount: invoice.total,
      paymentMethod: 'BANK',
      invoiceNumber: invoice.number,
      note: 'Auto-generat din XML e-Factura',
      company: invoice.client,
      costCenter: invoice.costCenter,
      status: 'unpaid'
    };

    setManualTransactions(prev => [newTx, ...prev]);
    apiPost('/api/manualTransactions', newTx);

    // Automatically change the system's active working date to match this invoice's date
    const isoDate = parseInvoiceDateToYYYYMMDD(invoice.date);
    if (isoDate && isoDate.length === 10) {
      setGlobalDate(isoDate);
    }
  };

  // Custom action to log payment against an invoice and subtract rest amount
  const handleAddPayment = (invoiceId: string, amount: number, method: string, ref: string) => {
    const today = new Date().toLocaleDateString('ro-RO');

    // 1. Log transaction
    const targetInvoice = invoices.find(inv => inv.id === invoiceId);
    if (!targetInvoice) return;

    const newTx: PaymentTransaction = {
      id: `tx-${Date.now()}`,
      invoiceId,
      invoiceNumber: targetInvoice.number,
      date: today,
      amount,
      method: method as any,
      reference: ref
    };

    setTransactions(prev => [newTx, ...prev]);
    apiPost('/api/transactions', newTx);

    // 2. Adjust remaining liability of the invoice
    const updatedInvoice = {
      ...targetInvoice,
      paid: targetInvoice.paid + amount,
      rest: parseFloat(Math.max(0, targetInvoice.total - (targetInvoice.paid + amount)).toFixed(2)),
      status: ((targetInvoice.paid + amount) >= targetInvoice.total ? 'paid' : 'partial') as 'paid' | 'partial' | 'unpaid',
      paymentDate: (targetInvoice.paid + amount) >= targetInvoice.total ? today : targetInvoice.paymentDate
    };

    setInvoices(prevInvoices => 
      prevInvoices.map(inv => inv.id === invoiceId ? updatedInvoice : inv)
    );
    apiPost('/api/invoices', updatedInvoice);

    // 3. Keep manualTransactions in sync and log a concrete payment entry in the general ledger
    const guessCategory = (partnerName: string): string => {
      const p = partnerName.toLowerCase();
      if (p.includes('apa') || p.includes('engie') || p.includes('electrica') || p.includes('vodafone') || p.includes('orange') || p.includes('digi')) {
        return 'UTILITATI';
      }
      if (p.includes('selgros') || p.includes('carrefour') || p.includes('lidl') || p.includes('auchan') || p.includes('agro') || p.includes('catering')) {
        return 'MANCARE & APROVIZIONARE';
      }
      if (p.includes('laundry') || p.includes('curatare') || p.includes('cosmetice') || p.includes('sanito') || p.includes('side grup')) {
        return 'CONSUMABILE';
      }
      if (p.includes('contabilitate') || p.includes('audit') || p.includes('one fin')) {
        return 'CONTABILITATE';
      }
      if (p.includes('openai') || p.includes('software') || p.includes('smartbill') || p.includes('sweeply')) {
        return 'DIGITAL';
      }
      return 'DIVERSE 1';
    };

    const todayDate = new Date().toISOString().split('T')[0];
    const methodMapping: { [key: string]: string } = {
      'Bank Transfer': 'BANK',
      'Cash': 'CASH',
      'Card': 'CARD',
      'Chitanță': 'CHITANȚĂ'
    };

    const newManualTx: FinancialTransaction = {
      id: `mtx-pmt-${Date.now()}`,
      type: 'Cheltuiala',
      date: todayDate, // use today's date so it appears under today's register as requested
      category: guessCategory(targetInvoice.company),
      partner: targetInvoice.company,
      description: `Plată Factură nr. ${targetInvoice.number} (${ref})`,
      amount: amount,
      paymentMethod: methodMapping[method] || method.toUpperCase(),
      invoiceNumber: targetInvoice.number,
      note: `Referință plată: ${ref || 'N/A'}`,
      company: targetInvoice.client === 'CCB HOTELS' ? 'CCB Hotels Management SRL' : targetInvoice.client,
      costCenter: targetInvoice.costCenter,
      status: 'paid'
    };

    setManualTransactions(prev => [newManualTx, ...prev]);
    apiPost('/api/manualTransactions', newManualTx);
  };

  const handleToggleTransactionStatus = (txId: string, newStatus: 'paid' | 'unpaid') => {
    // 1. Update status on the cashflow ledger entry
    setManualTransactions(prev => prev.map(tx => {
      if (tx.id === txId) {
        const todayDate = new Date().toISOString().split('T')[0];
        const updated = { 
          ...tx, 
          status: newStatus,
          date: newStatus === 'paid' ? todayDate : tx.date // if paid, set date to today so it displays on the active date filter
        };
        apiPost('/api/manualTransactions', updated);
        return updated;
      }
      return tx;
    }));

    // Find the associated transaction details
    const targetTx = manualTransactions.find(tx => tx.id === txId);
    if (targetTx && targetTx.invoiceNumber) {
      // 2. Synchronize back to invoice balance to keep registries perfectly coherent
      setInvoices(prevInvoices => prevInvoices.map(inv => {
        if (inv.number.toLowerCase() === targetTx.invoiceNumber.toLowerCase()) {
          const today = new Date().toLocaleDateString('ro-RO');
          const updatedInv = {
            ...inv,
            paid: newStatus === 'paid' ? inv.total : 0,
            rest: newStatus === 'paid' ? 0 : inv.total,
            status: newStatus,
            paymentDate: newStatus === 'paid' ? today : null
          };
          apiPost('/api/invoices', updatedInv);
          return updatedInv;
        }
        return inv;
      }));
    }
  };

  const handleToggleInvoicePayment = (invoiceId: string, newStatus: 'paid' | 'unpaid') => {
    const today = new Date().toLocaleDateString('ro-RO');
    
    // Find matching invoice
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    // 1. Update invoice status & local balances
    const updatedInvoice = {
      ...invoice,
      paid: newStatus === 'paid' ? invoice.total : 0,
      rest: newStatus === 'paid' ? 0 : invoice.total,
      status: newStatus,
      paymentDate: newStatus === 'paid' ? today : null
    };
    setInvoices(prevInvoices => prevInvoices.map(inv => inv.id === invoiceId ? updatedInvoice : inv));
    apiPost('/api/invoices', updatedInvoice);

    // 2. Keep manualTransactions in sync (prevent cashflow ledger discrepancy)
    setManualTransactions(prev => {
      const todayDate = new Date().toISOString().split('T')[0];
      const exists = prev.some(tx => tx.invoiceNumber && tx.invoiceNumber.toLowerCase() === invoice.number.toLowerCase());
      if (exists) {
        return prev.map(tx => {
          if (tx.invoiceNumber && tx.invoiceNumber.toLowerCase() === invoice.number.toLowerCase()) {
            const updatedTx = {
              ...tx,
              date: newStatus === 'paid' ? todayDate : tx.date, // update transaction date to today so they can see it in today's register as a paid transaction
              status: newStatus
            };
            apiPost('/api/manualTransactions', updatedTx);
            return updatedTx;
          }
          return tx;
        });
      } else if (newStatus === 'paid') {
        const guessCategory = (partnerName: string): string => {
          const p = partnerName.toLowerCase();
          if (p.includes('apa') || p.includes('engie') || p.includes('electrica') || p.includes('vodafone') || p.includes('orange') || p.includes('digi')) {
            return 'UTILITATI';
          }
          if (p.includes('selgros') || p.includes('carrefour') || p.includes('lidl') || p.includes('auchan') || p.includes('agro') || p.includes('catering')) {
            return 'MANCARE & APROVIZIONARE';
          }
          if (p.includes('laundry') || p.includes('curatare') || p.includes('cosmetice') || p.includes('sanito') || p.includes('side grup')) {
            return 'CONSUMABILE';
          }
          if (p.includes('contabilitate') || p.includes('audit') || p.includes('one fin')) {
            return 'CONTABILITATE';
          }
          if (p.includes('openai') || p.includes('software') || p.includes('smartbill') || p.includes('sweeply')) {
            return 'DIGITAL';
          }
          return 'DIVERSE 1';
        };

        const newTx: FinancialTransaction = {
          id: `tx-invoice-${invoice.id}`,
          type: 'Cheltuiala',
          date: todayDate, // use today's date so it appears on the register under today's date filter
          category: guessCategory(invoice.company),
          partner: invoice.company,
          description: `Factură e-Factura nr. ${invoice.number}`,
          amount: invoice.total,
          paymentMethod: 'BANK',
          invoiceNumber: invoice.number,
          note: 'Auto-generat prin marcare directă ca plătită',
          company: invoice.client,
          costCenter: invoice.costCenter,
          status: 'paid'
        };
        apiPost('/api/manualTransactions', newTx);
        return [newTx, ...prev];
      }
      return prev;
    });

    // 3. Update payment logs list (transactions)
    if (newStatus === 'paid') {
      const txExists = transactions.some(t => t.invoiceId === invoiceId);
      if (!txExists) {
        const newPmt: PaymentTransaction = {
          id: `tx-${Date.now()}`,
          invoiceId,
          invoiceNumber: invoice.number,
          date: today,
          amount: invoice.total,
          method: 'Bank Transfer',
          reference: `AUTO-PAY-${invoice.number}`
        };
        setTransactions(prev => [newPmt, ...prev]);
        apiPost('/api/transactions', newPmt);
      }
    } else {
      setTransactions(prev => {
        const kept = prev.filter(t => t.invoiceId !== invoiceId);
        const removed = prev.find(t => t.invoiceId === invoiceId);
        if (removed) {
          apiDelete(`/api/transactions/${removed.id}`);
        }
        return kept;
      });
    }
  };

  const handleUpdateUserRole = (username: string, newRole: UserRole) => {
    setUsers(prev => prev.map(u => {
      if (u.username.toLowerCase() === username.toLowerCase()) {
        const updated = { ...u, role: newRole };
        apiPost('/api/users', updated);
        // Sync active profile if it is the current user
        if (activeUser && activeUser.username.toLowerCase() === username.toLowerCase()) {
          setActiveUser(prevActive => prevActive ? { ...prevActive, role: newRole } : null);
        }
        return updated;
      }
      return u;
    }));
  };

  const handleAddUser = (newUser: UserProfile) => {
    setUsers(prev => {
      const exists = prev.some(u => u.username.toLowerCase() === newUser.username.toLowerCase());
      if (exists) {
        alert(lang === 'RO' 
          ? `Utilizatorul cu e-mailul ${newUser.username} există deja în baza de date!` 
          : `User with email ${newUser.username} is already registered!`);
        return prev;
      }
      apiPost('/api/users', newUser);
      return [...prev, newUser];
    });
  };

  const handleDeleteUser = (username: string) => {
    setUsers(prev => prev.filter(u => u.username.toLowerCase() !== username.toLowerCase()));
    apiDelete(`/api/users/${username.toLowerCase()}`);
  };

  const handleUpdateRolePermissions = (newPermissions: RolePermissions) => {
    setRolePermissions(newPermissions);
    Object.entries(newPermissions).forEach(async ([role, permissions]) => {
      try {
        apiPost('/api/rolePermissions', { role, permissions });
      } catch (e) {
        console.error('Error writing role permissions:', e);
      }
    });
  };

  const handleClearAllData = () => {
    setInvoices([]);
    setTransactions([]);
    setCostCenters([]);
    setCompanies([]);
    setSelectedInvoices([]);
    setOperationalLogs([]);
    setManualTransactions([]);
    localStorage.removeItem('efactura_invoices');
    localStorage.removeItem('efactura_transactions');
    localStorage.removeItem('efactura_invoices_v2');
    localStorage.removeItem('efactura_transactions_v2');
    localStorage.removeItem('efactura_cost_centers');
    localStorage.removeItem('efactura_companies');
    localStorage.removeItem('efactura_operational_logs');
    localStorage.removeItem('efactura_manual_transactions');
    localStorage.removeItem('efactura_hotel_tasks');
    localStorage.removeItem('efactura_hotel_completions');
    localStorage.removeItem('efactura_bs_base_cash');
    localStorage.removeItem('efactura_bs_fixed_assets');
    localStorage.removeItem('efactura_bs_equity_social');
    
    // Re-initialize custom states to empty or zero
    setBsBaseCash(0);
    setBsFixedAssets(0);
    setBsEquitySocial(0);
    setGlobalDate('2026-06-02');
    
    alert(lang === 'RO' ? "Toate tabelele și datele au fost șterse integral!" : "All database tables and cached data have been successfully deleted!");
    window.location.reload();
  };

  const handleRestoreDemoData = () => {
    setInvoices(initialInvoices);
    setTransactions(initialTransactions);
    setCostCenters(initialCostCenters);
    setCompanies(initialCompanies);
    setOperationalLogs(demoOperationalLogs);
    setManualTransactions(demoManualTransactions.map((tx: any) => ({
      ...tx,
      date: tx.date === '2026-05-28' ? '2026-06-02' : tx.date,
      company: tx.company || 'CCB Hotels Management SRL',
      costCenter: tx.costCenter || (tx.category === 'MANCARE & APROVIZIONARE' ? 'Bucătărie Centrală' : 'Restaurant Nord'),
      status: tx.status || 'paid'
    })));
    setSelectedInvoices(['50R0017238', '50R0016986']);
    
    // Restore default baseline figures for accounting
    setBsBaseCash(185000);
    setBsFixedAssets(1450000);
    setBsEquitySocial(1400000);
    setGlobalDate('2026-06-02');
    
    localStorage.setItem('efactura_hotel_tasks', JSON.stringify(demoTemplateTasks));
    localStorage.setItem('efactura_hotel_completions', JSON.stringify(demoCompletions));
    
    alert(lang === 'RO' ? "Datele demonstrative implicite au fost restaurate cu succes!" : "Default demo data has been successfully restored!");
    window.location.reload();
  };

  if (!activeUser) {
    return (
      <LoginScreen
        onLoginSuccess={(loggedInUser) => {
          setUsers(prevUsers => {
            const existing = prevUsers.find(u => u.username.toLowerCase() === loggedInUser.username.toLowerCase());
            if (existing) {
              const mergedUser = {
                ...loggedInUser,
                role: existing.role, // Keep role assigned in settings page
                fullName: existing.fullName || loggedInUser.fullName
              };
              setActiveUser(mergedUser);
              return prevUsers.map(u => u.username.toLowerCase() === loggedInUser.username.toLowerCase() ? mergedUser : u);
            } else {
              const newUser: UserProfile = {
                username: loggedInUser.username.toLowerCase(),
                fullName: loggedInUser.fullName,
                role: loggedInUser.role // Default role logged in with
              };
              setActiveUser(newUser);
              return [...prevUsers, newUser];
            }
          });
        }}
        lang={lang}
        onToggleLanguage={setLang}
      />
    );
  }

  // Define translations dictionary quick-access helper
  const t = translations[lang];

  // Permissions helper
  const isAllowed = (viewId: string) => {
    return rolePermissions[activeUser.role]?.includes(viewId) || false;
  };

  return (
    <div className="flex h-screen overflow-hidden text-slate-800 bg-slate-50 font-sans">
      
      {/* MOBILE NAVIGATION DRAWER (Overlay & Slide-over) */}
      {isMobileMenuOpen && (
        <div id="mobile-sidebar-drawer" className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Drawer panel */}
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white pt-5 pb-4 shadow-xl transition-transform duration-300 ease-in-out">
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Company Identity */}
            <div className="px-5 pb-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Warehouse className="w-5 h-5" />
              </div>
              <div className="leading-tight text-left">
                <span className="font-extrabold text-slate-900 tracking-tight block text-sm">e-Factura</span>
                <span className="text-[10px] text-slate-450 font-bold block tracking-wider uppercase">SELGROS Parser</span>
              </div>
            </div>

            {/* Mobile Navigation Links */}
            <div className="flex-1 overflow-y-auto mt-4 px-2">
              <nav className="p-2 space-y-1 bg-white">
                
                {/* Dashboard Link */}
                {isAllowed('dashboard') && (
                  <button
                    onClick={() => {
                      setCurrentView('dashboard');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      currentView === 'dashboard'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    <span>{t.dashboard}</span>
                  </button>
                )}

                {/* Registru Plăți Link */}
                {isAllowed('ledger') && (
                  <button
                    onClick={() => {
                      setCurrentView('ledger');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      currentView === 'ledger' || currentView === 'upload'
                        ? 'bg-slate-950 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span>{t.paymentLedger}</span>
                  </button>
                )}

                {/* Istoric Prețuri Link */}
                {isAllowed('priceHistory') && (
                  <button
                    onClick={() => {
                      setCurrentView('priceHistory');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      currentView === 'priceHistory'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <History className="w-4 h-4 shrink-0" />
                    <span>{t.priceHistory}</span>
                  </button>
                )}

                {/* Produse Link */}
                {isAllowed('products') && (
                  <button
                    onClick={() => {
                      setCurrentView('products');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      currentView === 'products'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <Package className="w-4 h-4 shrink-0" />
                    <span>{t.products}</span>
                  </button>
                )}

                {/* Divider */}
                {(isAllowed('dashboard') || isAllowed('ledger') || isAllowed('priceHistory') || isAllowed('products')) && (
                  <div className="border-t border-slate-100 my-4" />
                )}

                {/* Financial Module - Collapsible */}
                {(isAllowed('hotelDashboard') || isAllowed('transactions') || isAllowed('dailyData') || isAllowed('monthlyReport')) && (
                  <div className="space-y-1">
                    <button
                      onClick={() => setFinancialModuleExpanded(!financialModuleExpanded)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-extrabold text-slate-650 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Layers className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>{t.financialModule}</span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${financialModuleExpanded ? '' : '-rotate-90'}`} />
                    </button>

                    {financialModuleExpanded && (
                      <div className="pl-9 space-y-1">
                        {isAllowed('hotelDashboard') && (
                          <button
                            onClick={() => {
                              setCurrentView('hotelDashboard');
                              setIsMobileMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md text-[11px] font-bold block cursor-pointer ${
                              currentView === 'hotelDashboard' ? 'text-blue-600 bg-blue-50/50 font-extrabold' : 'text-slate-550 hover:text-slate-900'
                            }`}
                          >
                            {t.finDashboard}
                          </button>
                        )}

                        {isAllowed('transactions') && (
                          <button
                            onClick={() => {
                              setCurrentView('transactions');
                              setIsMobileMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md text-[11px] font-bold block cursor-pointer ${
                              currentView === 'transactions' ? 'text-blue-600 bg-blue-50/50 font-extrabold' : 'text-slate-550 hover:text-slate-900'
                            }`}
                          >
                            {t.finTransactions}
                          </button>
                        )}

                        {isAllowed('dailyData') && (
                          <button
                            onClick={() => {
                              setCurrentView('dailyData');
                              setIsMobileMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md text-[11px] font-bold block cursor-pointer ${
                              currentView === 'dailyData' ? 'text-blue-600 bg-blue-50/50 font-extrabold' : 'text-slate-550 hover:text-slate-900'
                            }`}
                          >
                            {t.finDailyData}
                          </button>
                        )}

                        {isAllowed('monthlyReport') && (
                          <button
                            onClick={() => {
                              setCurrentView('monthlyReport');
                              setIsMobileMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md text-[11px] font-bold block cursor-pointer ${
                              currentView === 'monthlyReport' ? 'text-blue-600 bg-blue-50/50 font-extrabold' : 'text-slate-550 hover:text-slate-900'
                            }`}
                          >
                            {t.finMonthlyReport}
                          </button>
                        )}

                        {isAllowed('financialReports') && (
                          <button
                            onClick={() => {
                              setCurrentView('financialReports');
                              setIsMobileMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md text-[11px] font-bold block cursor-pointer ${
                              currentView === 'financialReports' ? 'text-blue-600 bg-blue-50/50 font-extrabold' : 'text-slate-550 hover:text-slate-900'
                            }`}
                          >
                            {t.finReports}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}



                {/* Settings */}
                {isAllowed('settings') && (
                  <div className="space-y-1 mt-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setCurrentView('settings');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        currentView === 'settings'
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                      }`}
                    >
                      <SettingsIcon className="w-4 h-4 shrink-0" />
                      <span>{t.settingsNav}</span>
                    </button>
                  </div>
                )}
              </nav>
            </div>

            {/* Mobile User Profile Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black shadow-2xs text-white ${
                  activeUser.role === 'Administrator' ? 'bg-indigo-600' : activeUser.role === 'Manager' ? 'bg-emerald-600' : 'bg-amber-600'
                }`}>
                  {activeUser.fullName.charAt(0)}
                </div>
                <div className="leading-tight text-left">
                  <span className="font-bold text-slate-800 block text-[11px] max-w-[110px] truncate">{activeUser.fullName}</span>
                  <span className={`text-[8px] px-1 py-0.2 rounded border font-black uppercase tracking-wider ${
                    activeUser.role === 'Administrator' 
                      ? 'bg-indigo-50 border-indigo-150 text-indigo-700' 
                      : activeUser.role === 'Manager'
                        ? 'bg-emerald-50 border-emerald-150 text-emerald-700'
                        : 'bg-amber-50 border-amber-150 text-amber-700'
                  }`}>
                    {activeUser.role}
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setActiveUser(null);
                  setCurrentView('ledger');
                  setIsMobileMenuOpen(false);
                }}
                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 1. SIDE NAVIGATION BAR (directly structured as shown in the screenshot!) */}
      <aside 
        id="applet-sidebar" 
        className={`hidden md:flex bg-white border-r border-slate-200 flex-col justify-between h-full shrink-0 select-none transition-all duration-300 ${
          isSidebarCollapsed ? 'w-0 border-r-0 overflow-hidden' : 'w-64'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Company Identity / Logo */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3 overflow-hidden">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-lg bg-orange-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Warehouse className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <span className="font-extrabold text-slate-900 tracking-tight block text-sm">e-Factura</span>
                <span className="text-[10px] text-slate-450 font-bold block tracking-wider uppercase">SELGROS Parser</span>
              </div>
            </div>
            
            {/* Desktop collapse button */}
            <button
              onClick={() => {
                setIsSidebarCollapsed(true);
                localStorage.setItem('efactura_sidebar_collapsed', 'true');
              }}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-650 transition cursor-pointer shrink-0"
              title={lang === 'RO' ? "Restrânge meniul" : "Collapse sidebar"}
            >
              <ChevronLeft className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Navigation link blocks */}
          <nav className="p-4 space-y-1 bg-white">
            
            {/* Dashboard Link */}
            {isAllowed('dashboard') && (
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  currentView === 'dashboard'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>{t.dashboard}</span>
              </button>
            )}

            {/* Registru Plăți Link (SELECTED BY DEFAULT) */}
            {isAllowed('ledger') && (
              <button
                onClick={() => setCurrentView('ledger')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  currentView === 'ledger' || currentView === 'upload'
                    ? 'bg-slate-950 text-white shadow-sm font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>{t.paymentLedger}</span>
              </button>
            )}

            {/* Istoric Prețuri Link */}
            {isAllowed('priceHistory') && (
              <button
                onClick={() => setCurrentView('priceHistory')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  currentView === 'priceHistory'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                <History className="w-4 h-4 shrink-0" />
                <span>{t.priceHistory}</span>
              </button>
            )}

            {/* Produse Link */}
            {isAllowed('products') && (
              <button
                onClick={() => setCurrentView('products')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  currentView === 'products'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                <Package className="w-4 h-4 shrink-0" />
                <span>{t.products}</span>
              </button>
            )}
                   {/* Divider */}
            {(isAllowed('dashboard') || isAllowed('ledger') || isAllowed('priceHistory') || isAllowed('products')) && (
              <div className="border-t border-slate-100 my-4" />
            )}

            {/* Financial Module - Collapsible with subitems (expanded by default in screenshot!) */}
            {(isAllowed('hotelDashboard') || isAllowed('transactions') || isAllowed('dailyData') || isAllowed('monthlyReport')) && (
              <div className="space-y-1">
                <button
                  onClick={() => setFinancialModuleExpanded(!financialModuleExpanded)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-extrabold text-slate-650 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Layers className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>{t.financialModule}</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${financialModuleExpanded ? '' : '-rotate-90'}`} />
                </button>

                {financialModuleExpanded && (
                  <div className="pl-9 space-y-1">
                    {/* Dashboard link inside Financial */}
                    {isAllowed('hotelDashboard') && (
                      <button
                        onClick={() => setCurrentView('hotelDashboard')}
                        className={`w-full text-left px-3 py-2 rounded-md text-[11px] font-bold block cursor-pointer ${
                          currentView === 'hotelDashboard' ? 'text-blue-600 bg-blue-50/50 font-extrabold' : 'text-slate-550 hover:text-slate-900'
                        }`}
                      >
                        {t.finDashboard}
                      </button>
                    )}

                    {/* Tranzactii Link */}
                    {isAllowed('transactions') && (
                      <button
                        onClick={() => setCurrentView('transactions')}
                        className={`w-full text-left px-3 py-2 rounded-md text-[11px] font-bold block cursor-pointer ${
                          currentView === 'transactions' ? 'text-blue-600 bg-blue-50/50 font-extrabold' : 'text-slate-550 hover:text-slate-900'
                        }`}
                      >
                        {t.finTransactions}
                      </button>
                    )}

                    {/* Date Zilnice Link */}
                    {isAllowed('dailyData') && (
                      <button
                        onClick={() => setCurrentView('dailyData')}
                        className={`w-full text-left px-3 py-2 rounded-md text-[11px] font-bold block cursor-pointer ${
                          currentView === 'dailyData' ? 'text-blue-600 bg-blue-50/50 font-extrabold' : 'text-slate-550 hover:text-slate-900'
                        }`}
                      >
                        {t.finDailyData}
                      </button>
                    )}

                    {/* Raport Lunar Link */}
                    {isAllowed('monthlyReport') && (
                      <button
                        onClick={() => setCurrentView('monthlyReport')}
                        className={`w-full text-left px-3 py-2 rounded-md text-[11px] font-bold block cursor-pointer ${
                          currentView === 'monthlyReport' ? 'text-blue-600 bg-blue-50/50 font-extrabold' : 'text-slate-550 hover:text-slate-900'
                        }`}
                      >
                        {t.finMonthlyReport}
                      </button>
                    )}

                    {/* Rapoarte Avansate Link */}
                    {isAllowed('financialReports') && (
                      <button
                        onClick={() => setCurrentView('financialReports')}
                        className={`w-full text-left px-3 py-2 rounded-md text-[11px] font-bold block cursor-pointer ${
                          currentView === 'financialReports' ? 'text-blue-600 bg-blue-50/50 font-extrabold' : 'text-slate-550 hover:text-slate-900'
                        }`}
                      >
                        {t.finReports}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}



            {/* System Settings Link (Moved to bottom of Navigation container) */}
            {isAllowed('settings') && (
              <div className="space-y-1 mt-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setCurrentView('settings')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    currentView === 'settings'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  }`}
                >
                  <SettingsIcon className="w-4 h-4 shrink-0" />
                  <span>{t.settingsNav}</span>
                </button>
              </div>
            )}

          </nav>
        </div>

        {/* Footer profile info (humble metrics tracker) */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black shadow-2xs text-white ${
              activeUser.role === 'Administrator' ? 'bg-indigo-600' : activeUser.role === 'Manager' ? 'bg-emerald-600' : 'bg-amber-600'
            }`}>
              {activeUser.fullName.charAt(0)}
            </div>
            <div className="leading-tight">
              <span className="font-bold text-slate-800 block text-[11px] max-w-[110px] truncate">{activeUser.fullName}</span>
              <span className={`text-[8px] px-1 py-0.2 rounded border font-black uppercase tracking-wider ${
                activeUser.role === 'Administrator' 
                  ? 'bg-indigo-50 border-indigo-150 text-indigo-700' 
                  : activeUser.role === 'Manager'
                    ? 'bg-emerald-50 border-emerald-150 text-emerald-700'
                    : 'bg-amber-50 border-amber-150 text-amber-700'
              }`}>
                {activeUser.role}
              </span>
            </div>
          </div>
          
          {/* Logout Button */}
          <button
            onClick={() => {
              setActiveUser(null);
              setCurrentView('ledger');
            }}
            title={lang === 'RO' ? 'Ieșire' : 'Log Out'}
            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition"
            aria-label={lang === 'RO' ? 'Ieșire' : 'Log Out'}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* 2. MAIN APP CONTENT CANVAS */}
      <main id="applet-main-canvas" className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top bar with quick navigation shortcuts */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 shadow-3xs select-none">
          <div className="flex items-center gap-2 md:gap-3">
            {/* Mobile hamburger button */}
            <button
               onClick={() => setIsMobileMenuOpen(true)}
               className="flex md:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-655 transition cursor-pointer"
               aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop toggle button */}
            <button
              onClick={() => {
                const nextState = !isSidebarCollapsed;
                setIsSidebarCollapsed(nextState);
                localStorage.setItem('efactura_sidebar_collapsed', String(nextState));
              }}
              className="hidden md:flex p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer items-center justify-center gap-2"
              title={isSidebarCollapsed ? (lang === 'RO' ? "Afișează Meniul" : "Show Menu") : (lang === 'RO' ? "Ascunde Meniul" : "Hide Menu")}
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
              {isSidebarCollapsed && (
                <div className="flex items-center gap-1.5 animate-fade-in">
                  <span className="p-1 rounded bg-orange-600 text-white shrink-0">
                    <Warehouse className="w-3.5 h-3.5" />
                  </span>
                  <span className="font-extrabold text-slate-900 text-xs tracking-tight">e-Factura</span>
                </div>
              )}
            </button>

            {/* Mobile logo indicator */}
            <div className="flex md:hidden items-center gap-1.5 mr-1 bg-slate-50 border border-slate-100 px-2 py-1 rounded">
              <span className="p-1 rounded bg-orange-600 text-white shrink-0">
                <Warehouse className="w-3.5 h-3.5" />
              </span>
              <span className="font-extrabold text-slate-900 text-xs tracking-tight">e-Factura</span>
            </div>


          </div>

          <div className="flex items-center gap-3">
            {/* Quick Upload action */}
            {isAllowed('upload') && (
              <button
                onClick={() => setCurrentView('upload')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] md:text-xs px-2.5 py-1.5 md:px-3.5 rounded-lg flex items-center gap-1 shadow-2xs transition active:scale-95 cursor-pointer max-w-[130px] sm:max-w-none truncate"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{lang === 'RO' ? "Încarcă e-Factură XML" : "Upload e-Invoice XML"}</span>
                <span className="sm:hidden">{lang === 'RO' ? "Încarcă XML" : "Upload XML"}</span>
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Inner views container */}
        <div id="view-canvas-contents" className="flex-1 overflow-y-auto p-6 md:p-8">
          
          {!isAllowed(currentView) ? (
            <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center space-y-6 py-12">
              <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-slate-900">
                  {lang === 'RO' ? 'Acces Refuzat' : 'Access Denied'}
                </h2>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  {lang === 'RO' 
                    ? `Profilul dumneavoastră (${activeUser.role}) nu are permisiunea de a vizualiza acest modul sau meniu.`
                    : `Your profile (${activeUser.role}) does not have the permissions required to view this module.`}
                </p>
              </div>
              <button
                onClick={() => {
                  const allowed = rolePermissions[activeUser.role] || [];
                  if (allowed.length > 0) setCurrentView(allowed[0]);
                }}
                className="bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-all cursor-pointer shadow-sm"
              >
                {lang === 'RO' ? 'Înapoi la meniul permis' : 'Back to accessible workspace'}
              </button>
            </div>
          ) : (
            <>
              {currentView === 'dashboard' && (
                <Dashboard 
                  invoices={invoices} 
                  costCenters={costCenters} 
                  onNavigate={setCurrentView} 
                  lang={lang}
                />
              )}

              {currentView === 'ledger' && (
                <PaymentLedger
                  invoices={invoices}
                  costCenters={costCenters}
                  companies={companies}
                  selectedInvoices={selectedInvoices}
                  onToggleSelect={handleToggleSelectInvoice}
                  onClearSelection={handleClearSelection}
                  onAddPayment={handleAddPayment}
                  onNavigate={setCurrentView}
                  lang={lang}
                  onToggleInvoicePayment={handleToggleInvoicePayment}
                  onDeleteInvoice={handleDeleteInvoice}
                />
              )}

              {currentView === 'upload' && (
                <InvoiceUploader
                  onAddParsedInvoice={handleAddParsedInvoice}
                  onNavigate={setCurrentView}
                  costCenters={costCenters}
                  invoices={invoices}
                  lang={lang}
                  setGlobalDate={setGlobalDate}
                />
              )}

              {currentView === 'priceHistory' && (
                <PriceHistory invoices={invoices} lang={lang} />
              )}

              {currentView === 'products' && (
                <Products invoices={invoices} lang={lang} />
              )}

              {currentView === 'settings' && (
                <Settings
                  costCenters={costCenters}
                  companies={companies}
                  onAddCostCenter={handleAddCostCenter}
                  onDeleteCostCenter={handleDeleteCostCenter}
                  onAddCompany={handleAddCompany}
                  onDeleteCompany={handleDeleteCompany}
                  onClearAllData={handleClearAllData}
                  onRestoreDemoData={handleRestoreDemoData}
                  lang={lang}
                  onToggleLanguage={setLang}
                  activeUser={activeUser}
                  rolePermissions={rolePermissions}
                  onUpdateRolePermissions={handleUpdateRolePermissions}
                  users={users}
                  onUpdateUserRole={handleUpdateUserRole}
                  onAddUser={handleAddUser}
                  onDeleteUser={handleDeleteUser}
                  bsBaseCash={bsBaseCash}
                  setBsBaseCash={setBsBaseCash}
                  bsFixedAssets={bsFixedAssets}
                  setBsFixedAssets={setBsFixedAssets}
                  bsEquitySocial={bsEquitySocial}
                  setBsEquitySocial={setBsEquitySocial}
                />
              )}

              {/* Combined state logic for Financial Module views */}
              {(currentView === 'hotelDashboard' || currentView === 'transactions' || currentView === 'dailyData' || currentView === 'monthlyReport' || currentView === 'financialReports') && (
                <FinancialModule
                  invoices={invoices}
                  transactions={transactions}
                  onAddPayment={handleAddPayment}
                  view={currentView as any}
                  operationalLogs={operationalLogs}
                  setOperationalLogs={setOperationalLogs}
                  manualTransactions={manualTransactions}
                  setManualTransactions={setManualTransactions}
                  lang={lang}
                  companies={companies}
                  costCenters={costCenters}
                  bsBaseCash={bsBaseCash}
                  bsFixedAssets={bsFixedAssets}
                  bsEquitySocial={bsEquitySocial}
                  globalDate={globalDate}
                  onToggleTransactionStatus={handleToggleTransactionStatus}
                />
              )}


            </>
          )}

        </div>
      </main>

    </div>
  );
}
