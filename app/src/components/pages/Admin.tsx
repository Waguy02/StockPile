import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  UserPlus,
  MoreHorizontal,
  Loader2,
  Lock, 
  Trash2 
} from 'lucide-react';
import { useStore } from '../../lib/StoreContext';
import { useConnection } from '../../lib/ConnectionContext';
import { AddUserDialog } from '../modals/AddUserDialog';
import { ChangePasswordDialog } from '../modals/ChangePasswordDialog';
import { ConfirmDeleteDialog } from '../common/ConfirmDeleteDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { api } from '../../lib/api';

export function Admin() {
  const { isLoading, refresh, currentUser } = useStore();
  const { isOnline } = useConnection();
  const { t } = useTranslation();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userList, setUserList] = useState<any[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsUsersLoading(true);
    setUsersError(null);
    try {
      const users = await api.getAdmin();
      const normalized = Array.isArray(users)
        ? users.map((user: any) => ({
            id: user.id,
            name: user.name ?? user.email?.split('@')[0] ?? 'Unknown',
            email: user.email ?? '',
            role: user.role ?? 'staff',
            status: user.status ?? 'active',
            lastActive: user.lastActive ?? null,
          }))
        : [];
      setUserList(normalized);
    } catch (error: any) {
      console.error('Failed to load users', error);
      setUserList([]);
      setUsersError(error?.message ?? t('admin.loadUsersError', 'Failed to load user list. Check your connection and try again.'));
    } finally {
      setIsUsersLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (currentUser?.role === 'manager') {
      loadUsers();
    }
  }, [currentUser?.role, loadUsers]);

  const handleChangePassword = (user: any) => {
    setSelectedUser(user);
    setIsChangePasswordOpen(true);
  };

  const handleToggleStatus = async (user: any) => {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      await api.updateUser(user.id, { ...user, status: newStatus });
      await refresh();
      await loadUsers();
  };

  const handleRequestDeleteUser = (user: any) => {
    setUserToDelete(user);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    await api.deleteUser(userToDelete.id, userToDelete.email);
    await refresh();
    await loadUsers();
    setUserToDelete(null);
  };

  const handleConfirmReset = async () => {
    await api.seed(true);
    await refresh();
    await loadUsers();
    setResetConfirmOpen(false);
    alert(t('admin.resetSuccess', 'Database reset successfully.'));
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setIsAddUserOpen(true);
  };

  if (isLoading || isUsersLoading) {
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
        {currentUser?.role === 'manager' && (
            <div className="flex gap-2">
                <button 
                    onClick={() => setResetConfirmOpen(true)}
                    disabled={!isOnline}
                    className="flex items-center px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium text-sm shadow-lg shadow-rose-200 dark:shadow-rose-900/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('admin.resetDatabase', 'Reset Database')}
                </button>
                <button 
                    onClick={handleAddUser}
                    disabled={!isOnline}
                    className="flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {t('admin.addUser')}
                </button>
            </div>
        )}
      </div>

      <div className="w-full">
        <div className="space-y-8">
          {usersError && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm">
              {usersError}
            </div>
          )}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center">
                <Users className="w-5 h-5 mr-2.5 text-indigo-500 dark:text-indigo-400" />
                {t('admin.activeUsers')}
              </h2>
            </div>
            <table className="hidden md:table w-full text-left text-sm text-slate-600 dark:text-slate-400">
               <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4">{t('admin.table.name')}</th>
                  <th className="px-6 py-4">{t('admin.email')}</th>
                  <th className="px-6 py-4">{t('admin.table.role')}</th>
                  <th className="px-6 py-4">{t('inventory.table.status')}</th>
                  <th className="px-6 py-4">{t('admin.table.lastActive')}</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {userList.map((manager, idx) => (
                  <tr key={manager.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">{manager.name}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{manager.email || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                           manager.role === 'manager'
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}>
                         {manager.role === 'manager' ? 'Manager' : 'Staff'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                            manager.status === 'active'
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'
                                : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30'
                        }`}>
                            {manager.status === 'active' ? t('modals.addProduct.status.active') : t('modals.addProduct.status.inactive')}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      {manager.lastActive ? new Date(manager.lastActive).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem disabled={!isOnline} className="cursor-pointer" onClick={() => isOnline && handleChangePassword(manager)}>
                                <Lock className="w-4 h-4 mr-2" />
                                {t('admin.actions.resetPassword')}
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={!isOnline} className="cursor-pointer" onClick={() => isOnline && handleToggleStatus(manager)}>
                                {manager.status === 'active' ? (
                                    <>
                                        <div className="w-4 h-4 mr-2 rounded-full border-2 border-slate-400" />
                                        {t('admin.actions.deactivateAccount')}
                                    </>
                                ) : (
                                    <>
                                        <div className="w-4 h-4 mr-2 rounded-full border-2 border-emerald-500 bg-emerald-500" />
                                        {t('admin.actions.activateAccount')}
                                    </>
                                )}
                            </DropdownMenuItem>
                            {currentUser?.id !== manager.id && (
                                <DropdownMenuItem disabled={!isOnline} className="text-rose-600 focus:text-rose-600 cursor-pointer" onClick={() => isOnline && handleRequestDeleteUser(manager)}>
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

            {/* Mobile User List */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {userList.map((manager) => (
                    <div key={manager.id} className="p-4 flex items-center justify-between">
                        <div>
                             <h3 className="font-semibold text-slate-900 dark:text-slate-100">{manager.name}</h3>
                             <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                                    manager.role === 'manager'
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}>
                                    {manager.role === 'manager' ? 'Manager' : 'Staff'}
                                </span>
                                <span className="text-xs text-slate-400">
                                    {manager.lastActive ? new Date(manager.lastActive).toLocaleDateString() : '-'}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                                    manager.status === 'active'
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'
                                        : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30'
                                }`}>
                                    {manager.status === 'active' ? t('modals.addProduct.status.active') : t('modals.addProduct.status.inactive')}
                                </span>
                             </div>
                        </div>
                         <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg">
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem disabled={!isOnline} className="cursor-pointer" onClick={() => isOnline && handleChangePassword(manager)}>
                                <Lock className="w-4 h-4 mr-2" />
                                {t('admin.actions.resetPassword')}
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={!isOnline} className="cursor-pointer" onClick={() => isOnline && handleToggleStatus(manager)}>
                                {manager.status === 'active' ? (
                                    <>
                                        <div className="w-4 h-4 mr-2 rounded-full border-2 border-slate-400" />
                                        {t('admin.actions.deactivateAccount')}
                                    </>
                                ) : (
                                    <>
                                        <div className="w-4 h-4 mr-2 rounded-full border-2 border-emerald-500 bg-emerald-500" />
                                        {t('admin.actions.activateAccount')}
                                    </>
                                )}
                            </DropdownMenuItem>
                            {currentUser?.id !== manager.id && (
                                <DropdownMenuItem disabled={!isOnline} className="text-rose-600 focus:text-rose-600 cursor-pointer" onClick={() => isOnline && handleRequestDeleteUser(manager)}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    {t('common.delete')}
                                </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ))}
            </div> 
          </div>
        </div>
      </div>

      <AddUserDialog 
        open={isAddUserOpen} 
        onOpenChange={setIsAddUserOpen}
        user={selectedUser}
        onSaved={loadUsers}
      />
      
      <ChangePasswordDialog 
        open={isChangePasswordOpen} 
        onOpenChange={setIsChangePasswordOpen}
        user={selectedUser}
      />

      <ConfirmDeleteDialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
        title={t('common.confirmDeleteTitle')}
        description={t('common.confirmDelete', { item: t('admin.userItem') })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleConfirmDeleteUser}
      />

      <ConfirmDeleteDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title={t('admin.confirmResetTitle', 'Reset database')}
        description={t('admin.confirmReset')}
        confirmLabel={t('login.resetSystemData')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleConfirmReset}
        variant="default"
      />
    </div>
  );
}
