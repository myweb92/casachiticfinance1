import { pgTable, text, doublePrecision, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  number: text('number').notNull(),
  date: text('date').notNull(),
  client: text('client').notNull(),
  company: text('company').notNull(),
  costCenter: text('cost_center').notNull(),
  total: doublePrecision('total').notNull(),
  dueDate: text('due_date').notNull(),
  paid: doublePrecision('paid').notNull(),
  rest: doublePrecision('rest').notNull(),
  paymentDate: text('payment_date'),
  status: text('status').notNull(), // 'paid' | 'partial' | 'unpaid'
  products: jsonb('products').notNull() // ProductItem[]
});

export const paymentTransactions = pgTable('payment_transactions', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id').notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  date: text('date').notNull(),
  amount: doublePrecision('amount').notNull(),
  method: text('method').notNull(), // 'Bank Transfer' | 'Cash' | 'Card' | 'Chitanță'
  reference: text('reference').notNull()
});

export const costCenters = pgTable('cost_centers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  budget: doublePrecision('budget').notNull()
});

export const companies = pgTable('companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  cui: text('cui').notNull(),
  address: text('address').notNull()
});

export const operationalLogs = pgTable('operational_logs', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  occupiedRooms: integer('occupied_rooms').notNull(),
  totalRooms: integer('total_rooms').notNull(),
  touristsCount: integer('tourists_count').notNull(),
  overnights: integer('overnights').notNull(),
  dailyRevenue: doublePrecision('daily_revenue').notNull(),
  otaPercentage: doublePrecision('ota_percentage').notNull(),
  directPercentage: doublePrecision('direct_percentage').notNull(),
  targetRevenue: doublePrecision('target_revenue').notNull(),
  budgetExpenses: doublePrecision('budget_expenses').notNull(),
  note: text('note').notNull()
});

export const manualTransactions = pgTable('manual_transactions', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'Venit' | 'Cheltuiala'
  date: text('date').notNull(),
  category: text('category').notNull(),
  partner: text('partner').notNull(),
  description: text('description').notNull(),
  amount: doublePrecision('amount').notNull(),
  paymentMethod: text('payment_method').notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  note: text('note').notNull(),
  company: text('company'),
  costCenter: text('cost_center'),
  status: text('status') // 'paid' | 'unpaid'
});

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  taskType: text('task_type').notNull(), // 'Recurring' | 'Scheduled'
  recurrencePattern: text('recurrence_pattern'), // 'Daily' | 'Weekly'
  assignedUserId: text('assigned_user_id').notNull(),
  dueDate: text('due_date').notNull(),
  dueTime: text('due_time').notNull(),
  status: text('status').notNull(), // 'Pending' | 'In Progress' | 'Completed' | 'Overdue'
  department: text('department')
});

export const completions = pgTable('completions', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull(),
  completedBy: text('completed_by').notNull(),
  completionTime: text('completion_time').notNull(),
  notes: text('notes').notNull(),
  photoUrl: text('photo_url')
});

export const recurringTemplates = pgTable('recurring_templates', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  taskType: text('task_type').notNull(),
  recurrencePattern: text('recurrence_pattern'),
  assignedUserId: text('assigned_user_id').notNull(),
  dueTime: text('due_time').notNull(),
  department: text('department')
});

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  timestamp: text('timestamp').notNull(),
  read: boolean('read').notNull(),
  type: text('type').notNull()
});

export const automationLogs = pgTable('automation_logs', {
  id: text('id').primaryKey(),
  timestamp: text('timestamp').notNull(),
  countGenerated: integer('count_generated').notNull(),
  dateGeneratedFor: text('date_generated_for').notNull(),
  log: text('log').notNull()
});

export const users = pgTable('users', {
  username: text('username').primaryKey(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull() // UserRole
});

export const rolePermissions = pgTable('role_permissions', {
  role: text('role').primaryKey(),
  permissions: jsonb('permissions').notNull() // string[]
});

export const config = pgTable('config', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull()
});
