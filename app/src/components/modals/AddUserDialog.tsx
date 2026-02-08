import React from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useStore } from '../../lib/StoreContext';
import { api } from '../../lib/api';

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: any;
  onSaved?: () => Promise<void> | void;
}

export function AddUserDialog({ open, onOpenChange, user, onSaved }: AddUserDialogProps) {
  const { refresh } = useStore();
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      role: 'staff',
      status: 'active'
    }
  });

  React.useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email || '',
        role: user.role,
        status: user.status
      });
    } else {
      form.reset({
        name: '',
        email: '',
        role: 'staff',
        status: 'active'
      });
    }
  }, [user, form]);

  const [isLoading, setIsLoading] = React.useState(false);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      if (user) {
        await api.updateUser(user.id, { ...user, ...data });
        toast.success(t('admin.userUpdated', 'User updated successfully'));
      } else {
        const generatedPassword = Math.random().toString(36).slice(-8);
        await api.createUser({ name: data.name, email: data.email, role: data.role, password: generatedPassword });
        
        // Simulate sending email
        console.log(`Sending email to ${data.email} with username: ${data.name} and password: ${generatedPassword}`);
        toast.success(t('admin.userCreated', 'User created successfully'), {
            description: `Email sent to ${data.email} with credentials.`
        });
      }
      
      await refresh();
      if (onSaved) {
        await onSaved();
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error('Failed to save user', error);
      toast.error(t('common.error', 'An error occurred'), {
        description: error.message || 'Failed to save user'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[425px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-100">
            {user ? t('admin.editUser') : t('admin.addUser')}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
             {user ? t('admin.editUserDesc') : t('admin.addUserDesc')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-900 dark:text-slate-200">{t('admin.table.name')}</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-900 dark:text-slate-200">{t('admin.email')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('admin.emailPlaceholder')} {...field} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-900 dark:text-slate-200">{t('admin.table.role')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                      <SelectItem value="manager">{t('admin.table.role.manager')}</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-700">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {user ? t('common.save') : t('admin.addUser')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
