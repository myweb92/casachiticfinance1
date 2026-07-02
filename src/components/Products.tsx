import { useState } from 'react';
import { Invoice, ProductItem, Language } from '../types';
import { translations } from '../translations';
import { Search, ShoppingCart, Landmark, Tag, TrendingUp, HelpCircle } from 'lucide-react';

interface ProductsProps {
  invoices: Invoice[];
  lang?: Language;
}

interface AggregatedProduct {
  code: string;
  name: string;
  avgPrice: number;
  totalQty: number;
  totalSpent: number;
  unit: string;
  costCenters: string[];
  vats: number[];
}

export default function Products({ invoices, lang = 'RO' }: ProductsProps) {
  const t = translations[lang];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState<'name' | 'spent' | 'qty'>('spent');

  // Aggregate products from all invoices
  const aggregateMap: { [code: string]: { name: string; prices: number[]; totalQty: number; totalSpent: number; unit: string; costCenters: Set<string>; vats: Set<number> } } = {};

  invoices.forEach(inv => {
    inv.products.forEach(p => {
      if (!aggregateMap[p.code]) {
        aggregateMap[p.code] = {
          name: p.name,
          prices: [],
          totalQty: 0,
          totalSpent: 0,
          unit: p.unit || 'BUC',
          costCenters: new Set<string>(),
          vats: new Set<number>()
        };
      }
      
      aggregateMap[p.code].prices.push(p.unitPrice);
      aggregateMap[p.code].totalQty += p.quantity;
      aggregateMap[p.code].totalSpent += p.totalPrice;
      aggregateMap[p.code].costCenters.add(inv.costCenter);
      aggregateMap[p.code].vats.add(p.vat);
    });
  });

  const products: AggregatedProduct[] = Object.keys(aggregateMap).map(code => {
    const prices = aggregateMap[code].prices;
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    return {
      code,
      name: aggregateMap[code].name,
      avgPrice,
      totalQty: aggregateMap[code].totalQty,
      totalSpent: aggregateMap[code].totalSpent,
      unit: aggregateMap[code].unit,
      costCenters: Array.from(aggregateMap[code].costCenters),
      vats: Array.from(aggregateMap[code].vats)
    };
  });

  // Filter products by search query
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Apply sorting
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (selectedSort === 'name') {
      return a.name.localeCompare(b.name);
    } else if (selectedSort === 'qty') {
      return b.totalQty - a.totalQty;
    } else {
      return b.totalSpent - a.totalSpent;
    }
  });

  return (
    <div id="products-module" className="space-y-6">
      {/* Upper Title */}
      <div>
        <h1 id="products-headline" className="text-3xl font-bold tracking-tight text-slate-900 font-sans">
          Nomenclator Produse / Parsed Inventory
        </h1>
        <p id="products-sub-headline" className="text-slate-550 mt-1">
          Catalog consolidat cu articolele extrase din facturi, calculate cu preț mediu de achiziție și destinație.
        </p>
      </div>

      {/* Searching / sorting controls */}
      <div id="products-controls" className="bg-white border border-slate-150 p-4 rounded-xl shadow-2xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Caută în nomenclator..."
            aria-label="Caută în nomenclator"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:bg-white focus:border-slate-450 focus:outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 select-none">
          <span className="text-xs text-slate-500 font-semibold">Ordonează după:</span>
          <div className="inline-flex gap-1 border border-slate-200 bg-slate-100/50 p-1 rounded-lg">
            <button
              onClick={() => setSelectedSort('spent')}
              className={`text-xs px-3 py-1 rounded-md font-semibold transition ${selectedSort === 'spent' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Valoare Totală
            </button>
            <button
              onClick={() => setSelectedSort('qty')}
              className={`text-xs px-3 py-1 rounded-md font-semibold transition ${selectedSort === 'qty' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Cantitate
            </button>
            <button
              onClick={() => setSelectedSort('name')}
              className={`text-xs px-3 py-1 rounded-md font-semibold transition ${selectedSort === 'name' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Nume
            </button>
          </div>
        </div>
      </div>

      {/* Main product cards grid */}
      <div id="products-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sortedProducts.length > 0 ? (
          sortedProducts.map((p, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-150 p-5 rounded-xl shadow-2xs hover:shadow-sm transition flex flex-col justify-between space-y-4"
            >
              {/* Product title */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold font-mono text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded uppercase tracking-wider">
                  Cod: {p.code}
                </span>
                <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 pt-1">{p.name}</h4>
              </div>

              {/* Financial metrics list */}
              <div className="space-y-2 border-y border-slate-100 py-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-450 font-medium">Volum Achiziționat</span>
                  <span className="font-bold font-mono text-slate-800">
                    {p.totalQty} {p.unit}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-450 font-medium">Preț Mediu de Unitate</span>
                  <span className="font-bold font-mono text-blue-600">
                    {p.avgPrice.toFixed(2)} RON
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-450 font-medium font-sans">Valoare Totală Cheltuită</span>
                  <span className="font-extrabold font-mono text-slate-900">
                    {p.totalSpent.toFixed(2)} RON
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-450 font-medium">TVA aplicat</span>
                  <span className="font-mono text-slate-500 font-semibold">{p.vats.map(v => `${v}%`).join(', ')}</span>
                </div>
              </div>

              {/* Linked cost centers tag list */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5 select-none">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mr-1">Centre:</span>
                {p.costCenters.map((cc, i) => (
                  <span
                    key={i}
                    className="text-[10px] bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded border border-purple-150"
                  >
                    {cc}
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-slate-50 border p-12 text-center rounded-xl text-slate-400 italic text-xs">
            Nu s-au găsit produse în nomenclator corespunzătoare criteriilor selectate.
          </div>
        )}
      </div>
    </div>
  );
}
