import { Invoice, CostCenter, Language } from '../types';
import { translations } from '../translations';
import { DollarSign, FileText, CheckCircle2, AlertCircle, TrendingUp, Landmark, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  invoices: Invoice[];
  costCenters: CostCenter[];
  onNavigate: (view: string) => void;
  lang: Language;
}

export default function Dashboard({ invoices, costCenters, onNavigate, lang }: DashboardProps) {
  const t = translations[lang];
  // Calculations
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.paid, 0);
  const totalRest = invoices.reduce((sum, inv) => sum + inv.rest, 0);
  const invoiceCount = invoices.length;
  const unpaidCount = invoices.filter(inv => inv.status !== 'paid').length;

  // Monthly breakdown
  const monthlyData: { [key: string]: number } = {};
  invoices.forEach(inv => {
    // invoice date is DD/MM/YYYY, extract month/year
    const splitted = inv.date.split('/');
    if (splitted.length === 3) {
      const monthYear = `${splitted[1]}/${splitted[2]}`; // MM/YYYY
      monthlyData[monthYear] = (monthlyData[monthYear] || 0) + inv.total;
    }
  });

  // Sort months chronologically
  const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
    const [mA, yA] = a.split('/').map(Number);
    const [mB, yB] = b.split('/').map(Number);
    return yA !== yB ? yA - yB : mA - mB;
  });

  // Map to simple human readable format
  const monthNames = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec'];
  const trendPoints = sortedMonths.map(my => {
    const [m, y] = my.split('/').map(Number);
    return {
      label: `${monthNames[m - 1]} '${String(y).slice(2)}`,
      amount: monthlyData[my]
    };
  });

  // Fallback if empty
  if (trendPoints.length === 0) {
    trendPoints.push({ label: 'Inițial', amount: 0 });
  }

  // Cost Center data
  const ccExpenses = costCenters.map(cc => {
    const total = invoices
      .filter(inv => inv.costCenter === cc.name)
      .reduce((sum, inv) => sum + inv.total, 0);
    return {
      name: cc.name,
      code: cc.code,
      budget: cc.budget,
      spent: total,
      percentage: cc.budget > 0 ? Math.min(Math.round((total / cc.budget) * 100), 100) : 0
    };
  });

  // SVG Chart Calculations
  const maxTrendAmount = Math.max(...trendPoints.map(p => p.amount), 1000);
  const chartHeight = 160;
  const chartWidth = 500;
  const padding = 40;

  // Generate SVG path coordinate points
  const points = trendPoints.map((pt, i) => {
    const x = padding + (i / Math.max(trendPoints.length - 1, 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - (pt.amount / maxTrendAmount) * (chartHeight - padding * 2);
    return { x, y, label: pt.label, amount: pt.amount };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  // For filling under the curve
  const areaPathD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z` 
    : '';

  // Container motion variant
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div id="dashboard-wrapper" className="space-y-8 p-1">
      {/* Top Welcome Title */}
      <div>
        <h1 id="dashboard-main-title" className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans">
          {lang === 'RO' ? 'Panou de Control / Dashboard' : 'Executive Control Dashboard'}
        </h1>
        <p id="dashboard-subtitle" className="text-xs text-slate-500 font-medium mt-1">
          {lang === 'RO' 
            ? 'Analiza cheltuielilor, încărcările e-Factura și distribuția bugetară pe centre de cost.'
            : 'Expense analytics, e-Invoice processing logs and cost center specific budget allocations.'}
        </p>
      </div>

      {/* KPI Overviews Grid */}
      <motion.div 
        id="kpi-grid"
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        <motion.div 
          id="kpi-card-invoiced"
          variants={itemVariants}
          className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs hover:shadow-md transition-shadow flex items-start justify-between"
        >
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-450">{lang === 'RO' ? 'Total Facturat' : 'Total Invoiced'}</span>
            <div className="text-2xl font-black text-slate-900">{totalInvoiced.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">{lang === 'RO' ? 'Înregistrat prin parser' : 'Parsed XML inputs'}</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
            <FileText className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div 
          id="kpi-card-paid"
          variants={itemVariants}
          className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs hover:shadow-md transition-shadow flex items-start justify-between"
        >
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-450">{lang === 'RO' ? 'Total Plătit' : 'Total Paid'}</span>
            <div className="text-2xl font-black text-emerald-600">{totalPaid.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">{lang === 'RO' ? 'Tranzacții confirmate' : 'Confirmed payouts'}</p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div 
          id="kpi-card-remaining"
          variants={itemVariants}
          className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs hover:shadow-md transition-shadow flex items-start justify-between"
        >
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-450">{lang === 'RO' ? 'Rest de Plată' : 'Remaining Liability'}</span>
            <div className="text-2xl font-black text-rose-600">{totalRest.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</div>
            <p className="text-[10px] text-rose-500 font-bold uppercase tracking-wider font-mono">{lang === 'RO' ? 'Necesită atenție' : 'Requires attention'}</p>
          </div>
          <div className="bg-rose-50 p-3 rounded-lg text-rose-600">
            <AlertCircle className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div 
          id="kpi-card-volume"
          variants={itemVariants}
          className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs hover:shadow-md transition-shadow flex items-start justify-between"
        >
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-450">{lang === 'RO' ? 'Volum Facturi' : 'Invoice Count'}</span>
            <div className="text-2xl font-black text-slate-900">{invoiceCount} {lang === 'RO' ? 'documente' : 'documents'}</div>
            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider font-mono">{unpaidCount} {lang === 'RO' ? 'neachitate' : 'unpaid'}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-purple-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </motion.div>
      </motion.div>

      {/* Main Charts area */}
      <div id="dashboard-charts-layout" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Expenditure trend visualizer */}
        <div id="expenditure-trend-card" className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-900 text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                {lang === 'RO' ? 'Evoluție Achiziții / Monthly Trend' : 'Monthly Expenditure Trend'}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'RO' ? 'Valoarea totală a facturilor e-Factura pe luni' : 'Total processed e-Invoice expenditures grouped by month'}
              </p>
            </div>
            <span className="text-xs bg-slate-50 text-slate-600 px-2.5 py-1 rounded-md border border-slate-150 font-mono">
              {lang === 'RO' ? 'Grupat calendaristic' : 'Grouped by month'}
            </span>
          </div>

          {/* Fallback to standard graphics if just 1 item / SVG visualization */}
          <div className="w-full flex justify-center">
            <div className="relative w-full max-w-full overflow-x-auto">
              {trendPoints.length > 0 ? (
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto min-w-[450px]">
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
                    const y = padding + r * (chartHeight - padding * 2);
                    const labelVal = maxTrendAmount * (1 - r);
                    return (
                      <g key={idx} className="opacity-40">
                        <line 
                          x1={padding} 
                          y1={y} 
                          x2={chartWidth - padding} 
                          y2={y} 
                          stroke="#e2e8f0" 
                          strokeWidth="1" 
                          strokeDasharray="4 4"
                        />
                        <text 
                          x={padding - 5} 
                          y={y + 4} 
                          textAnchor="end" 
                          fill="#94a3b8" 
                          className="text-[9px] font-mono"
                        >
                          {Math.round(labelVal)} RON
                        </text>
                      </g>
                    );
                  })}

                  {/* Shaded Area Under Curve */}
                  {areaPathD && (
                    <path 
                      d={areaPathD} 
                      fill="url(#chartGrad)" 
                    />
                  )}

                  {/* Main Line */}
                  {pathD && (
                    <path 
                      d={pathD} 
                      fill="none" 
                      stroke="#3b82f6" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Plot Dots and Labels */}
                  {points.map((p, idx) => (
                    <g key={idx} className="group cursor-pointer">
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r="4" 
                        fill="#3b82f6" 
                        stroke="#ffffff" 
                        strokeWidth="1.5" 
                        className="transition-transform duration-200 hover:scale-150"
                      />
                      <text 
                        x={p.x} 
                        y={p.y - 8} 
                        textAnchor="middle" 
                        fill="#1e293b" 
                        className="text-[8px] font-semibold font-mono bg-white"
                      >
                        {Math.round(p.amount)} RON
                      </text>
                      <text 
                        x={p.x} 
                        y={chartHeight - 15} 
                        textAnchor="middle" 
                        fill="#64748b" 
                        className="text-[9px] font-medium"
                      >
                        {p.label}
                      </text>
                    </g>
                  ))}

                  {/* Definitions */}
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                </svg>
              ) : (
                <div className="h-40 flex items-center justify-center text-slate-450 text-sm">
                  {lang === 'RO' ? 'Nu există suficiente date pentru grafic.' : 'Insufficient data points to plot trend line.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cost Centers budget list card */}
        <div id="cost-centers-overview-card" className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-lg mb-1 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-purple-500" />
              {lang === 'RO' ? 'Bugete Centre Cost' : 'Cost Department Budgets'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              {lang === 'RO' ? 'Distribuția cheltuielilor e-Factura' : 'Budget breakdowns from parsed vendor invoices'}
            </p>
            
            <div className="space-y-3.5">
              {ccExpenses.map((cc, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{cc.name}</span>
                    <span className="font-mono text-slate-550 font-semibold">
                      {cc.spent.toLocaleString('ro-RO')} / {cc.budget.toLocaleString('ro-RO')} RON
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div 
                      className={`h-full rounded-full ${cc.percentage > 90 ? 'bg-rose-500' : cc.percentage > 60 ? 'bg-amber-500' : 'bg-purple-500'}`}
                      style={{ width: `${cc.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold font-mono">
                    <span>{cc.code}</span>
                    <span>{cc.percentage}% {lang === 'RO' ? 'consumat' : 'consumed'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button 
            id="navigate-to-ledger-btn"
            onClick={() => onNavigate('ledger')}
            className="w-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-extrabold text-xs py-2.5 rounded-lg transition-all mt-6 cursor-pointer"
          >
            {lang === 'RO' ? 'Gestionează Registru Facturi' : 'Manage Invoices Registry'}
          </button>
        </div>
      </div>

      {/* Embedded Action Panel / Short description */}
      <div id="action-panel-help" className="bg-slate-50 border border-slate-150 p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 mt-0.5 md:mt-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">
              {lang === 'RO' ? 'Validat prin sistemul obligatoriu RO e-Factura' : 'Verified via Romanian RO e-Factura Standards'}
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {lang === 'RO' 
                ? 'Încarcă oricând XML-uri direct exportate din sistemul ANAF sau facturi SELGROS. Sistemul parser va extrage automat liniile de produse, prețurile unitare și va grupa totul pe centrele tale de cost.'
                : 'Upload native ANAF XML export files or standard Selgros invoices. The system automatically reads products, pricing and associates charges back to cost centers.'}
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end">
          <button 
            id="btn-upload-direct"
            onClick={() => onNavigate('ledger')} 
            className="bg-slate-900 border border-slate-900 text-white font-extrabold text-xs px-4 py-2.5 rounded-lg hover:bg-slate-800 active:scale-95 transition-all text-center w-full md:w-auto cursor-pointer"
          >
            {lang === 'RO' ? 'Mergi la Registru' : 'Go to Ledger'}
          </button>
        </div>
      </div>
    </div>
  );
}
