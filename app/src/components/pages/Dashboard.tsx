import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  AlertCircle, 
  Package, 
  ShoppingCart,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Download,
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUp,
  Activity,
  Truck
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { useStore } from '../../lib/StoreContext';
import { formatCurrency, formatDateForDisplay } from '../../lib/formatters';
import { savePdf } from '../../lib/downloadPdf';
import { loadLogoWithTextDataUrl, drawPdfHeader } from '../../lib/pdfReportHeader';
import { ViewState } from '../../lib/data';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

// --- Colors for Charts ---
// More refined palette
const COLORS = [
    '#6366f1', // Indigo 500
    '#10b981', // Emerald 500
    '#f59e0b', // Amber 500
    '#ec4899', // Pink 500
    '#8b5cf6', // Violet 500
    '#06b6d4', // Cyan 500
    '#f43f5e'  // Rose 500
];

// Helper: build time-bucket key and label from a date, based on the selected time range
function getTimeBucket(date: Date, timeRange: string): { key: string; label: string } {
  if (timeRange === 'last24Hours') {
    // Group by hour
    const h = date.getHours();
    return { key: `h-${String(h).padStart(2, '0')}`, label: `${String(h).padStart(2, '0')}h` };
  }
  if (timeRange === 'last7Days' || timeRange === 'last30Days') {
    // Group by day
    const d = date.toISOString().slice(0, 10); // YYYY-MM-DD
    const label = date.toLocaleDateString('default', { day: '2-digit', month: 'short' });
    return { key: d, label };
  }
  // lastTrimester, lastYear, allTime => group by month
  const m = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  const label = date.toLocaleDateString('default', { month: 'short', year: 'numeric' });
  return { key: m, label };
}

export function Dashboard({ onNavigate }: { onNavigate: (view: ViewState) => void }) {
  const { stockBatches, sales, purchaseOrders, payments, products, categories, customers, providers, managers, isLoading, currentUser } = useStore();
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState('last7Days');

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || t('common.unknown');
  const getProviderName = (id: string) => providers.find(p => p.id === id)?.name || t('common.unknown');
  const getManagerName = (id: string) => {
    if (id && id === currentUser?.id) return currentUser.name || t('common.unknown');
    return managers.find(m => m.id === id)?.name || t('common.unknown');
  };

  // RBAC Filtering
  const isStaff = currentUser?.role === 'staff';
  
  const relevantSales = useMemo(() => {
    if (isStaff && currentUser) {
      return sales.filter(s => s.managerId === currentUser.id);
    }
    return sales;
  }, [sales, isStaff, currentUser]);

  const relevantOrders = useMemo(() => {
    if (isStaff) return [];
    return purchaseOrders;
  }, [purchaseOrders, isStaff]);

  const relevantBatches = useMemo(() => {
    if (isStaff) return []; // Staff cannot see stock batches
    return stockBatches;
  }, [stockBatches, isStaff]);

  // --- Recent Activity: all actions (sales, POs, batches, payments) regardless of who
  type ActivityItem = { key: string; date: string; type: string; title: string; desc: string; nav: ViewState; icon: 'sale' | 'saleUpdated' | 'batch' | 'po' | 'paymentIn' | 'paymentOut'; managerId?: string; responsibleName?: string };
  const recentActivityItems = useMemo(() => {
    const items: ActivityItem[] = [];
    const cust = (id: string) => customers.find(c => c.id === id)?.name || t('common.unknown');
    const prov = (id: string) => providers.find(p => p.id === id)?.name || t('common.unknown');
    const respName = (managerId: string | undefined) => managerId ? getManagerName(managerId) : undefined;
    sales.forEach(s => {
      const saleIdShort = s.id.slice(0, 8).toUpperCase();
      const updatedAt = (s as any).updatedAt;
      const isUpdated = updatedAt && updatedAt !== s.initiationDate;
      const mid = (s as any).managerId;
      if (isUpdated) {
        items.push({
          key: `sale-updated-${s.id}`,
          date: updatedAt,
          type: 'saleUpdated',
          title: t('dashboard.activity.saleUpdated'),
          desc: t('dashboard.activity.saleUpdatedDesc', { id: saleIdShort }),
          nav: 'sales',
          icon: 'saleUpdated',
          managerId: mid,
          responsibleName: respName(mid),
        });
      } else {
        items.push({
          key: `sale-${s.id}`,
          date: s.initiationDate || '',
          type: 'sale',
          title: t('dashboard.activity.newSale'),
          desc: t('dashboard.activity.saleDesc', { id: saleIdShort, customer: cust(s.customerId) }),
          nav: 'sales',
          icon: 'sale',
          managerId: mid,
          responsibleName: respName(mid),
        });
      }
    });
    purchaseOrders.forEach(po => {
      const mid = (po as any).managerId;
      items.push({
        key: `po-${po.id}`,
        date: po.initiationDate || '',
        type: 'purchaseOrder',
        title: t('dashboard.activity.purchaseOrder'),
        desc: t('dashboard.activity.purchaseOrderDesc', { id: po.id.slice(0, 8).toUpperCase(), provider: prov(po.providerId) }),
        nav: 'procurement',
        icon: 'po',
        managerId: mid,
        responsibleName: respName(mid),
      });
      if (po.status === 'completed' && po.finalizationDate) {
        items.push({
          key: `po-received-${po.id}`,
          date: po.finalizationDate,
          type: 'stockReceived',
          title: t('dashboard.activity.stockReceived'),
          desc: t('dashboard.activity.stockReceivedDesc', { id: po.id.slice(0, 8).toUpperCase() }),
          nav: 'procurement',
          icon: 'batch',
          managerId: mid,
          responsibleName: respName(mid),
        });
      }
    });
    stockBatches.forEach(b => {
      items.push({
        key: `batch-${b.id}`,
        date: b.entryDate || '',
        type: 'batch',
        title: t('dashboard.activity.stockBatch'),
        desc: t('dashboard.activity.batchDesc', { id: b.id.slice(0, 8).toUpperCase(), count: b.quantity }),
        nav: 'inventory',
        icon: 'batch',
      });
    });
    payments.forEach(p => {
      const isIn = p.referenceType === 'sale';
      const refShort = (p.referenceId || '').slice(0, 8).toUpperCase();
      const amountStr = formatCurrency(p.amount);
      const mid = p.managerId;
      items.push({
        key: `pay-${p.id}`,
        date: p.date || '',
        type: isIn ? 'paymentIn' : 'paymentOut',
        title: isIn ? t('dashboard.activity.paymentIn') : t('dashboard.activity.paymentOut'),
        desc: isIn ? t('dashboard.activity.paymentInDesc', { amount: amountStr, ref: refShort }) : t('dashboard.activity.paymentOutDesc', { amount: amountStr, ref: refShort }),
        nav: 'finance',
        icon: isIn ? 'paymentIn' : 'paymentOut',
        managerId: mid,
        responsibleName: respName(mid),
      });
    });
    return items.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 4);
  }, [sales, purchaseOrders, stockBatches, payments, customers, providers, managers, currentUser, t]);

  // --- Derived Data for New Charts ---

  // 1. Stock Distribution by Category
  const stockByCategoryData = useMemo(() => {
    const categoryCount: Record<string, number> = {};
    relevantBatches.forEach(batch => {
      const product = products.find(p => p.id === batch.productId);
      if (product) {
        const category = categories.find(c => c.id === product.categoryId);
        const catName = category ? category.name : t('common.unknown');
        categoryCount[catName] = (categoryCount[catName] || 0) + batch.quantity;
      }
    });
    return Object.entries(categoryCount).map(([name, value]) => ({ name, value }));
  }, [relevantBatches, products, categories, t]);

  // 2. Top Selling Products
  const topSellingData = useMemo(() => {
    const productSales: Record<string, number> = {};
    relevantSales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
           const product = products.find(p => p.id === item.productId);
           const name = product ? product.name : 'Unknown Product';
           productSales[name] = (productSales[name] || 0) + item.quantity;
        });
      }
    });
    
    return Object.entries(productSales)
      .map(([name, value]) => ({ name, quantity: value }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [relevantSales, products]);

  // 3. Purchase Order Status Distribution
  const orderStatusData = useMemo(() => {
    const statusCount: Record<string, number> = {};
    relevantOrders.forEach(po => {
      const status = t(`procurement.status.${po.status}`);
      statusCount[status] = (statusCount[status] || 0) + 1;
    });
    return Object.entries(statusCount).map(([name, value]) => ({ name, value }));
  }, [relevantOrders, t]);

  // 4. Revenue chart data filtered by selected time range
  const filteredChartData = useMemo(() => {
    const now = new Date();
    const past = new Date();
    if (timeRange === 'last24Hours') past.setTime(now.getTime() - 24 * 60 * 60 * 1000);
    else if (timeRange === 'last7Days') past.setDate(now.getDate() - 7);
    else if (timeRange === 'last30Days') past.setDate(now.getDate() - 30);
    else if (timeRange === 'lastTrimester') past.setMonth(now.getMonth() - 3);
    else if (timeRange === 'lastYear') past.setFullYear(now.getFullYear() - 1);
    else past.setFullYear(2000); // allTime fallback

    // Pre-generate all empty buckets for the full range so chart always shows full timeline
    const buckets: Record<string, { label: string; fullLabel: string; sales: number; procurement: number }> = {};

    if (timeRange === 'last24Hours') {
      // One bucket per hour for the last 24 hours
      for (let i = 0; i < 24; i++) {
        const d = new Date(past.getTime() + i * 60 * 60 * 1000);
        const h = d.getHours();
        const key = `h-${String(h).padStart(2, '0')}`;
        const fullLabel = d.toLocaleDateString('default', { day: '2-digit', month: 'long', year: 'numeric' }) + ` ${String(h).padStart(2, '0')}h`;
        buckets[key] = { label: `${String(h).padStart(2, '0')}h`, fullLabel, sales: 0, procurement: 0 };
      }
    } else if (timeRange === 'last7Days' || timeRange === 'last30Days') {
      // One bucket per day
      const cursor = new Date(past);
      cursor.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      while (cursor <= end) {
        const key = cursor.toISOString().slice(0, 10);
        const label = cursor.toLocaleDateString('default', { day: '2-digit', month: 'short' });
        const fullLabel = cursor.toLocaleDateString('default', { day: '2-digit', month: 'long', year: 'numeric' });
        buckets[key] = { label, fullLabel, sales: 0, procurement: 0 };
        cursor.setDate(cursor.getDate() + 1);
      }
    } else {
      // lastTrimester, lastYear, allTime => one bucket per month
      const cursor = new Date(past.getFullYear(), past.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 1);
      while (cursor <= end) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        const label = cursor.toLocaleDateString('default', { month: 'short', year: 'numeric' });
        const fullLabel = cursor.toLocaleDateString('default', { month: 'long', year: 'numeric' });
        buckets[key] = { label, fullLabel, sales: 0, procurement: 0 };
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    // Aggregate sales into pre-generated buckets
    relevantSales
      .filter(s => new Date(s.initiationDate) >= past)
      .forEach(s => {
        const { key } = getTimeBucket(new Date(s.initiationDate), timeRange);
        if (buckets[key]) buckets[key].sales += s.totalAmount;
      });

    // Aggregate procurement costs
    relevantOrders
      .filter(po => new Date(po.initiationDate) >= past)
      .forEach(po => {
        const { key } = getTimeBucket(new Date(po.initiationDate), timeRange);
        if (buckets[key]) buckets[key].procurement += po.totalAmount;
      });

    // Sort buckets chronologically by key
    const sorted = Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({ name: v.label, fullLabel: v.fullLabel, sales: v.sales, orders: v.procurement }));

    return sorted.length > 0 ? sorted : [{ name: '-', fullLabel: '-', sales: 0, orders: 0 }];
  }, [relevantSales, relevantOrders, timeRange]);


  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  const getDateRangeLabel = () => {
    switch(timeRange) {
      case 'last24Hours': return t('dashboard.filter.last24Hours');
      case 'last7Days': return t('dashboard.filter.last7Days');
      case 'last30Days': return t('dashboard.filter.last30Days');
      case 'lastTrimester': return t('dashboard.filter.lastTrimester');
      case 'lastYear': return t('dashboard.filter.lastYear');
      default: return '';
    }
  };

  const getFilteredSales = () => {
    const now = new Date();
    const past = new Date();
    if (timeRange === 'last24Hours') past.setTime(now.getTime() - 24 * 60 * 60 * 1000);
    if (timeRange === 'last7Days') past.setDate(now.getDate() - 7);
    if (timeRange === 'last30Days') past.setDate(now.getDate() - 30);
    if (timeRange === 'lastTrimester') past.setMonth(now.getMonth() - 3);
    if (timeRange === 'lastYear') past.setFullYear(now.getFullYear() - 1);

    return relevantSales.filter(s => new Date(s.initiationDate) >= past);
  };

  const totalStockCount = relevantBatches.reduce((acc, batch) => acc + batch.quantity, 0);
  const filteredSales = getFilteredSales();
  const filteredSalesRevenue = filteredSales.reduce((acc, sale) => acc + sale.totalAmount, 0);
  const filteredPaidRevenue = filteredSales.reduce((acc, sale) => acc + (sale.amountPaid || 0), 0);
  const filteredPendingPayments = filteredSalesRevenue - filteredPaidRevenue;
  const pendingPaymentCount = filteredSales.filter(s => s.totalAmount > (s.amountPaid || 0)).length;
  const lowStockItems = relevantBatches.filter(b => b.quantity < 10).length;
  const pendingOrders = relevantOrders.filter(p => p.status === 'pending').length;

  const totalStockValue = useMemo(
    () =>
      products.reduce((sum, p) => {
        const qty = relevantBatches.filter((b) => b.productId === p.id).reduce((s, b) => s + b.quantity, 0);
        return sum + qty * p.baseUnitPrice;
      }, 0),
    [products, relevantBatches]
  );

  const handleDownloadReport = async () => {
    const doc = new jsPDF();
    const margin = 10;
    const pageW = doc.internal.pageSize.getWidth();
    const logoDataUrl = await loadLogoWithTextDataUrl();
    let currentY = drawPdfHeader(doc, logoDataUrl);

    // Period bounds (same logic as getFilteredSales)
    const endDate = new Date();
    const startDate = new Date();
    if (timeRange === 'last24Hours') startDate.setTime(endDate.getTime() - 24 * 60 * 60 * 1000);
    else if (timeRange === 'last7Days') startDate.setDate(endDate.getDate() - 7);
    else if (timeRange === 'last30Days') startDate.setDate(endDate.getDate() - 30);
    else if (timeRange === 'lastTrimester') startDate.setMonth(endDate.getMonth() - 3);
    else if (timeRange === 'lastYear') startDate.setFullYear(endDate.getFullYear() - 1);
    const fmt = (d: Date) => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };
    const periodText = t('dashboard.reportPeriodRange', { start: fmt(startDate), end: fmt(endDate) });

    // Period as H1, centered
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(periodText, pageW / 2, currentY, { align: 'center' });
    currentY += 12;

    // Section 1: Key Metrics
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(t('dashboard.reportKeyMetrics'), margin, currentY);
    currentY += 5;
    
    autoTable(doc, {
        startY: currentY,
        head: [[t('dashboard.reportMetric'), t('dashboard.reportValue')]],
        body: [
            [t('dashboard.totalStockItems'), String(totalStockCount)],
            [t('dashboard.totalStockValue'), formatCurrency(totalStockValue)],
            [t('dashboard.totalRevenueSelectedPeriod'), formatCurrency(filteredPaidRevenue)],
            [t('dashboard.pendingPayments'), formatCurrency(filteredPendingPayments)],
            [t('dashboard.lowStock'), String(lowStockItems)],
            [t('dashboard.pendingOrders'), String(pendingOrders)]
        ],
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Section 2: Top Selling Products
    doc.setFontSize(14);
    doc.text(t('dashboard.topSellingProducts'), margin, currentY);
    currentY += 5;

    autoTable(doc, {
        startY: currentY,
        head: [[t('dashboard.reportProduct'), t('dashboard.reportQuantitySold')]],
        body: topSellingData.map(item => [item.name, item.quantity]),
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Section 3: Stock by Category
    doc.setFontSize(14);
    doc.text(t('dashboard.stockByCategory'), margin, currentY);
    currentY += 5;

    autoTable(doc, {
        startY: currentY,
        head: [[t('dashboard.reportCategory'), t('dashboard.reportQuantity')]],
        body: stockByCategoryData.map(item => [item.name, item.value]),
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 246] }
    });

    // "Fait le" / "Done on" at bottom (larger font)
    currentY = (doc as any).lastAutoTable.finalY + 14;
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    const doneOnText = `${t('dashboard.reportDoneOn')} ${new Date().toLocaleString()}`;
    doc.text(doneOnText, pageW / 2, pageH - 10, { align: 'center' });

    await savePdf(doc, `odicam_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex gap-2 items-stretch">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="rounded-lg border-0 ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last24Hours">{t('dashboard.filter.last24Hours')}</SelectItem>
                <SelectItem value="last7Days">{t('dashboard.filter.last7Days')}</SelectItem>
                <SelectItem value="last30Days">{t('dashboard.filter.last30Days')}</SelectItem>
                <SelectItem value="lastTrimester">{t('dashboard.filter.lastTrimester')}</SelectItem>
                <SelectItem value="lastYear">{t('dashboard.filter.lastYear')}</SelectItem>
              </SelectContent>
            </Select>
            <button 
                onClick={handleDownloadReport}
                className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/30 transition-colors whitespace-nowrap"
            >
                <Download className="w-4 h-4 shrink-0" />
                {Capacitor.getPlatform() !== 'web' ? t('dashboard.report') : t('dashboard.downloadReport')}
            </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={t('dashboard.totalInventory')}
          value={isStaff ? 'N/A' : formatCurrency(totalStockValue)} 
          secondaryValue={isStaff ? undefined : totalStockCount.toString()}
          subtitle={isStaff ? 'Restricted Access' : t('dashboard.itemsInStock')}
          icon={Package}
          trend={isStaff ? '' : "+12%"}
          trendUp={true}
          variant="blue"
          onClick={() => onNavigate('inventory')}
        />
        <StatCard 
          title={t('dashboard.totalRevenue')}
          value={formatCurrency(filteredPaidRevenue)} 
          secondaryLine={filteredPendingPayments > 0 ? `${t('dashboard.pendingPayments', { count: pendingPaymentCount })}: ${formatCurrency(filteredPendingPayments)}` : undefined}
          subtitle={getDateRangeLabel()}
          icon={DollarSign}
          trend={`+${((filteredPaidRevenue / Math.max(filteredSalesRevenue, 1)) * 100).toFixed(1)}%`}
          trendUp={true}
          variant="green"
          onClick={() => onNavigate('finance')}
        />
        <StatCard 
          title={t('dashboard.lowStock')}
          value={isStaff ? 'N/A' : lowStockItems.toString()} 
          subtitle={isStaff ? 'Restricted Access' : t('dashboard.batchesBelowThreshold')}
          icon={AlertCircle}
          trend={isStaff ? '' : t('dashboard.actionNeeded')}
          trendUp={false}
          variant="red"
          onClick={() => onNavigate('inventory')}
        />
        <StatCard 
          title={t('dashboard.pendingOrders')}
          value={isStaff ? 'N/A' : pendingOrders.toString()} 
          subtitle={isStaff ? 'Restricted Access' : t('dashboard.awaitingDelivery')}
          icon={ShoppingCart}
          trend={isStaff ? '' : t('dashboard.arriving', { count: pendingOrders })}
          trendUp={true}
          variant="purple"
          onClick={!isStaff ? () => onNavigate('procurement') : undefined}
        />
      </div>

      {/* Main Charts Section - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                 <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                 </div>
                 <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('dashboard.revenueAnalytics')}</h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">{t('dashboard.comparisonSalesProcurement')}</p>
                 </div>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
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
                    tickFormatter={(v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}k` : String(v)}
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
                  labelFormatter={(_label: string, payload: any[]) => payload?.[0]?.payload?.fullLabel || _label}
                  formatter={(value: number) => formatCurrency(value)}
                  itemStyle={{ fontSize: '13px', fontWeight: 600 }}
                  labelStyle={{ color: '#64748b', fontSize: '12px', marginBottom: '8px' }}
                />
                <Area 
                    type="monotone" 
                    dataKey="sales" 
                    name={t('dashboard.chartSalesRevenue')}
                    stroke="#6366f1" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                />
                <Area 
                    type="monotone" 
                    dataKey="orders" 
                    name={t('dashboard.chartProcurementCost')}
                    stroke="#f59e0b" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorOrders)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] flex flex-col">
          <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('dashboard.recentActivity')}</h2>
          </div>
          <div className="space-y-6 flex-1 overflow-auto pr-2 custom-scrollbar">
            {recentActivityItems.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.activity.empty')}</p>
            ) : (
              recentActivityItems.map((item) => {
                const iconClass = (item.icon === 'sale' || item.icon === 'saleUpdated') ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30'
                  : item.icon === 'batch' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30'
                  : item.icon === 'po' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30'
                  : item.icon === 'paymentIn' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30'
                  : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/30';
                const Icon = (item.icon === 'sale' || item.icon === 'saleUpdated') ? DollarSign : item.icon === 'batch' ? Package : item.icon === 'po' ? Truck : item.icon === 'paymentIn' ? ArrowDownRight : ArrowUpRight;
                return (
                  <div
                    key={item.key}
                    onClick={() => onNavigate(item.nav)}
                    className="flex items-start gap-4 group cursor-pointer"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${iconClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {item.title}
                        </p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full">{formatDateForDisplay(item.date)}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                      {item.responsibleName && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{t('dashboard.activity.byResponsible', { name: item.responsibleName })}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <button 
            onClick={() => onNavigate('activity')}
            className="w-full mt-6 py-3 text-sm text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-xl transition-all duration-200"
          >
            {t('dashboard.viewAllActivity')}
          </button>
        </div>
      </div>

      {/* Additional Insights Section - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {/* Pane 1: Stock by Category (Pie Chart) */}
        <div 
            onClick={() => onNavigate('inventory')}
            className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] flex flex-col cursor-pointer hover:shadow-lg transition-all duration-300 group"
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 transition-colors">
                    <PieChartIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{t('dashboard.stockByCategory')}</h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">{t('dashboard.distribution')}</p>
                </div>
            </div>
            
            <div className="h-72 min-h-[18rem] w-full flex items-center justify-center">
               {stockByCategoryData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={stockByCategoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius="60%"
                            outerRadius="80%"
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={5}
                        >
                            {stockByCategoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'}}
                        />
                        <Legend 
                            iconType="circle" 
                            layout="horizontal" 
                            verticalAlign="bottom" 
                            align="center"
                            wrapperStyle={{fontSize: '12px', color: '#64748b', paddingTop: '10px'}} 
                        />
                    </PieChart>
                 </ResponsiveContainer>
               ) : (
                   <div className="flex flex-col items-center justify-center text-slate-400">
                       <PieChartIcon className="w-12 h-12 mb-3 opacity-20" />
                       <p className="text-sm font-medium">No stock data available</p>
                   </div>
               )}
            </div>
        </div>

        {/* Pane 2: Top Selling Products (Bar Chart) */}
        <div 
            onClick={() => onNavigate('sales')}
            className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] lg:col-span-2 flex flex-col cursor-pointer hover:shadow-lg transition-all duration-300 group"
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-pink-50 dark:bg-pink-900/20 rounded-lg group-hover:bg-pink-100 dark:group-hover:bg-pink-900/30 transition-colors">
                    <BarChart3 className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{t('dashboard.topSellingProducts')}</h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">{t('dashboard.bestSellers')}</p>
                </div>
            </div>
            
            <div className="h-72 min-h-[18rem] w-full">
                {topSellingData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={topSellingData}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            barSize={20}
                        >
                             <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                width={120}
                                tick={{fontSize: 12, fill: '#64748b', fontWeight: 500}}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip 
                                cursor={{fill: 'transparent'}}
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                }}
                                content={({ active, payload }) => {
                                    if (!active || !payload?.length) return null;
                                    const item = payload[0].payload;
                                    return (
                                        <div className="rounded-lg border-0 bg-white dark:bg-slate-900 px-4 py-3 shadow-md">
                                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.name}</p>
                                            <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-0.5">{t('dashboard.quantityLabel')} : {item.quantity}</p>
                                        </div>
                                    );
                                }}
                            />
                            <Bar dataKey="quantity" fill="#8b5cf6" radius={[0, 6, 6, 0]}>
                                {topSellingData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        <BarChart3 className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-600" />
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No sales data available</p>
                        <p className="text-xs text-slate-400 mt-1">Start selling products to see trends here</p>
                    </div>
                )}
            </div>
        </div>

      </div>

      {/* Additional Insights Section - Row 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
           {/* Pane 3: Order Status Overview (Donut Chart) */}
           <div 
                onClick={!isStaff ? () => onNavigate('procurement') : undefined}
                className={`bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] flex flex-col hover:shadow-lg transition-all duration-300 group ${!isStaff ? 'cursor-pointer' : ''}`}
           >
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 transition-colors">
                    <PieChartIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{t('dashboard.orderStatus')}</h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">{t('dashboard.statusDistribution')}</p>
                </div>
            </div>
            
            <div className="h-72 min-h-[18rem] w-full">
               {orderStatusData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={orderStatusData}
                            cx="50%"
                            cy="50%"
                            innerRadius="60%"
                            outerRadius="80%"
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={5}
                        >
                            {orderStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'}}
                        />
                        <Legend 
                            iconType="circle" 
                            layout="horizontal" 
                            verticalAlign="bottom" 
                            align="center"
                            wrapperStyle={{fontSize: '12px', color: '#64748b', paddingTop: '10px'}} 
                        />
                    </PieChart>
                 </ResponsiveContainer>
               ) : (
                   <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                       <PieChartIcon className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-600" />
                       <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No orders available</p>
                       <p className="text-xs text-slate-400 mt-1">Create purchase orders to see distribution</p>
                   </div>
               )}
            </div>
        </div>

         {/* Pane 4: Monthly Trend (Line/Area Chart) */}
         <div 
            onClick={() => onNavigate('sales')}
            className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] flex flex-col cursor-pointer hover:shadow-lg transition-all duration-300 group"
         >
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg group-hover:bg-teal-100 dark:group-hover:bg-teal-900/30 transition-colors">
                    <TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{t('dashboard.monthlySales')}</h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">{t('dashboard.salesTrend')}</p>
                </div>
            </div>
            
            <div className="h-72 min-h-[18rem] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorSalesGrow" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <Tooltip 
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'}}
                        />
                        <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSalesGrow)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

      </div>

      {/* Report Download */}
    </div>
  );
}

function StatCard({ title, value, secondaryValue, secondaryLine, subtitle, icon: Icon, trend, trendUp, variant, onClick }: any) {
  const styles: any = {
    blue: { bg: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", light: "bg-blue-50 dark:bg-blue-900/20" },
    green: { bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", light: "bg-emerald-50 dark:bg-emerald-900/20" },
    red: { bg: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", light: "bg-rose-50 dark:bg-rose-900/20" },
    purple: { bg: "bg-violet-500", text: "text-violet-600 dark:text-violet-400", light: "bg-violet-50 dark:bg-violet-900/20" },
    orange: { bg: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", light: "bg-amber-50 dark:bg-amber-900/20" },
    slate: { bg: "bg-slate-500", text: "text-slate-600 dark:text-slate-400", light: "bg-slate-100 dark:bg-slate-800" },
  };

  const s = styles[variant] || styles.blue;

  return (
    <div 
      onClick={onClick}
      className={`flex flex-col h-full min-h-[180px] bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] hover:shadow-lg transition-all duration-300 group ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
    >
      <div className="flex items-start justify-between flex-1 min-h-0">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <h3 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mt-2 tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{value}</h3>
          {secondaryLine != null && secondaryLine !== '' && (
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mt-1.5 tabular-nums">{secondaryLine}</p>
          )}
        </div>
        <div className={`p-3.5 rounded-xl ${s.light} group-hover:scale-110 transition-transform duration-300 shrink-0`}>
          <Icon className={`w-6 h-6 ${s.text}`} />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between shrink-0">
         <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'}`}>
             {trendUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
             {trend}
         </div>
         <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
           {secondaryValue != null && secondaryValue !== '' && subtitle ? (
             <><span className="tabular-nums font-semibold text-slate-600 dark:text-slate-300">{secondaryValue}</span> {subtitle}</>
           ) : (
             subtitle
           )}
         </p>
      </div>
    </div>
  );
}
