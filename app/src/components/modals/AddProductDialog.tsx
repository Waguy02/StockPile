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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useStore } from '../../lib/StoreContext';
import { api } from '../../lib/api';

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: any;
}

export function AddProductDialog({ open, onOpenChange, product }: AddProductDialogProps) {
  const { categories, refresh } = useStore();
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
      categoryId: '',
      baseUnitPrice: 0,
      status: 'active',
    }
  });

  React.useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        description: product.description || '',
        categoryId: product.categoryId,
        baseUnitPrice: product.baseUnitPrice,
        status: product.status || 'active',
      });
    } else {
      form.reset({
        name: '',
        description: '',
        categoryId: '',
        baseUnitPrice: 0,
        status: 'active',
      });
    }
  }, [product, form]);

  const [isLoading, setIsLoading] = React.useState(false);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
        if (product) {
           await api.updateProduct(product.id, {
            ...product,
            ...data,
            categoryId: data.categoryId,
            baseUnitPrice: Number(data.baseUnitPrice),
            status: product.status || 'active',
           });
        } else {
           await api.createProduct({
            ...data,
            categoryId: data.categoryId,
            baseUnitPrice: Number(data.baseUnitPrice),
            status: 'active',
           });
        }
        
        await refresh();
        onOpenChange(false);
        form.reset();
    } catch (error) {
        console.error('Failed to save product', error);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[425px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-100">{product ? t('modals.addProduct.editTitle') : t('modals.addProduct.addTitle')}</DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
             {product ? t('modals.addProduct.editDesc') : t('modals.addProduct.addDesc')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-900 dark:text-slate-200">{t('modals.addProduct.nameLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('modals.addProduct.namePlaceholder')} {...field} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-900 dark:text-slate-200">{t('modals.addProduct.categoryLabel')}</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      options={categories.map((c) => ({ value: c.id, label: c.name }))}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t('modals.addProduct.categoryPlaceholder')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="baseUnitPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-900 dark:text-slate-200">{t('modals.addProduct.priceLabel')}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400" />
                  </FormControl>
                  <FormDescription className="text-slate-500 dark:text-slate-400">
                    {t('modals.addProduct.priceDesc')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-900 dark:text-slate-200">{t('modals.addProduct.descLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('modals.addProduct.descPlaceholder')} {...field} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-700">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {product ? t('modals.addProduct.validateButton') : t('modals.addProduct.createButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
