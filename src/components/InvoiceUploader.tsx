import React, { useState, useRef } from 'react';
import { Invoice, ProductItem, Language } from '../types';
import { translations } from '../translations';
import { 
  Upload, 
  FileCode, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  FileText, 
  Sparkles, 
  Check, 
  HelpCircle, 
  X, 
  Trash2, 
  ChevronRight, 
  Layers 
} from 'lucide-react';
import { motion } from 'motion/react';

interface InvoiceUploaderProps {
  onAddParsedInvoice: (invoice: Invoice) => void;
  onNavigate: (view: string) => void;
  costCenters: { name: string }[];
  invoices: Invoice[];
  lang?: Language;
  setGlobalDate?: (date: string) => void;
}

export interface ParsedItem {
  id: string;
  fileName: string;
  isXml: boolean;
  status: 'success' | 'duplicate' | 'error';
  errorMsg?: string | null;
  invoice: Partial<Invoice>;
}

export default function InvoiceUploader({ onAddParsedInvoice, onNavigate, costCenters, invoices, lang = 'RO', setGlobalDate }: InvoiceUploaderProps) {
  const t = translations[lang];
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // List of parsed draft items from the multi-upload queue
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  // Currently selected item in the queue for preview/edit
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  // Recalculates the duplicate status for all items in the current queue based on both database and queue items themselves
  const recalculateStatuses = (itemsList: ParsedItem[]): ParsedItem[] => {
    return itemsList.map(item => {
      // If it's already an error, keep it as error
      if (item.status === 'error') {
        return item;
      }

      const num = (item.invoice.number || '').trim();
      if (!num) {
        return {
          ...item,
          status: 'error',
          errorMsg: lang === 'RO' ? "Numărul facturii lipsește!" : "Invoice number is missing!"
        };
      }
      
      const normalizedNum = num.toLowerCase();
      
      // 1. Check if registered in client system (database)
      const isRegisteredInDb = invoices.some(inv => inv.number.toLowerCase().trim() === normalizedNum);
      if (isRegisteredInDb) {
        return {
          ...item,
          status: 'duplicate',
          errorMsg: lang === 'RO' 
            ? `Factura nr. "${num}" există deja în Registrul Plăți!` 
            : `Invoice nr. "${num}" already exists in the Payment Ledger!`
        };
      }
      
      // 2. Check if duplicated within the queue itself (items that have different IDs but the same invoice number)
      const otherSameNumIndex = itemsList.findIndex(other => 
        other.id !== item.id && 
        (other.invoice.number || '').trim().toLowerCase() === normalizedNum
      );
      
      if (otherSameNumIndex !== -1) {
        return {
          ...item,
          status: 'duplicate',
          errorMsg: lang === 'RO'
            ? `Factură duplicată detectată în coada ta de upload (nr. "${num}")!`
            : `Duplicate invoice detected in your upload queue (No. "${num}")!`
        };
      }
      
      return {
        ...item,
        status: 'success',
        errorMsg: null
      };
    });
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active item lookup helper
  const activeItem = parsedItems.find(item => item.id === activeItemId) || null;

  const convertToIsoDate = (dateStr: string): string => {
    if (!dateStr) return '';
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

  const handleSelectActiveItem = (id: string, customInvoice?: Partial<Invoice>) => {
    setActiveItemId(id);
    if (setGlobalDate) {
      const target = customInvoice || parsedItems.find(item => item.id === id)?.invoice;
      if (target && target.date) {
        const iso = convertToIsoDate(target.date);
        if (iso && iso.length === 10) {
          setGlobalDate(iso);
        }
      }
    }
  };

  // Trigger file selection
  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  // Drag over handler
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64Str = reader.result as string;
        resolve(base64Str.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Parse UBL XML directly in browser (offline/online)
  const parseUblXmlInBrowser = (xmlString: string): Partial<Invoice> | null => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      
      const parserError = xmlDoc.getElementsByTagName('parsererror');
      if (parserError.length > 0) {
        throw new Error('Formatul XML nu este valid sau este corupt.');
      }

      const getTagValue = (parent: Element | Document, tagShort: string): string => {
        const tags = [tagShort, `cbc:${tagShort}`, `cac:${tagShort}`];
        for (const tag of tags) {
          const el = parent.getElementsByTagName(tag)[0];
          if (el && el.textContent) return el.textContent.trim();
        }
        return '';
      };

      const number = getTagValue(xmlDoc, 'ID');
      const date = getTagValue(xmlDoc, 'IssueDate'); // YYYY-MM-DD
      const formattedDate = date ? date.split('-').reverse().join('/') : new Date().toLocaleDateString('ro-RO');
      const dueDate = getTagValue(xmlDoc, 'PaymentDueDate') || getTagValue(xmlDoc, 'DueDate');
      const formattedDueDate = dueDate ? dueDate.split('-').reverse().join('/') : formattedDate;

      let company = 'Beta Catering SRL';
      const supplierParties = xmlDoc.getElementsByTagName('cac:AccountingSupplierParty');
      if (supplierParties.length > 0) {
        const party = supplierParties[0];
        const legalName = getTagValue(party, 'RegistrationName') || getTagValue(party, 'Name');
        if (legalName) company = legalName;
      }

      let client = 'CCB HOTELS';
      const customerParties = xmlDoc.getElementsByTagName('cac:AccountingCustomerParty');
      if (customerParties.length > 0) {
        const party = customerParties[0];
        const legalName = getTagValue(party, 'RegistrationName') || getTagValue(party, 'Name');
        if (legalName) client = legalName;
      }

      let totalAmountStr = getTagValue(xmlDoc, 'PayableAmount') || getTagValue(xmlDoc, 'TaxExclusiveAmount');
      if (!totalAmountStr) {
        const monetaryTotal = xmlDoc.getElementsByTagName('cac:LegalMonetaryTotal')[0];
        if (monetaryTotal) {
          totalAmountStr = getTagValue(monetaryTotal, 'PayableAmount') || getTagValue(monetaryTotal, 'TaxExclusiveAmount');
        }
      }
      const total = totalAmountStr ? parseFloat(totalAmountStr) : 0;

      const products: ProductItem[] = [];
      const lines = xmlDoc.getElementsByTagName('cac:InvoiceLine');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineId = getTagValue(line, 'ID');
        const qtyStr = getTagValue(line, 'InvoicedQuantity');
        const quantity = qtyStr ? parseFloat(qtyStr) : 1;
        const unit = line.getElementsByTagName('cbc:InvoicedQuantity')[0]?.getAttribute('unitCode') || 'BUC';
        
        const priceAmountStr = getTagValue(line, 'PriceAmount');
        const unitPrice = priceAmountStr ? parseFloat(priceAmountStr) : 0;

        const itemEl = line.getElementsByTagName('cac:Item')[0];
        let name = 'Articol general';
        let code = `ART-${lineId || i}`;
        
        if (itemEl) {
          name = getTagValue(itemEl, 'Name') || name;
          code = getTagValue(itemEl, 'ID') || code;
          
          const sellersId = itemEl.getElementsByTagName('cac:SellersItemIdentification')[0];
          if (sellersId) {
            code = getTagValue(sellersId, 'ID') || code;
          }
        }

        let vat = 19;
        const taxCategory = line.getElementsByTagName('cac:ClassifiedTaxCategory')[0];
        if (taxCategory) {
          const vatStr = getTagValue(taxCategory, 'Percent');
          if (vatStr) vat = parseFloat(vatStr);
        }

        const totalPrice = parseFloat((quantity * unitPrice * (1 + vat / 100)).toFixed(2));

        products.push({
          code,
          name,
          quantity,
          unit,
          unitPrice,
          vat,
          totalPrice
        });
      }

      const calculatedTotal = products.reduce((acc, p) => acc + p.totalPrice, 0);

      return {
        number: number || `EFC-${Math.floor(Math.random() * 900000)}`,
        date: formattedDate,
        client,
        company,
        costCenter: costCenters[0]?.name || 'Restaurant Nord',
        total: total > 0 ? total : parseFloat(calculatedTotal.toFixed(2)),
        dueDate: formattedDueDate,
        paid: 0,
        rest: total > 0 ? total : parseFloat(calculatedTotal.toFixed(2)),
        paymentDate: null,
        status: 'unpaid',
        products
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  // Parse using server-side Gemini AI
  const parseDocumentWithGemini = async (file: File): Promise<Partial<Invoice> | null> => {
    try {
      const mimeType = file.type;
      const base64Data = await fileToBase64(file);

      const response = await fetch('/api/parse-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileName: file.name,
          mimeType,
          fileData: base64Data
        })
      });

      let results: any = null;
      try {
        results = await response.json();
      } catch (parseErr) {
        // Silent fallthrough
      }

      if (!response.ok) {
        if (results && (results.details || results.error)) {
          throw new Error(results.details || results.error);
        }
        throw new Error(`Răspunsul serverului cu AI a eșuat (Status: ${response.status}).`);
      }

      if (!results || !results.invoice) {
        throw new Error('Serverul nu a returnat datele facturii în structura așteptată.');
      }
      
      return results.invoice;
    } catch (e: any) {
      console.error('Gemini Server parsing failed:', e);
      throw e;
    }
  };

  // Main Dropped Files orchestrator (processes single or multiple files)
  const handleDroppedFiles = async (files: File[]) => {
    setIsParsing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const newItems: ParsedItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const itemId = `parsed-${Date.now()}-${Math.floor(Math.random() * 10000) + i}`;
      const isXml = file.name.endsWith('.xml') || file.type === 'text/xml' || file.type === 'application/xml';
      
      setProcessingStatus(
        lang === 'RO' 
          ? `Se interpretează fișierul ${i + 1}/${files.length}: ${file.name}...` 
          : `Processing file ${i + 1}/${files.length}: ${file.name}...`
      );

      try {
        let parsedNode: Partial<Invoice> | null = null;
        if (isXml) {
          const text = await file.text();
          parsedNode = parseUblXmlInBrowser(text);
        } else {
          parsedNode = await parseDocumentWithGemini(file);
        }

        if (parsedNode) {
          if (!parsedNode.costCenter) {
            parsedNode.costCenter = costCenters[0]?.name || 'Restaurant Nord';
          }
          if (parsedNode.total === undefined || isNaN(Number(parsedNode.total))) {
            const calculatedTotal = parsedNode.products?.reduce((acc, p) => acc + p.totalPrice, 0) || 0;
            parsedNode.total = parseFloat(calculatedTotal.toFixed(2));
          }
          if (parsedNode.rest === undefined) {
            parsedNode.rest = parsedNode.total;
          }

          newItems.push({
            id: itemId,
            fileName: file.name,
            isXml,
            status: 'success',
            invoice: parsedNode
          });
        } else {
          newItems.push({
            id: itemId,
            fileName: file.name,
            isXml,
            status: 'error',
            errorMsg: 'Formatul fișierului nu a putut fi citit sau tagurile sunt invalide.',
            invoice: { number: `ERR-${file.name}`, company: 'Eroare parsare', total: 0, products: [] }
          });
        }
      } catch (err: any) {
        newItems.push({
          id: itemId,
          fileName: file.name,
          isXml,
          status: 'error',
          errorMsg: err.message || 'Eroare la procesarea fișierului.',
          invoice: { number: `ERR-${file.name}`, company: 'Eroare parsare', total: 0, products: [] }
        });
      }
    }

    setParsedItems(prev => recalculateStatuses([...prev, ...newItems]));
    setIsParsing(false);
    setProcessingStatus('');

    // Pre-activate the first newly parsed success or duplicate item
    if (newItems.length > 0) {
      const fullMerged = recalculateStatuses([...parsedItems, ...newItems]);
      const matched = fullMerged.find(item => item.id === newItems[0].id);
      if (matched) {
        handleSelectActiveItem(matched.id, matched.invoice);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleDroppedFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Live input changes bound directly to the active item in our queue
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!activeItemId) return;
    const { name, value } = e.target;
    
    setParsedItems(prev => {
      const mapped = prev.map(item => {
        if (item.id === activeItemId) {
          const updatedInvoice = {
            ...item.invoice,
            [name]: name === 'total' ? parseFloat(value) || 0 : value
          };
          
          // Auto Sync remaining rest on total adjustment
          if (name === 'total') {
            updatedInvoice.rest = updatedInvoice.total;
          }

          return {
            ...item,
            invoice: updatedInvoice
          };
        }
        return item;
      });

      return recalculateStatuses(mapped);
    });
  };

  // Register only the currently selected item and drop it from queue
  const handleConfirmSingleInvoice = () => {
    if (!activeItem) return;
    const { invoice } = activeItem;
    
    const numberToCheck = (invoice.number || '').trim();
    if (invoices.some(inv => inv.number.toLowerCase().trim() === numberToCheck.toLowerCase())) {
      setErrorMsg(`Salvare respinsă: Factura nr. "${numberToCheck}" există deja în Registrul Plăți!`);
      return;
    }

    if (parsedItems.some(item => item.id !== activeItem.id && (item.invoice.number || '').trim().toLowerCase() === numberToCheck.toLowerCase())) {
      setErrorMsg(`Salvare respinsă: Există o factură nesalvată cu numărul "${numberToCheck}" deja în cache-ul tău de upload! Resorbiți mai întâi conflictul.`);
      return;
    }

    const invoiceToAdd: Invoice = {
      id: invoice.id || `inv-${Math.floor(Date.now() + Math.random() * 10000)}`,
      number: invoice.number || `50R${Math.floor(100000 + Math.random() * 900000)}`,
      date: invoice.date || new Date().toLocaleDateString('ro-RO'),
      client: invoice.client || 'Client Generic',
      company: invoice.company || 'Beta Catering SRL',
      costCenter: invoice.costCenter || 'Restaurant Nord',
      total: typeof invoice.total === 'number' ? invoice.total : parseFloat(String(invoice.total)),
      dueDate: invoice.dueDate || new Date().toLocaleDateString('ro-RO'),
      paid: 0,
      rest: typeof invoice.total === 'number' ? invoice.total : parseFloat(String(invoice.total)),
      paymentDate: null,
      status: 'unpaid',
      products: invoice.products || []
    };

    onAddParsedInvoice(invoiceToAdd);
    
    // Remove item from draft queue and recalculate statuses for the rest
    const remainingDrafts = parsedItems.filter(item => item.id !== activeItemId);
    const updatedRemaining = recalculateStatuses(remainingDrafts);
    setParsedItems(updatedRemaining);
    setSuccessMsg(`Factura nr. "${numberToCheck}" a fost salvată în Registrul Plăți!`);

    if (updatedRemaining.length > 0) {
      handleSelectActiveItem(updatedRemaining[0].id, updatedRemaining[0].invoice);
    } else {
      setActiveItemId(null);
      setTimeout(() => {
        onNavigate('ledger');
      }, 1000);
    }
  };

  // CRITICAL 1-CLICK ACTION: Register ALL ready invoices instantly 
  const handleConfirmAllInvoices = () => {
    const successItems = parsedItems.filter(item => item.status === 'success');
    
    if (successItems.length === 0) {
      setErrorMsg(
        lang === 'RO' 
          ? "Nu există nicio factură marcată ca Validă în coadă. Remediați duplicatele sau erorile." 
          : "There are no valid invoices in the queue. Fix duplicates or errors first."
      );
      return;
    }

    // Safety filter to guarantee no duplicates bypass
    const registeredInvoices = [...invoices];
    const uniqueCheckedNumbers = new Set<string>();
    const safeToSaveItems: ParsedItem[] = [];

    for (const item of successItems) {
      const num = (item.invoice.number || '').trim().toLowerCase();
      const hasDbDuplicate = registeredInvoices.some(inv => inv.number.toLowerCase().trim() === num);
      const hasQueueDuplicate = uniqueCheckedNumbers.has(num);

      if (hasDbDuplicate || hasQueueDuplicate) {
        continue;
      }

      uniqueCheckedNumbers.add(num);
      safeToSaveItems.push(item);
    }

    if (safeToSaveItems.length === 0) {
      setErrorMsg(
        lang === 'RO'
          ? "Nicio factură nu a putut fi salvată deoarece introduce duplicate!"
          : "No invoices could be saved because they introduce duplicates!"
      );
      return;
    }

    let savedCount = 0;
    safeToSaveItems.forEach(item => {
      const { invoice } = item;
      const invoiceToAdd: Invoice = {
        id: invoice.id || `inv-${Math.floor(Date.now() + Math.random() * 20000)}`,
        number: invoice.number || `50R${Math.floor(100000 + Math.random() * 900000)}`,
        date: invoice.date || new Date().toLocaleDateString('ro-RO'),
        client: invoice.client || 'Client Generic',
        company: invoice.company || 'Beta Catering SRL',
        costCenter: invoice.costCenter || 'Restaurant Nord',
        total: typeof invoice.total === 'number' ? invoice.total : parseFloat(String(invoice.total)),
        dueDate: invoice.dueDate || new Date().toLocaleDateString('ro-RO'),
        paid: 0,
        rest: typeof invoice.total === 'number' ? invoice.total : parseFloat(String(invoice.total)),
        paymentDate: null,
        status: 'unpaid',
        products: invoice.products || []
      };
      
      onAddParsedInvoice(invoiceToAdd);
      savedCount++;
    });

    setSuccessMsg(
      lang === 'RO'
        ? `S-au înregistrat ${savedCount} facturi cu succes în Registrul de Plăți dintr-un singur click!`
        : `Successfully registered ${savedCount} invoices in the Payment Ledger with 1 click!`
    );

    // Keep only duplicates/errors to let users review, or clear completely if all were valid
    const safeSavedIds = new Set(safeToSaveItems.map(item => item.id));
    const remainingProblems = parsedItems.filter(item => !safeSavedIds.has(item.id));
    const finalRemaining = recalculateStatuses(remainingProblems);
    setParsedItems(finalRemaining);

    if (finalRemaining.length > 0) {
      handleSelectActiveItem(finalRemaining[0].id, finalRemaining[0].invoice);
    } else {
      setActiveItemId(null);
      setTimeout(() => {
        onNavigate('ledger');
      }, 1500);
    }
  };

  const handleDeleteDraft = (id: string) => {
    setParsedItems(prev => {
      const filtered = prev.filter(item => item.id !== id);
      if (activeItemId === id) {
        if (filtered.length > 0) {
          handleSelectActiveItem(filtered[0].id, filtered[0].invoice);
        } else {
          setActiveItemId(null);
        }
      }
      return recalculateStatuses(filtered);
    });
  };

  const handleClearQueue = () => {
    setParsedItems([]);
    setActiveItemId(null);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Simulated raw files data for robust Multi-File testing (One-Click)
  const handleInjectMultipleDemoXml = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const demoXml1 = `<?xml version="1.0" encoding="UTF-8"?>
    <Invoice xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" 
             xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
      <cbc:ID>50R0018502</cbc:ID>
      <cbc:IssueDate>2026-06-01</cbc:IssueDate>
      <cbc:PaymentDueDate>2026-06-11</cbc:PaymentDueDate>
      <cac:AccountingSupplierParty>
        <cac:PartyName><cbc:Name>Selgros Cash &amp; Carry SRL</cbc:Name></cac:PartyName>
      </cac:AccountingSupplierParty>
      <cac:AccountingCustomerParty>
        <cac:PartyName><cbc:Name>CCB HOTELS</cbc:Name></cac:PartyName>
      </cac:AccountingCustomerParty>
      <cac:LegalMonetaryTotal>
        <cbc:PayableAmount>415.06</cbc:PayableAmount>
      </cac:LegalMonetaryTotal>
      <cac:InvoiceLine>
        <cbc:ID>1</cbc:ID>
        <cbc:InvoicedQuantity unitCode="BAX">4</cbc:InvoicedQuantity>
        <cac:Item>
          <cbc:Name>Suc Portocale Granini 1.5L</cbc:Name>
          <cac:SellersItemIdentification><cbc:ID>3321903</cbc:ID></cac:SellersItemIdentification>
        </cac:Item>
        <cac:Price><cbc:PriceAmount>18.50</cbc:PriceAmount></cac:Price>
        <cac:ClassifiedTaxCategory><cbc:Percent>19</cbc:Percent></cac:ClassifiedTaxCategory>
      </cac:InvoiceLine>
    </Invoice>`;

    const demoXml2 = `<?xml version="1.0" encoding="UTF-8"?>
    <Invoice xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" 
             xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
      <cbc:ID>50R0559281</cbc:ID>
      <cbc:IssueDate>2026-06-02</cbc:IssueDate>
      <cbc:PaymentDueDate>2026-06-12</cbc:PaymentDueDate>
      <cac:AccountingSupplierParty>
        <cac:PartyName><cbc:Name>Selgros Food Distributie</cbc:Name></cac:PartyName>
      </cac:AccountingSupplierParty>
      <cac:AccountingCustomerParty>
        <cac:PartyName><cbc:Name>CCB HOTELS</cbc:Name></cac:PartyName>
      </cac:AccountingCustomerParty>
      <cac:LegalMonetaryTotal>
        <cbc:PayableAmount>1250.00</cbc:PayableAmount>
      </cac:LegalMonetaryTotal>
      <cac:InvoiceLine>
        <cbc:ID>1</cbc:ID>
        <cbc:InvoicedQuantity unitCode="KG">40</cbc:InvoicedQuantity>
        <cac:Item>
          <cbc:Name>Orez Sfatul Bucatarului Arborio</cbc:Name>
          <cac:SellersItemIdentification><cbc:ID>1122334</cbc:ID></cac:SellersItemIdentification>
        </cac:Item>
        <cac:Price><cbc:PriceAmount>25.05</cbc:PriceAmount></cac:Price>
        <cac:ClassifiedTaxCategory><cbc:Percent>9</cbc:Percent></cac:ClassifiedTaxCategory>
      </cac:InvoiceLine>
    </Invoice>`;

    const demoXml3 = `<?xml version="1.0" encoding="UTF-8"?>
    <Invoice xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" 
             xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
      <cbc:ID>50R0882947</cbc:ID>
      <cbc:IssueDate>2026-06-02</cbc:IssueDate>
      <cbc:PaymentDueDate>2026-06-16</cbc:PaymentDueDate>
      <cac:AccountingSupplierParty>
        <cac:PartyName><cbc:Name>Metro Cash &amp; Carry SRL</cbc:Name></cac:PartyName>
      </cac:AccountingSupplierParty>
      <cac:AccountingCustomerParty>
        <cac:PartyName><cbc:Name>CCB HOTELS</cbc:Name></cac:PartyName>
      </cac:AccountingCustomerParty>
      <cac:LegalMonetaryTotal>
        <cbc:PayableAmount>525.00</cbc:PayableAmount>
      </cac:LegalMonetaryTotal>
      <cac:InvoiceLine>
        <cbc:ID>1</cbc:ID>
        <cbc:InvoicedQuantity unitCode="BUC">15</cbc:InvoicedQuantity>
        <cac:Item>
          <cbc:Name>Sapun Lichid Pro Dezinfectant 5L</cbc:Name>
          <cac:SellersItemIdentification><cbc:ID>9922115</cbc:ID></cac:SellersItemIdentification>
        </cac:Item>
        <cac:Price><cbc:PriceAmount>35.00</cbc:PriceAmount></cac:Price>
        <cac:ClassifiedTaxCategory><cbc:Percent>19</cbc:Percent></cac:ClassifiedTaxCategory>
      </cac:InvoiceLine>
    </Invoice>`;

    const demoFiles = [
      { name: 'selgros-factura-50R0018502.xml', xml: demoXml1 },
      { name: 'selgros-factura-50R0559281.xml', xml: demoXml2 },
      { name: 'metro-factura-50R0882947.xml', xml: demoXml3 }
    ];

    const newItems: ParsedItem[] = [];

    demoFiles.forEach((f, idx) => {
      const parsed = parseUblXmlInBrowser(f.xml);
      const itemId = `demo-parsed-${idx}-${Date.now()}`;
      if (parsed) {
        parsed.costCenter = costCenters[idx % costCenters.length]?.name || 'Restaurant Nord';

        newItems.push({
          id: itemId,
          fileName: f.name,
          isXml: true,
          status: 'success',
          invoice: parsed
        });
      }
    });

    setParsedItems(prev => recalculateStatuses([...prev, ...newItems]));
    if (newItems.length > 0) {
      const fullMerged = recalculateStatuses([...parsedItems, ...newItems]);
      const matched = fullMerged.find(item => item.id === newItems[0].id);
      if (matched) {
        handleSelectActiveItem(matched.id, matched.invoice);
      }
    }
    setSuccessMsg(
      lang === 'RO' 
        ? "S-au injectat 3 facturi XML (Selgros & Metro) în coada de procesare dintr-un singur click!" 
        : "Injected 3 XML test invoices into the processing pipeline with 1 click!"
    );
  };

  return (
    <div id="invoice-uploader-module" className="space-y-6">
      {/* Top Description */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 id="uploader-headline" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-sans">
            {lang === 'RO' ? "Arhivează & Încarcă În Masă - e-Factura" : "Bulk Upload & Archive - e-Invoice"}
          </h1>
          <p id="uploader-summary" className="text-slate-500 mt-1 text-sm">
            {lang === 'RO' 
              ? "Trage mai multe XML-uri RO e-Factura deodată ori fișiere PDF/imagini pentru scanare cu AI." 
              : "Drag and drop multiple RO e-Invoice XMLs at once or upload PDF/images for AI scanning."}
          </p>
        </div>
        
        {parsedItems.length > 0 && (
          <button
            onClick={handleClearQueue}
            className="self-start sm:self-auto bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg transition"
          >
            {lang === 'RO' ? "Golește lista" : "Clear queue"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* LEFT COLUMN: Drag-drop File Upload Hub */}
        <div className="lg:col-span-2 space-y-4">
          <div
            id="drag-and-drop-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`cursor-pointer border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-4 transition-all min-h-[260px] ${
              isDragging 
                ? 'border-blue-500 bg-blue-50/25 scale-[0.99] shadow-inner' 
                : 'border-slate-300 hover:border-slate-400 bg-white shadow-3xs'
            }`}
          >
            <div className="p-3.5 bg-slate-50 border rounded-full text-slate-500 shadow-3xs">
              <Upload className={`w-7 h-7 text-slate-600 ${isParsing ? 'animate-bounce text-blue-500' : ''}`} />
            </div>

            <div className="space-y-1 max-w-xs text-xs">
              <p className="font-extrabold text-slate-900 text-sm">
                {isParsing ? 'Se procesează fișierele...' : (lang === 'RO' ? 'Încarcă mai multe facturi' : 'Upload multiple invoices')}
              </p>
              <p className="text-slate-500 mt-1 leading-normal">
                {lang === 'RO' 
                  ? "Suportă multiple fișiere drag & drop. XML e-Factura sunt interpretate instantaneu local." 
                  : "Supports multi-file drug & drop. XML e-Invoices are parsed instantly in the browser."}
              </p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleDroppedFiles(Array.from(e.target.files));
                }
              }}
              accept=".xml,text/xml,application/xml,image/*,application/pdf"
              className="hidden"
            />

            {!isParsing && (
              <button
                id="select-file-btn"
                onClick={handleSelectFile}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm transition active:scale-95"
              >
                {lang === 'RO' ? "Selectează fișiere" : "Select files"}
              </button>
            )}
          </div>

          {/* Quick Demo Helper Section for Bulk Testing */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-5 space-y-3 text-xs text-slate-600">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-orange-600 animate-pulse" />
              {lang === 'RO' ? 'Testare rapidă 1-Click Multi-Upload' : 'Fast 1-Click Multi-Upload Demo'}
            </h4>
            <p className="leading-normal">
              {lang === 'RO' 
                ? "Doriți să testați funcția de încărcare în masă cu o singură apăsare de buton? Injectați 3 XML-uri Selgros & Metro gata configurate!"
                : "Want to try the bulk upload feature in action? Instantly populate the uploader queue with 3 pre-configured demo invoices!"}
            </p>
            <button
              id="inject-demo-xml-btn"
              onClick={handleInjectMultipleDemoXml}
              className="w-full bg-white border border-slate-200 hover:border-slate-350 text-slate-800 font-extrabold py-2 px-3 rounded-lg shadow-3xs transition-all hover:bg-slate-50 text-[11px]"
            >
              🚀 {lang === 'RO' ? "Injectează 3 facturi XML (Demo)" : "Inject 3 XML invoices (Demo)"}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Draft Queue & Smart Verification Form */}
        <div className="lg:col-span-3">
          
          <div className="space-y-4">
            {/* Status indicators */}
            {isParsing && (
              <div className="bg-blue-50 border border-blue-150 p-4 rounded-xl flex items-center gap-3 text-blue-800 text-xs animate-pulse">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-600 shrink-0" />
                <div className="text-left">
                  <p className="font-extrabold">{lang === 'RO' ? 'Modulul de parsare este activ...' : 'Parsing engine active...'}</p>
                  <p className="text-blue-600 mt-0.5 text-[11px] font-semibold">{processingStatus}</p>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-150 p-4 rounded-xl flex items-start gap-3 text-rose-800 text-xs">
                <AlertTriangle className="w-5 h-5 mt-0.5 text-rose-650 shrink-0" />
                <div className="text-left">
                  <p className="font-extrabold">{lang === 'RO' ? 'Atenție' : 'Warning'}</p>
                  <p className="text-rose-600 mt-0.5 font-medium">{errorMsg}</p>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-xl flex items-start gap-3 text-emerald-800 text-xs">
                <CheckCircle className="w-5 h-5 mt-0.5 text-emerald-700 shrink-0" />
                <div className="text-left">
                  <p className="font-extrabold">{lang === 'RO' ? 'Operat cu succes' : 'Operated successfully'}</p>
                  <p className="text-emerald-700 mt-0.5 font-medium">{successMsg}</p>
                </div>
              </div>
            )}

            {parsedItems.length > 0 ? (
              <div className="space-y-4">
                
                {/* 1-CLICK BULK SUBMIT PANEL */}
                <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
                  <div className="text-left">
                    <span className="text-[10px] bg-blue-500 font-extrabold text-white px-2 py-0.5 rounded uppercase tracking-wider block w-fit mb-1">
                      {lang === 'RO' ? "Procesare în masă" : "Bulk processing"}
                    </span>
                    <h3 className="font-extrabold text-sm font-sans tracking-tight">
                      {lang === 'RO' 
                        ? `Apar ${parsedItems.length} facturi în dosar` 
                        : `${parsedItems.length} invoices waiting in queue`}
                    </h3>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {lang === 'RO'
                        ? `${parsedItems.filter(p => p.status === 'success').length} facturi sunt pregătite de înregistrare`
                        : `${parsedItems.filter(p => p.status === 'success').length} invoices are valid & ready`}
                    </p>
                  </div>

                  <button
                    onClick={handleConfirmAllInvoices}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    {lang === 'RO' ? "Înregistrează tot (1-Click)" : "Register All (1-Click)"}
                  </button>
                </div>

                {/* TWO-PANEL QUEUE WORKSPACE (Files list + Selected details form) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  
                  {/* QUEUE SIDEBAR (List of uploads) */}
                  <div className="md:col-span-5 bg-white border border-slate-150 rounded-xl p-3 space-y-2.5">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      {lang === 'RO' ? "Fișiere scanate" : "Scanned files"}
                    </p>
                    
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                      {parsedItems.map((item) => {
                        const isSelected = item.id === activeItemId;
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelectActiveItem(item.id, item.invoice)}
                            className={`group relative text-left p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-blue-50/50 border-blue-400 shadow-3xs ring-1 ring-blue-350'
                                : 'bg-slate-50/50 hover:bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 text-xs truncate">
                              <FileCode className={`w-4 h-4 shrink-0 ${
                                item.status === 'success' ? 'text-emerald-500' : item.status === 'duplicate' ? 'text-amber-500' : 'text-rose-500'
                              }`} />
                              <div className="truncate text-left leading-normal">
                                <p className="font-bold text-slate-800 truncate text-[11px]" title={item.fileName}>
                                  {item.fileName}
                                </p>
                                <p className="text-[9px] text-slate-450 font-mono font-bold mt-0.5">
                                  {item.invoice.number || 'Fără număr'} • {item.invoice.total?.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Status indicators */}
                              {item.status === 'success' && (
                                <span className="bg-emerald-50 text-emerald-700 text-[8px] px-1.5 py-0.2 rounded font-black uppercase border border-emerald-100">
                                  {lang === 'RO' ? "Ok" : "Ready"}
                                </span>
                              )}
                              {item.status === 'duplicate' && (
                                <span className="bg-amber-50 text-amber-700 text-[8px] px-1.5 py-0.2 rounded font-black uppercase border border-amber-100" title={item.errorMsg || 'Duplicate'}>
                                  {lang === 'RO' ? "Duplicat" : "Dup"}
                                </span>
                              )}
                              {item.status === 'error' && (
                                <span className="bg-rose-50 text-rose-700 text-[8px] px-1.5 py-0.2 rounded font-black uppercase border border-rose-100">
                                  {lang === 'RO' ? "Eroare" : "Err"}
                                </span>
                              )}

                              {/* Delete draft trigger */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDraft(item.id);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                title="Șterge fișier"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ACTIVE PREVIEW FORM AND PRODUCTS LIST */}
                  <div className="md:col-span-7">
                    {activeItem ? (
                      <div className="bg-white border border-slate-150 rounded-xl overflow-hidden shadow-3xs text-left">
                        <div className="p-3 bg-slate-50 border-b flex justify-between items-center text-xs">
                          <span className="font-extrabold text-slate-700 flex items-center gap-1.5 truncate">
                            <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                            <span className="truncate">{activeItem.fileName}</span>
                          </span>
                          
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                            activeItem.status === 'success' 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                              : activeItem.status === 'duplicate' 
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : 'bg-rose-50 border-rose-250 text-rose-850'
                          }`}>
                            {activeItem.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="p-4 space-y-4">
                          {/* Warnings specific to currently loaded invoice */}
                          {activeItem.status === 'duplicate' && (
                            <div className="bg-amber-50 border border-amber-150 p-3 rounded-lg flex items-start gap-2 text-xs text-amber-800">
                              <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
                              <div className="text-left font-medium">
                                <p className="font-bold">{lang === 'RO' ? 'Factură Duplicată' : 'Duplicate Invoice Detected'}</p>
                                <p className="text-[11px] mt-0.5">
                                  {lang === 'RO' 
                                    ? `O factură cu numărul "${activeItem.invoice.number}" este deja înregistrată. Pentru a înregistra, vă rugăm modificați manual numărul mai jos.` 
                                    : `An invoice with number "${activeItem.invoice.number}" is already registered. To resolve this, edit the number in the field below.`}
                                </p>
                              </div>
                            </div>
                          )}

                          {activeItem.status === 'error' && (
                            <div className="bg-rose-50 border border-rose-150 p-3 rounded-lg flex items-start gap-2 text-xs text-rose-800">
                              <AlertTriangle className="w-4 h-4 mt-0.5 text-rose-600 shrink-0" />
                              <div className="text-left font-medium">
                                <p className="font-bold">{lang === 'RO' ? 'Eroare de structură' : 'Structure error'}</p>
                                <p className="text-[11px] mt-0.5">{activeItem.errorMsg}</p>
                              </div>
                            </div>
                          )}

                          {/* Editable fields */}
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            {/* Invoice number */}
                            <div className="space-y-1">
                              <label className="text-slate-500 font-bold block">{lang === 'RO' ? 'Număr Factură' : 'Invoice Number'}</label>
                              <input
                                type="text"
                                name="number"
                                value={activeItem.invoice.number || ''}
                                onChange={handleInputChange}
                                className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 w-full font-mono font-extrabold text-xs focus:bg-white focus:outline-none"
                              />
                            </div>

                            {/* Issue date */}
                            <div className="space-y-1">
                              <label className="text-slate-500 font-bold block">{lang === 'RO' ? 'Data Emitere' : 'Issue Date'}</label>
                              <input
                                type="text"
                                name="date"
                                value={activeItem.invoice.date || ''}
                                onChange={handleInputChange}
                                className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 w-full font-mono text-xs focus:bg-white focus:outline-none"
                              />
                            </div>

                            {/* Supplier */}
                            <div className="space-y-1">
                              <label className="text-slate-500 font-bold block">{lang === 'RO' ? 'Furnizor' : 'Supplier'}</label>
                              <input
                                type="text"
                                name="company"
                                value={activeItem.invoice.company || ''}
                                onChange={handleInputChange}
                                className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 w-full text-xs focus:bg-white focus:outline-none font-semibold text-slate-800"
                              />
                            </div>

                            {/* Customer / Buyer */}
                            <div className="space-y-1">
                              <label className="text-slate-500 font-bold block">{lang === 'RO' ? 'Cumpărător (Client)' : 'Buyer (Client)'}</label>
                              <input
                                type="text"
                                name="client"
                                value={activeItem.invoice.client || ''}
                                onChange={handleInputChange}
                                className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 w-full text-xs focus:bg-white focus:outline-none text-slate-700"
                              />
                            </div>

                            {/* Cost Center / Destination */}
                            <div className="space-y-1">
                              <label className="text-slate-500 font-bold block">{lang === 'RO' ? 'Centru Cost (Destinație)' : 'Cost Center (Destination)'}</label>
                              <select
                                name="costCenter"
                                value={activeItem.invoice.costCenter || ''}
                                onChange={handleInputChange}
                                className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 w-full text-xs focus:bg-white focus:outline-none text-slate-700 font-bold"
                              >
                                {costCenters.map((cc, i) => (
                                  <option key={i} value={cc.name}>{cc.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* Total calculated value */}
                            <div className="space-y-1">
                              <label className="text-slate-500 font-bold block">{lang === 'RO' ? 'Valoare Totală (RON)' : 'Total Amount (RON)'}</label>
                              <input
                                type="number"
                                name="total"
                                value={activeItem.invoice.total || 0}
                                onChange={handleInputChange}
                                className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 w-full font-mono font-black text-xs focus:bg-white focus:outline-none text-slate-900"
                              />
                            </div>
                          </div>

                          {/* Extracted Product Lines block */}
                          {activeItem.invoice.products && activeItem.invoice.products.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                                {lang === 'RO' ? `Articole Extrase (${activeItem.invoice.products.length} linii)` : `Extracted Items (${activeItem.invoice.products.length} lines)`}
                              </span>
                              <div className="max-h-[160px] overflow-y-auto border border-slate-150 rounded-xl divide-y divide-slate-100">
                                {activeItem.invoice.products.map((p, idx) => (
                                  <div key={idx} className="p-2 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                                    <div className="text-left leading-normal truncate max-w-[70%]">
                                      <p className="font-bold text-slate-850 truncate text-[11px]">{p.name}</p>
                                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                                        Cod: {p.code} • {p.quantity} {p.unit} x {p.unitPrice.toFixed(2)} RON (TVA {p.vat}%)
                                      </p>
                                    </div>
                                    <span className="font-mono font-black text-slate-900 shrink-0 text-[11px]">{p.totalPrice.toFixed(2)} RON</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action button specific to active item */}
                          <div className="pt-2">
                            <button
                              onClick={handleConfirmSingleInvoice}
                              disabled={activeItem.status !== 'success'}
                              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-extrabold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition active:scale-98 shadow-sm cursor-pointer"
                            >
                              <Check className="w-4 h-4 shrink-0" />
                              {lang === 'RO' ? "Validează doar această factură" : "Validate only this invoice"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white border rounded-xl p-8 text-center text-slate-400">
                        {lang === 'RO' ? "Selectați un fișier din stânga pentru vizualizare." : "Select a file from the list to view particulars."}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              /* Waiting for Document Empty State */
              <div className="bg-white border border-slate-150 p-12 text-center rounded-xl flex flex-col items-center justify-center space-y-4 shadow-3xs">
                <div className="p-3 bg-slate-50 border rounded-full text-slate-400 shadow-3xs">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="text-xs text-slate-500 space-y-2 max-w-sm leading-normal">
                  <p className="font-extrabold text-slate-800 text-sm">{lang === 'RO' ? 'Așteptare documente / Multi-Upload' : 'Awaiting Files / Multi-Upload'}</p>
                  <p className="text-slate-500">
                    {lang === 'RO'
                      ? 'Informațiile extrase automat din fișierele introduse se vor aduna într-un dosar de analiză în care le puteți review-ui pe toate și aproba cu un singur click!'
                      : 'Automatically extracted invoice data will stack in an interactive drafts folder. You can inspect drafts, adjust values, and register all at once with 1 click!'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
