import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal,
  PackageOpen,
  Tag,
  Loader2,
  ListFilter,
  Edit,
  Trash2,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  History
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useStore } from '../../lib/StoreContext';
import { useConnection } from '../../lib/ConnectionContext';
import { AddProductDialog } from '../modals/AddProductDialog';
import { CategoriesDialog } from '../modals/CategoriesDialog';
import { ProductHistory } from './ProductHistory';
import { api } from '../../lib/api';
import { formatCurrency, formatDateForDisplay } from '../../lib/formatters';
import { savePdf } from '../../lib/downloadPdf';
import { loadLogoWithTextDataUrl, drawPdfHeader } from '../../lib/pdfReportHeader';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';

export function Inventory() {
  const { products, categories, stockBatches, isLoading, refresh, currentUser } = useStore();
  const { isOnline } = useConnection();
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'products' | 'batches'>('products');

  // If staff, force active tab to products
  React.useEffect(() => {
    if (currentUser?.role === 'staff' && activeTab === 'batches') {
      setActiveTab('products');
    }
  }, [currentUser, activeTab]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  
  // Filters state
  const [filters, setFilters] = useState({
    categoryId: 'all',
    startDate: '',
    endDate: ''
  });
  const [includeOutOfStock, setIncludeOutOfStock] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);
  const [historyProduct, setHistoryProduct] = useState<any>(null);

  const clearFilters = () => {
    setFilters({
      categoryId: 'all',
      startDate: '',
      endDate: ''
    });
    setSearchTerm('');
  };

  const handleEditProduct = (product: any) => {
      setEditingProduct(product);
      setIsAddProductOpen(true);
  };

  const handleCloseProductDialog = (open: boolean) => {
      setIsAddProductOpen(open);
      if (!open) setEditingProduct(null);
  }
  
  const handleRequestDeleteProduct = (product: { id: string; name: string }) => {
    setProductToDelete(product);
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    await api.deleteProduct(productToDelete.id);
    await refresh();
    setProductToDelete(null);
  };

  const isManager = currentUser?.role === 'manager';

  const totalStockValue = React.useMemo(
    () =>
      products.reduce((sum, p) => {
        const qty = stockBatches.filter((b) => b.productId === p.id).reduce((s, b) => s + b.quantity, 0);
        return sum + qty * p.baseUnitPrice;
      }, 0),
    [products, stockBatches]
  );

  const handleExportInventoryReport = async () => {
    const doc = new jsPDF();
    const now = new Date();
    const dateLocale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-GB';
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 18;

    const logoDataUrl = await loadLogoWithTextDataUrl();
    let y = drawPdfHeader(doc, logoDataUrl);

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(t('inventory.reportTitle'), pageW / 2, y, { align: 'center' });
    y += 8;

    // Date
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(now.toLocaleDateString(dateLocale, { dateStyle: 'long' }), pageW / 2, y, { align: 'center' });
    y += 12;

    // Build rows: only non-depleted products (stock > 0)
    const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || t('common.unknown');
    const rows: string[][] = [];
    let reportTotal = 0;

    products.forEach((p) => {
      const qty = stockBatches.filter(b => b.productId === p.id).reduce((s, b) => s + b.quantity, 0);
      if (qty <= 0) return; // skip depleted products
      const lineValue = qty * p.baseUnitPrice;
      reportTotal += lineValue;
      rows.push([
        p.name,
        getCategoryName(p.categoryId),
        formatCurrency(p.baseUnitPrice),
        String(qty),
        formatCurrency(lineValue),
      ]);
    });

    // Products table
    autoTable(doc, {
      startY: y,
      head: [[
        t('inventory.reportProductName'),
        t('inventory.reportCategory'),
        t('inventory.reportBasePrice'),
        t('inventory.reportStock'),
        t('inventory.reportStockValue'),
      ]],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' },
      margin: { left: margin, right: margin },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
      tableLineWidth: 0.1,
      tableLineColor: [200, 200, 200],
    });

    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 10;

    // Total stock value summary
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 8;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`${t('inventory.totalStockValue')} :`, margin, y);
    doc.text(formatCurrency(reportTotal), pageW - margin, y, { align: 'right' });

    // Footer "Fait le"
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    const doneOnText = `${t('dashboard.reportDoneOn')} ${now.toLocaleString(dateLocale, { dateStyle: 'medium', timeStyle: 'short' })}`;
    doc.text(doneOnText, pageW / 2, pageH - 10, { align: 'center' });

    const dateStr = now.toISOString().split('T')[0];
    await savePdf(doc, `odicam_rapport_inventaire_${dateStr}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Product History sub-view
  if (historyProduct) {
    return <ProductHistory product={historyProduct} onBack={() => setHistoryProduct(null)} />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t('inventory.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">{t('inventory.subtitle')}</p>
        </div>
        {currentUser?.role !== 'staff' && (
          <div className="flex flex-wrap gap-3">
            {isManager && (
              <button
                onClick={handleExportInventoryReport}
                className="flex items-center px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 font-medium text-sm transition-all shadow-sm"
              >
                <Download className="w-4 h-4 mr-2 text-slate-500 dark:text-slate-400 shrink-0" />
                {t('inventory.exportReport')}
              </button>
            )}
            <button 
              onClick={() => setIsCategoriesOpen(true)}
              disabled={!isOnline}
              className="flex items-center px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 font-medium text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Tag className="w-4 h-4 mr-2 text-slate-500" />
              {t('inventory.categories')}
            </button>
            <button 
              onClick={() => setIsAddProductOpen(true)}
              disabled={!isOnline}
              className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium text-sm shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('inventory.addProduct')}
            </button>
          </div>
        )}
      </div>

      {isManager && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]">
          <PackageOpen className="w-5 h-5 text-indigo-500 dark:text-indigo-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('inventory.totalStockValue')}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">{formatCurrency(totalStockValue)}</p>
          </div>
        </div>
      )}

      <AddProductDialog 
        open={isAddProductOpen} 
        onOpenChange={handleCloseProductDialog} 
        product={editingProduct}
      />
      <CategoriesDialog open={isCategoriesOpen} onOpenChange={setIsCategoriesOpen} />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
        {/* Tabs & Toolbar Container */}
        <div className="border-b border-slate-100 dark:border-slate-800">
             {/* Tabs */}
            <div className="flex px-2 pt-2">
            <button
                onClick={() => setActiveTab('products')}
                className={`relative px-6 py-4 text-sm font-semibold transition-all duration-200 rounded-t-lg ${
                activeTab === 'products'
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
            >
                {t('inventory.tab.productCatalog')}
                {activeTab === 'products' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-500 rounded-full mx-6"></div>
                )}
            </button>
            {currentUser?.role !== 'staff' && (
              <button
                  onClick={() => setActiveTab('batches')}
                  className={`relative px-6 py-4 text-sm font-semibold transition-all duration-200 rounded-t-lg ${
                  activeTab === 'batches'
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
              >
                  {t('inventory.tab.stockBatches')}
                  {activeTab === 'batches' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-500 rounded-full mx-6"></div>
                  )}
              </button>
            )}
            </div>
        </div>
        
        {/* Toolbar */}
        <div className="p-5 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row gap-4 justify-between items-center border-b border-slate-100 dark:border-slate-800">
          <div className="relative w-full sm:w-96 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
            <input 
              type="text"
              placeholder={t('inventory.searchPlaceholder', { type: activeTab === 'products' ? t('inventory.tab.productCatalog') : t('inventory.tab.stockBatches') })}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none ring-0 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 transition-all shadow-sm"
            />
          </div>
          
          {activeTab === 'products' && (
            <div
              className={`flex items-center gap-3 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors shadow-sm ${
                includeOutOfStock
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <PackageOpen className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
              <span className="whitespace-nowrap">{t('inventory.includeOutOfStock')}</span>
              <Switch
                checked={includeOutOfStock}
                onCheckedChange={(v) => setIncludeOutOfStock(!!v)}
                className="shrink-0 data-[state=unchecked]:bg-slate-200 data-[state=checked]:bg-indigo-600 dark:data-[state=unchecked]:bg-slate-600 dark:data-[state=checked]:bg-indigo-500"
              />
            </div>
          )}
          <Popover>
            <PopoverTrigger asChild>
                <button className={`flex items-center px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors shadow-sm ${
                    (filters.categoryId !== 'all' || filters.startDate !== '' || filters.endDate !== '') 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}>
                    <Filter className="w-4 h-4 mr-2" />
                    {t('inventory.filter')}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-sm">{t('inventory.filter')}</h4>
                        <button onClick={clearFilters} className="text-xs text-slate-500 hover:text-indigo-600">{t('sales.filters.clear')}</button>
                    </div>

                    {activeTab === 'products' ? (
                        <>
                             <div className="space-y-2">
                                <Label htmlFor="category">{t('inventory.categories')}</Label>
                                <Select value={filters.categoryId} onValueChange={(v) => setFilters({ ...filters, categoryId: v })}>
                                    <SelectTrigger id="category" className="h-9">
                                        <SelectValue placeholder={t('common.allOptions')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('common.allOptions')}</SelectItem>
                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-2">
                            <Label htmlFor="date-range">{t('inventory.table.entryDate')}</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label htmlFor="startDate" className="text-xs text-slate-500">{t('sales.filters.startDate')}</Label>
                                    <Input 
                                        id="startDate"
                                        type="date" 
                                        value={filters.startDate} 
                                        onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                                        className="h-8 text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="endDate" className="text-xs text-slate-500">{t('sales.filters.endDate')}</Label>
                                    <Input 
                                        id="endDate"
                                        type="date" 
                                        value={filters.endDate} 
                                        onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                                        className="h-8 text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto min-h-[400px]">
          {activeTab === 'products' ? (
            <ProductsTable 
                searchTerm={searchTerm} 
                filters={filters}
                includeOutOfStock={includeOutOfStock}
                onEdit={handleEditProduct} 
                onDelete={isOnline && isManager ? handleRequestDeleteProduct : undefined}
                onHistory={setHistoryProduct}
                readOnly={!isOnline}
            />
          ) : (
            <BatchesTable 
                searchTerm={searchTerm} 
                filters={filters}
            />
          )}
        </div>
        
        {/* Pagination is rendered inside each table component */}
      </div>

      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inventory.deleteProductTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {productToDelete ? t('inventory.deleteProductDescription', { name: productToDelete.name }) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteProduct}
              className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
            >
              {t('inventory.deleteProductConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProductsTable({ searchTerm, filters, includeOutOfStock, onEdit, onDelete, onHistory, readOnly }: { searchTerm: string, filters: any, includeOutOfStock: boolean, onEdit: (p: any) => void, onDelete?: (product: { id: string; name: string }) => void; onHistory?: (p: any) => void; readOnly?: boolean }) {
  const { products, categories, stockBatches, currentUser } = useStore();
  const { t } = useTranslation();
  const showActions = !readOnly && currentUser?.role !== 'staff';
  const canDelete = !!onDelete;
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  const getTotalStock = (productId: string) =>
    stockBatches.filter(b => b.productId === productId).reduce((sum, b) => sum + b.quantity, 0);
  
  const filteredProducts = React.useMemo(() => products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filters.categoryId === 'all' || p.categoryId === filters.categoryId;
    const totalStock = getTotalStock(p.id);
    const matchesStock = includeOutOfStock || totalStock > 0;
    return matchesSearch && matchesCategory && matchesStock;
  }), [products, stockBatches, searchTerm, filters, includeOutOfStock]);

  // Reset page when filters change
  React.useEffect(() => { setPage(1); }, [searchTerm, filters.categoryId, includeOutOfStock]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedProducts = React.useMemo(
    () => filteredProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredProducts, safePage]
  );

  React.useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || t('common.unknown');

  if (filteredProducts.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <PackageOpen className="w-12 h-12 mb-3 opacity-20" />
              <p>{t('inventory.noProducts')}</p>
          </div>
      )
  }

  return (
    <>
    <div className="hidden md:block">
      <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
        <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-xs">
          <tr>
            <th className="px-6 py-4">{t('inventory.table.productName')}</th>
            <th className="px-6 py-4">{t('inventory.table.category')}</th>
            <th className="px-6 py-4">{t('inventory.table.basePrice')}</th>
            <th className="px-6 py-4">{t('inventory.table.totalStock')}</th>
            <th className="px-6 py-4 font-mono tabular-nums">{t('inventory.table.stockValue')}</th>
            {showActions && <th className="px-6 py-4 text-right">{t('inventory.table.actions')}</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {paginatedProducts.map((product) => {
            const totalStock = getTotalStock(product.id);
            const lineStockValue = totalStock * product.baseUnitPrice;

            return (
              <tr key={product.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors group">
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">{product.name}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{product.description}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {getCategoryName(product.categoryId)}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono font-medium text-slate-700 dark:text-slate-300">{formatCurrency(product.baseUnitPrice)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${totalStock < 10 ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                    <span className={`font-semibold ${totalStock < 10 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>{totalStock} {t('inventory.units')}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono font-medium text-slate-700 dark:text-slate-300 tabular-nums">{formatCurrency(lineStockValue)}</td>
                {showActions && (
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all">
                            <MoreHorizontal className="w-5 h-5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {onHistory && (
                            <DropdownMenuItem className="cursor-pointer" onClick={() => onHistory(product)}>
                                <History className="w-4 h-4 mr-2" />
                                {t('productHistory.menuLabel')}
                            </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="cursor-pointer" onClick={() => onEdit(product)}>
                                <Edit className="w-4 h-4 mr-2" />
                                {t('common.edit')}
                            </DropdownMenuItem>
                            {canDelete && (
                            <DropdownMenuItem className="text-rose-600 focus:text-rose-600 cursor-pointer" onClick={() => onDelete!({ id: product.id, name: product.name })}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('common.delete')}
                            </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    {/* Mobile List View */}
    <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-700">
      {paginatedProducts.map((product) => {
        const totalStock = stockBatches
          .filter(b => b.productId === product.id)
          .reduce((sum, b) => sum + b.quantity, 0);
        const lineStockValue = totalStock * product.baseUnitPrice;

        return (
          <div key={product.id} className="p-4 space-y-3">
             <div className="flex justify-between items-start">
                <div>
                   <h3 className="font-semibold text-slate-900 dark:text-slate-100">{product.name}</h3>
                   <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{product.description}</p>
                </div>
                {showActions && (
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <button className="p-2 -mr-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg">
                          <MoreHorizontal className="w-5 h-5" />
                          </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                          {onHistory && (
                          <DropdownMenuItem className="cursor-pointer" onClick={() => onHistory(product)}>
                              <History className="w-4 h-4 mr-2" />
                              {t('productHistory.menuLabel')}
                          </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="cursor-pointer" onClick={() => onEdit(product)}>
                              <Edit className="w-4 h-4 mr-2" />
                              {t('common.edit')}
                          </DropdownMenuItem>
                          {canDelete && (
                          <DropdownMenuItem className="text-rose-600 focus:text-rose-600 cursor-pointer" onClick={() => onDelete!({ id: product.id, name: product.name })}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t('common.delete')}
                          </DropdownMenuItem>
                          )}
                      </DropdownMenuContent>
                  </DropdownMenu>
                )}
             </div>
             
             <div className="flex flex-wrap gap-2 text-sm">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {getCategoryName(product.categoryId)}
                </span>
             </div>

             <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="font-mono font-medium text-slate-700 dark:text-slate-300">
                    {formatCurrency(product.baseUnitPrice)}
                </div>
                <div className="flex items-center text-sm">
                    <div className={`w-1.5 h-1.5 rounded-full mr-2 ${totalStock < 10 ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                    <span className={`${totalStock < 10 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'} font-medium`}>
                        {totalStock} {t('inventory.units')}
                    </span>
                </div>
             </div>
             <div className="flex justify-between items-center text-sm pt-1">
                <span className="text-slate-500 dark:text-slate-400">{t('inventory.table.stockValue')}</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300 tabular-nums">{formatCurrency(lineStockValue)}</span>
             </div>
          </div>
        );
      })}
    </div>

    {/* Pagination */}
    {filteredProducts.length > 0 && (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('activity.paginationShowing', {
            from: (safePage - 1) * PAGE_SIZE + 1,
            to: Math.min(safePage * PAGE_SIZE, filteredProducts.length),
            total: filteredProducts.length,
          })}
        </p>
        <nav className="flex items-center gap-2" aria-label={t('activity.paginationPage', { current: safePage, total: totalPages })}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-3 min-h-[44px] rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('inventory.previous')}
          </button>
          <span className="px-3 py-2 min-h-[44px] flex items-center text-sm font-medium text-slate-600 dark:text-slate-400">
            {t('activity.paginationPage', { current: safePage, total: totalPages })}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-3 min-h-[44px] rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
          >
            {t('inventory.next')}
            <ChevronRight className="w-4 h-4" />
          </button>
        </nav>
      </div>
    )}
    </>
  );
}

function BatchesTable({ searchTerm, filters }: { searchTerm: string, filters: any }) {
  const { stockBatches, products } = useStore();
  const { t } = useTranslation();
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);
  
  const filteredBatches = React.useMemo(() => stockBatches.filter(b => {
    const matchesSearch = b.batchLabel.toLowerCase().includes(searchTerm.toLowerCase());
    
    const batchDate = new Date(b.entryDate);
    const matchesDate = 
        (!filters.startDate || batchDate >= new Date(filters.startDate + 'T00:00:00.000Z')) &&
        (!filters.endDate || batchDate <= new Date(filters.endDate + 'T23:59:59.999Z'));

    return matchesSearch && matchesDate;
  }).sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()), [stockBatches, searchTerm, filters]);

  // Reset page when filters change
  React.useEffect(() => { setPage(1); }, [searchTerm, filters.startDate, filters.endDate]);

  const totalPages = Math.max(1, Math.ceil(filteredBatches.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedBatches = React.useMemo(
    () => filteredBatches.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredBatches, safePage]
  );

  React.useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || t('common.unknown');

   if (filteredBatches.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <PackageOpen className="w-12 h-12 mb-3 opacity-20" />
              <p>{t('inventory.noBatches')}</p>
          </div>
      )
  }

  return (
    <>
    <div className="hidden md:block">
      <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
        <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-xs">
          <tr>
            <th className="px-6 py-4">{t('inventory.table.batchLabel')}</th>
            <th className="px-6 py-4">{t('inventory.table.product')}</th>
            <th className="px-6 py-4">{t('inventory.table.entryDate')}</th>
            <th className="px-6 py-4">{t('inventory.table.unitCost')}</th>
            <th className="px-6 py-4">{t('inventory.table.quantity')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {paginatedBatches.map((batch) => (
            <tr key={batch.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors group">
              <td className="px-6 py-4">
                  <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded border border-indigo-100 dark:border-indigo-900/30">
                      {batch.batchLabel}
                  </span>
              </td>
              <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                {getProductName(batch.productId)}
              </td>
              <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{formatDateForDisplay(batch.entryDate)}</td>
              <td className="px-6 py-4 font-mono font-medium text-slate-700 dark:text-slate-300">{formatCurrency(batch.unitPriceCost)}</td>
              <td className="px-6 py-4">
                <div className="flex items-center">
                    <div className={`w-1.5 h-1.5 rounded-full mr-2 ${batch.quantity < 10 ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                    <span className={`font-medium ${batch.quantity < 10 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {batch.quantity}
                    </span>
                  </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Mobile Batches List */}
    <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-700">
      {paginatedBatches.map((batch) => (
        <div key={batch.id} className="p-4 space-y-3">
           <div className="flex justify-between items-start">
             <div>
                <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded border border-indigo-100 dark:border-indigo-900/30">
                    {batch.batchLabel}
                </span>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mt-2">
                  {getProductName(batch.productId)}
                </h3>
             </div>
           </div>
           
           <div className="flex justify-between items-center text-sm text-slate-500">
              <span className="flex items-center gap-1">
                 <Calendar className="w-3.5 h-3.5" />
                 {formatDateForDisplay(batch.entryDate)}
              </span>
           </div>

           <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="font-mono font-medium text-slate-700 dark:text-slate-300">{formatCurrency(batch.unitPriceCost)}</div>
              <div className="flex items-center text-sm">
                  <div className={`w-1.5 h-1.5 rounded-full mr-2 ${batch.quantity < 10 ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                  <span className={`font-medium ${batch.quantity < 10 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {batch.quantity} {t('inventory.units')}
                  </span>
                </div>
           </div>
        </div>
      ))}
    </div>

    {/* Pagination */}
    {filteredBatches.length > 0 && (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('activity.paginationShowing', {
            from: (safePage - 1) * PAGE_SIZE + 1,
            to: Math.min(safePage * PAGE_SIZE, filteredBatches.length),
            total: filteredBatches.length,
          })}
        </p>
        <nav className="flex items-center gap-2" aria-label={t('activity.paginationPage', { current: safePage, total: totalPages })}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-3 min-h-[44px] rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('inventory.previous')}
          </button>
          <span className="px-3 py-2 min-h-[44px] flex items-center text-sm font-medium text-slate-600 dark:text-slate-400">
            {t('activity.paginationPage', { current: safePage, total: totalPages })}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-3 min-h-[44px] rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
          >
            {t('inventory.next')}
            <ChevronRight className="w-4 h-4" />
          </button>
        </nav>
      </div>
    )}
    </>
  );
}
