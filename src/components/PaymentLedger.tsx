import React, { useState } from 'react';
import { Invoice, CostCenter, Company, Language } from '../types';
import { translations } from '../translations';
import { Search, RotateCcw, ArrowRightLeft, FileCheck2, Calendar, CreditCard, ShoppingCart, Info, X, Check, ArrowRight, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PaymentLedgerProps {
  invoices: Invoice[];
  costCenters: CostCenter[];
  companies: Company[];
  selectedInvoices: string[];
  onToggleSelect: (id: string) => void;
  onClearSelection: () => void;
  onAddPayment: (invoiceId: string, amount: number, method: string, ref: string) => void;
  onNavigate: (view: string) => void;
  lang?: Language;
  onToggleInvoicePayment?: (invoiceId: string, newStatus: 'paid' | 'unpaid') => void;
  onDeleteInvoice?: (invoiceId: string) => void;
}

export default function PaymentLedger({
  invoices,
  costCenters,
  companies,
  selectedInvoices,
  onToggleSelect,
  onClearSelection,
  onAddPayment,
  onNavigate,
  lang = 'RO',
  onToggleInvoicePayment,
  onDeleteInvoice
}: PaymentLedgerProps) {
  const t = translations[lang];
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedCostCenter, setSelectedCostCenter] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  // Drawer / Details modal state
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Bank Transfer' | 'Cash' | 'Card' | 'Chitanță'>('Bank Transfer');
  const [paymentRef, setPaymentRef] = useState('');

  // Quick Popup Payment state
  const [quickPaymentInvoice, setQuickPaymentInvoice] = useState<Invoice | null>(null);
  const [quickPaymentAmount, setQuickPaymentAmount] = useState('');
  const [quickPaymentMethod, setQuickPaymentMethod] = useState<'Bank Transfer' | 'Cash' | 'Card' | 'Chitanță'>('Bank Transfer');
  const [quickPaymentRef, setQuickPaymentRef] = useState('');
  
  // Compare state
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [invoiceIdToConfirmDelete, setInvoiceIdToConfirmDelete] = useState<string | null>(null);

  // Quick payment submit
  const handleQuickPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPaymentInvoice || !quickPaymentAmount) return;
    const numericAmount = parseFloat(quickPaymentAmount);
    if (isNaN(numericAmount) || numericAmount <= 0 || numericAmount > quickPaymentInvoice.rest) {
      alert(`Vă rugăm să introduceți o sumă validă (maximum ${quickPaymentInvoice.rest} RON).`);
      return;
    }
    onAddPayment(quickPaymentInvoice.id, numericAmount, quickPaymentMethod, quickPaymentRef || `OP-${Math.floor(100000 + Math.random() * 900055)}`);
    setQuickPaymentInvoice(null);
    setQuickPaymentAmount('');
    setQuickPaymentRef('');
  };

  // Helper to parse DD/MM/YYYY dates
  const parseDateDDMMYYYY = (dateStr: string): Date => {
    const parts = dateStr.trim().split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date();
  };

  // Overdue check
  const isInvoiceOverdue = (inv: Invoice): boolean => {
    if (inv.status === 'paid' || inv.rest <= 0) return false;
    if (!inv.dueDate || inv.dueDate === '—' || inv.dueDate === '-') return false;
    
    // Parse DD/MM/YYYY
    const parts = inv.dueDate.trim().split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const dueObj = new Date(year, month, day);
      dueObj.setHours(23, 59, 59, 999);
      
      return dueObj < new Date();
    }
    return false;
  };

  // Filter application
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.number.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          inv.client.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCompany = selectedCompany === 'all' || inv.company === selectedCompany;
    const matchesCostCenter = selectedCostCenter === 'all' || inv.costCenter === selectedCostCenter;
    
    let matchesStatus = true;
    if (selectedStatus !== 'all') {
      matchesStatus = inv.status === selectedStatus;
    }

    return matchesSearch && matchesCompany && matchesCostCenter && matchesStatus;
  });

  // Calculate outstanding rest of only shown / filtered invoices
  const totalRestAmount = filteredInvoices.reduce((sum, inv) => sum + inv.rest, 0);

  // Selected invoices objects
  const selectedInvoiceObjects = invoices.filter(inv => selectedInvoices.includes(inv.number));

  // Companies unique
  const uniqueCompanies = Array.from(new Set(invoices.map(i => i.company)));
  // Cost centers unique
  const uniqueCostCenters = Array.from(new Set(invoices.map(i => i.costCenter)));

  // Perform reset of filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCompany('all');
    setSelectedCostCenter('all');
    setSelectedStatus('all');
  };

  // Submit payment from drawer
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingInvoice || !paymentAmount) return;
    const numericAmount = parseFloat(paymentAmount);
    if (isNaN(numericAmount) || numericAmount <= 0 || numericAmount > viewingInvoice.rest) {
      alert(`Vă rugăm să introduceți o sumă validă (maximum ${viewingInvoice.rest} RON).`);
      return;
    }
    onAddPayment(viewingInvoice.id, numericAmount, paymentMethod, paymentRef || `OP-${Math.floor(100000 + Math.random() * 900000)}`);
    
    // update current drawer viewing object with new balances
    const updatedInvoice = {
      ...viewingInvoice,
      paid: viewingInvoice.paid + numericAmount,
      rest: viewingInvoice.rest - numericAmount,
      status: (viewingInvoice.paid + numericAmount) >= viewingInvoice.total ? 'paid' as const : 'partial' as const
    };
    setViewingInvoice(updatedInvoice);
    setPaymentAmount('');
    setPaymentRef('');
  };

  return (
    <div id="payment-ledger-wrapper" className="space-y-6">
      {/* Upper header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 id="ledger-title" className="text-3xl font-bold tracking-tight text-slate-950 flex items-center gap-2">
            Registru Plăți / Payment Ledger
          </h1>
          <p id="ledger-subtitle" className="text-slate-550 mt-1">
            Gestionează facturile, plățile și centrele de cost
          </p>
        </div>

        {/* Dynamic Nav buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="tab-facturi"
            onClick={() => handleResetFilters()}
            className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-800 shadow-xs hover:border-slate-350 hover:bg-slate-50 transition-all"
          >
            <FileCheck2 className="w-4 h-4 text-slate-600" />
            Facturi & Plăți
          </button>
          <button
            id="tab-upload"
            onClick={() => onNavigate('products')}
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-700 transition-all"
          >
            <ShoppingCart className="w-4 h-4 text-slate-500" />
            Vezi Produse
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div id="filters-layout" className="bg-white border border-slate-150 p-4 rounded-xl shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              id="search-invoice-input"
              type="text"
              placeholder="Caută factură, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-xs focus:bg-white focus:border-slate-400 focus:outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Company dropdown */}
          <div>
            <select
              id="filter-company-select"
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-700 focus:bg-white focus:border-slate-400 focus:outline-none transition-all"
            >
              <option value="all">Toate companiile</option>
              {uniqueCompanies.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Cost Center Dropdown */}
          <div>
            <select
              id="filter-cc-select"
              value={selectedCostCenter}
              onChange={(e) => setSelectedCostCenter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-700 focus:bg-white focus:border-slate-400 focus:outline-none transition-all"
            >
              <option value="all">Toate centrele</option>
              {uniqueCostCenters.map((cc, i) => (
                <option key={i} value={cc}>{cc}</option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex gap-2">
            <select
              id="filter-status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-700 focus:bg-white focus:border-slate-400 focus:outline-none transition-all"
            >
              <option value="all">Toate statusurile</option>
              <option value="paid">Plătită complet</option>
              <option value="partial">Plătită parțial</option>
              <option value="unpaid">Neachitată</option>
            </select>

            {/* Compare 2 Button */}
            <button
              id="compare-btn"
              disabled={selectedInvoices.length !== 2}
              onClick={() => setShowCompareModal(true)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedInvoices.length === 2
                  ? 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-xs'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              Compară {selectedInvoices.length}
            </button>
          </div>
        </div>

        {/* Reset filters line */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <button
            id="reset-selection-btn"
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            Reset selecție
          </button>
        </div>
      </div>

      {/* Summary totals line */}
      <div id="totals-summary-legend" className="flex items-center gap-4 text-xs">
        <span className="text-slate-500 font-medium">{filteredInvoices.length} facturi afișate</span>
        <span className="text-red-600 font-bold">
          Rest de plată: {totalRestAmount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
        </span>
      </div>

      {/* BLUE SELECTED PILL BOX (directly mimics screenshot style!) */}
      <AnimatePresence>
        {selectedInvoices.length > 0 && (
          <motion.div
            id="selected-pills-bar"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-blue-50/70 border border-blue-150 p-3 rounded-lg flex flex-wrap items-center gap-2"
          >
            <span className="text-xs font-semibold text-blue-800 mr-2">Selectate:</span>
            {selectedInvoices.map((invNum) => (
              <span
                key={invNum}
                className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-900 px-2.5 py-1 rounded-md text-xs font-mono font-bold shadow-2xs"
              >
                {invNum}
                <button
                  onClick={() => onToggleSelect(invNum)}
                  className="hover:bg-slate-100 p-0.5 rounded-full text-blue-500 hover:text-blue-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              onClick={onClearSelection}
              className="text-xs text-blue-600 hover:text-blue-800 underline font-medium ml-auto"
            >
              Anulează selecția
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PRIMARY LEDGER TABLE */}
      <div id="ledger-table-container" className="bg-white border border-slate-150 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={filteredInvoices.length > 0 && filteredInvoices.every(inv => selectedInvoices.includes(inv.number))}
                    onChange={() => {
                      const allCurrentSelected = filteredInvoices.every(inv => selectedInvoices.includes(inv.number));
                      filteredInvoices.forEach(inv => {
                        if (allCurrentSelected) {
                          // deselect if already selected
                          if (selectedInvoices.includes(inv.number)) onToggleSelect(inv.number);
                        } else {
                          // select if not selected
                          if (!selectedInvoices.includes(inv.number)) onToggleSelect(inv.number);
                        }
                      });
                    }}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4"
                  />
                </th>
                <th className="p-4 text-slate-600 font-semibold font-sans">Nr. Factură</th>
                <th className="p-4 text-slate-600 font-semibold font-sans">Data</th>
                <th className="p-4 text-slate-600 font-semibold font-sans">Client</th>
                <th className="p-4 text-slate-600 font-semibold font-sans">Companie</th>
                <th className="p-4 text-slate-600 font-semibold font-sans">Centru cost</th>
                <th className="p-4 text-right text-slate-600 font-semibold font-sans">Total plată</th>
                <th className="p-4 text-slate-600 font-semibold font-sans">Scadență</th>
                <th className="p-4 text-right text-slate-600 font-semibold font-sans">Plătit</th>
                <th className="p-4 text-right text-rose-600 font-bold font-sans">Rest</th>
                <th className="p-4 text-slate-600 font-semibold font-sans">Data plății</th>
                <th className="p-4 text-center text-slate-600 font-semibold font-sans">Status</th>
                <th className="p-4 text-center text-slate-600 font-semibold font-sans">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => {
                  const isSelected = selectedInvoices.includes(invoice.number);
                  const isOverdue = isInvoiceOverdue(invoice);
                  return (
                    <tr
                      key={invoice.id}
                      className={`hover:bg-slate-150 transition-colors ${
                        isSelected 
                          ? 'bg-blue-50/30 font-semibold' 
                          : isOverdue 
                            ? 'bg-rose-50/40 hover:bg-rose-50/60 border-l-2 border-l-rose-500' 
                            : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelect(invoice.number)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4 cursor-pointer"
                        />
                      </td>

                      {/* Number */}
                      <td className="p-4 font-bold font-mono">
                        <button
                          onClick={() => setViewingInvoice(invoice)}
                          className="hover:underline hover:text-blue-600 text-left focus:outline-none flex items-center gap-1.5"
                        >
                          {invoice.number}
                          <Info className="w-3.5 h-3.5 text-slate-400 inline" />
                        </button>
                      </td>

                      {/* Date */}
                      <td className="p-4 text-slate-500 font-mono">{invoice.date}</td>

                      {/* Client */}
                      <td className="p-4 font-semibold text-slate-800">
                        {invoice.company === 'Selgros Cash & Carry SRL' || invoice.company === 'SELGROS CASH & CARRY SRL' ? 'S.C. Selgros' : invoice.company}
                      </td>

                      {/* Company */}
                      <td className="p-4 text-slate-500">
                        {invoice.client === 'CCB HOTELS' ? 'CCB' : invoice.client}
                      </td>

                      {/* Cost Center */}
                      <td className="p-4">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-sm font-medium">
                          {invoice.costCenter}
                        </span>
                      </td>

                      {/* Total plată */}
                      <td className="p-4 text-right font-bold font-mono text-slate-900">
                        {invoice.total.toFixed(2)}
                      </td>

                      {/* Scadenta */}
                      <td className="p-4 font-mono">
                        <div className="flex flex-col">
                          <span className={`font-semibold ${isOverdue ? 'text-rose-700' : 'text-slate-500'}`}>
                            {invoice.number === '2635006010112204' ? '—' : invoice.dueDate}
                          </span>
                          {isOverdue && (
                            <span className="text-[10px] text-rose-700 font-bold bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded mt-1 inline-flex items-center gap-1 w-max shadow-2xs">
                              <span className="w-1.5 h-1.5 bg-rose-600 rounded-full animate-pulse" />
                              Depășită (RESTANȚĂ)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Plătit */}
                      <td className="p-4 text-right font-bold font-mono text-emerald-600">
                        {invoice.paid.toFixed(2)}
                      </td>

                      {/* Rest */}
                      <td className="p-4 text-right font-bold font-mono text-rose-600">
                        {invoice.rest.toFixed(2)}
                      </td>

                      {/* Data plătii */}
                      <td className="p-4 text-slate-500 font-mono">
                        {invoice.paymentDate || '—'}
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          invoice.status === 'paid' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : invoice.status === 'partial'
                              ? 'bg-amber-50 text-amber-700 border border-amber-250 animate-pulse'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            invoice.status === 'paid' 
                              ? 'bg-emerald-500' 
                              : invoice.status === 'partial'
                                ? 'bg-amber-500 animate-ping'
                                : 'bg-rose-500'
                          }`}></span>
                          {invoice.status === 'paid' 
                            ? (lang === 'RO' ? 'PLĂTIT' : 'PAID') 
                            : invoice.status === 'partial'
                              ? (lang === 'RO' ? 'PARȚIAL' : 'PARTIAL')
                              : (lang === 'RO' ? 'NEACHITAT' : 'UNPAID')
                          }
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {onToggleInvoicePayment ? (
                            <button
                              id={`pay-toggle-${invoice.id}`}
                              onClick={() => {
                                if (invoice.status === 'paid') {
                                  onToggleInvoicePayment(invoice.id, 'unpaid');
                                } else {
                                  setQuickPaymentInvoice(invoice);
                                  setQuickPaymentAmount(invoice.rest.toString());
                                  setQuickPaymentMethod('Bank Transfer');
                                  setQuickPaymentRef('');
                                }
                              }}
                              className={`p-1 px-2.5 rounded-md transition-all text-2xs font-extrabold inline-flex items-center gap-1 cursor-pointer border ${
                                invoice.status === 'paid'
                                  ? 'bg-slate-50 text-amber-600 border-amber-200 hover:bg-amber-50'
                                  : 'bg-emerald-600 text-white border-transparent hover:bg-emerald-505 shadow-3xs hover:shadow-2xs'
                              }`}
                              title={invoice.status === 'paid' 
                                ? (lang === 'RO' ? 'Marchează ca Neachitată' : 'Mark as Unpaid') 
                                : (lang === 'RO' ? 'Marchează ca Plătită' : 'Mark as Paid')
                              }
                            >
                              <Check className="w-3 h-3" />
                              <span>
                                {invoice.status === 'paid' 
                                  ? (lang === 'RO' ? 'Revocă' : 'Unpay') 
                                  : (lang === 'RO' ? 'Plătește' : 'Pay')
                                }
                              </span>
                            </button>
                          ) : null}

                          {onDeleteInvoice && (
                            <div className="inline-flex items-center gap-1.5">
                              {invoiceIdToConfirmDelete === invoice.id ? (
                                <div className="flex items-center gap-1 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 animate-fade-in">
                                  <span className="text-rose-700 text-3xs font-extrabold px-1">
                                    {lang === 'RO' ? 'Sigur?' : 'Sure?'}
                                  </span>
                                  <button
                                    id={`confirm-delete-${invoice.id}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteInvoice(invoice.id);
                                      setInvoiceIdToConfirmDelete(null);
                                    }}
                                    className="p-1 px-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white transition-all text-3xs font-black inline-flex items-center cursor-pointer shadow-3xs"
                                    title={lang === 'RO' ? 'Da, Șterge' : 'Yes, Delete'}
                                  >
                                    {lang === 'RO' ? 'Da' : 'Yes'}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInvoiceIdToConfirmDelete(null);
                                    }}
                                    className="p-1 px-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all text-3xs font-semibold inline-flex items-center cursor-pointer border border-slate-200"
                                    title={lang === 'RO' ? 'Anulează' : 'Cancel'}
                                  >
                                    {lang === 'RO' ? 'Nu' : 'No'}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  id={`delete-invoice-${invoice.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInvoiceIdToConfirmDelete(invoice.id);
                                  }}
                                  className="p-1 px-2 rounded-md bg-white border border-rose-250 text-rose-600 hover:bg-rose-50 hover:border-rose-350 transition-all text-2xs font-bold inline-flex items-center gap-1 cursor-pointer"
                                  title={lang === 'RO' ? 'Șterge Factură' : 'Delete Invoice'}
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>{lang === 'RO' ? 'Șterge' : 'Delete'}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-400 italic">
                    Nu s-au găsit facturi conform filtrelor selectate.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* COMPARISON MODAL FOR "Compară 2" */}
      <AnimatePresence>
        {showCompareModal && selectedInvoiceObjects.length === 2 && (() => {
          const dateA = parseDateDDMMYYYY(selectedInvoiceObjects[0].date);
          const dateB = parseDateDDMMYYYY(selectedInvoiceObjects[1].date);
          
          // factura1 is LATEST, factura2 is OLDER
          const factura1 = dateA >= dateB ? selectedInvoiceObjects[0] : selectedInvoiceObjects[1];
          const factura2 = dateA < dateB ? selectedInvoiceObjects[0] : selectedInvoiceObjects[1];

          return (
            <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-2xs">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-xl border border-slate-100 shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              >
                <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <ArrowRightLeft className="w-5 h-5 text-blue-500" />
                      Analiză Comparativă Facturi / Selgros Match Tool
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Comparare side-by-side: Factura 1 (Latest) vs Factura 2 (Bought Earlier)</p>
                  </div>
                  <button
                    onClick={() => setShowCompareModal(false)}
                    className="bg-slate-200/60 hover:bg-slate-200 p-1.5 rounded-full text-slate-600 transition-colors cursor-pointer"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Side-by-side scrollable area */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
                  {/* Visual side-by-side grid */}
                  <div className="grid grid-cols-2 gap-6 divide-x divide-slate-150">
                    {/* Invoice 1 (Latest) */}
                    <div className="space-y-4">
                      <div className="bg-slate-100/40 p-4 rounded-lg border-l-4 border-slate-900">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-450">FACTURA 1 (Cea mai recentă / Latest)</div>
                        <h4 className="text-xl font-bold font-mono text-slate-900 mt-1">{factura1.number}</h4>
                        <p className="text-xs text-slate-500 font-medium font-sans">Dată emitere: {factura1.date}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] font-medium">Firma emitentă</span>
                          <span className="font-semibold text-slate-800">{factura1.company}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-medium">Buget Centru cost</span>
                          <span className="font-semibold text-purple-600">{factura1.costCenter}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-medium font-sans">Valoare totală</span>
                          <span className="font-extrabold font-mono text-slate-900 text-sm">{factura1.total.toFixed(2)} RON</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-medium">Sold datorat Rest</span>
                          <span className="font-extrabold font-mono text-rose-600 text-sm">{factura1.rest.toFixed(2)} RON</span>
                        </div>
                      </div>
                    </div>

                    {/* Invoice 2 (Older) */}
                    <div className="space-y-4 pl-6">
                      <div className="bg-slate-100/40 p-4 rounded-lg border-l-4 border-blue-500">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-450">FACTURA 2 (Cumpărată anterior / Older)</div>
                        <h4 className="text-xl font-bold font-mono text-slate-900 mt-1">{factura2.number}</h4>
                        <p className="text-xs text-slate-500 font-medium font-sans">Dată emitere: {factura2.date}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] font-medium">Firma emitentă</span>
                          <span className="font-semibold text-slate-800">{factura2.company}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-medium">Buget Centru cost</span>
                          <span className="font-semibold text-purple-600">{factura2.costCenter}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-medium">Valoare totală</span>
                          <span className="font-extrabold font-mono text-slate-900 text-sm">{factura2.total.toFixed(2)} RON</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-medium">Sold datorat Rest</span>
                          <span className="font-extrabold font-mono text-rose-600 text-sm">{factura2.rest.toFixed(2)} RON</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comparative itemized analysis */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-800 text-sm border-b pb-2">Analiză prețuri produse comune / Price discrepancies</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Prețul produsului cumpărat anterior (Factura 2) este evidențiat cu <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Verde</span> dacă a costat mai mult decât prețul actual, respectiv cu <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">Roșu</span> dacă a costat mai puțin.
                    </p>
                    
                    <div className="border border-slate-150 rounded-lg overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                          <tr>
                            <th className="p-3">Cod Selgros</th>
                            <th className="p-3">Produs</th>
                            <th className="p-3 text-right">Preț Nou ({factura1.number})</th>
                            <th className="p-3 text-right">Preț Anterior ({factura2.number})</th>
                            <th className="p-3 text-center">Analiză Preț Anterior (Factura 2)</th>
                            <th className="p-3 text-center">Cantități (Prezent vs Anterior)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Array.from(new Set([
                            ...factura1.products.map(p => p.code),
                            ...factura2.products.map(p => p.code)
                          ])).map(code => {
                            const p1 = factura1.products.find(p => p.code === code);
                            const p2 = factura2.products.find(p => p.code === code);
                            const name = p1?.name || p2?.name || 'Necunoscut';
                            
                            const price1 = p1?.unitPrice || 0;
                            const price2 = p2?.unitPrice || 0;
                            
                            const priceDiff = price1 && price2 ? price2 - price1 : 0;
                            const percentDiff = price1 ? (priceDiff / price1) * 100 : 0;

                            return (
                              <tr key={code} className="hover:bg-slate-50/50">
                                <td className="p-3 font-mono text-[11px] text-slate-500">{code}</td>
                                <td className="p-3 font-medium text-slate-800">{name}</td>
                                <td className="p-3 text-right font-mono text-slate-900 font-semibold">
                                  {price1 > 0 ? `${price1.toFixed(2)} RON` : '—'}
                                </td>
                                <td className="p-3 text-right font-mono">
                                  {price2 > 0 ? (
                                    price1 > 0 ? (
                                      price2 > price1 ? (
                                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded font-extrabold shadow-3xs">
                                          {price2.toFixed(2)} RON
                                        </span>
                                      ) : price2 < price1 ? (
                                        <span className="text-rose-700 bg-rose-50 border border-rose-100 px-2 py-1 rounded font-extrabold shadow-3xs">
                                          {price2.toFixed(2)} RON
                                        </span>
                                      ) : (
                                        <span className="text-slate-750 px-2 py-1">
                                          {price2.toFixed(2)} RON
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-slate-700 font-medium">{price2.toFixed(2)} RON</span>
                                    )
                                  ) : '—'}
                                </td>
                                <td className="p-3 text-center font-mono">
                                  {price1 > 0 && price2 > 0 ? (
                                    priceDiff === 0 ? (
                                      <span className="text-slate-450 font-medium bg-slate-50 border px-2 py-1 rounded">Fără diferență (0%)</span>
                                    ) : priceDiff > 0 ? (
                                      <span className="text-emerald-700 bg-emerald-50/50 border border-emerald-200 px-2.5 py-1.5 rounded-md font-bold inline-block shadow-3xs">
                                        Anterior a fost MAI SCUMP (+{priceDiff.toFixed(2)} RON / +{percentDiff.toFixed(1)}%) ↗
                                      </span>
                                    ) : (
                                      <span className="text-rose-700 bg-rose-50/50 border border-rose-200 px-2.5 py-1.5 rounded-md font-bold inline-block shadow-3xs">
                                        Anterior a fost MAI IEFTIN ({priceDiff.toFixed(2)} RON / {percentDiff.toFixed(1)}%) ↘
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-slate-400 italic">Disponibil exclusiv într-o singură factură</span>
                                  )}
                                </td>
                                <td className="p-3 text-center font-mono text-slate-650">
                                  {p1?.quantity || 0} vs {p2?.quantity || 0} {p1?.unit || p2?.unit}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                  <button
                    onClick={() => setShowCompareModal(false)}
                    className="bg-slate-900 text-white font-semibold text-xs px-5 py-2.5 rounded-lg hover:bg-slate-850 transition cursor-pointer"
                  >
                    Închide fereastra
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* DETAILS DRAWER / PAYMENT DIALOG */}
      <AnimatePresence>
        {viewingInvoice && (
          <div className="fixed inset-0 bg-slate-950/60 z-50 flex justify-end">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={() => setViewingInvoice(null)} />
            
            <motion.div
              id="invoice-details-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-200"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                    FACTURE DETALII
                  </span>
                  <h3 className="text-xl font-bold font-mono text-slate-900">{viewingInvoice.number}</h3>
                  <p className="text-xs text-slate-500 font-sans">Dată înregistrare: {viewingInvoice.date}</p>
                </div>
                <button
                  onClick={() => setViewingInvoice(null)}
                  className="bg-white border rounded-full p-2 text-slate-600 hover:bg-slate-100 transition shadow-2xs"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Scrollable Contents */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-700">
                {/* Invoice overview metadata */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-150">
                  <div className="text-xs">
                    <span className="text-slate-450 block font-medium">FURNIZOR</span>
                    <span className="font-bold text-slate-800">{viewingInvoice.company}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-450 block font-medium">BENEFICIAR</span>
                    <span className="font-bold text-slate-800">{viewingInvoice.client}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-450 block font-medium">CENTRU COST</span>
                    <span className="font-mono bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded border border-purple-150">
                      {viewingInvoice.costCenter}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-450 block font-medium">SCADENȚĂ</span>
                    <span className="font-bold font-mono text-slate-800">
                      {viewingInvoice.number === '2635006010112204' ? '—' : viewingInvoice.dueDate}
                    </span>
                  </div>
                </div>

                {/* Financial balances */}
                <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50/70 rounded-xl border border-slate-150">
                  <div className="text-center text-xs space-y-1">
                    <span className="text-slate-450 block font-medium">TOTAL PLATĂ</span>
                    <span className="font-extrabold font-mono text-slate-900 text-base">{viewingInvoice.total.toFixed(2)} RON</span>
                  </div>
                  <div className="text-center text-xs border-x border-slate-200 space-y-1">
                    <span className="text-slate-450 block font-medium">ACHITAT</span>
                    <span className="font-extrabold font-mono text-emerald-600 text-base">{viewingInvoice.paid.toFixed(2)} RON</span>
                  </div>
                  <div className="text-center text-xs space-y-1">
                    <span className="text-slate-450 block font-medium">REST PLATA</span>
                    <span className="font-extrabold font-mono text-rose-600 text-base">{viewingInvoice.rest.toFixed(2)} RON</span>
                  </div>
                </div>

                {/* Product listing parsed */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-450">Linii Produse Selgros ({viewingInvoice.products.length})</h4>
                  
                  <div className="border border-slate-150 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                    {viewingInvoice.products.map((item, idx) => (
                      <div key={idx} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900">{item.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                            <span>Art: {item.code}</span>
                            <span>•</span>
                            <span>{item.quantity} {item.unit} x {item.unitPrice.toFixed(2)} RON (TVA {item.vat}%)</span>
                          </div>
                        </div>
                        <div className="text-right font-mono font-bold text-slate-800 shrink-0">
                          {item.totalPrice.toFixed(2)} RON
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interactive form to pay off */}
                {viewingInvoice.rest > 0 ? (
                  <form onSubmit={handlePaymentSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                    <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                      <CreditCard className="w-4 h-4 text-emerald-500" />
                      Efectuează Plată Parțială sau Totală
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-slate-500 font-semibold block">Suma de plată (RON)</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            max={viewingInvoice.rest}
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder={viewingInvoice.rest.toFixed(2)}
                            className="bg-white border rounded-lg p-2.5 w-full font-mono text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setPaymentAmount(viewingInvoice.rest.toString())}
                            className="absolute right-2 top-2.5 text-[9px] bg-slate-200/80 hover:bg-slate-200 rounded px-1.5 py-0.5 text-slate-700 font-semibold"
                          >
                            Max
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-500 font-semibold block">Metodă Plată</label>
                        <select
                          value={paymentMethod}
                          onChange={(e: any) => setPaymentMethod(e.target.value)}
                          className="bg-white border rounded-lg p-2.5 w-full text-xs focus:outline-none"
                        >
                          <option value="Bank Transfer">Ordin de plată (OP)</option>
                          <option value="Card">Card bancar</option>
                          <option value="Cash">Numerar / Cash</option>
                          <option value="Chitanță">Chitanță Selgros</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <label className="text-slate-500 font-semibold block">Număr Referință (OP / Chitanță / Tranzacție)</label>
                      <input
                        type="text"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        placeholder="OP-982310"
                        className="bg-white border rounded-lg p-2.5 w-full focus:outline-none text-xs"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98 transition-all"
                    >
                      <Check className="w-4.5 h-4.5" />
                      Adaugă tranzacție și actualizează sold
                    </button>
                  </form>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-xl flex items-center gap-3">
                    <span className="p-1 bg-emerald-100 text-emerald-800 rounded-full shrink-0">
                      <Check className="w-5 h-5" />
                    </span>
                    <div className="text-xs">
                      <p className="font-bold text-emerald-900">Această factură este achitată integral!</p>
                      <p className="text-emerald-700 mt-0.5">Soldul datorat este de 0.00 RON.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center gap-2 shrink-0">
                {onDeleteInvoice && (
                  <div className="inline-flex items-center gap-1.5">
                    {invoiceIdToConfirmDelete === viewingInvoice.id ? (
                      <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 rounded-lg p-1.5 shadow-3xs animate-fade-in text-xs">
                        <span className="text-rose-700 text-2xs font-bold px-1.5">
                          {lang === 'RO' ? 'Sigur doriți ștergerea totală?' : 'Are you sure you want to delete?'}
                        </span>
                        <button
                          onClick={() => {
                            onDeleteInvoice(viewingInvoice.id);
                            setInvoiceIdToConfirmDelete(null);
                            setViewingInvoice(null);
                          }}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-3xs px-2.5 py-1.5 rounded cursor-pointer shadow-3xs"
                        >
                          {lang === 'RO' ? 'Da, Șterge' : 'Yes, Delete'}
                        </button>
                        <button
                          onClick={() => setInvoiceIdToConfirmDelete(null)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-850 font-bold text-3xs px-2 py-1.5 rounded cursor-pointer"
                        >
                          {lang === 'RO' ? 'Anulează' : 'Cancel'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setInvoiceIdToConfirmDelete(viewingInvoice.id)}
                        className="p-2 px-4 rounded-lg bg-white border border-rose-250 text-rose-600 hover:bg-rose-50 hover:border-rose-350 transition-all text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-3xs hover:shadow-2xs"
                        title={lang === 'RO' ? 'Șterge Factură' : 'Delete Invoice'}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>{lang === 'RO' ? 'Șterge Factură' : 'Delete Invoice'}</span>
                      </button>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setViewingInvoice(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition"
                >
                  Închide Detalii
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK PAYMENT MODAL BY ROW BUTTON CLICK */}
      <AnimatePresence>
        {quickPaymentInvoice && (
          <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-2xs">
            <div className="absolute inset-0" onClick={() => setQuickPaymentInvoice(null)} />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden flex flex-col z-10"
            >
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-905 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block animate-ping" />
                    {lang === 'RO' ? 'Efectuează Plată Factură' : 'Make Invoice Payment'}
                  </h3>
                  <p className="text-2xs text-slate-500 font-medium font-mono mt-0.5">Factura nr: {quickPaymentInvoice.number}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickPaymentInvoice(null)}
                  className="bg-white border rounded-full p-2 text-slate-600 hover:bg-slate-100 transition shadow-2xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleQuickPaymentSubmit} className="p-6 space-y-4">
                {/* Visual stats breakdown */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Total</span>
                    <span className="text-xs font-bold font-mono text-slate-800">{quickPaymentInvoice.total.toFixed(2)}</span>
                  </div>
                  <div className="border-x border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Achitat</span>
                    <span className="text-xs font-bold font-mono text-emerald-600">{quickPaymentInvoice.paid.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Datorat</span>
                    <span className="text-xs font-black font-mono text-rose-600">{quickPaymentInvoice.rest.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-bold block">
                    {lang === 'RO' ? 'Suma de plată (RON) — Suportă plată parțială' : 'Payment Amount (RON) — Supports partial payment'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={quickPaymentInvoice.rest}
                      value={quickPaymentAmount}
                      onChange={(e) => setQuickPaymentAmount(e.target.value)}
                      placeholder={quickPaymentInvoice.rest.toFixed(2)}
                      className="bg-slate-50 border rounded-lg p-2.5 w-full font-mono text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-500 focus:outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setQuickPaymentAmount(quickPaymentInvoice.rest.toString())}
                      className="absolute right-2 top-2.5 text-[9px] bg-slate-200 hover:bg-slate-300 rounded px-1.5 py-0.5 text-slate-750 font-extrabold"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-bold block">
                    {lang === 'RO' ? 'Metodă Plată / Tip Plată' : 'Payment Method / Type'}
                  </label>
                  <select
                    value={quickPaymentMethod}
                    onChange={(e: any) => setQuickPaymentMethod(e.target.value)}
                    className="bg-slate-50 border rounded-lg p-2.5 w-full text-xs text-slate-800 focus:bg-white focus:outline-none"
                  >
                    <option value="Bank Transfer">Ordin de Plată / Online Bank Transfer</option>
                    <option value="Card">Card Bancar / POS / Online Card</option>
                    <option value="Cash">Numerar / Cash</option>
                    <option value="Chitanță">Chitanță Selgros</option>
                  </select>
                </div>

                <div className="space-y-1 text-xs">
                  <label className="text-[11px] text-slate-500 font-bold block">
                    {lang === 'RO' ? 'Număr Referință (OP / Chitanță / Tranzacție)' : 'Reference Num / Receipt'}
                  </label>
                  <input
                    type="text"
                    value={quickPaymentRef}
                    onChange={(e) => setQuickPaymentRef(e.target.value)}
                    placeholder="Ex: OP-10293, CASH-552, CARD-8293"
                    className="bg-slate-50 border rounded-lg p-2.5 w-full text-xs text-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickPaymentInvoice(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold text-2xs uppercase tracking-wider px-4 py-2.5 rounded-lg transition"
                  >
                    {lang === 'RO' ? 'Anulează' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-2xs uppercase tracking-wider px-5 py-2.5 rounded-lg flex items-center gap-1 cursor-pointer transition shadow-sm active:scale-98"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {lang === 'RO' ? 'Inregistrează Plată' : 'Record Payment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
