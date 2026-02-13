import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertCircle } from 'lucide-react';
import { useStore } from '../../lib/StoreContext';
import { supabase } from '../../lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

export function Login() {
  const { refresh } = useStore();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changePasswordEmail, setChangePasswordEmail] = useState('');
  const [changePasswordCurrent, setChangePasswordCurrent] = useState('');
  const [changePasswordNew, setChangePasswordNew] = useState('');
  const [changePasswordConfirm, setChangePasswordConfirm] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }
      
      await refresh();
      
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || '';
      const invalidCreds = /invalid login credentials|invalid_credentials/i.test(msg);
      setError(invalidCreds ? t('login.errorInvalidCredentials', { defaultValue: 'Invalid email or password.' }) : t('login.errorLoginFailed', { defaultValue: 'Login failed. Please try again.' }));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChangePassword = () => {
    setChangePasswordOpen(true);
    setChangePasswordEmail(email);
    setChangePasswordCurrent('');
    setChangePasswordNew('');
    setChangePasswordConfirm('');
    setChangePasswordError('');
    setChangePasswordSuccess(false);
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError('');
    if (changePasswordNew !== changePasswordConfirm) {
      setChangePasswordError(t('login.passwordsMustMatch', { defaultValue: 'New password and confirmation must match' }));
      return;
    }
    if (changePasswordNew.length < 6) {
      setChangePasswordError(t('login.passwordMinLength', { defaultValue: 'Password must be at least 6 characters' }));
      return;
    }
    setChangePasswordLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: changePasswordEmail.trim(),
        password: changePasswordCurrent,
      });
      if (signInError) {
        setChangePasswordError(signInError.message || t('login.currentPasswordIncorrect', { defaultValue: 'Current password is incorrect' }));
        setChangePasswordLoading(false);
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: changePasswordNew });
      if (updateError) {
        setChangePasswordError(updateError.message || t('login.errorUpdatePasswordFailed', { defaultValue: 'Failed to update password.' }));
        setChangePasswordLoading(false);
        return;
      }
      setChangePasswordSuccess(true);
      await refresh();
      setTimeout(() => {
        setChangePasswordOpen(false);
        setChangePasswordSuccess(false);
      }, 1500);
    } catch (err: any) {
      setChangePasswordError(err.message || 'Something went wrong.');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a] relative overflow-hidden">
      {/* Subtle radial glow behind card for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(79,70,229,0.12),transparent)] pointer-events-none" aria-hidden />
      {/* Large background logo */}
      <img src="./odicam_logo.png" alt="" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(100vw,800px)] h-[min(100vh,800px)] scale-[2] object-contain opacity-[0.02] blur-[2px] pointer-events-none select-none z-0" aria-hidden />
      <div className="w-full max-w-md bg-[#0B1121] rounded-2xl shadow-2xl shadow-slate-900/20 dark:shadow-black/40 border border-slate-800/50 overflow-hidden relative z-10">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <img src="./odicam_logo_with_text.png" alt="Odicam - Gestion de Stock" className="w-full max-w-[220px] h-auto object-contain mb-4" />
            <p className="text-slate-400 text-sm">{t('login.signInToAccount', { defaultValue: 'Sign in to your account' })}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">{t('login.email', { defaultValue: 'Email' })}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-white placeholder:text-slate-500"
                placeholder={t('login.emailPlaceholder', { defaultValue: 'you@company.com' })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">{t('login.password', { defaultValue: 'Password' })}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-white placeholder:text-slate-500"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-900/20 text-rose-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('login.signIn', { defaultValue: 'Sign In' })}
            </button>
          </form>

          <p className="mt-4 text-center">
            <button
              type="button"
              onClick={handleOpenChangePassword}
              className="text-sm text-indigo-400 hover:text-indigo-300 hover:underline"
            >
              {t('login.changePassword', { defaultValue: 'Change password' })}
            </button>
          </p>
        </div>
        <div className="px-8 py-4 border-t border-slate-800/50 text-center">
          <p className="text-xs text-slate-500">StockPile v1.0.0 2026</p>
        </div>
      </div>

      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">{t('login.changePasswordTitle', { defaultValue: 'Change password' })}</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              {t('login.changePasswordHint', { defaultValue: 'Enter your current password, then type your new password twice.' })}
            </DialogDescription>
          </DialogHeader>
          {changePasswordSuccess ? (
            <p className="py-4 text-center text-emerald-600 dark:text-emerald-400 font-medium">
              {t('login.passwordChanged', { defaultValue: 'Password changed successfully. You are now signed in.' })}
            </p>
          ) : (
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('login.email', { defaultValue: 'Email' })}</label>
                <input
                  type="email"
                  value={changePasswordEmail}
                  onChange={(e) => setChangePasswordEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder={t('login.emailPlaceholder', { defaultValue: 'you@company.com' })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('login.currentPassword', { defaultValue: 'Current password' })}</label>
                <input
                  type="password"
                  value={changePasswordCurrent}
                  onChange={(e) => setChangePasswordCurrent(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('login.newPassword', { defaultValue: 'New password' })}</label>
                <input
                  type="password"
                  value={changePasswordNew}
                  onChange={(e) => setChangePasswordNew(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('login.confirmNewPassword', { defaultValue: 'Confirm new password' })}</label>
                <input
                  type="password"
                  value={changePasswordConfirm}
                  onChange={(e) => setChangePasswordConfirm(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              {changePasswordError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {changePasswordError}
                </div>
              )}
              <DialogFooter>
                <button
                  type="submit"
                  disabled={changePasswordLoading}
                  className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {changePasswordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {t('login.submitChangePassword', { defaultValue: 'Change password' })}
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
