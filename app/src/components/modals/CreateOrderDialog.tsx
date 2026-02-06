import React from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Trash2 } from 'lucide-react';
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
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { useStore } from '../../lib/StoreContext';
import { api } from '../../lib/api';

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'purchase' | 'sale';
  order?: any;
}

export function CreateOrderDialog({ open, onOpenChange, type, order }: CreateOrderDialogProps) {
  const { providers, customers, products, stockBatches, refresh } = useStore();
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: {
      partnerId: '',
      totalAmount: '0',
      amountPaid: '0',
      status: 'draft',
      notes: '',
      items: [] as { productId: string; quantity: string; unitPrice: string }[],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = useWatch({
    control: form.control,
    name: "items",
  });

  React.useEffect(() => {
    const total = (watchedItems || []).reduce((sum, item) => {
      const q = parseFloat(String(item.quantity)) || 0;
      const p = parseFloat(String(item.unitPrice)) || 0;
      return sum + (q * p);
    }, 0);
    
    // Update total whenever items change
    form.setValue("totalAmount", total.toFixed(2));
  }, [watchedItems, form]);

  React.useEffect(() => {
    if (order) {
        form.reset({
            partnerId: type === 'purchase' ? (order.providerId || '') : (order.customerId || ''),
            totalAmount: order.totalAmount?.toString() || '0',
            amountPaid: order.amountPaid?.toString() || '0',
            status: order.status || 'draft',
            notes: order.notes || '',
            items: order.items?.map((i: any) => ({
                productId: i.productId,
                quantity: i.quantity.toString(),
                unitPrice: i.unitPrice.toString()
            })) || [],
        });
    } else {
        form.reset({
            partnerId: '',
            totalAmount: '0',
            amountPaid: '0',
      status: 'draft',
            notes: '',
            items: [],
        });
    }
  }, [order, type, form]);

  const [isLoading, setIsLoading] = React.useState(false);


  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
        if (order && order.status === 'completed' && data.status !== 'completed') {
             toast.error(t('modals.createOrder.errors.completedStatus'));
             setIsLoading(false);
             return;
        }

        // Allow updates to payment for completed orders, but prevent other critical changes if needed.
        // For now, we rely on the backend/logic to handle what's safe. 
        // We will just enforce that if it WAS completed, it MUST STAY completed.
        // And if it is completed, we don't re-add stock (logic below handles this by checking status change).

        if (!data.partnerId) {
             toast.error(t('modals.createOrder.errors.selectPartner', { type: type === 'purchase' ? t('modals.createOrder.providerLabel') : t('modals.createOrder.customerLabel') }));
             setIsLoading(false);
             return; 
        }

        const payload = {
            totalAmount: Number(data.totalAmount),
            amountPaid: Number(data.amountPaid),
            paymentStatus: Number(data.amountPaid) >= Number(data.totalAmount),
            status: data.status,
            notes: data.notes,
            initiationDate: order?.initiationDate || new Date().toISOString().split('T')[0],
            items: data.items?.map((i: any) => ({
                productId: i.productId,
                quantity: Number(i.quantity),
                unitPrice: Number(i.unitPrice)
            })) || [],
        };

        if (type === 'sale') {
            for (const item of payload.items) {
                if (item.productId && item.quantity > 0) {
                    const available = stockBatches
                        .filter(b => b.productId === item.productId)
                        .reduce((sum, b) => sum + b.quantity, 0);
                    
                    if (item.quantity > available) {
                        toast.error(t('modals.createOrder.errors.insufficientStock'));
                        setIsLoading(false);
                        return;
                    }
                }
            }
        }

        if (type === 'purchase') {
            if (order) {
                // Check if we are marking as received/completed
                if (data.status === 'completed' && order.status !== 'completed') {
                    // Create stock batches for each item
                    let batchesCreated = 0;
                    for (const item of payload.items) {
                        if (item.productId && item.quantity > 0) {
                            try {
                                await api.createBatch({
                                    productId: item.productId,
                                    quantity: item.quantity,
                                    unitPriceCost: item.unitPrice,
                                    batchLabel: `PO-${order.id.slice(0, 8)}`,
                                    entryDate: new Date().toISOString().split('T')[0],
                                    status: 'active'
                                });
                                batchesCreated++;
                            } catch (err) {
                                console.error("Failed to create batch for item", item, err);
                                toast.error(t('modals.createOrder.errors.stockCreation'));
                            }
                        }
                    }
                    if (batchesCreated > 0) {
                        toast.success(t('modals.createOrder.success.batchesCreated', { count: batchesCreated }));
                    }
                }

                await api.updatePO(order.id, {
                    ...order,
                    ...payload,
                    providerId: data.partnerId, // Ensure we send current partnerId
                });
                toast.success(t('modals.createOrder.success.purchaseUpdated'));
            } else {
                await api.createPO({
                    ...payload,
                    providerId: data.partnerId,
                });

                // If created directly as completed
                if (data.status === 'completed') {
                    for (const item of payload.items) {
                        if (item.productId && item.quantity > 0) {
                             try {
                                await api.createBatch({
                                    productId: item.productId,
                                    quantity: item.quantity,
                                    unitPriceCost: item.unitPrice,
                                    batchLabel: `PO-${newPO.id.slice(0, 8)}`,
                                    entryDate: new Date().toISOString().split('T')[0],
                                    status: 'active'
                                });
                            } catch (err) {
                                console.error("Failed to create batch", err);
                            }
                        }
                    }
                }
                toast.success(t('modals.createOrder.success.purchaseCreated'));
            }
        } else {
            if (order) {
                await api.updateSale(order.id, {
                    ...order,
                    ...payload,
                    customerId: data.partnerId,
                });
                toast.success(t('modals.createOrder.success.saleUpdated'));
            } else {
                await api.createSale({
                    ...payload,
                    customerId: data.partnerId,
                    amountPaid: Number(data.amountPaid)
                });
                toast.success(t('modals.createOrder.success.saleCreated'));
            }
        }
        await refresh();
        onOpenChange(false);
        form.reset();
    } catch (error: any) {
        console.error('Failed to save order', error);
        toast.error(t('modals.createOrder.errors.saveFailed', { error: error.message || t('common.unknown') }));
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-100">
            {order ? t('modals.createOrder.editTitle', { type: type === 'purchase' ? t('modals.createOrder.purchase') : t('modals.createOrder.sale') }) 
                   : t('modals.createOrder.createTitle', { type: type === 'purchase' ? t('modals.createOrder.purchase') : t('modals.createOrder.sale') })}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
             {order ? t('modals.createOrder.editDesc', { type: type === 'purchase' ? t('modals.createOrder.procurement') : t('modals.createOrder.customerSale') })
                    : t('modals.createOrder.createDesc', { type: type === 'purchase' ? t('modals.createOrder.procurement') : t('modals.createOrder.customerSale') })}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="partnerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-900 dark:text-slate-200">{type === 'purchase' ? t('modals.createOrder.providerLabel') : t('modals.createOrder.customerLabel')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                        <SelectValue placeholder={t('modals.createOrder.selectPlaceholder', { type: type === 'purchase' ? t('modals.createOrder.providerLabel') : t('modals.createOrder.customerLabel') })} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                      {type === 'purchase' 
                        ? providers.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-800">{p.name}</SelectItem>
                          ))
                        : customers.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-800">{c.name}</SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <FormLabel className="text-slate-900 dark:text-slate-200">{t('modals.createOrder.itemsLabel')}</FormLabel>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => append({ productId: '', quantity: '1', unitPrice: '0' })}
                  className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('modals.createOrder.addProduct')}
                </Button>
              </div>
              
              <div className="max-h-[240px] overflow-y-auto space-y-2 pr-2">
              {fields.map((field, index) => {
                const currentProductId = watchedItems?.[index]?.productId;
                const availableStock = type === 'sale' && currentProductId 
                    ? stockBatches
                        .filter(b => b.productId === currentProductId)
                        .reduce((sum, b) => sum + b.quantity, 0)
                    : null;

                return (
                <div key={field.id} className="flex gap-2 items-end border border-slate-200 dark:border-slate-800 p-2 rounded-md bg-slate-50 dark:bg-slate-900">
                  <FormField
                    control={form.control}
                    name={`items.${index}.productId`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-xs text-slate-900 dark:text-slate-200">{t('modals.createOrder.productLabel')}</FormLabel>
                        <Select 
                            onValueChange={(val) => {
                                field.onChange(val);
                                const prod = products.find(p => p.id === val);
                                if (prod && type === 'sale') {
                                    form.setValue(`items.${index}.unitPrice`, prod.baseUnitPrice.toString());
                                }
                            }} 
                            value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 h-8 text-xs">
                              <SelectValue placeholder={t('modals.createOrder.selectProduct')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id} className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-800 text-xs">{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem className="w-24">
                        <FormLabel className="text-xs text-slate-900 dark:text-slate-200">
                            {t('modals.createOrder.qtyLabel')}
                            {availableStock !== null && (
                                <span className="block text-[10px] font-normal text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                    {t('modals.createOrder.maxStock', { stock: availableStock })}
                                </span>
                            )}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max={availableStock !== null ? availableStock : undefined}
                            {...field} 
                            className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 h-8 text-xs"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name={`items.${index}.unitPrice`}
                    render={({ field }) => (
                      <FormItem className="w-24">
                        <FormLabel className="text-xs text-slate-900 dark:text-slate-200">{t('modals.createOrder.priceLabel')}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" {...field} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 h-8 text-xs" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mb-0.5 h-8 w-8 hover:bg-slate-200 dark:hover:bg-slate-800"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              );
              })}
              </div>
            </div>

            <FormField
              control={form.control}
              name="totalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-900 dark:text-slate-200">{t('modals.createOrder.totalLabel')}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amountPaid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-900 dark:text-slate-200">{t('modals.createOrder.paidLabel')}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400" />
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
                  <FormLabel className="text-slate-900 dark:text-slate-200">{t('modals.createOrder.statusLabel')}</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={order?.status === 'completed'}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                        <SelectValue placeholder={t('modals.createOrder.selectStatus')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                      <SelectItem value="draft" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-800">{t('modals.createOrder.status.draft')}</SelectItem>
                      <SelectItem value="pending" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-800">{t('modals.createOrder.status.pending')}</SelectItem>
                      <SelectItem value="completed" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-800">{type === 'purchase' ? t('modals.createOrder.status.received') : t('modals.createOrder.status.completed')}</SelectItem>
                      <SelectItem value="cancelled" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-800">{t('modals.createOrder.status.cancelled')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-900 dark:text-slate-200">{t('modals.createOrder.notesLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('modals.createOrder.notesPlaceholder')} {...field} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-700">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {order ? t('modals.createOrder.saveButton') : t('modals.createOrder.createButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
