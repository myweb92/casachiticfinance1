import { useState } from 'react';
import { Invoice, Language } from '../types';
import { translations } from '../translations';
import { TrendingUp, Sparkles, Filter, Search, Tag, ArrowUpRight, ArrowDownRight, Package } from 'lucide-react';
import { motion } from 'motion/react';

interface PriceHistoryProps {
  invoices: Invoice[];
  lang?: Language;
}

export default function PriceHistory({ invoices, lang = 'RO' }: PriceHistoryProps) {
  const t = translations[lang];
  // Extract all products and their price history points from invoices
  const productPointsMap: { [code: string]: { name: string; points: { date: string; dateObj: Date; unitPrice: number; invoiceNo: string }[] } } = {};

  invoices.forEach(inv => {
    inv.products.forEach(prod => {
      if (!productPointsMap[prod.code]) {
        productPointsMap[prod.code] = {
          name: prod.name,
          points: []
        };
      }
      
      // Parse DD/MM/YYYY to Date object
      const parts = inv.date.split('/');
      let dateObj = new Date();
      if (parts.length === 3) {
        dateObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }

      // Avoid duplicates for same product on same invoice to keep it clean
      const alreadyHasInvoice = productPointsMap[prod.code].points.some(p => p.invoiceNo === inv.number);
      if (!alreadyHasInvoice) {
        productPointsMap[prod.code].points.push({
          date: inv.date,
          dateObj,
          unitPrice: prod.unitPrice,
          invoiceNo: inv.number
        });
      }
    });
  });

  // Sort history points by date
  Object.keys(productPointsMap).forEach(code => {
    productPointsMap[code].points.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  });

  // Unique list of products with history
  const productList = Object.keys(productPointsMap).map(code => ({
    code,
    name: productPointsMap[code].name,
    pointsCount: productPointsMap[code].points.length,
    latestPrice: productPointsMap[code].points[productPointsMap[code].points.length - 1]?.unitPrice || 0,
  })).filter(p => p.pointsCount > 0);

  // Selected product state
  const [selectedProductCode, setSelectedProductCode] = useState<string>(productList[0]?.code || '');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected product points
  const activeProduct = productPointsMap[selectedProductCode];
  const historyPoints = activeProduct ? activeProduct.points : [];

  // Statistics calculation
  const prices = historyPoints.map(p => p.unitPrice);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const avgPrice = prices.length > 0 ? parseFloat((prices.reduce((s, x) => s + x, 0) / prices.length).toFixed(2)) : 0;
  const priceChange = historyPoints.length > 1 
    ? historyPoints[historyPoints.length - 1].unitPrice - historyPoints[0].unitPrice 
    : 0;
  const priceChangePercent = historyPoints.length > 1 && historyPoints[0].unitPrice > 0
    ? parseFloat(((priceChange / historyPoints[0].unitPrice) * 100).toFixed(1))
    : 0;

  // Render visual SVG chart
  const hasHistory = historyPoints.length > 1;
  const chartHeight = 180;
  const chartWidth = 500;
  const paddingX = 40;
  const paddingY = 30;

  const maxVal = maxPrice > 0 ? maxPrice * 1.08 : 100;
  const minVal = minPrice > 0 ? minPrice * 0.92 : 0;
  const valRange = maxVal - minVal;

  const svgPoints = historyPoints.map((pt, i) => {
    const x = paddingX + (i / Math.max(historyPoints.length - 1, 1)) * (chartWidth - paddingX * 2);
    const yStr = valRange > 0 
      ? chartHeight - paddingY - ((pt.unitPrice - minVal) / valRange) * (chartHeight - paddingY * 2)
      : chartHeight / 2;
    return { x, y: yStr, date: pt.date, price: pt.unitPrice, inv: pt.invoiceNo };
  });

  const pathD = svgPoints.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaPathD = svgPoints.length > 0
    ? `${pathD} L ${svgPoints[svgPoints.length - 1].x} ${chartHeight - paddingY} L ${svgPoints[0].x} ${chartHeight - paddingY} Z`
    : '';

  // Filter list by search query
  const filteredProductList = productList.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="price-history-module" className="space-y-6">
      {/* Title */}
      <div>
        <h1 id="price-history-headline" className="text-3xl font-bold tracking-tight text-slate-900 font-sans">
          Istoric Prețuri / Price History
        </h1>
        <p id="price-history-caption" className="text-slate-550 mt-1">
          Urmărește fluctuația prețurilor de achiziție Selgros pentru a detecta inflația sau ofertele promoționale.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* LEFT LIST PANEL: Search and select products */}
        <div className="bg-white border border-slate-150 rounded-xl overflow-hidden shadow-xs flex flex-col max-h-[550px]">
          <div className="p-4 border-b bg-slate-50/60 text-xs space-y-3">
            <span className="font-bold text-slate-700 block uppercase tracking-wider">Articole înregistrate ({productList.length})</span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Caută articol Selgros..."
                value={searchQuery}
                aria-label="Caută articol Selgros"
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:border-slate-400 focus:outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
            {filteredProductList.length > 0 ? (
              filteredProductList.map((prod) => (
                <button
                  key={prod.code}
                  onClick={() => setSelectedProductCode(prod.code)}
                  className={`w-full p-3 text-left transition-colors flex items-center justify-between text-xs ${
                    selectedProductCode === prod.code 
                      ? 'bg-blue-50/70 border-r-3 border-blue-600' 
                      : 'hover:bg-slate-50/50'
                  }`}
                >
                  <div className="space-y-1 pr-3">
                    <p className={`font-bold text-slate-800 ${selectedProductCode === prod.code ? 'text-blue-900' : ''}`}>
                      {prod.name}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">Cod Selgros: {prod.code}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold font-mono text-slate-900">{prod.latestPrice.toFixed(2)} RON</p>
                    <span className="text-[9px] text-slate-400 font-medium">{prod.pointsCount} facturi</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 italic text-xs">
                Niciun produs găsit.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT CHART PANEL: Visual details */}
        <div className="md:col-span-2 space-y-6">
          {activeProduct ? (
            <div className="space-y-6">
              
              {/* Product overview and fast statistics widgets */}
              <div className="bg-white border border-slate-150 p-6 rounded-xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                      <Package className="w-5 h-5 text-blue-500" />
                      {activeProduct.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">Identificator articol (SKU Selgros): {selectedProductCode}</p>
                  </div>
                  
                  {/* Price movement badge */}
                  <div>
                    {priceChange === 0 ? (
                      <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-sm font-semibold font-sans">
                        Fără fluctuații preț (0%)
                      </span>
                    ) : priceChange > 0 ? (
                      <span className="bg-rose-50 border border-rose-150 text-rose-700 text-xs px-2.5 py-1 rounded-sm font-bold flex items-center gap-1">
                        <ArrowUpRight className="w-4 h-4" />
                        Scumpit cu {priceChangePercent}%
                      </span>
                    ) : (
                      <span className="bg-emerald-50 border border-emerald-150 text-emerald-700 text-xs px-2.5 py-1 rounded-sm font-bold flex items-center gap-1">
                        <ArrowDownRight className="w-4 h-4" />
                        Ieftinit cu {Math.abs(priceChangePercent)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* mini stats grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 border p-3 rounded-lg text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PREȚ MINIM</span>
                    <span className="text-sm font-bold font-mono text-slate-900">{minPrice.toFixed(2)} RON</span>
                  </div>
                  <div className="bg-slate-50 border p-3 rounded-lg text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PREȚ MEDIU</span>
                    <span className="text-sm font-bold font-mono text-slate-900">{avgPrice.toFixed(2)} RON</span>
                  </div>
                  <div className="bg-slate-50 border p-3 rounded-lg text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PREȚ MAXIM</span>
                    <span className="text-sm font-bold font-mono text-slate-900">{maxPrice.toFixed(2)} RON</span>
                  </div>
                </div>
              </div>

              {/* Graphical representation curve */}
              <div className="bg-white border border-slate-150 p-6 rounded-xl shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-6 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Evoluție preț unitar / Price timeline
                </h4>

                {hasHistory ? (
                  <div className="w-full flex justify-center">
                    <div className="relative w-full max-w-full overflow-x-auto">
                      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto min-w-[420px]">
                        {/* Grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
                          const y = paddingY + r * (chartHeight - paddingY * 2);
                          const priceVal = maxVal - r * valRange;
                          return (
                            <g key={idx} className="opacity-40">
                              <line 
                                x1={paddingX} 
                                y1={y} 
                                x2={chartWidth - paddingX} 
                                y2={y} 
                                stroke="#e2e8f0" 
                                strokeWidth="0.8" 
                                strokeDasharray="3 3"
                              />
                              <text 
                                x={paddingX - 5} 
                                y={y + 3} 
                                textAnchor="end" 
                                fill="#94a3b8" 
                                className="text-[8px] font-mono"
                              >
                                {priceVal.toFixed(2)}
                              </text>
                            </g>
                          );
                        })}

                        {/* Covered Area */}
                        {areaPathD && (
                          <path d={areaPathD} fill="url(#priceGrad)" />
                        )}

                        {/* Connector line */}
                        {pathD && (
                          <path 
                            d={pathD} 
                            fill="none" 
                            stroke="#2563eb" 
                            strokeWidth="2" 
                            strokeLinecap="round"
                          />
                        )}

                        {/* Plots */}
                        {svgPoints.map((p, idx) => (
                          <g key={idx} className="group cursor-pointer">
                            <circle 
                              cx={p.x} 
                              cy={p.y} 
                              r="4" 
                              fill="#2563eb" 
                              stroke="#ffffff" 
                              strokeWidth="1"
                            />
                            {/* hoverable pill labels */}
                            <text 
                              x={p.x} 
                              y={p.y - 8} 
                              textAnchor="middle" 
                              fill="#1e293b" 
                              className="text-[8px] font-mono font-bold bg-white"
                            >
                              {p.price.toFixed(2)} RON
                            </text>
                            <text
                              x={p.x}
                              y={chartHeight - 12}
                              textAnchor="middle"
                              fill="#64748b"
                              className="text-[9px] font-sans"
                            >
                              {p.date}
                            </text>
                          </g>
                        ))}

                        <defs>
                          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center text-slate-400 italic text-xs">
                    Acest produs apare o singură dată în baza de date. Evoluția se generează la inserarea a minimum 2 facturi.
                  </div>
                )}
              </div>

              {/* AI intelligent comment box */}
              <div className="bg-blue-50/50 border border-blue-150 p-5 rounded-xl text-xs text-slate-700 flex gap-3">
                <span className="p-1.5 bg-blue-100 text-blue-700 rounded-full shrink-0 h-8 w-8 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4 shrink-0" />
                </span>
                <div className="space-y-1">
                  <span className="font-bold text-blue-900 block">Observații AI Parser: evoluție comercială</span>
                  <p className="text-slate-650 mt-0.5 leading-relaxed">
                    Prețul curent unitar pentru <strong className="text-blue-950 font-semibold">{activeProduct.name}</strong> este de <strong>{historyPoints[historyPoints.length - 1]?.unitPrice.toFixed(2)} RON</strong>. 
                    {priceChange > 0 ? (
                      ` Se remarcă o pantă inflationistă de +${priceChangePercent}% comparativ cu prima achiziție din ${historyPoints[0]?.date}. Vă sugerăm să renegociați pachetele bulk de la Selgros.`
                    ) : priceChange < 0 ? (
                      ` Trend favorabil de scădere a costului cu ${Math.abs(priceChangePercent)}%. Recomandăm suplimentarea stocurilor pe baza acestui preț avantajos de discount.`
                    ) : (
                      ' Prețul unitar a rămas remarcabil de stabil pe parcursul trimestrului curent, oferind un grad ridicat de siguranță pentru previziuni bugetare.'
                    )}
                  </p>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-150 p-12 text-center rounded-xl flex items-center justify-center max-h-[400px]">
              <p className="text-slate-400 italic text-xs">Alegeți un produs din lista stângă pentru analiza curbei de cost.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
