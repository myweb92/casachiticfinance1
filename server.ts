import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { db } from './src/db/index.ts';
import { 
  invoices, 
  paymentTransactions, 
  costCenters, 
  companies, 
  operationalLogs, 
  manualTransactions, 
  tasks, 
  completions, 
  recurringTemplates, 
  notifications, 
  automationLogs, 
  users, 
  rolePermissions, 
  config 
} from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

// Load environment variables
dotenv.config();

// Define static seed data for PostgreSQL
const initialCostCenters = [
  { id: 'cc1', name: 'Restaurant Nord', code: 'RN-01', budget: 15000 },
  { id: 'cc2', name: 'Bucătărie Centrală', code: 'BC-02', budget: 35000 },
  { id: 'cc3', name: 'Catering Sud', code: 'CS-03', budget: 12000 },
  { id: 'cc4', name: 'Bar & Lounge', code: 'BL-04', budget: 8000 },
];

const initialCompanies = [
  { id: 'comp1', name: 'Beta Catering SRL', cui: 'RO38291032', address: 'Bulevardul Pipera nr. 1B, Voluntari, Ilfov' },
  { id: 'comp2', name: 'Selgros Cash & Carry SRL', cui: 'RO11938221', address: 'Calea București nr. 231, Brașov' },
  { id: 'comp3', name: 'CCB Hotels Management SRL', cui: 'RO41029381', address: 'Aleea Trandafirilor nr. 5, Sector 1, București' },
];

const initialUsersList = [
  { username: '5minsudha@gmail.com', fullName: 'Sudha', role: 'Administrator' },
  { username: 'manager@hotel.com', fullName: 'Radu Crețu', role: 'Manager' },
  { username: 'ops@hotel.com', fullName: 'Mircea Sandu', role: 'Operational Manager' },
  { username: 'staff@hotel.com', fullName: 'Elena Popescu', role: 'Staff' }
];

const defaultRolePermissions = {
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

async function seedDatabase() {
  console.log('Checking database seed status...');
  try {
    // 1. Cost Centers
    const ccCount = await db.select().from(costCenters).limit(1);
    if (ccCount.length === 0) {
      console.log('Seeding cost centers...');
      await db.insert(costCenters).values(initialCostCenters);
    }

    // 2. Companies
    const compCount = await db.select().from(companies).limit(1);
    if (compCount.length === 0) {
      console.log('Seeding companies...');
      await db.insert(companies).values(initialCompanies);
    }

    // 3. Users
    const userCount = await db.select().from(users).limit(1);
    if (userCount.length === 0) {
      console.log('Seeding users...');
      await db.insert(users).values(initialUsersList);
    }

    // 4. Role Permissions
    const permCount = await db.select().from(rolePermissions).limit(1);
    if (permCount.length === 0) {
      console.log('Seeding role permissions...');
      for (const [role, permissions] of Object.entries(defaultRolePermissions)) {
        await db.insert(rolePermissions).values({ role, permissions });
      }
    }

    // 5. Config Balance Sheet
    const bsConfig = await db.select().from(config).where(eq(config.key, 'balanceSheet'));
    if (bsConfig.length === 0) {
      console.log('Seeding balance sheet config...');
      await db.insert(config).values({
        key: 'balanceSheet',
        value: {
          bsBaseCash: 185000,
          bsFixedAssets: 1450000,
          bsEquitySocial: 1400000
        }
      });
    }

    console.log('Database seeding checks completed successfully!');
  } catch (error) {
    console.error('Database seeding failed (database might still be starting):', error);
  }
}

// Create Gemini Client safely on the server side using lazy initialization
// Note: User-Agent set to 'aistudio-build' as required by instructions
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required but was not provided.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Helper function to call Gemini with retries and fallback models
async function callGeminiWithRetryAndFallback(aiClient: any, documentPart: any, promptPart: any, invoiceSchema: any) {
  const modelsToTry = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    let attempt = 0;
    const maxRetries = 2; // Retry twice per model
    const baseDelayMs = 1000;

    console.log(`Attempting visual parsing using model: ${modelName}`);

    while (attempt < maxRetries) {
      try {
        const response = await aiClient.models.generateContent({
          model: modelName,
          contents: [documentPart, promptPart],
          config: {
            responseMimeType: 'application/json',
            responseSchema: invoiceSchema,
            systemInstruction: 'You are an intelligent administrative scanner. You parse images of physical invoices or digital receipts and extract structures accurately.',
            temperature: 0.1
          }
        });
        return response; // Success! Return response immediately
      } catch (err: any) {
        attempt++;
        lastError = err;
        const errMessage = err.message || String(err);
        const errStatus = err.status || (err.error && err.error.code);
        
        console.warn(`[${modelName}] Attempt ${attempt}/${maxRetries} failed: ${errMessage}`);

        // Detect if it is a quota limits exhaustion error (e.g., daily free tier limit)
        const isQuotaExceeded = 
          errMessage.includes('RESOURCE_EXHAUSTED') || 
          errMessage.includes('Quota exceeded') ||
          errMessage.includes('quota') ||
          errStatus === 429;

        if (isQuotaExceeded) {
          console.log(`Quota exceeded for ${modelName}. Skipping retries for this model and attempting fallback model...`);
          break;
        }

        // Check if the error is a transient one (503, etc.)
        const isTransient = 
          errStatus === 503 || 
          errMessage.includes('503') || 
          errMessage.includes('UNAVAILABLE') || 
          errMessage.includes('high demand') ||
          errMessage.includes('temporary') ||
          errMessage.includes('overloaded');

        if (isTransient && attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1);
          console.log(`Transient error detected on ${modelName}. Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          // Break out of retry loop for this model and try next model if it's not a transient or if we exhausted retries
          break;
        }
      }
    }
  }

  // If we reach here, both models failed
  throw lastError;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trigger database seeding on start
  await seedDatabase();

  // Support JSON and large payloads for base64 image scanning
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Route - Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // --- Invoices API ---
  app.get('/api/invoices', async (req, res) => {
    try {
      const list = await db.select().from(invoices);
      res.json(list);
    } catch (err: any) {
      console.error('Fetch invoices error:', err);
      res.status(500).json({ error: 'Failed to fetch invoices', details: err.message });
    }
  });

  app.post('/api/invoices', async (req, res) => {
    try {
      const data = req.body;
      if (!data.id) {
        res.status(400).json({ error: 'Missing invoice id' });
        return;
      }
      await db.insert(invoices).values(data).onConflictDoUpdate({
        target: invoices.id,
        set: data
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error('Save invoice error:', err);
      res.status(500).json({ error: 'Failed to save invoice', details: err.message });
    }
  });

  app.delete('/api/invoices/:id', async (req, res) => {
    try {
      await db.delete(invoices).where(eq(invoices.id, req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('Delete invoice error:', err);
      res.status(500).json({ error: 'Failed to delete invoice', details: err.message });
    }
  });

  // --- Transactions (PaymentTransactions) API ---
  app.get('/api/transactions', async (req, res) => {
    try {
      const list = await db.select().from(paymentTransactions);
      res.json(list);
    } catch (err: any) {
      console.error('Fetch transactions error:', err);
      res.status(500).json({ error: 'Failed to fetch transactions', details: err.message });
    }
  });

  app.post('/api/transactions', async (req, res) => {
    try {
      const data = req.body;
      if (!data.id) {
        res.status(400).json({ error: 'Missing transaction id' });
        return;
      }
      await db.insert(paymentTransactions).values(data).onConflictDoUpdate({
        target: paymentTransactions.id,
        set: data
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error('Save transaction error:', err);
      res.status(500).json({ error: 'Failed to save transaction', details: err.message });
    }
  });

  app.delete('/api/transactions/:id', async (req, res) => {
    try {
      await db.delete(paymentTransactions).where(eq(paymentTransactions.id, req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('Delete transaction error:', err);
      res.status(500).json({ error: 'Failed to delete transaction', details: err.message });
    }
  });

  // --- CostCenters API ---
  app.get('/api/costCenters', async (req, res) => {
    try {
      const list = await db.select().from(costCenters);
      res.json(list);
    } catch (err: any) {
      console.error('Fetch costCenters error:', err);
      res.status(500).json({ error: 'Failed to fetch cost centers', details: err.message });
    }
  });

  app.post('/api/costCenters', async (req, res) => {
    try {
      const data = req.body;
      if (!data.id) {
        res.status(400).json({ error: 'Missing cost center id' });
        return;
      }
      await db.insert(costCenters).values(data).onConflictDoUpdate({
        target: costCenters.id,
        set: data
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error('Save costCenter error:', err);
      res.status(500).json({ error: 'Failed to save cost center', details: err.message });
    }
  });

  app.delete('/api/costCenters/:id', async (req, res) => {
    try {
      await db.delete(costCenters).where(eq(costCenters.id, req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('Delete costCenter error:', err);
      res.status(500).json({ error: 'Failed to delete cost center', details: err.message });
    }
  });

  // --- Companies API ---
  app.get('/api/companies', async (req, res) => {
    try {
      const list = await db.select().from(companies);
      res.json(list);
    } catch (err: any) {
      console.error('Fetch companies error:', err);
      res.status(500).json({ error: 'Failed to fetch companies', details: err.message });
    }
  });

  app.post('/api/companies', async (req, res) => {
    try {
      const data = req.body;
      if (!data.id) {
        res.status(400).json({ error: 'Missing company id' });
        return;
      }
      await db.insert(companies).values(data).onConflictDoUpdate({
        target: companies.id,
        set: data
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error('Save company error:', err);
      res.status(500).json({ error: 'Failed to save company', details: err.message });
    }
  });

  app.delete('/api/companies/:id', async (req, res) => {
    try {
      await db.delete(companies).where(eq(companies.id, req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('Delete company error:', err);
      res.status(500).json({ error: 'Failed to delete company', details: err.message });
    }
  });

  // --- OperationalLogs API ---
  app.get('/api/operationalLogs', async (req, res) => {
    try {
      const list = await db.select().from(operationalLogs);
      res.json(list);
    } catch (err: any) {
      console.error('Fetch operationalLogs error:', err);
      res.status(500).json({ error: 'Failed to fetch operational logs', details: err.message });
    }
  });

  app.post('/api/operationalLogs', async (req, res) => {
    try {
      const data = req.body;
      if (!data.id) {
        res.status(400).json({ error: 'Missing operational log id' });
        return;
      }
      await db.insert(operationalLogs).values(data).onConflictDoUpdate({
        target: operationalLogs.id,
        set: data
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error('Save operationalLog error:', err);
      res.status(500).json({ error: 'Failed to save operational log', details: err.message });
    }
  });

  app.delete('/api/operationalLogs/:id', async (req, res) => {
    try {
      await db.delete(operationalLogs).where(eq(operationalLogs.id, req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('Delete operationalLog error:', err);
      res.status(500).json({ error: 'Failed to delete operational log', details: err.message });
    }
  });

  // --- ManualTransactions API ---
  app.get('/api/manualTransactions', async (req, res) => {
    try {
      const list = await db.select().from(manualTransactions);
      res.json(list);
    } catch (err: any) {
      console.error('Fetch manualTransactions error:', err);
      res.status(500).json({ error: 'Failed to fetch manual transactions', details: err.message });
    }
  });

  app.post('/api/manualTransactions', async (req, res) => {
    try {
      const data = req.body;
      if (!data.id) {
        res.status(400).json({ error: 'Missing transaction id' });
        return;
      }
      await db.insert(manualTransactions).values(data).onConflictDoUpdate({
        target: manualTransactions.id,
        set: data
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error('Save manualTransaction error:', err);
      res.status(500).json({ error: 'Failed to save manual transaction', details: err.message });
    }
  });

  app.delete('/api/manualTransactions/:id', async (req, res) => {
    try {
      await db.delete(manualTransactions).where(eq(manualTransactions.id, req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('Delete manualTransaction error:', err);
      res.status(500).json({ error: 'Failed to delete manual transaction', details: err.message });
    }
  });

  // --- Tasks API ---
  app.get('/api/tasks', async (req, res) => {
    try {
      const list = await db.select().from(tasks);
      res.json(list);
    } catch (err: any) {
      console.error('Fetch tasks error:', err);
      res.status(500).json({ error: 'Failed to fetch tasks', details: err.message });
    }
  });

  app.post('/api/tasks', async (req, res) => {
    try {
      const data = req.body;
      if (!data.id) {
        res.status(400).json({ error: 'Missing task id' });
        return;
      }
      await db.insert(tasks).values(data).onConflictDoUpdate({
        target: tasks.id,
        set: data
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error('Save task error:', err);
      res.status(500).json({ error: 'Failed to save task', details: err.message });
    }
  });

  app.delete('/api/tasks/:id', async (req, res) => {
    try {
      await db.delete(tasks).where(eq(tasks.id, req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('Delete task error:', err);
      res.status(500).json({ error: 'Failed to delete task', details: err.message });
    }
  });

  // --- Completions API ---
  app.get('/api/completions', async (req, res) => {
    try {
      const list = await db.select().from(completions);
      res.json(list);
    } catch (err: any) {
      console.error('Fetch completions error:', err);
      res.status(500).json({ error: 'Failed to fetch completions', details: err.message });
    }
  });

  app.post('/api/completions', async (req, res) => {
    try {
      const data = req.body;
      if (!data.id) {
        res.status(400).json({ error: 'Missing completion id' });
        return;
      }
      await db.insert(completions).values(data).onConflictDoUpdate({
        target: completions.id,
        set: data
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error('Save completion error:', err);
      res.status(500).json({ error: 'Failed to save completion', details: err.message });
    }
  });

  app.delete('/api/completions/:id', async (req, res) => {
    try {
      await db.delete(completions).where(eq(completions.id, req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('Delete completion error:', err);
      res.status(500).json({ error: 'Failed to delete completion', details: err.message });
    }
  });

  // --- RecurringTemplates API ---
  app.get('/api/recurringTemplates', async (req, res) => {
    try {
      const list = await db.select().from(recurringTemplates);
      res.json(list);
    } catch (err: any) {
      console.error('Fetch recurringTemplates error:', err);
      res.status(500).json({ error: 'Failed to fetch recurring templates', details: err.message });
    }
  });

  app.post('/api/recurringTemplates', async (req, res) => {
    try {
      const data = req.body;
      if (!data.id) {
        res.status(400).json({ error: 'Missing template id' });
        return;
      }
      await db.insert(recurringTemplates).values(data).onConflictDoUpdate({
        target: recurringTemplates.id,
        set: data
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error('Save template error:', err);
      res.status(500).json({ error: 'Failed to save template', details: err.message });
    }
  });

  app.delete('/api/recurringTemplates/:id', async (req, res) => {
    try {
      await db.delete(recurringTemplates).where(eq(recurringTemplates.id, req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('Delete template error:', err);
      res.status(500).json({ error: 'Failed to delete template', details: err.message });
    }
  });

  // --- Notifications API ---
  app.get('/api/notifications', async (req, res) => {
    try {
      const list = await db.select().from(notifications);
      res.json(list);
    } catch (err: any) {
      console.error('Fetch notifications error:', err);
      res.status(500).json({ error: 'Failed to fetch notifications', details: err.message });
    }
  });

  app.post('/api/notifications', async (req, res) => {
    try {
      const data = req.body;
      if (!data.id) {
        res.status(400).json({ error: 'Missing notification id' });
        return;
      }
      await db.insert(notifications).values(data).onConflictDoUpdate({
        target: notifications.id,
        set: data
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error('Save notification error:', err);
      res.status(500).json({ error: 'Failed to save notification', details: err.message });
    }
  });

  app.delete('/api/notifications/:id', async (req, res) => {
    try {
      await db.delete(notifications).where(eq(notifications.id, req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('Delete notification error:', err);
      res.status(500).json({ error: 'Failed to delete notification', details: err.message });
    }
  });

  // --- AutomationLogs API ---
  app.get('/api/automationLogs', async (req, res) => {
    try {
      const list = await db.select().from(automationLogs);
      res.json(list);
    } catch (err: any) {
      console.error('Fetch automationLogs error:', err);
      res.status(500).json({ error: 'Failed to fetch automation logs', details: err.message });
    }
  });

  app.post('/api/automationLogs', async (req, res) => {
    try {
      const data = req.body;
      if (!data.id) {
        res.status(400).json({ error: 'Missing log id' });
        return;
      }
      await db.insert(automationLogs).values(data).onConflictDoUpdate({
        target: automationLogs.id,
        set: data
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error('Save log error:', err);
      res.status(500).json({ error: 'Failed to save automation log', details: err.message });
    }
  });

  app.delete('/api/automationLogs/:id', async (req, res) => {
    try {
      await db.delete(automationLogs).where(eq(automationLogs.id, req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('Delete log error:', err);
      res.status(500).json({ error: 'Failed to delete automation log', details: err.message });
    }
  });

  // --- Users API ---
  app.get('/api/users', async (req, res) => {
    try {
      const list = await db.select().from(users);
      res.json(list);
    } catch (err: any) {
      console.error('Fetch users error:', err);
      res.status(500).json({ error: 'Failed to fetch users', details: err.message });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      const data = req.body;
      if (!data.username) {
        res.status(400).json({ error: 'Missing username' });
        return;
      }
      await db.insert(users).values(data).onConflictDoUpdate({
        target: users.username,
        set: data
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error('Save user error:', err);
      res.status(500).json({ error: 'Failed to save user', details: err.message });
    }
  });

  app.delete('/api/users/:username', async (req, res) => {
    try {
      await db.delete(users).where(eq(users.username, req.params.username.toLowerCase()));
      res.json({ success: true });
    } catch (err: any) {
      console.error('Delete user error:', err);
      res.status(500).json({ error: 'Failed to delete user', details: err.message });
    }
  });

  // --- RolePermissions API ---
  app.get('/api/rolePermissions', async (req, res) => {
    try {
      const list = await db.select().from(rolePermissions);
      // Format as role -> list of permissions
      const formatted: any = {};
      list.forEach((row) => {
        formatted[row.role] = row.permissions;
      });
      res.json(formatted);
    } catch (err: any) {
      console.error('Fetch rolePermissions error:', err);
      res.status(500).json({ error: 'Failed to fetch role permissions', details: err.message });
    }
  });

  app.post('/api/rolePermissions', async (req, res) => {
    try {
      const { role, permissions } = req.body;
      if (!role || !permissions) {
        res.status(400).json({ error: 'Missing role or permissions' });
        return;
      }
      await db.insert(rolePermissions).values({ role, permissions }).onConflictDoUpdate({
        target: rolePermissions.role,
        set: { permissions }
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error('Save rolePermissions error:', err);
      res.status(500).json({ error: 'Failed to save role permissions', details: err.message });
    }
  });

  // --- Config API ---
  app.get('/api/config/balanceSheet', async (req, res) => {
    try {
      const rows = await db.select().from(config).where(eq(config.key, 'balanceSheet'));
      if (rows.length > 0) {
        res.json(rows[0].value);
      } else {
        res.json({ bsBaseCash: 185000, bsFixedAssets: 1450000, bsEquitySocial: 1400000 });
      }
    } catch (err: any) {
      console.error('Fetch config error:', err);
      res.status(500).json({ error: 'Failed to fetch config', details: err.message });
    }
  });

  app.post('/api/config/balanceSheet', async (req, res) => {
    try {
      const data = req.body;
      // Get current value
      const existing = await db.select().from(config).where(eq(config.key, 'balanceSheet'));
      const base = existing.length > 0 ? (existing[0].value as any) : {};
      const newValue = { ...base, ...data };
      
      await db.insert(config).values({
        key: 'balanceSheet',
        value: newValue
      }).onConflictDoUpdate({
        target: config.key,
        set: { value: newValue }
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error('Save config error:', err);
      res.status(500).json({ error: 'Failed to save config', details: err.message });
    }
  });

  // API Route - Intelligent Gemini Document Parser Proxy
  app.post('/api/parse-invoice', async (req, res) => {
    try {
      const { fileName, mimeType, fileData } = req.body;

      if (!fileData) {
        res.status(400).json({ error: 'Missing fileData (base64) parameter.' });
        return;
      }

      // Check if API key is present
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
        res.status(400).json({ 
          error: 'Missing GEMINI_API_KEY', 
          details: 'Cheia API pentru Gemini nu este configurată în Secrets.' 
        });
        return;
      }

      console.log(`Parsing document '${fileName}' of type '${mimeType}' via Gemini AI...`);

      // Instruction to Gemini on how to extract and map fields
      const prompt = `Interpret and extract the core financial invoice values from this document or invoice image/text. 
Return the output structured precisely according to the requested JSON schema.
If products have specific item/article codes (e.g., SKU or numerical codes from Selgros, Metro, or e-Factura), extract them. If not present, assign a mock/serial numerical code.
Parse quantities, unit prices, unit types (e.g. BUC, KG, BAX), VAT percentages (always output numbers like 19, 9, 5, 0), and total line prices.
Always output numerical amounts as decimal numbers.`;

      // Define strict JSON Schema for output consistency, saving parsing errors
      const invoiceSchema = {
        type: Type.OBJECT,
        properties: {
          number: {
            type: Type.STRING,
            description: "The unique invoice number, e.g., '50R0017238' or similar ID. Do not include labels like 'Nr.'"
          },
          date: {
            type: Type.STRING,
            description: "The invoice execution or issue date formatted in Romanian style 'DD/MM/YYYY'. Example: '13/03/2026'"
          },
          client: {
            type: Type.STRING,
            description: "The customer buying name, e.g., 'CCB HOTELS' or buyer organization"
          },
          company: {
            type: Type.STRING,
            description: "The supplier selling name, e.g., 'Selgros Cash & Carry SRL' or 'Beta Catering SRL'"
          },
          total: {
            type: Type.NUMBER,
            description: "The absolute total invoice amount due/paid in RON. Example: 1222.08"
          },
          dueDate: {
            type: Type.STRING,
            description: "The payment due/limit date formatted in 'DD/MM/YYYY'. Example: '23/03/2026'"
          },
          products: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                code: {
                  type: Type.STRING,
                  description: "The unique numerical SKU/article code. E.g. '4820102'"
                },
                name: {
                  type: Type.STRING,
                  description: "The clean products/commodities description"
                },
                quantity: {
                  type: Type.NUMBER,
                  description: "Units purchased (always numeric)"
                },
                unit: {
                  type: Type.STRING,
                  description: "Unit type: 'KG', 'BUC', 'BAX', etc."
                },
                unitPrice: {
                  type: Type.NUMBER,
                  description: "Gross or Net average unit price"
                },
                vat: {
                  type: Type.NUMBER,
                  description: "The VAT rate applied, e.g., 19 or 9 or 5 without percent symbol (always numeric)"
                },
                totalPrice: {
                  type: Type.NUMBER,
                  description: "The final line total including VAT. Example: 300.84"
                }
              },
              required: ["code", "name", "quantity", "unit", "unitPrice", "vat", "totalPrice"]
            }
          }
        },
        required: ["number", "date", "client", "company", "total", "dueDate", "products"]
      };

      // Call generation Content with base64 embedded part
      const documentPart = {
        inlineData: {
          mimeType,
          data: fileData
        }
      };

      const promptPart = {
        text: prompt
      };

      // Call newest @google/genai SDK with retry and fallback mechanics
      const aiClientInstance = getGeminiClient();
      const response = await callGeminiWithRetryAndFallback(aiClientInstance, documentPart, promptPart, invoiceSchema);

      const extractedText = response.text;
      if (!extractedText) {
        throw new Error('S-a înregistrat o eroare la interpretarea vizuală a documentului. Textul extras este nul.');
      }

      const parsedInvoice = JSON.parse(extractedText.trim());
      console.log(`Extracted invoice successfully: #${parsedInvoice.number}`);

      res.json({ invoice: parsedInvoice });
    } catch (err: any) {
      console.error('Gemini extraction error:', err);
      const errMessage = err.message || String(err);
      const isHighDemand = errMessage.includes('high demand') || errMessage.includes('503') || errMessage.includes('UNAVAILABLE') || errMessage.includes('overloaded');
      const isQuotaExceeded = errMessage.includes('429') || errMessage.includes('RESOURCE_EXHAUSTED') || errMessage.includes('quota') || errMessage.includes('Quota exceeded');
      
      let details = errMessage;
      if (isHighDemand) {
        details = 'Modelul AI de la Google (Gemini) întâmpină un volum extrem de mare de solicitări în acest moment. Vă rugăm să reîncercați peste câteva secunde sau să încărcați documentul din nou.';
      } else if (isQuotaExceeded) {
        details = 'S-a atins limita de utilizare a cheii de test preconfigurate (Quota Exceeded). Pentru a continua scanarea documentelor fără restricții, vă rugăm să adăugați propria cheie API Gemini în meniul Settings (Setări) > Secrets (Secrete) al aplicației (din colțul din dreapta-sus) sau să reîncercați mai târziu.';
      }

      res.status(500).json({ 
        error: 'Eroare la interpretarea cu AI', 
        details: details
      });
    }
  });

  // Integration with Vite Dev/Prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted for local UI Hot-Module reloading.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log(`Static file server initiated pointing to dist folder.`);
  }

  // Bind correctly using 0.0.0.0 as mandated by guidelines
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running successfully on port ${PORT} binding 0.0.0.0 (prod-compatible)`);
  });
}

startServer();
