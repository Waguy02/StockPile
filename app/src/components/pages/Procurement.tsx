import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Search, 
  Filter,
  MoreHorizontal, 
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  Edit,
  Trash2,
  UserCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '../../lib/StoreContext';
import { useConnection } from '../../lib/ConnectionContext';
import CreateOrderDialog from '../modals/CreateOrderDialog';
import { ConfirmDeleteDialog } from '../common/ConfirmDeleteDialog';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { formatCurrency, formatDateForDisplay } from '../../lib/formatters';
import { generatePurchaseInvoicePdf } from '../../lib/invoicePdf';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

const PAGE_SIZE = 20;

export function Procurement() {
  const { purchaseOrders, providers, managers, currentUser, isLoading, refresh, products } = useStore();
  const { isOnline } = useConnection();
  const { t } = useTranslation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [productsDialogItems, setProductsDialogItems] = useState<any[] | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
    paymentStatus: 'all'
  });
  const [page, setPage] = useState(1);

  const getProviderName = (id: string) => providers.find(p => p.id === id)?.name || t('common.unknown');
  const getManagerName = (id: string) => {
    if (id && id === currentUser?.id) return currentUser.name || t('common.unknown');
    return managers.find(m => m.id === id)?.name || t('common.unknown');
  };

  const clearFilters = () => {
    setFilters({ startDate: '', endDate: '', status: 'all', paymentStatus: 'all' });
    setSearchTerm('');
  };

  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const poDate = new Date(po.initiationDate || 0);
      const matchesDate =
        (!filters.startDate || poDate >= new Date(filters.startDate + 'T00:00:00.000Z')) &&
        (!filters.endDate || poDate <= new Date(filters.endDate + 'T23:59:59.999Z'));
      const matchesStatus = filters.status === 'all' || po.status === filters.status || (filters.status === 'pending' && po.status === 'draft');
      const percentPaid = po.totalAmount > 0 ? ((po.amountPaid || 0) / po.totalAmount) * 100 : 100;
      const matchesPayment = filters.paymentStatus === 'all' ||
        (filters.paymentStatus === 'paid' && percentPaid >= 100) ||
        (filters.paymentStatus === 'unpaid' && percentPaid === 0) ||
        (filters.paymentStatus === 'partial' && percentPaid > 0 && percentPaid < 100);
      return matchesDate && matchesStatus && matchesPayment;
    });
  }, [purchaseOrders, filters]);

  const searchFilteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return filteredOrders;
    const q = searchTerm.trim().toLowerCase();
    return filteredOrders.filter((po) => {
      const idStr = (po.id || '').toUpperCase();
      const providerName = providers.find((p) => p.id === po.providerId)?.name || '';
      const providerStr = providerName.toLowerCase();
      return idStr.toLowerCase().includes(q) || providerStr.includes(q);
    });
  }, [filteredOrders, searchTerm, providers]);

  const sortedPurchaseOrders = useMemo(
    () => [...searchFilteredOrders].sort((a, b) => (b.initiationDate || '').localeCompare(a.initiationDate || '')),
    [searchFilteredOrders]
  );

  const totalPages = Math.max(1, Math.ceil(sortedPurchaseOrders.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedOrders = useMemo(
    () => sortedPurchaseOrders.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [sortedPurchaseOrders, safePage]
  );

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  React.useEffect(() => {
    setPage(1);
  }, [filters.startDate, filters.endDate, filters.status, filters.paymentStatus, searchTerm]);

  const handleEditOrder = (order: any) => {
    setEditingOrder(order);
    setIsCreateOpen(true);
  };

  const handleRequestDeleteOrder = (po: any) => {
    if (po.status === 'completed') {
      alert(t('common.deleteCompleted'));
      return;
    }
    setOrderToDelete(po);
  };

  const handleConfirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    await api.deletePO(orderToDelete.id);
    await refresh();
    setOrderToDelete(null);
  };

  const handleCloseDialog = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) {
        setEditingOrder(null);
    }
  };

  const handleGenerateInvoice = async (po: any) => {
    try {
const invoiceI18n = {
      title: t('invoice.title'),
      titleSale: t('invoice.titleSale'),
      titlePurchase: t('invoice.titlePurchase'),
      natureSale: t('invoice.natureSale'),
      naturePurchase: t('invoice.naturePurchase'),
        reference: t('invoice.reference'),
        date: t('invoice.date'),
        client: t('invoice.client'),
        provider: t('invoice.provider'),
        product: t('invoice.product'),
        quantity: t('invoice.quantity'),
        unitPrice: t('invoice.unitPrice'),
        lineTotal: t('invoice.lineTotal'),
        total: t('invoice.total'),
        amountPaid: t('invoice.amountPaid'),
        remaining: t('invoice.remaining'),
      };
      await generatePurchaseInvoicePdf(po, invoiceI18n, getProviderName, getProductName);
    } catch (err) {
      toast.error(t('invoice.downloadError'), { description: err instanceof Error ? err.message : undefined });
    }
  };

  const getProductName = (id: string) =>
    (products || []).find((p: { id: string }) => p.id === id)?.name ?? t('common.unknown');

  const getProductsDisplay = (items: any[]) => {
    if (!items || items.length === 0) return '-';
    const displayItems = items.slice(0, 2);
    const remainingCount = items.length - 2;
    return (
      <div className="flex flex-wrap gap-1">
        {displayItems.map((item: any, idx: number) => (
          <Badge key={idx} variant="outline" className="text-xs font-normal bg-slate-50 dark:bg-slate-800/50">
            {getProductName(item.productId)}
            {item.quantity > 1 && <span className="ml-1 text-slate-400">x{item.quantity}</span>}
          </Badge>
        ))}
        {remainingCount > 0 && (
          <Badge
            variant="secondary"
            className="text-xs cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors"
            onClick={(e) => { e.stopPropagation(); setProductsDialogItems(items); }}
          >
            +{remainingCount}
          </Badge>
        )}
      </div>
    );
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t('procurement.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">{t('procurement.subtitle')}</p>
        </div>
        <button 
          onClick={() => setIsCreateOpen(true)}
          disabled={!isOnline}
          className="flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('procurement.createOrder')}
        </button>
      </div>

      <CreateOrderDialog 
        open={isCreateOpen} 
        onOpenChange={handleCloseDialog} 
        type="purchase" 
        order={editingOrder} 
      />

      <ConfirmDeleteDialog
        open={!!orderToDelete}
        onOpenChange={(open) => !open && setOrderToDelete(null)}
        title={t('common.confirmDeleteTitle')}
        description={t('common.confirmDelete', { item: t('procurement.purchaseOrder') })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleConfirmDeleteOrder}
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="p-5 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row gap-4 justify-between items-center border-b border-slate-100 dark:border-slate-800">
          <div className="relative w-full sm:w-96 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
            <input 
              type="text"
              placeholder={t('procurement.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none ring-0 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all shadow-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <button className={`flex items-center px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors shadow-sm ${
                Object.values(filters).some(v => v !== 'all' && v !== '')
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}>
                <Filter className="w-4 h-4 mr-2" />
                {t('procurement.filter')}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-sm">{t('procurement.filter')}</h4>
                  <button onClick={clearFilters} className="text-xs text-slate-500 hover:text-indigo-600">{t('procurement.filters.clear')}</button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="po-date-range">{t('procurement.table.date')}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="po-startDate" className="text-xs text-slate-500">{t('procurement.filters.startDate')}</Label>
                      <Input
                        id="po-startDate"
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="po-endDate" className="text-xs text-slate-500">{t('procurement.filters.endDate')}</Label>
                      <Input
                        id="po-endDate"
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="po-status">{t('procurement.table.status')}</Label>
                  <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                    <SelectTrigger id="po-status" className="h-9">
                      <SelectValue placeholder={t('common.allOptions')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.allOptions')}</SelectItem>
                      <SelectItem value="draft">{t('procurement.status.draft')}</SelectItem>
                      <SelectItem value="pending">{t('procurement.status.pending')}</SelectItem>
                      <SelectItem value="completed">{t('procurement.status.received')}</SelectItem>
                      <SelectItem value="cancelled">{t('procurement.status.cancelled')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="po-payment">{t('procurement.filters.paymentStatus')}</Label>
                  <Select value={filters.paymentStatus} onValueChange={(v) => setFilters({ ...filters, paymentStatus: v })}>
                    <SelectTrigger id="po-payment" className="h-9">
                      <SelectValue placeholder={t('common.allOptions')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.allOptions')}</SelectItem>
                      <SelectItem value="paid">{t('procurement.paid')}</SelectItem>
                      <SelectItem value="partial">{t('procurement.status.pending')}</SelectItem>
                      <SelectItem value="unpaid">{t('sales.filters.unpaid')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4">{t('procurement.table.orderId')}</th>
                  <th className="px-6 py-4">{t('procurement.table.provider')}</th>
                  <th className="px-6 py-4">{t('common.products', { defaultValue: 'Products' })}</th>
                  <th className="px-6 py-4">{t('procurement.table.date')}</th>
                  <th className="px-6 py-4">{t('procurement.table.totalAmount')}</th>
                  <th className="px-6 py-4">{t('procurement.table.paymentProgress')}</th>
                  <th className="px-6 py-4">{t('procurement.table.status')}</th>
                  <th className="px-6 py-4 text-right">{t('procurement.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedPurchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      {t('procurement.empty', { defaultValue: 'No purchase orders yet' })}
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((po) => {
                  const amountPaid = po.amountPaid || 0;
                  const percentDisplay = po.totalAmount > 0 ? Math.round((amountPaid / po.totalAmount) * 100) : (po.status === 'completed' ? 100 : 0);
                  return (
                    <tr key={po.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 group-hover:border-indigo-200 dark:group-hover:border-indigo-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                          #{po.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{getProviderName(po.providerId)}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('procurement.reqBy', { name: getManagerName(po.managerId) })}</div>
                      </td>
                      <td className="px-6 py-4">
                        {getProductsDisplay(po.items || [])}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3.5 h-3.5 mr-2 text-slate-400 dark:text-slate-500" />
                          {formatDateForDisplay(po.initiationDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-slate-700 dark:text-slate-300">{formatCurrency(po.totalAmount)}</td>
                      <td className="px-6 py-4">
                        <div className="w-full min-w-[160px] max-w-[180px]">
                          <div className="flex justify-between items-baseline gap-2 text-xs mb-1.5">
                            <span className="font-medium text-slate-600 dark:text-slate-400 shrink-0">{percentDisplay}%</span>
                            <span className="text-slate-400 dark:text-slate-500 font-mono text-right tabular-nums min-w-[100px]">{formatCurrency(Number(po.amountPaid) || 0)} {t('procurement.paid')}</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${percentDisplay === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(percentDisplay, 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          po.status === 'completed' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30' : po.status === 'pending' || po.status === 'draft' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}>
                          {po.status === 'completed' ? t('procurement.status.received') : (po.status === 'draft' ? t('procurement.status.pending') : t(`procurement.status.${po.status}`))}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all">
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer" onClick={() => handleGenerateInvoice(po)}>
                              <FileText className="w-4 h-4 mr-2" />
                              {t('invoice.button')}
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={!isOnline} className="cursor-pointer" onClick={() => isOnline && handleEditOrder(po)}>
                              <Edit className="w-4 h-4 mr-2" />
                              {t('common.edit')}
                            </DropdownMenuItem>
                            {currentUser?.role === 'manager' && (
                            <DropdownMenuItem disabled={!isOnline} className="text-rose-600 focus:text-rose-600 cursor-pointer" onClick={() => isOnline && handleRequestDeleteOrder(po)}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t('common.delete')}
                            </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-700">
            {sortedPurchaseOrders.length === 0 ? (
              <div className="px-5 py-16 text-center text-slate-500 dark:text-slate-400 text-sm">
                {t('procurement.empty', { defaultValue: 'No purchase orders yet' })}
              </div>
            ) : (
              paginatedOrders.map((po) => {
                const percentDisplay = po.totalAmount > 0 ? Math.round(((po.amountPaid || 0) / po.totalAmount) * 100) : (po.status === 'completed' ? 100 : 0);
                return (
                  <div key={po.id} className="p-5 space-y-4 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                            #{po.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                            po.status === 'completed' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30' : po.status === 'pending' || po.status === 'draft' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}>
                            {po.status === 'completed' ? t('procurement.status.received') : (po.status === 'draft' ? t('procurement.status.pending') : t(`procurement.status.${po.status}`))}
                          </span>
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{getProviderName(po.providerId)}</h3>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center mt-1">
                          <UserCircle className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                          <span className="truncate">{getManagerName(po.managerId)}</span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="shrink-0 p-2.5 -m-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[160px]">
                          <DropdownMenuItem className="cursor-pointer py-3 text-sm" onClick={() => handleGenerateInvoice(po)}>
                            <FileText className="w-4 h-4 mr-3" />
                            {t('invoice.button')}
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled={!isOnline} className="cursor-pointer py-3 text-sm" onClick={() => isOnline && handleEditOrder(po)}>
                            <Edit className="w-4 h-4 mr-3" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          {currentUser?.role === 'manager' && (
                          <DropdownMenuItem disabled={!isOnline} className="text-rose-600 focus:text-rose-600 cursor-pointer py-3 text-sm" onClick={() => isOnline && handleRequestDeleteOrder(po)}>
                            <Trash2 className="w-4 h-4 mr-3" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                      <Calendar className="w-4 h-4 mr-2 shrink-0 text-slate-400 dark:text-slate-500" />
                      {formatDateForDisplay(po.initiationDate)}
                    </div>
                    {(po.items || []).length > 0 && (
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {getProductsDisplay(po.items || [])}
                      </div>
                    )}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-end mb-2">
                        <p className="font-mono font-medium text-slate-900 dark:text-slate-100">{formatCurrency(po.totalAmount)}</p>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 dark:text-slate-400">{t('procurement.paid')}: {formatCurrency(po.amountPaid || 0)}</p>
                          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{percentDisplay}%</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${percentDisplay === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(percentDisplay, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {sortedPurchaseOrders.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('activity.paginationShowing', {
                  from: (safePage - 1) * PAGE_SIZE + 1,
                  to: Math.min(safePage * PAGE_SIZE, sortedPurchaseOrders.length),
                  total: sortedPurchaseOrders.length,
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

      {/* Products list dialog */}
      <Dialog open={!!productsDialogItems} onOpenChange={(open) => !open && setProductsDialogItems(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.products', { defaultValue: 'Products' })}</DialogTitle>
          </DialogHeader>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[60vh] overflow-y-auto -mx-6 px-6">
            {(productsDialogItems || []).map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <span className="font-medium text-slate-900 dark:text-slate-100 truncate">{getProductName(item.productId)}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className="text-sm text-slate-500 dark:text-slate-400">x{item.quantity}</span>
                  {item.unitPrice != null && (
                    <span className="text-sm font-mono text-slate-600 dark:text-slate-300">{formatCurrency(Number(item.unitPrice) * Number(item.quantity))}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
