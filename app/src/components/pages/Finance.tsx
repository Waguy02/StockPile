import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Loader2,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useStore } from '../../lib/StoreContext';
import { formatCurrency, formatDateForDisplay } from '../../lib/formatters';
import { savePdf } from '../../lib/downloadPdf';
import { loadLogoWithTextDataUrl, drawPdfHeader } from '../../lib/pdfReportHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export function Finance() {
  const { payments, sales, managers, currentUser, isLoading, products, stockBatches } = useStore();
  const { t, i18n } = useTranslation();
  const [timeRange, setTimeRange] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'sale' | 'purchase_order'>('all');
  const [responsibleFilter, setResponsibleFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const dateLocale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-GB';

  const PAGE_SIZE = 20;

  const getTimeRangeLabel = (range: string) =>
    range === 'all' ? t('dashboard.filter.allTime') : t(`dashboard.filter.${range}`);

  const getManagerName = (id: string) => {
    if (id && id === currentUser?.id) return currentUser.name || t('common.unknown');
    return managers.find(m => m.id === id)?.name || t('common.unknown');
  };

  const getFilteredPayments = () => {
    let list = payments;
    if (timeRange !== 'all') {
      const now = new Date();
      const past = new Date();
      if (timeRange === 'last24Hours') past.setTime(now.getTime() - 24 * 60 * 60 * 1000);
      else if (timeRange === 'last7Days') past.setDate(now.getDate() - 7);
      else if (timeRange === 'last30Days') past.setDate(now.getDate() - 30);
      else if (timeRange === 'lastTrimester') past.setMonth(now.getMonth() - 3);
      else if (timeRange === 'lastYear') past.setFullYear(now.getFullYear() - 1);
      list = list.filter(p => new Date(p.date) >= past);
    }
    if (typeFilter !== 'all') list = list.filter(p => p.referenceType === typeFilter);
    if (responsibleFilter !== 'all') {
      if (responsibleFilter === '__none__') list = list.filter(p => !p.managerId);
      else list = list.filter(p => p.managerId === responsibleFilter);
    }
    return list;
  };

  const filteredPayments = getFilteredPayments();
  const totalInflow = filteredPayments.filter(p => p.referenceType === 'sale').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalOutflow = filteredPayments.filter(p => p.referenceType === 'purchase_order').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const salesWithPending = sales.filter(s => s.totalAmount > (s.amountPaid || 0));
  const totalPendingPayments = salesWithPending.reduce((acc, s) => acc + (s.totalAmount - (s.amountPaid || 0)), 0);

  const searchFilteredPayments = React.useMemo(() => {
    if (!searchTerm.trim()) return filteredPayments;
    const q = searchTerm.trim().toLowerCase();
    return filteredPayments.filter((p) => {
      const dateStr = formatDateForDisplay(p.date) ?? '';
      const typeStr = p.referenceType === 'sale' ? t('finance.incoming') : t('finance.outgoing');
      const refStr = (p.referenceId ?? '').toUpperCase();
      const managerStr = getManagerName(p.managerId ?? '');
      const amountStr = formatCurrency(Number(p.amount) || 0);
      return [dateStr, typeStr, refStr, managerStr, amountStr].some((s) => s.toLowerCase().includes(q));
    });
  }, [filteredPayments, searchTerm, t]);

  const sortedPayments = React.useMemo(
    () => [...searchFilteredPayments].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [searchFilteredPayments]
  );

  const totalPages = Math.max(1, Math.ceil(sortedPayments.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedPayments = React.useMemo(
    () => sortedPayments.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [sortedPayments, safePage]
  );

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  React.useEffect(() => {
    setPage(1);
  }, [timeRange, typeFilter, responsibleFilter, searchTerm]);

  const totalStockValue = React.useMemo(
    () =>
      (products || []).reduce((sum, p) => {
        const qty = (stockBatches || []).filter((b: { productId: string; quantity: number }) => b.productId === p.id).reduce((s: number, b: { quantity: number }) => s + b.quantity, 0);
        return sum + qty * p.baseUnitPrice;
      }, 0),
    [products, stockBatches]
  );

  const handleDownloadReport = async () => {
    const doc = new jsPDF();
    const now = new Date();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 18;

    // Period bounds (same logic as filter)
    const endDate = new Date();
    const startDate = new Date();
    if (timeRange === 'all') startDate.setFullYear(endDate.getFullYear() - 10);
    else if (timeRange === 'last24Hours') startDate.setTime(endDate.getTime() - 24 * 60 * 60 * 1000);
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

    const logoDataUrl = await loadLogoWithTextDataUrl();
    let y = drawPdfHeader(doc, logoDataUrl);

    // Centered H1 title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(t('finance.reportTitle'), pageW / 2, y, { align: 'center' });
    y += 8;

    // Period centered, larger font
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(periodText, pageW / 2, y, { align: 'center' });
    y += 12;

    // Financial summary (internationalized)
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(t('finance.financialSummary'), margin, y);
    y += 7;

    autoTable(doc, {
        startY: y,
        head: [[t('finance.reportMetric'), t('finance.table.amount')]],
        body: [
            [t('finance.totalRevenue'), formatCurrency(totalInflow)],
            [t('finance.totalExpenses'), formatCurrency(totalOutflow)],
            [t('finance.netFlow'), formatCurrency(totalInflow - totalOutflow)],
            [t('finance.totalStockValue'), formatCurrency(totalStockValue)]
        ],
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' },
        margin: { left: margin, right: margin },
        tableLineWidth: 0.1,
        tableLineColor: [200, 200, 200]
    });

    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 14;

    // Transaction history (internationalized)
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(t('finance.transactionHistory'), margin, y);
    y += 7;

    autoTable(doc, {
        startY: y,
        head: [[t('finance.table.date'), t('finance.table.type'), t('finance.table.reference'), t('finance.table.processedBy'), t('finance.table.amount')]],
        body: sortedPayments.map(p => [
            formatDateForDisplay(p.date),
            p.referenceType === 'sale' ? t('finance.incoming') : t('finance.outgoing'),
            p.referenceType === 'sale' ? t('finance.saleRef', { id: p.referenceId.toUpperCase() }) : t('finance.poRef', { id: p.referenceId.toUpperCase() }),
            getManagerName(p.managerId),
            (p.referenceType === 'sale' ? '+' : '-') + formatCurrency(Number(p.amount) || 0)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129], fontStyle: 'bold' },
        margin: { left: margin, right: margin },
        tableLineWidth: 0.1,
        tableLineColor: [200, 200, 200]
    });

    // "Fait le" / "Done on" at bottom (larger font)
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    const doneOnText = `${t('dashboard.reportDoneOn')} ${now.toLocaleString(dateLocale, { dateStyle: 'medium', timeStyle: 'short' })}`;
    doc.text(doneOnText, pageW / 2, pageH - 10, { align: 'center' });

    const dateStr = now.toISOString().split('T')[0];
    await savePdf(doc, `odicam_report_financier_${dateStr}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t('finance.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">{t('finance.subtitle')}</p>
        </div>
        <button 
          onClick={handleDownloadReport}
          className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-sm whitespace-nowrap transition-colors shadow-sm hover:border-slate-300 dark:hover:border-slate-700"
        >
          <Download className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          {t('finance.exportReport')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] flex items-center justify-between group hover:shadow-lg transition-all">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('finance.totalStockValue')}</p>
            <h3 className="text-3xl font-bold text-slate-700 dark:text-slate-200 mt-1 tracking-tight tabular-nums group-hover:scale-105 transition-transform origin-left">{formatCurrency(totalStockValue)}</h3>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] flex items-center justify-between group hover:shadow-lg transition-all">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('finance.totalRevenue')}</p>
            <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tracking-tight tabular-nums group-hover:scale-105 transition-transform origin-left">+{formatCurrency(totalInflow)}</h3>
            {totalPendingPayments > 0 && (
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mt-1.5 tabular-nums">
                {t('dashboard.pendingPayments', { count: salesWithPending.length })}: {formatCurrency(totalPendingPayments)}
              </p>
            )}
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] flex items-center justify-between group hover:shadow-lg transition-all">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('finance.totalExpenses')}</p>
            <h3 className="text-3xl font-bold text-rose-600 dark:text-rose-400 mt-1 tracking-tight tabular-nums group-hover:scale-105 transition-transform origin-left">-{formatCurrency(totalOutflow)}</h3>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] flex items-center justify-between group hover:shadow-lg transition-all">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('finance.netFlow')}</p>
            <h3 className={`text-3xl font-bold mt-1 tracking-tight tabular-nums group-hover:scale-105 transition-transform origin-left ${(totalInflow - totalOutflow) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {(totalInflow - totalOutflow) >= 0 ? '+' : ''}{formatCurrency(totalInflow - totalOutflow)}
            </h3>
          </div>
           <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
            <DollarSignIcon className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base sm:text-lg">{t('finance.transactionHistory')}</h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="relative flex-1 sm:flex-initial min-w-[200px] sm:min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder={t('finance.searchTransactionsPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500"
                />
              </div>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-auto min-w-[130px] h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-sm font-medium">
                  <SelectValue placeholder={t('finance.filterPeriod')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('dashboard.filter.allTime')}</SelectItem>
                  <SelectItem value="last24Hours">{t('dashboard.filter.last24Hours')}</SelectItem>
                  <SelectItem value="last7Days">{t('dashboard.filter.last7Days')}</SelectItem>
                  <SelectItem value="last30Days">{t('dashboard.filter.last30Days')}</SelectItem>
                  <SelectItem value="lastTrimester">{t('dashboard.filter.lastTrimester')}</SelectItem>
                  <SelectItem value="lastYear">{t('dashboard.filter.lastYear')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v: 'all' | 'sale' | 'purchase_order') => setTypeFilter(v)}>
                <SelectTrigger className="w-auto min-w-[120px] h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-sm font-medium">
                  <SelectValue placeholder={t('finance.filterType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('finance.filterTypeAll')}</SelectItem>
                  <SelectItem value="sale">{t('finance.incoming')}</SelectItem>
                  <SelectItem value="purchase_order">{t('finance.outgoing')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
                <SelectTrigger className="w-auto min-w-[140px] h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-sm font-medium">
                  <SelectValue placeholder={t('finance.filterResponsible')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('finance.filterResponsibleAll')}</SelectItem>
                  <SelectItem value="__none__">{t('finance.filterResponsibleUnassigned')}</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name || t('common.unknown')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Desktop: scrollable table */}
        <div className="hidden md:block overflow-x-auto min-h-[400px] -mx-px">
          <table className="w-full min-w-[640px] text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">{t('finance.table.date')}</th>
                <th className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">{t('finance.table.type')}</th>
                <th className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">{t('finance.table.reference')}</th>
                <th className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">{t('finance.table.processedBy')}</th>
                <th className="px-4 lg:px-6 py-3 lg:py-4 text-right font-mono tabular-nums whitespace-nowrap">{t('finance.table.amount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors group">
                  <td className="px-4 lg:px-6 py-3 lg:py-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatDateForDisplay(payment.date)}</td>
                  <td className="px-4 lg:px-6 py-3 lg:py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      payment.referenceType === 'sale'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'
                        : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30'
                    }`}>
                      {payment.referenceType === 'sale' ? t('finance.incoming') : t('finance.outgoing')}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-3 lg:py-4 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {payment.referenceType === 'sale' ? t('finance.saleRef', { id: payment.referenceId.toUpperCase() }) : t('finance.poRef', { id: payment.referenceId.toUpperCase() })}
                  </td>
                  <td className="px-4 lg:px-6 py-3 lg:py-4 text-slate-600 dark:text-slate-400">{getManagerName(payment.managerId)}</td>
                  <td className={`px-4 lg:px-6 py-3 lg:py-4 text-right font-bold font-mono tabular-nums whitespace-nowrap min-w-[120px] lg:min-w-[140px] ${
                    payment.referenceType === 'sale' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {payment.referenceType === 'sale' ? '+' : '-'}{formatCurrency(Number(payment.amount) || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: card list */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 min-h-[200px]">
          {paginatedPayments.map((p) => (
            <div key={p.id} className="p-4 flex justify-between items-start gap-3 active:bg-slate-50/80 dark:active:bg-slate-800/50">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border shrink-0 ${
                    p.referenceType === 'sale'
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'
                      : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30'
                  }`}>
                    {p.referenceType === 'sale' ? t('finance.incoming') : t('finance.outgoing')}
                  </span>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400 truncate">
                    {p.referenceType === 'sale' ? t('finance.saleRef', { id: p.referenceId.toUpperCase() }) : t('finance.poRef', { id: p.referenceId.toUpperCase() })}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{formatDateForDisplay(p.date)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{getManagerName(p.managerId)}</p>
              </div>
              <div className={`font-mono font-semibold tabular-nums text-right shrink-0 min-w-[5rem] ${p.referenceType === 'sale' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {p.referenceType === 'sale' ? '+' : '-'}{formatCurrency(Number(p.amount) || 0)}
              </div>
            </div>
          ))}
        </div>

        {sortedPayments.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('activity.paginationShowing', {
                  from: sortedPayments.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1,
                  to: Math.min(safePage * PAGE_SIZE, sortedPayments.length),
                  total: sortedPayments.length,
                })}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400" aria-hidden>
                {t('activity.perPage', { count: PAGE_SIZE })}
              </p>
            </div>
            <nav className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end" aria-label={t('activity.paginationPage', { current: safePage, total: totalPages })}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                aria-label={t('activity.paginationAriaPrev')}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 min-h-[44px] rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
              >
                <ChevronLeft className="w-4 h-4" />
                {t('activity.paginationPrev')}
              </button>
              <span className="px-3 py-2 min-h-[44px] flex items-center text-sm font-medium text-slate-600 dark:text-slate-400">
                {t('activity.paginationPage', { current: safePage, total: totalPages })}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                aria-label={t('activity.paginationAriaNext')}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 min-h-[44px] rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
              >
                {t('activity.paginationNext')}
                <ChevronRight className="w-4 h-4" />
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}

function DollarSignIcon(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
