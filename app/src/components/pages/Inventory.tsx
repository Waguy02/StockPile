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
  Trash2
} from 'lucide-react';
import { useStore } from '../../lib/StoreContext';
import { AddProductDialog } from '../modals/AddProductDialog';
import { CategoriesDialog } from '../modals/CategoriesDialog';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/formatters';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export function Inventory() {
  const { products, categories, stockBatches, isLoading, refresh } = useStore();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'products' | 'batches'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const handleEditProduct = (product: any) => {
      setEditingProduct(product);
      setIsAddProductOpen(true);
  };

  const handleCloseProductDialog = (open: boolean) => {
      setIsAddProductOpen(open);
      if (!open) setEditingProduct(null);
  }
  
  const handleDeleteProduct = async (id: string) => {
    if (confirm(t('common.confirmDelete', { item: 'product' }))) {
        await api.deleteProduct(id);
        await refresh();
    }
  };

  const handleDeleteBatch = async (id: string) => {
    if (confirm(t('common.confirmDelete', { item: 'batch' }))) {
        await api.deleteBatch(id);
        await refresh();
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t('inventory.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">{t('inventory.subtitle')}</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setIsCategoriesOpen(true)}
            className="flex items-center px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 font-medium text-sm transition-all shadow-sm"
          >
            <Tag className="w-4 h-4 mr-2 text-slate-500" />
            {t('inventory.categories')}
          </button>
          <button 
            onClick={() => setIsAddProductOpen(true)}
            className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium text-sm shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('inventory.addProduct')}
          </button>
        </div>
      </div>
      
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
          <button className="flex items-center px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm">
            <ListFilter className="w-4 h-4 mr-2" />
            {t('inventory.filter')}
          </button>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto min-h-[400px]">
          {activeTab === 'products' ? (
            <ProductsTable 
                searchTerm={searchTerm} 
                onEdit={handleEditProduct} 
                onDelete={handleDeleteProduct} 
            />
          ) : (
            <BatchesTable 
                searchTerm={searchTerm} 
                onDelete={handleDeleteBatch}
            />
          )}
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span className="font-medium">{t('inventory.showing', { count: activeTab === 'products' ? products.length : stockBatches.length })}</span>
          <div className="flex space-x-2">
            <button className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors" disabled>{t('inventory.previous')}</button>
            <button className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">{t('inventory.next')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductsTable({ searchTerm, onEdit, onDelete }: { searchTerm: string, onEdit: (p: any) => void, onDelete: (id: string) => void }) {
  const { products, categories, stockBatches } = useStore();
  const { t } = useTranslation();
  
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
      <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-xs">
        <tr>
          <th className="px-6 py-4">{t('inventory.table.productName')}</th>
          <th className="px-6 py-4">{t('inventory.table.category')}</th>
          <th className="px-6 py-4">{t('inventory.table.basePrice')}</th>
          <th className="px-6 py-4">{t('inventory.table.totalStock')}</th>
          <th className="px-6 py-4">{t('inventory.table.status')}</th>
          <th className="px-6 py-4 text-right">{t('inventory.table.actions')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
        {filteredProducts.map((product) => {
          const totalStock = stockBatches
            .filter(b => b.productId === product.id)
            .reduce((sum, b) => sum + b.quantity, 0);

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
              <td className="px-6 py-4">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                  product.status === 'active' 
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' 
                    : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30'
                }`}>
                  {product.status}
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
                        <DropdownMenuItem className="cursor-pointer" onClick={() => onEdit(product)}>
                            <Edit className="w-4 h-4 mr-2" />
                            {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-rose-600 focus:text-rose-600 cursor-pointer" onClick={() => onDelete(product.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('common.delete')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function BatchesTable({ searchTerm, onDelete }: { searchTerm: string, onDelete: (id: string) => void }) {
  const { stockBatches, products } = useStore();
  const { t } = useTranslation();
  
  const filteredBatches = stockBatches.filter(b => 
    b.batchLabel.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
      <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-xs">
        <tr>
          <th className="px-6 py-4">{t('inventory.table.batchLabel')}</th>
          <th className="px-6 py-4">{t('inventory.table.product')}</th>
          <th className="px-6 py-4">{t('inventory.table.entryDate')}</th>
          <th className="px-6 py-4">{t('inventory.table.unitCost')}</th>
          <th className="px-6 py-4">{t('inventory.table.quantity')}</th>
          <th className="px-6 py-4 text-right">{t('inventory.table.actions')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
        {filteredBatches.map((batch) => (
          <tr key={batch.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors group">
            <td className="px-6 py-4">
                <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded border border-indigo-100 dark:border-indigo-900/30">
                    {batch.batchLabel}
                </span>
            </td>
            <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
              {getProductName(batch.productId)}
            </td>
            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{batch.entryDate}</td>
            <td className="px-6 py-4 font-mono font-medium text-slate-700 dark:text-slate-300">{formatCurrency(batch.unitPriceCost)}</td>
            <td className="px-6 py-4">
               <div className="flex items-center">
                  <div className={`w-1.5 h-1.5 rounded-full mr-2 ${batch.quantity < 10 ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                  <span className={`font-medium ${batch.quantity < 10 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {batch.quantity}
                  </span>
                </div>
            </td>
            <td className="px-6 py-4 text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all">
                        <MoreHorizontal className="w-5 h-5" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                         <DropdownMenuItem className="text-rose-600 focus:text-rose-600 cursor-pointer" onClick={() => onDelete(batch.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('common.delete')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
