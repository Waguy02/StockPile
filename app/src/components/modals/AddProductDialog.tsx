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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
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
            baseUnitPrice: Number(data.baseUnitPrice)
           });
        } else {
           await api.createProduct({
            ...data,
            categoryId: data.categoryId,
            baseUnitPrice: Number(data.baseUnitPrice)
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{product ? t('modals.addProduct.editTitle') : t('modals.addProduct.addTitle')}</DialogTitle>
          <DialogDescription>
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
                  <FormLabel>{t('modals.addProduct.nameLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('modals.addProduct.namePlaceholder')} {...field} />
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
                  <FormLabel>{t('modals.addProduct.categoryLabel')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('modals.addProduct.categoryPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="baseUnitPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('modals.addProduct.priceLabel')}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormDescription>
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
                  <FormLabel>{t('modals.addProduct.descLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('modals.addProduct.descPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('modals.addProduct.statusLabel')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('modals.addProduct.statusPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">{t('modals.addProduct.status.active')}</SelectItem>
                      <SelectItem value="inactive">{t('modals.addProduct.status.inactive')}</SelectItem>
                      <SelectItem value="archived">{t('modals.addProduct.status.archived')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('modals.addProduct.createButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
