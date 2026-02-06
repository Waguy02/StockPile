import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  UserPlus,
  MoreHorizontal,
  Loader2
} from 'lucide-react';
import { useStore } from '../../lib/StoreContext';

export function Admin() {
  const { managers, isLoading } = useStore();
  const { t } = useTranslation();

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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('admin.title')}</h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">{t('admin.subtitle')}</p>
        </div>
        <button className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium text-sm shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5">
          <UserPlus className="w-4 h-4 mr-2" />
          {t('admin.addUser')}
        </button>
      </div>

      <div className="w-full">
        <div className="space-y-8">
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-800 flex items-center">
                <Users className="w-5 h-5 mr-2.5 text-indigo-500" />
                {t('admin.activeUsers')}
              </h2>
            </div>
            <table className="w-full text-left text-sm text-slate-600">
               <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4">{t('admin.table.name')}</th>
                  <th className="px-6 py-4">{t('admin.table.role')}</th>
                  <th className="px-6 py-4">{t('admin.table.lastActive')}</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {managers.map((manager, idx) => (
                  <tr key={manager.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-slate-900">{manager.name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                        Manager
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {idx === 0 ? <span className="text-emerald-600 font-medium flex items-center"><span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>{t('admin.onlineNow')}</span> : t('admin.hoursAgo', { hours: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {/* Dummy regular users */}
                 <tr className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-slate-900">John Employee</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        Staff
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{t('admin.yesterday')}</td>
                    <td className="px-6 py-4 text-right">
                       <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
