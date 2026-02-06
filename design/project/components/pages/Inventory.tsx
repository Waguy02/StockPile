import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal,
  PackageOpen,
  Tag,
  Loader2,
  ListFilter
} from 'lucide-react';
import { useStore } from '../../lib/StoreContext';

export function Inventory() {
  const { products, categories, stockBatches, isLoading } = useStore();
  const [activeTab, setActiveTab] = useState<'products' | 'batches'>('products');
  const [searchTerm, setSearchTerm] = useState('');

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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Inventory</h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">Manage your product catalog and track stock levels in real-time.</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-medium text-sm transition-all shadow-sm">
            <Tag className="w-4 h-4 mr-2 text-slate-500" />
            Categories
          </button>
          <button className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium text-sm shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
        {/* Tabs & Toolbar Container */}
        <div className="border-b border-slate-100">
             {/* Tabs */}
            <div className="flex px-2 pt-2">
            <button
                onClick={() => setActiveTab('products')}
                className={`relative px-6 py-4 text-sm font-semibold transition-all duration-200 rounded-t-lg ${
                activeTab === 'products'
                    ? 'text-indigo-600'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
            >
                Product Catalog
                {activeTab === 'products' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full mx-6"></div>
                )}
            </button>
            <button
                onClick={() => setActiveTab('batches')}
                className={`relative px-6 py-4 text-sm font-semibold transition-all duration-200 rounded-t-lg ${
                activeTab === 'batches'
                    ? 'text-indigo-600'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
            >
                Stock Batches
                {activeTab === 'batches' && (
                     <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full mx-6"></div>
                )}
            </button>
            </div>
        </div>
        
        {/* Toolbar */}
        <div className="p-5 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center border-b border-slate-100">
          <div className="relative w-full sm:w-96 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text"
              placeholder={`Search ${activeTab === 'products' ? 'products by name or description' : 'batches by label'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none ring-0 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
          <button className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm font-medium hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm">
            <ListFilter className="w-4 h-4 mr-2" />
            Filter
          </button>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto min-h-[400px]">
          {activeTab === 'products' ? (
            <ProductsTable searchTerm={searchTerm} />
          ) : (
            <BatchesTable searchTerm={searchTerm} />
          )}
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between text-sm text-slate-500">
          <span className="font-medium">Showing 1-10 of {activeTab === 'products' ? products.length : stockBatches.length} items</span>
          <div className="flex space-x-2">
            <button className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors" disabled>Previous</button>
            <button className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-indigo-600 font-medium transition-colors">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductsTable({ searchTerm }: { searchTerm: string }) {
  const { products, categories, stockBatches } = useStore();
  
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Unknown';

  if (filteredProducts.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <PackageOpen className="w-12 h-12 mb-3 opacity-20" />
              <p>No products found matching your search.</p>
          </div>
      )
  }

  return (
    <table className="w-full text-left text-sm text-slate-600">
      <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-xs">
        <tr>
          <th className="px-6 py-4">Product Name</th>
          <th className="px-6 py-4">Category</th>
          <th className="px-6 py-4">Base Price</th>
          <th className="px-6 py-4">Total Stock</th>
          <th className="px-6 py-4">Status</th>
          <th className="px-6 py-4 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {filteredProducts.map((product) => {
          const totalStock = stockBatches
            .filter(b => b.productId === product.id)
            .reduce((sum, b) => sum + b.quantity, 0);

          return (
            <tr key={product.id} className="hover:bg-slate-50/80 transition-colors group">
              <td className="px-6 py-4">
                <div className="font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">{product.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{product.description}</div>
              </td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  {getCategoryName(product.categoryId)}
                </span>
              </td>
              <td className="px-6 py-4 font-mono font-medium text-slate-700">${product.baseUnitPrice.toFixed(2)}</td>
              <td className="px-6 py-4">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${totalStock < 10 ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                  <span className={`font-semibold ${totalStock < 10 ? 'text-rose-600' : 'text-slate-700'}`}>{totalStock} units</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                  product.status === 'active' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : 'bg-rose-50 text-rose-700 border-rose-100'
                }`}>
                  {product.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function BatchesTable({ searchTerm }: { searchTerm: string }) {
  const { stockBatches, products } = useStore();
  
  const filteredBatches = stockBatches.filter(b => 
    b.batchLabel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Unknown';

   if (filteredBatches.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <PackageOpen className="w-12 h-12 mb-3 opacity-20" />
              <p>No batches found.</p>
          </div>
      )
  }

  return (
    <table className="w-full text-left text-sm text-slate-600">
      <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-xs">
        <tr>
          <th className="px-6 py-4">Batch Label</th>
          <th className="px-6 py-4">Product</th>
          <th className="px-6 py-4">Entry Date</th>
          <th className="px-6 py-4">Unit Cost</th>
          <th className="px-6 py-4">Quantity</th>
          <th className="px-6 py-4 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {filteredBatches.map((batch) => (
          <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors group">
            <td className="px-6 py-4">
                <span className="font-mono text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-100">
                    {batch.batchLabel}
                </span>
            </td>
            <td className="px-6 py-4 font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
              {getProductName(batch.productId)}
            </td>
            <td className="px-6 py-4 text-slate-500">{batch.entryDate}</td>
            <td className="px-6 py-4 font-mono font-medium">${batch.unitPriceCost.toFixed(2)}</td>
            <td className="px-6 py-4">
               <div className="flex items-center">
                  <div className={`w-1.5 h-1.5 rounded-full mr-2 ${batch.quantity < 10 ? 'bg-rose-500' : 'bg-slate-300'}`}></div>
                  <span className={`font-medium ${batch.quantity < 10 ? 'text-rose-600' : 'text-slate-700'}`}>
                    {batch.quantity}
                  </span>
                </div>
            </td>
            <td className="px-6 py-4 text-right">
              <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
