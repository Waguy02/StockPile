import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  UserPlus,
  MoreHorizontal,
  Loader2,
  Edit, 
  Lock, 
  Trash2 
} from 'lucide-react';
import { useStore } from '../../lib/StoreContext';
import { AddUserDialog } from '../modals/AddUserDialog';
import { ChangePasswordDialog } from '../modals/ChangePasswordDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { api } from '../../lib/api';

export function Admin() {
  const { managers, isLoading, refresh, currentUser } = useStore();
  const { t } = useTranslation();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setIsAddUserOpen(true);
  };

  const handleChangePassword = (user: any) => {
    setSelectedUser(user);
    setIsChangePasswordOpen(true);
  };

  const handleDeleteUser = async (user: any) => {
      if (confirm(t('common.confirmDelete', { item: 'user' }))) {
          await api.deleteUser(user.id);
          await refresh();
      }
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setIsAddUserOpen(true);
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t('admin.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">{t('admin.subtitle')}</p>
        </div>
        <button 
          onClick={handleAddUser}
          className="flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition-all hover:-translate-y-0.5"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {t('admin.addUser')}
        </button>
      </div>

      <div className="w-full">
        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center">
                <Users className="w-5 h-5 mr-2.5 text-indigo-500 dark:text-indigo-400" />
                {t('admin.activeUsers')}
              </h2>
            </div>
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
               <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4">{t('admin.table.name')}</th>
                  <th className="px-6 py-4">{t('admin.table.role')}</th>
                  <th className="px-6 py-4">{t('admin.table.lastActive')}</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {managers.map((manager, idx) => (
                  <tr key={manager.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">{manager.name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                        manager.role === 'admin' 
                          ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-900/30'
                          : manager.role === 'manager'
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}>
                        {manager.role ? manager.role.charAt(0).toUpperCase() + manager.role.slice(1) : 'Staff'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      {manager.status === 'active' ? <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center"><span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>{t('admin.onlineNow')}</span> : t('admin.hoursAgo', { hours: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button 
                            className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                          >
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditUser(manager)} className="cursor-pointer">
                            <Edit className="w-4 h-4 mr-2" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleChangePassword(manager)} className="cursor-pointer">
                            <Lock className="w-4 h-4 mr-2" />
                            {t('admin.changePassword')}
                          </DropdownMenuItem>
                          {currentUser?.id !== manager.id && (
                            <DropdownMenuItem onClick={() => handleDeleteUser(manager)} className="text-rose-600 focus:text-rose-600 cursor-pointer">
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('common.delete')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddUserDialog 
        open={isAddUserOpen} 
        onOpenChange={setIsAddUserOpen}
        user={selectedUser}
      />
      
      <ChangePasswordDialog 
        open={isChangePasswordOpen} 
        onOpenChange={setIsChangePasswordOpen}
        user={selectedUser}
      />
    </div>
  );
}
