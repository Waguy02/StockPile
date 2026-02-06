import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, 
  AlertCircle, 
  Package, 
  ShoppingCart,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  MoreHorizontal
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useStore } from '../../lib/StoreContext';
import { formatCurrency } from '../../lib/formatters';

const chartData = [
  { name: 'Jan', sales: 4000, orders: 2400 },
  { name: 'Feb', sales: 3000, orders: 1398 },
  { name: 'Mar', sales: 2000, orders: 9800 },
  { name: 'Apr', sales: 2780, orders: 3908 },
  { name: 'May', sales: 1890, orders: 4800 },
  { name: 'Jun', sales: 2390, orders: 3800 },
  { name: 'Jul', sales: 3490, orders: 4300 },
];

export function Dashboard() {
  const { stockBatches, sales, purchaseOrders, isLoading } = useStore();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  const totalStockCount = stockBatches.reduce((acc, batch) => acc + batch.quantity, 0);
  const totalSalesRevenue = sales.reduce((acc, sale) => acc + sale.totalAmount, 0);
  const lowStockItems = stockBatches.filter(b => b.quantity < 10).length;
  const pendingOrders = purchaseOrders.filter(p => p.status === 'pending').length;

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex gap-2">
            <select className="bg-white border-0 ring-1 ring-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer">
                <option>{t('dashboard.filter.last7Days')}</option>
                <option>{t('dashboard.filter.last30Days')}</option>
                <option>{t('dashboard.filter.thisQuarter')}</option>
            </select>
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md shadow-indigo-200 transition-colors">
                {t('dashboard.downloadReport')}
            </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={t('dashboard.totalInventory')}
          value={totalStockCount.toString()} 
          subtitle={t('dashboard.itemsInStock')}
          icon={Package}
          trend="+12%"
          trendUp={true}
          variant="blue"
        />
        <StatCard 
          title={t('dashboard.totalRevenue')}
          value={formatCurrency(totalSalesRevenue)} 
          subtitle={t('dashboard.currentFiscalYear')}
          icon={DollarSign}
          trend="+8.2%"
          trendUp={true}
          variant="green"
        />
        <StatCard 
          title={t('dashboard.lowStock')}
          value={lowStockItems.toString()} 
          subtitle={t('dashboard.batchesBelowThreshold')}
          icon={AlertCircle}
          trend="Action needed"
          trendUp={false}
          variant="red"
        />
        <StatCard 
          title={t('dashboard.pendingOrders')}
          value={pendingOrders.toString()} 
          subtitle={t('dashboard.awaitingDelivery')}
          icon={ShoppingCart}
          trend="2 arriving"
          trendUp={true}
          variant="purple"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-100 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-8">
            <div>
                 <h2 className="text-lg font-bold text-slate-900">{t('dashboard.revenueAnalytics')}</h2>
                 <p className="text-xs text-slate-400 mt-1 font-medium">{t('dashboard.comparisonSalesProcurement')}</p>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 500}} 
                    dy={10}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 500}} 
                />
                <Tooltip 
                  contentStyle={{
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', 
                      padding: '12px 16px',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(4px)'
                  }}
                  itemStyle={{ fontSize: '13px', fontWeight: 600 }}
                  labelStyle={{ color: '#64748b', fontSize: '12px', marginBottom: '8px' }}
                />
                <Area 
                    type="monotone" 
                    dataKey="sales" 
                    name="Sales Revenue"
                    stroke="#4f46e5" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                />
                <Area 
                    type="monotone" 
                    dataKey="orders" 
                    name="Procurement Cost"
                    stroke="#f59e0b" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorOrders)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] flex flex-col">
          <h2 className="text-lg font-bold text-slate-900 mb-6">{t('dashboard.recentActivity')}</h2>
          <div className="space-y-6 flex-1 overflow-auto pr-2 custom-scrollbar">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-4 group cursor-pointer">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    i % 2 === 0 
                        ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' 
                        : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'
                }`}>
                  {i % 2 === 0 ? <DollarSign className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                     <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {i % 2 === 0 ? t('dashboard.activity.newSale') : t('dashboard.activity.stockBatch')}
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-full">2h</span>
                  </div>
                 
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {i % 2 === 0 
                        ? t('dashboard.activity.saleDesc', { id: '2490', customer: 'Acme Corp.' }) 
                        : t('dashboard.activity.batchDesc', { id: 'B-902', count: '50' })
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-3 text-sm text-indigo-600 font-semibold bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all duration-200">
            {t('dashboard.viewAllActivity')}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp, variant }: any) {
  const styles: any = {
    blue: { bg: "bg-blue-500", text: "text-blue-600", light: "bg-blue-50" },
    green: { bg: "bg-emerald-500", text: "text-emerald-600", light: "bg-emerald-50" },
    red: { bg: "bg-rose-500", text: "text-rose-600", light: "bg-rose-50" },
    purple: { bg: "bg-violet-500", text: "text-violet-600", light: "bg-violet-50" },
    orange: { bg: "bg-amber-500", text: "text-amber-600", light: "bg-amber-50" },
  };

  const s = styles[variant] || styles.blue;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900 mt-2 tracking-tight group-hover:text-indigo-600 transition-colors">{value}</h3>
        </div>
        <div className={`p-3.5 rounded-xl ${s.light} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`w-6 h-6 ${s.text}`} />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
         <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
             {trendUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
             {trend}
         </div>
         <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
      </div>
    </div>
  );
}
