import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DollarSign,
  Package,
  Truck,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { useStore } from '../../lib/StoreContext';
import { formatCurrency } from '../../lib/formatters';
import { ViewState } from '../../lib/data';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

type ActivityItem = {
  key: string;
  date: string;
  type: string;
  title: string;
  desc: string;
  nav: ViewState;
  icon: 'sale' | 'saleUpdated' | 'batch' | 'po' | 'paymentIn' | 'paymentOut';
  managerId?: string;
  productsDetail?: string;
  /** Raw product line items for badge display (like Sales page) */
  productsItems?: { productId: string; quantity: number }[];
};

const PAGE_SIZE = 20;

const ACTIVITY_TYPE_OPTIONS: { value: string; labelKey: string }[] = [
  { value: 'all', labelKey: 'activity.filterTypeAll' },
  { value: 'sale', labelKey: 'dashboard.activity.newSale' },
  { value: 'saleUpdated', labelKey: 'dashboard.activity.saleUpdated' },
  { value: 'purchaseOrder', labelKey: 'dashboard.activity.purchaseOrder' },
  { value: 'stockReceived', labelKey: 'dashboard.activity.stockReceived' },
  { value: 'batch', labelKey: 'dashboard.activity.stockBatch' },
  { value: 'paymentIn', labelKey: 'dashboard.activity.paymentIn' },
  { value: 'paymentOut', labelKey: 'dashboard.activity.paymentOut' },
];

function formatProductsList(
  items: { productId: string; quantity: number }[] | undefined,
  getProductName: (id: string) => string
): string {
  if (!items?.length) return '—';
  return items.map((i) => `${getProductName(i.productId)} × ${i.quantity}`).join(', ');
}

export function Activity() {
  const { sales, purchaseOrders, stockBatches, payments, customers, providers, managers, currentUser, products, isLoading } = useStore();
  const { t } = useTranslation();
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [responsibleFilter, setResponsibleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const getManagerName = (id: string | undefined) => {
    if (!id) return '—';
    if (id === currentUser?.id) return currentUser.name || t('common.unknown');
    return managers.find(m => m.id === id)?.name || t('common.unknown');
  };

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || t('common.unknown');

  /** Render product list as badges (same style as Sales page) */
  const renderProductsBadges = (productItems: { productId: string; quantity: number }[]) => {
    if (!productItems?.length) return <span className="text-slate-400">—</span>;
    const displayItems = productItems.slice(0, 2);
    const remainingCount = productItems.length - 2;
    return (
      <div className="flex flex-wrap gap-1">
        {displayItems.map((item, idx) => (
          <Badge key={idx} variant="outline" className="text-xs font-normal bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
            {getProductName(item.productId)}
            {item.quantity > 1 && <span className="ml-1 text-slate-400">x{item.quantity}</span>}
          </Badge>
        ))}
        {remainingCount > 0 && (
          <Badge variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            +{remainingCount}
          </Badge>
        )}
      </div>
    );
  };

  const allActivityItems = useMemo(() => {
    const items: ActivityItem[] = [];
    const cust = (id: string) => customers.find(c => c.id === id)?.name || t('common.unknown');
    const prov = (id: string) => providers.find(p => p.id === id)?.name || t('common.unknown');
    const getProductName = (id: string) => products.find(p => p.id === id)?.name || t('common.unknown');
    sales.forEach(s => {
      const saleIdShort = s.id.slice(0, 8).toUpperCase();
      const managerId = (s as any).managerId;
      const saleItems = s.items || [];
      items.push({
        key: `sale-${s.id}`,
        date: s.initiationDate || '',
        type: 'sale',
        title: t('dashboard.activity.newSale'),
        desc: t('dashboard.activity.saleDesc', { id: saleIdShort, customer: cust(s.customerId) }),
        nav: 'sales',
        icon: 'sale',
        managerId,
        productsDetail: formatProductsList(saleItems, getProductName),
        productsItems: saleItems.length ? saleItems.map((i: any) => ({ productId: i.productId, quantity: i.quantity })) : undefined,
      });
      const updatedAt = (s as any).updatedAt;
      if (updatedAt && updatedAt !== s.initiationDate) {
        items.push({
          key: `sale-updated-${s.id}`,
          date: updatedAt,
          type: 'saleUpdated',
          title: t('dashboard.activity.saleUpdated'),
          desc: t('dashboard.activity.saleUpdatedDesc', { id: saleIdShort }),
          nav: 'sales',
          icon: 'saleUpdated',
          managerId,
          productsDetail: formatProductsList(saleItems, getProductName),
          productsItems: saleItems.length ? saleItems.map((i: any) => ({ productId: i.productId, quantity: i.quantity })) : undefined,
        });
      }
    });
    purchaseOrders.forEach(po => {
      const managerId = (po as any).managerId;
      const poItems = po.items || [];
      items.push({
        key: `po-${po.id}`,
        date: po.initiationDate || '',
        type: 'purchaseOrder',
        title: t('dashboard.activity.purchaseOrder'),
        desc: t('dashboard.activity.purchaseOrderDesc', { id: po.id.slice(0, 8).toUpperCase(), provider: prov(po.providerId) }),
        nav: 'procurement',
        icon: 'po',
        managerId,
        productsDetail: formatProductsList(poItems, getProductName),
        productsItems: poItems.length ? poItems.map((i: any) => ({ productId: i.productId, quantity: i.quantity })) : undefined,
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
          managerId,
          productsDetail: formatProductsList(poItems, getProductName),
          productsItems: poItems.length ? poItems.map((i: any) => ({ productId: i.productId, quantity: i.quantity })) : undefined,
        });
      }
    });
    stockBatches.forEach(b => {
      const batchItems = b.productId ? [{ productId: b.productId, quantity: b.quantity }] : undefined;
      items.push({
        key: `batch-${b.id}`,
        date: b.entryDate || '',
        type: 'batch',
        title: t('dashboard.activity.stockBatch'),
        desc: t('dashboard.activity.batchDesc', { id: b.id.slice(0, 8).toUpperCase(), count: b.quantity }),
        nav: 'inventory',
        icon: 'batch',
        productsDetail: batchItems ? `${getProductName(b.productId)} × ${b.quantity}` : '—',
        productsItems: batchItems,
      });
    });
    payments.forEach(p => {
      const isIn = p.referenceType === 'sale';
      const refShort = (p.referenceId || '').slice(0, 8).toUpperCase();
      const amountStr = formatCurrency(p.amount);
      items.push({
        key: `pay-${p.id}`,
        date: p.date || '',
        type: isIn ? 'paymentIn' : 'paymentOut',
        title: isIn ? t('dashboard.activity.paymentIn') : t('dashboard.activity.paymentOut'),
        desc: isIn ? t('dashboard.activity.paymentInDesc', { amount: amountStr, ref: refShort }) : t('dashboard.activity.paymentOutDesc', { amount: amountStr, ref: refShort }),
        nav: 'finance',
        icon: isIn ? 'paymentIn' : 'paymentOut',
        managerId: p.managerId,
      });
    });
    return items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [sales, purchaseOrders, stockBatches, payments, customers, providers, products, t]);

  const filteredItems = useMemo(() => {
    let list = allActivityItems;
    if (typeFilter !== 'all') {
      list = list.filter(item => item.type === typeFilter);
    }
    if (dateRange !== 'all') {
      const now = new Date();
      const past = new Date();
      if (dateRange === 'last7Days') past.setDate(now.getDate() - 7);
      else if (dateRange === 'last30Days') past.setDate(now.getDate() - 30);
      else if (dateRange === 'lastTrimester') past.setMonth(now.getMonth() - 3);
      else if (dateRange === 'lastYear') past.setFullYear(now.getFullYear() - 1);
      list = list.filter(item => new Date(item.date) >= past);
    }
    if (responsibleFilter !== 'all') {
      if (responsibleFilter === '__none__') {
        list = list.filter(item => !item.managerId);
      } else {
        list = list.filter(item => item.managerId === responsibleFilter);
      }
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(item =>
        `${item.title} ${item.desc}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allActivityItems, typeFilter, dateRange, responsibleFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedItems = useMemo(
    () => filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredItems, safePage]
  );

  React.useEffect(() => setPage(1), [typeFilter, dateRange, responsibleFilter, searchQuery]);
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const getIcon = (item: ActivityItem) => {
    switch (item.icon) {
      case 'sale':
      case 'saleUpdated': return DollarSign;
      case 'batch': return Package;
      case 'po': return Truck;
      case 'paymentIn': return ArrowDownRight;
      case 'paymentOut': return ArrowUpRight;
      default: return Package;
    }
  };

  const getIconClass = (item: ActivityItem) => {
    switch (item.icon) {
      case 'sale':
      case 'saleUpdated': return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400';
      case 'batch': return 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400';
      case 'po': return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400';
      case 'paymentIn': return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400';
      case 'paymentOut': return 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    }
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t('activity.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">{t('activity.subtitle')}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="p-5 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col gap-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger aria-label={t('activity.filterType')} className="h-10 min-w-[10rem] rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <SelectValue placeholder={t('activity.filterType')} />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger aria-label={t('activity.filterDate')} className="h-10 min-w-[10rem] rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <SelectValue placeholder={t('activity.filterDate')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('dashboard.filter.allTime')}</SelectItem>
                  <SelectItem value="last7Days">{t('dashboard.filter.last7Days')}</SelectItem>
                  <SelectItem value="last30Days">{t('dashboard.filter.last30Days')}</SelectItem>
                  <SelectItem value="lastTrimester">{t('dashboard.filter.lastTrimester')}</SelectItem>
                  <SelectItem value="lastYear">{t('dashboard.filter.lastYear')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
                <SelectTrigger aria-label={t('activity.filterResponsible')} className="h-10 min-w-[140px] rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <SelectValue placeholder={t('activity.filterResponsible')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('activity.filterResponsibleAll')}</SelectItem>
                  <SelectItem value="__none__">{t('activity.filterResponsibleUnknown')}</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name || t('common.unknown')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('activity.filterSearchPlaceholder')}
                aria-label={t('activity.filterSearchPlaceholder')}
                className="w-full h-10 pl-10 pr-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
              />
            </div>
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {t('activity.filtersLabel')}
          </span>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4 w-28">{t('activity.tableDate')}</th>
                  <th className="px-6 py-4 w-48">{t('activity.tableType')}</th>
                  <th className="px-6 py-4">{t('activity.tableDescription')}</th>
                  <th className="px-6 py-4 min-w-[140px]">{t('activity.tableProducts')}</th>
                  <th className="px-6 py-4 w-36">{t('activity.tableResponsible')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      {t('activity.empty')}
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => {
                    const Icon = getIcon(item);
                    return (
                      <tr key={item.key} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors group">
                        <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">{item.date}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${getIconClass(item)}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="font-medium text-slate-900 dark:text-slate-100">{item.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{item.desc}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm max-w-[280px]">
                          {item.productsItems?.length ? renderProductsBadges(item.productsItems) : (item.productsDetail ?? '—')}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-sm">{getManagerName(item.managerId)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-700">
            {paginatedItems.length === 0 ? (
              <div className="px-5 py-16 text-center text-slate-500 dark:text-slate-400 text-sm">
                {t('activity.empty')}
              </div>
            ) : (
              paginatedItems.map((item) => {
                const Icon = getIcon(item);
                return (
                  <div key={item.key} className="p-5 space-y-4 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${getIconClass(item)}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{item.title}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">{item.date}</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider">{t('activity.tableProducts')}: </span>
                      <span className="block mt-1">{item.productsItems?.length ? renderProductsBadges(item.productsItems) : (item.productsDetail ?? '—')}</span>
                    </div>
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-slate-600 dark:text-slate-400">{t('activity.tableResponsible')}: </span>
                      {getManagerName(item.managerId)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {filteredItems.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('activity.paginationShowing', {
                  from: (safePage - 1) * PAGE_SIZE + 1,
                  to: Math.min(safePage * PAGE_SIZE, filteredItems.length),
                  total: filteredItems.length,
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
