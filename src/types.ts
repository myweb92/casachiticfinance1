export interface ProductItem {
  code: string;      // SKU / Article Code from Selgros, e.g. "9382103"
  name: string;      // Product name
  quantity: number;  // Quantity purchased
  unit: string;      // KG, BUC, BAX, etc.
  unitPrice: number; // Price per unit
  vat: number;       // VAT % (e.g., 9, 19, 5)
  totalPrice: number; // Total price including VAT
}

export interface Invoice {
  id: string;
  number: string;      // Nr. Factura, e.g. "50R0017238"
  date: string;        // DD/MM/YYYY
  client: string;      // Buyer name, e.g. "CCB HOTELS"
  company: string;     // Supplier / Supplier company, e.g. "Beta Catering SRL"
  costCenter: string;  // Cost Center, e.g. "Restaurant Nord"
  total: number;       // Total plata
  dueDate: string;     // Scadenta (DD/MM/YYYY)
  paid: number;        // Amount paid so far
  rest: number;        // Remaining balance
  paymentDate: string | null; // Date of payout
  status: 'paid' | 'partial' | 'unpaid';
  products: ProductItem[];
}

export interface PaymentTransaction {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  date: string;        // DD/MM/YYYY
  amount: number;
  method: 'Bank Transfer' | 'Cash' | 'Card' | 'Chitanță';
  reference: string;   // Reference info, OP number, etc.
}

export interface CostCenter {
  id: string;
  name: string;
  code: string;
  budget: number;
}

export interface Company {
  id: string;
  name: string;
  cui: string;
  address: string;
}

export interface PriceHistoryPoint {
  date: string;
  unitPrice: number;
  invoiceNumber: string;
}

export interface ProductPriceHistory {
  code: string;
  name: string;
  history: PriceHistoryPoint[];
}

export interface OperationalLog {
  id: string;
  date: string; // DD.MM.YYYY
  occupiedRooms: number;
  totalRooms: number;
  touristsCount: number;
  overnights: number;
  dailyRevenue: number;
  otaPercentage: number;
  directPercentage: number;
  targetRevenue: number;
  budgetExpenses: number;
  note: string;
}

export interface FinancialTransaction {
  id: string;
  type: 'Venit' | 'Cheltuiala';
  date: string; // YYYY-MM-DD or DD.MM.YYYY
  category: string;
  partner: string; // Furnizor / Beneficiar
  description: string;
  amount: number;
  paymentMethod: string;
  invoiceNumber: string;
  note: string;
  company?: string;
  costCenter?: string;
  status?: 'paid' | 'unpaid';
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'Manager' | 'Operational Manager' | 'Staff';
}

export interface AppTask {
  id: string;
  title: string;
  description: string;
  taskType: 'Recurring' | 'Scheduled';
  recurrencePattern?: 'Daily' | 'Weekly';
  assignedUserId: string; // email of the staff member
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // "HH:MM"
  status: 'Pending' | 'In Progress' | 'Completed' | 'Overdue';
  department?: string; // e.g., Housekeeping, F&B, Maintenance, Front Desk
}

export interface AppTaskCompletion {
  id: string;
  taskId: string;
  completedBy: string;
  completionTime: string;
  notes: string;
  photoUrl?: string;
}

export interface HotelTask {
  id: string;
  description: string;
  scheduleType: 'Daily' | 'Weekly' | 'Monthly' | 'Specific Date';
  specificDate?: string; // YYYY-MM-DD
  dueTime: string; // e.g. "09:00"
  department: string; // e.g. "Cleaning", "Food", "Maintenance", "Administration"
  priority: 'Normal' | 'High' | 'Low';
  assignedTo: string;
  assignedPhone?: string;
  managerPhone?: string;
  company?: string;
  costCenter?: string;
}

export interface HotelTaskCompletion {
  id: string; // "taskId-date" key
  taskId: string;
  date: string; // YYYY-MM-DD or DD.MM.YYYY
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

export type UserRole = 'Administrator' | 'Manager' | 'Operational Manager' | 'Staff';

export type Language = 'RO' | 'EN';

export interface UserProfile {
  username: string;
  role: UserRole;
  fullName: string;
}

export interface RolePermissions {
  Administrator: string[];
  Manager: string[];
  'Operational Manager'?: string[];
  Staff: string[];
}


