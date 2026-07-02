import React, { useState } from 'react';
import { CostCenter, Company, Language, UserProfile, RolePermissions, UserRole } from '../types';
import { translations } from '../translations';
import { 
  Landmark, 
  Building2, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle, 
  RefreshCw, 
  Database, 
  Lock, 
  Globe,
  Settings as SettingsIcon,
  Check,
  ShieldAlert,
  Users,
  UserPlus
} from 'lucide-react';
import { motion } from 'motion/react';

interface SettingsProps {
  costCenters: CostCenter[];
  companies: Company[];
  onAddCostCenter: (cc: CostCenter) => void;
  onDeleteCostCenter: (id: string) => void;
  onAddCompany: (comp: Company) => void;
  onDeleteCompany: (id: string) => void;
  onClearAllData: () => void;
  onRestoreDemoData: () => void;
  
  // New localization props
  lang: Language;
  onToggleLanguage: (l: Language) => void;

  // New RBAC props
  activeUser: UserProfile | null;
  rolePermissions: RolePermissions;
  onUpdateRolePermissions: (pm: RolePermissions) => void;

  // User role assignment directory props
  users: UserProfile[];
  onUpdateUserRole: (username: string, newRole: UserRole) => void;
  onAddUser: (user: UserProfile) => void;
  onDeleteUser: (username: string) => void;

  // Dynamic balance sheet values
  bsBaseCash?: number;
  setBsBaseCash?: (v: number) => void;
  bsFixedAssets?: number;
  setBsFixedAssets?: (v: number) => void;
  bsEquitySocial?: number;
  setBsEquitySocial?: (v: number) => void;
}

export default function Settings({
  costCenters,
  companies,
  onAddCostCenter,
  onDeleteCostCenter,
  onAddCompany,
  onDeleteCompany,
  onClearAllData,
  onRestoreDemoData,
  
  lang,
  onToggleLanguage,
  activeUser,
  rolePermissions,
  onUpdateRolePermissions,
  users,
  onUpdateUserRole,
  onAddUser,
  onDeleteUser,
  bsBaseCash = 185000,
  setBsBaseCash,
  bsFixedAssets = 1450000,
  setBsFixedAssets,
  bsEquitySocial = 1400000,
  setBsEquitySocial
}: SettingsProps) {
  const t = translations[lang];

  // Cost centers form
  const [ccName, setCcName] = useState('');
  
  // Custom confirmation state to avoid window.confirm (blocked/unsafe in iframe sandboxes)
  const [confirmDeleteUsername, setConfirmDeleteUsername] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [ccCode, setCcCode] = useState('');
  const [ccBudget, setCcBudget] = useState('');

  // Companies form
  const [compName, setCompName] = useState('');
  const [compCui, setCompCui] = useState('');
  const [compAddr, setCompAddr] = useState('');

  // User Registry form
  const [newUName, setNewUName] = useState('');
  const [newUFulName, setNewUFulName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Staff');

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUName || !newUFulName) return;
    onAddUser({
      username: newUName.trim().toLowerCase(),
      fullName: newUFulName.trim(),
      role: newUserRole
    });
    setNewUName('');
    setNewUFulName('');
    setNewUserRole('Staff');
  };

  const handleCCSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ccName || !ccCode) return;
    onAddCostCenter({
      id: `cc-${Date.now()}`,
      name: ccName,
      code: ccCode,
      budget: ccBudget ? parseFloat(ccBudget) : 0
    });
    setCcName('');
    setCcCode('');
    setCcBudget('');
  };

  const handleCompSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName || !compCui) return;
    onAddCompany({
      id: `comp-${Date.now()}`,
      name: compName,
      cui: compCui,
      address: compAddr
    });
    setCompName('');
    setCompCui('');
    setCompAddr('');
  };

  // List of all customizable module views
  const modulesList: { id: string; nameRO: string; nameEN: string; category: string }[] = [
    { id: 'dashboard', nameRO: 'Executive Dashboard / Rezumat', nameEN: 'Executive Dashboard', category: 'Core' },
    { id: 'ledger', nameRO: 'Registru Plăți Invoices', nameEN: 'Payment Ledger', category: 'Core' },
    { id: 'upload', nameRO: 'Uploader e-Factură XML', nameEN: 'XML Parser Uploader', category: 'Core' },
    { id: 'priceHistory', nameRO: 'Istoric Prețuri Selgros', nameEN: 'Price History Tracker', category: 'Core' },
    { id: 'products', nameRO: 'Produse & Articole', nameEN: 'Invoiced Items Library', category: 'Core' },
    { id: 'hotelDashboard', nameRO: 'Dashboard Financiar Hotel', nameEN: 'Hotel Finance Summary', category: 'Financial' },
    { id: 'transactions', nameRO: 'Registru Tranzacții Cash Flow', nameEN: 'Cash Flow Register', category: 'Financial' },
    { id: 'dailyData', nameRO: 'Input Date Zilnice Grad Ocupare', nameEN: 'Daily Occupancy Entry', category: 'Financial' },
    { id: 'monthlyReport', nameRO: 'Raport Lunar Financiar (Printabil)', nameEN: 'Printable Monthly Report', category: 'Financial' },
    { id: 'settings', nameRO: 'Setări Sistem & Firme & RBAC', nameEN: 'General Settings & Permissions', category: 'Admin' }
  ];

  const handlePermissionToggle = (role: UserRole, moduleId: string) => {
    if (activeUser?.role !== 'Administrator') {
      alert(lang === 'RO' ? "Doar utilizatorii cu rol de Administrator pot edita permisiunile de acces!" : "Only users with the Administrator role can modify access permissions!");
      return;
    }

    const currentRolePerms = [...rolePermissions[role]];
    const updatedPerms = currentRolePerms.includes(moduleId)
      ? currentRolePerms.filter(id => id !== moduleId)
      : [...currentRolePerms, moduleId];

    onUpdateRolePermissions({
      ...rolePermissions,
      [role]: updatedPerms
    });
  };

  const isRowChecked = (role: UserRole, moduleId: string) => {
    return rolePermissions[role]?.includes(moduleId) || false;
  };

  return (
    <div id="settings-module" className="space-y-6">
      
      {/* Title & Lang toggle header card */}
      <div className="bg-white border border-slate-150 p-6 rounded-xl shadow-3xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 id="settings-headline" className="text-2xl font-black tracking-tight text-slate-900 font-sans">
            {t.settingsTitle}
          </h1>
          <p id="settings-caption" className="text-xs text-slate-500 mt-1 font-medium">
            {t.settingsDesc}
          </p>
        </div>

        {/* Global Language Selector (Inline layout) */}
        <div className="bg-slate-100 p-1 rounded-lg inline-flex items-center gap-1 select-none border">
          <button
            onClick={() => onToggleLanguage('RO')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              lang === 'RO' ? 'bg-white text-slate-900 shadow-3xs font-black' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            RO - Română
          </button>
          <button
            onClick={() => onToggleLanguage('EN')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              lang === 'EN' ? 'bg-white text-slate-900 shadow-3xs font-black' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            EN - English
          </button>
        </div>
      </div>


      {/* ACCOUNT & COVENANT BASELINE VALUES */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-lg">
            <Landmark className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase">
              {lang === 'RO' ? "Configurare Valori de Bilanț (Active & Pasive)" : "Configure Balance Sheet Values (Assets, Liability & Equity)"}
            </h3>
            <span className="text-xs text-slate-400 block -mt-0.5">
              {lang === 'RO' 
                ? "Editați disponibilitățile bănești de pornire, mijloacele fixe și capitalul social pentru rapoartele financiare."
                : "Edit starting cash baseline accounts, tangible fixed assets, and social capital for active financial models."}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          {/* Cash and Equivalents */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-600 font-bold block bg-white">
              {lang === 'RO' ? "Disponibilități Bănești (Numerar & Conturi) - Bază" : "Cash and Equivalents Base Value (RON)"}
            </label>
            <div className="relative">
              <input
                type="number"
                value={bsBaseCash}
                onChange={(e) => setBsBaseCash && setBsBaseCash(parseFloat(e.target.value) || 0)}
                className="bg-slate-50 border rounded-lg p-2.5 pl-3 pr-12 w-full focus:bg-white focus:outline-none font-mono text-xs font-bold text-slate-800"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">RON</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              {lang === 'RO' ? "Depozite bancare și numerar inițiale contolabile folosite în calculele P&L/Flux de numerar." : "Initial cash deposits and reserve accounts of the hospitality entity."}
            </p>
          </div>

          {/* Fixed Assets */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-600 font-bold block bg-white">
              {lang === 'RO' ? "Mijloace Fixe, Clădiri & Amenajări (Active Imobilizate)" : "Tangible Fixed Assets Value (RON)"}
            </label>
            <div className="relative">
              <input
                type="number"
                value={bsFixedAssets}
                onChange={(e) => setBsFixedAssets && setBsFixedAssets(parseFloat(e.target.value) || 0)}
                className="bg-slate-50 border rounded-lg p-2.5 pl-3 pr-12 w-full focus:bg-white focus:outline-none font-mono text-xs font-bold text-slate-800"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">RON</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              {lang === 'RO' ? "Valoarea contabilă de inventar a clădirilor, hotelului, terenurilor sau echipamentelor active." : "Total net book value of physical properties, structures, and appliances."}
            </p>
          </div>

          {/* Share Capital */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-600 font-bold block bg-white">
              {lang === 'RO' ? "Capital Social Înregistrat (Pasive / Capitaluri)" : "Registered Share Capital (RON)"}
            </label>
            <div className="relative">
              <input
                type="number"
                value={bsEquitySocial}
                onChange={(e) => setBsEquitySocial && setBsEquitySocial(parseFloat(e.target.value) || 0)}
                className="bg-slate-50 border rounded-lg p-2.5 pl-3 pr-12 w-full focus:bg-white focus:outline-none font-mono text-xs font-bold text-slate-800"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">RON</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              {lang === 'RO' ? "Aportul inițial al asociaților înregistrat la Registrul Comerțului (Capital propriu)." : "Total legal equity capital introduced by company equity holders."}
            </p>
          </div>
        </div>
      </div>

      {/* USER DIRECTORY & ROLE ASSIGNMENT SECTION */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-50 border border-indigo-150 p-2 rounded-lg">
              <Users className="w-5 h-5 text-indigo-600 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase">
                {lang === 'RO' ? "Alocare Roluri & Director Utilizatori" : "User Role Assignment & Registry"}
              </h3>
              <span className="text-xs text-slate-400 block -mt-0.5">
                {lang === 'RO' 
                  ? "Gestionați profilurile de acces, schimbați rolurile personalului autentificat sau înregistrați conturi noi."
                  : "Manage access profiles, change localized staff roles of active users, or pre-register employee accounts."}
              </span>
            </div>
          </div>
        </div>

        {activeUser?.role !== 'Administrator' && (
          <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3.5 flex items-start gap-2.5 text-xs text-amber-850 leading-relaxed font-semibold">
            <ShieldAlert className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              {lang === 'RO' 
                ? `Sunteți autentificat ca "${activeUser?.fullName}" (${activeUser?.role}). Doar utilizatorii cu drept de Administrator pot edita, șterge sau atribui roluri noi celorlalți colegi.`
                : `You are connected as "${activeUser?.fullName}" (${activeUser?.role}). Only Administrators are permitted to assign alternative roles or remove user accounts.`}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-1">
          {/* User Directory List Panel (2/3 width) */}
          <div className="lg:col-span-2 space-y-3">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-2">
              {lang === 'RO' ? "Utilizatori Înregistrați în Sistem" : "Registered Cloud Workspace Users"}
            </span>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-slate-50/20 max-h-96 overflow-y-auto">
              {users.map((u) => {
                const isSelf = u.username.toLowerCase() === activeUser?.username.toLowerCase();
                const isPrimaryAdmin = u.username.toLowerCase() === '5minsudha@gmail.com';
                
                return (
                  <div key={u.username} className="p-4 hover:bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition">
                    <div className="flex items-center gap-3">
                      {/* Avatar Initials Badge */}
                      <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center font-bold text-xs text-white uppercase shrink-0 ${
                        u.role === 'Administrator' ? 'bg-indigo-600' : u.role === 'Manager' ? 'bg-emerald-600' : 'bg-slate-500'
                      }`}>
                        {u.fullName.charAt(0) || 'U'}
                      </div>
                      
                      <div className="leading-tight">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-slate-900">{u.fullName}</span>
                          {isSelf && (
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 rounded-md font-extrabold border border-indigo-100 font-sans uppercase">
                              {lang === 'RO' ? "Tu (Activ)" : "You (Active)"}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block font-mono bg-slate-100/50 px-1 py-0.2 rounded mt-0.5 w-fit">{u.username}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {/* Assign Role selector */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">
                          {lang === 'RO' ? "Rol:" : "Role:"}
                        </span>
                        <select
                          value={u.role}
                          disabled={activeUser?.role !== 'Administrator' || isPrimaryAdmin}
                          onChange={(e) => onUpdateUserRole(u.username, e.target.value as UserRole)}
                          className="bg-white border border-slate-250 rounded-lg p-1.5 focus:border-slate-400 focus:ring-0 text-xs font-bold text-slate-800 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                          <option value="Administrator">Administrator</option>
                          <option value="Manager">Manager</option>
                          <option value="Staff">Staff</option>
                        </select>
                      </div>

                      {/* Delete user button */}
                      {confirmDeleteUsername === u.username ? (
                        <div className="flex items-center gap-1.5 animate-fade-in mr-2 duration-150 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteUser(u.username);
                              setConfirmDeleteUsername(null);
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-md transition cursor-pointer uppercase shrink-0"
                          >
                            {lang === 'RO' ? "Șterge" : "Delete"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteUsername(null)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-[10px] px-2.5 py-1.5 rounded-md transition cursor-pointer uppercase shrink-0"
                          >
                            {lang === 'RO' ? "Anulează" : "Cancel"}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={activeUser?.role !== 'Administrator' || isSelf || isPrimaryAdmin}
                          onClick={() => setConfirmDeleteUsername(u.username)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition disabled:opacity-20 disabled:hover:bg-transparent duration-150 cursor-pointer shrink-0"
                          title={lang === 'RO' ? "Șterge Utilizator" : "Delete User"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* New User Pre-Registration Form Panel (1/3 width) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <UserPlus className="w-4 h-4 text-indigo-500" />
              <span className="font-extrabold text-slate-850 uppercase tracking-wide text-xs">
                {lang === 'RO' ? "Înregistrează Cont Nou" : "Pre-Register Employee"}
              </span>
            </div>

            <form onSubmit={handleUserSubmit} className="space-y-3.5 text-xs text-slate-650">
              {/* Full Name Input */}
              <div className="space-y-1">
                <label className="text-slate-500 font-bold block bg-transparent">
                  {lang === 'RO' ? "Nume angajat" : "Employee Full Name"}
                </label>
                <input
                  type="text"
                  required
                  value={newUFulName}
                  disabled={activeUser?.role !== 'Administrator'}
                  onChange={(e) => setNewUFulName(e.target.value)}
                  placeholder="Ex: Elena Pop"
                  className="bg-white border rounded-lg p-2 w-full focus:bg-white focus:outline-none placeholder-slate-400 font-medium text-slate-800 disabled:opacity-50"
                />
              </div>

              {/* Email/Username Input */}
              <div className="space-y-1">
                <label className="text-slate-500 font-bold block bg-transparent">
                  {lang === 'RO' ? "Adresă e-mail" : "Email Address"}
                </label>
                <input
                  type="email"
                  required
                  value={newUName}
                  disabled={activeUser?.role !== 'Administrator'}
                  onChange={(e) => setNewUName(e.target.value)}
                  placeholder="Ex: elena@hotel.com"
                  className="bg-white border rounded-lg p-2 w-full focus:bg-white focus:outline-none placeholder-slate-400 font-medium text-slate-800 disabled:opacity-50"
                />
              </div>

              {/* Default Role Select */}
              <div className="space-y-1">
                <label className="text-slate-500 font-bold block bg-transparent">
                  {lang === 'RO' ? "Rol implicit" : "Initial Assigned Role"}
                </label>
                <select
                  value={newUserRole}
                  disabled={activeUser?.role !== 'Administrator'}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="bg-white border rounded-lg p-2 w-full focus:outline-none cursor-pointer font-bold text-slate-800 disabled:opacity-50"
                >
                  <option value="Administrator">Administrator</option>
                  <option value="Manager">Manager</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={activeUser?.role !== 'Administrator'}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2 rounded-lg flex items-center justify-center gap-1 transition shadow-sm cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                <Plus className="w-4 h-4" />
                {lang === 'RO' ? "Creează Profil" : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      </div>


      {/* ROLE-BASED ACCESS CONTROL (RBAC) ACCESS SETTINGS */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-50 border border-indigo-100 p-2 rounded-lg">
            <Lock className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase">
              {t.rbacTitle}
            </h3>
            <span className="text-xs text-slate-400 block -mt-0.5">
              {t.rbacDesc}
            </span>
          </div>
        </div>

        {activeUser?.role !== 'Administrator' && (
          <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3.5 flex items-start gap-2.5 text-xs text-amber-800 leading-relaxed font-semibold">
            <ShieldAlert className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              {lang === 'RO' 
                ? `Sunteți autentificat ca "${activeUser?.fullName}" (${activeUser?.role}). Doar Administratorii au permisiunea de a modifica matricea de drepturi de acces.`
                : `You are logged in as "${activeUser?.fullName}" (${activeUser?.role}). Only Administrators are permitted to customize the Role-Based security matrix.`
              }
            </div>
          </div>
        )}

        {/* Access control matrix table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b text-[10px] font-black uppercase tracking-wider text-slate-400 font-sans">
                  <th className="p-3">Module Info / Modul</th>
                  <th className="p-3 text-center border-l bg-slate-50 font-sans">Administrator</th>
                  <th className="p-3 text-center border-l bg-slate-50 font-sans font-normal">Manager</th>
                  <th className="p-3 text-center border-l bg-slate-50 font-sans">Staff / Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {modulesList.map(mod => (
                  <tr key={mod.id} className="hover:bg-slate-50/40">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">
                        {lang === 'RO' ? mod.nameRO : mod.nameEN}
                      </div>
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-bold uppercase tracking-wide">
                        {mod.category}
                      </span>
                    </td>

                    {/* ADMIN checkbox */}
                    <td className="p-3 text-center border-l bg-slate-50/10">
                      <input
                        type="checkbox"
                        checked={isRowChecked('Administrator', mod.id)}
                        disabled={activeUser?.role !== 'Administrator'}
                        onChange={() => handlePermissionToggle('Administrator', mod.id)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition cursor-pointer disabled:opacity-50"
                        aria-label={`Permisiune admin pentru ${lang === 'RO' ? mod.nameRO : mod.nameEN}`}
                      />
                    </td>

                    {/* MANAGER checkbox */}
                    <td className="p-3 text-center border-l bg-slate-50/10">
                      <input
                        type="checkbox"
                        checked={isRowChecked('Manager', mod.id)}
                        disabled={activeUser?.role !== 'Administrator'}
                        onChange={() => handlePermissionToggle('Manager', mod.id)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition cursor-pointer disabled:opacity-50"
                        aria-label={`Permisiune manager pentru ${lang === 'RO' ? mod.nameRO : mod.nameEN}`}
                      />
                    </td>

                    {/* STAFF checkbox */}
                    <td className="p-3 text-center border-l bg-slate-50/10">
                      <input
                        type="checkbox"
                        checked={isRowChecked('Staff', mod.id)}
                        disabled={activeUser?.role !== 'Administrator'}
                        onChange={() => handlePermissionToggle('Staff', mod.id)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition cursor-pointer disabled:opacity-50"
                        aria-label={`Permisiune staff pentru ${lang === 'RO' ? mod.nameRO : mod.nameEN}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>


      {/* TWO COLUMNS FOR COST CENTERS & COMPANIES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* COST CENTERS MANAGER */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-150 p-5 rounded-xl shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 uppercase tracking-wider">
              <Landmark className="w-5 h-5 text-purple-600 animate-pulse" />
              {t.costCentersTitle}
            </h3>

            {/* List of current CCs */}
            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto border border-slate-150 rounded-xl text-xs text-slate-700">
              {costCenters.map(cc => (
                <div key={cc.id} className="p-3 hover:bg-slate-50 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{cc.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">Cod: {cc.code} • Buget lunar: {cc.budget.toLocaleString('ro-RO')} RON</p>
                  </div>
                  {/* Keep first mock center protected */}
                  {cc.id !== 'cc1' ? (
                    <button
                      onClick={() => onDeleteCostCenter(cc.id)}
                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-full transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded border">{t.deleteProtect}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Form to insert CC */}
            <form onSubmit={handleCCSubmit} className="space-y-3 pt-2 text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">{t.costCentersSub}</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block bg-white">{t.ccNameLabel}</label>
                  <input
                    type="text"
                    value={ccName}
                    onChange={(e) => setCcName(e.target.value)}
                    placeholder="Ex: Departament IT"
                    className="bg-slate-50 border rounded-lg p-2 w-full focus:bg-white focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block bg-white">{t.ccCodeLabel}</label>
                  <input
                    type="text"
                    value={ccCode}
                    onChange={(e) => setCcCode(e.target.value)}
                    placeholder="Ex: RN-05"
                    className="bg-slate-50 border rounded-lg p-2 w-full focus:bg-white focus:outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold block bg-white">{t.ccBudgetLabel}</label>
                <input
                  type="number"
                  value={ccBudget}
                  onChange={(e) => setCcBudget(e.target.value)}
                  placeholder="Ex: 20000"
                  className="bg-slate-50 border rounded-lg p-2 w-full focus:bg-white focus:outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2 rounded-lg flex items-center justify-center gap-1 transition shadow-sm cursor-pointer active:scale-98"
              >
                <Plus className="w-4 h-4" /> {t.addBtn}
              </button>
            </form>
          </div>
        </div>

        {/* COMPANIES MANAGER */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-150 p-5 rounded-xl shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 uppercase tracking-wider">
              <Building2 className="w-5 h-5 text-blue-600" />
              {t.companiesTitle}
            </h3>

            {/* List of current companies */}
            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto border border-slate-150 rounded-xl text-xs text-slate-700">
              {companies.map(comp => (
                <div key={comp.id} className="p-3 hover:bg-slate-50 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{comp.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">CUI: {comp.cui} • Adresă: {comp.address || 'Nespecificată'}</p>
                  </div>
                  {comp.id !== 'comp1' ? (
                    <button
                      onClick={() => onDeleteCompany(comp.id)}
                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-full transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded border">{t.deleteProtect}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Form to insert company */}
            <form onSubmit={handleCompSubmit} className="space-y-3 pt-2 text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">{t.companiesSub}</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block bg-white">{t.compNameLabel}</label>
                  <input
                    type="text"
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    placeholder="Ex: CCB HOTELS"
                    className="bg-slate-50 border rounded-lg p-2 w-full focus:bg-white focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block bg-white">{t.compCuiLabel}</label>
                  <input
                    type="text"
                    value={compCui}
                    onChange={(e) => setCompCui(e.target.value)}
                    placeholder="Ex: RO43219032"
                    className="bg-slate-50 border rounded-lg p-2 w-full focus:bg-white focus:outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold block bg-white">{t.compAddrLabel}</label>
                <input
                  type="text"
                  value={compAddr}
                  onChange={(e) => setCompAddr(e.target.value)}
                  placeholder="Ex: Strada Florilor, Nr. 12, Cluj-Napoca"
                  className="bg-slate-50 border rounded-lg p-2 w-full focus:bg-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2 rounded-lg flex items-center justify-center gap-1 transition shadow-sm cursor-pointer active:scale-98"
              >
                <Plus className="w-4 h-4" /> {t.addBtn}
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* DATABASE MAINTENANCE block to clear all test data */}
      <div className="bg-white border border-slate-150 p-6 rounded-xl shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
            {t.dbControl}
          </h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed -mt-1 font-medium">
          {t.dbControlSub}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          {showClearConfirm ? (
            <div className="flex-1 bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-center justify-between gap-3 animate-fade-in w-full">
              <span className="text-xs font-bold text-rose-800">
                {lang === 'RO' ? "Sigur ștergeți TOATE datele din sistem?" : "Wipe ALL application databases?"}
              </span>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onClearAllData();
                    setShowClearConfirm(false);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-3 py-1.5 rounded-md transition cursor-pointer"
                >
                  {lang === 'RO' ? "Șterge definitiv" : "Confirm Wipe"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs px-3 py-1.5 rounded-md transition cursor-pointer"
                >
                  {lang === 'RO' ? "Anulează" : "Cancel"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold py-2.5 px-4 rounded-lg border border-rose-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              {t.clearAllData}
            </button>
          )}
          
          <button
            type="button"
            onClick={() => {
              onRestoreDemoData();
              alert(lang === 'RO' ? "Setul de date demonstrative implicit a fost restaurat cu succes!" : "Default demonstration data has been re-loaded into system!");
            }}
            className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-lg border border-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-slate-500 shrink-0" />
            {t.restoreData}
          </button>
        </div>
      </div>

      {/* Compliance / info box */}
      <div className="bg-slate-50 border border-slate-150 p-5 rounded-xl flex items-start gap-3 text-xs text-slate-500 font-medium">
        <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <span className="font-bold text-slate-800 block">RO e-Factura / ANAF Secure Sandbox</span>
          <p className="leading-relaxed">
            {lang === 'RO' 
              ? "Sistemul funcționează de sine stătător offline, respectând integral standardele UBL ANAF."
              : "The system runs standalone offline, in full compliance with localized ANAF xml standard parsing pipelines."}
          </p>
        </div>
      </div>
    </div>
  );
}
