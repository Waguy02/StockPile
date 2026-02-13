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
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '../../lib/StoreContext';
import { api } from '../../lib/api';
import { formatAmountForInput, parseAmountToInteger } from '../../lib/formatters';

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'purchase' | 'sale';
  order?: any;
}

function CreateOrderDialog({ open, onOpenChange, type, order }: CreateOrderDialogProps) {
  const queryClient = useQueryClient();
  const { providers, customers, products, stockBatches, refresh, currentUser } = useStore();
  const { t, i18n } = useTranslation();
  const amountLocale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
  const form = useForm({
    defaultValues: {
      partnerId: '',
      totalAmount: '0',
      amountPaid: '0',
      status: 'pending',
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
    const totalInt = String(Math.round(total));
    form.setValue("totalAmount", totalInt);
    const paid = parseInt(form.getValues("amountPaid"), 10) || 0;
    if (paid > Math.round(total)) form.setValue("amountPaid", totalInt);
  }, [watchedItems, form]);

  React.useEffect(() => {
    if (order) {
        form.reset({
            partnerId: type === 'purchase' ? (order.providerId || '') : (order.customerId || ''),
            totalAmount: String(Math.round(Number(order.totalAmount) || 0)),
            amountPaid: String(Math.round(Number(order.amountPaid) || 0)),
            status: (order.status === 'draft' || order.status === 'cancelled') ? 'pending' : (order.status || 'pending'),
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
            status: 'pending',
            notes: '',
            items: [],
        });
    }
  }, [order, type, form]);

  const [isLoading, setIsLoading] = React.useState(false);

  const hasAtLeastOneProduct = (watchedItems || []).some(
    (i: any) => i.productId && (parseFloat(String(i.quantity)) || 0) > 0
  );

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

        const validItems = (data.items || []).filter((i: any) => i.productId && (parseFloat(String(i.quantity)) || 0) > 0);
        if (validItems.length === 0) {
             toast.error(t('modals.createOrder.errors.atLeastOneProduct'));
             setIsLoading(false);
             return;
        }

        const total = parseInt(String(data.totalAmount), 10) || 0;
        const paid = parseInt(String(data.amountPaid), 10) || 0;
        if (paid > total) {
             toast.error(t('modals.createOrder.errors.amountPaidExceedsTotal'));
             setIsLoading(false);
             return;
        }

        const managerId = currentUser?.id ?? '';
        const payload = {
            totalAmount: parseInt(String(data.totalAmount), 10) || 0,
            amountPaid: parseInt(String(data.amountPaid), 10) || 0,
            paymentStatus: Number(data.amountPaid) >= Number(data.totalAmount),
            status: data.status,
            notes: data.notes,
            initiationDate: order?.initiationDate || new Date().toISOString(),
            items: validItems.map((i: any) => ({
                productId: i.productId,
                quantity: Number(i.quantity),
                unitPrice: Number(i.unitPrice)
            })),
            managerId,
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
                                    entryDate: new Date().toISOString(),
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
                    providerId: data.partnerId,
                });
                toast.success(t('modals.createOrder.success.purchaseUpdated'));
            } else {
                const newPO = await api.createPO({
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
                                    entryDate: new Date().toISOString(),
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
                const updated = await api.updateSale(order.id, {
                    ...order,
                    ...payload,
                    customerId: data.partnerId,
                });
                queryClient.setQueryData(['appData'], (old: any) =>
                  old ? { ...old, sales: (old.sales || []).map((s: any) => s.id === updated.id ? updated : s) } : old
                );
                toast.success(t('modals.createOrder.success.saleUpdated'));
            } else {
                await api.createSale({
                    ...payload,
                    customerId: data.partnerId,
                    amountPaid: Number(data.amountPaid),
                });
                toast.success(t('modals.createOrder.success.saleCreated'));
            }
        }
        await refresh();
        onOpenChange(false);
        form.reset();
    } catch (error: any) {
        console.error('Failed to save order', error);
        toast.error(t('modals.createOrder.errors.saveFailed', { error: error.message || t('common.error') }));
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {order
              ? t('modals.createOrder.editTitle', { type: type === 'purchase' ? t('modals.createOrder.purchase') : t('modals.createOrder.sale'), defaultValue: 'Edit Order' })
              : t('modals.createOrder.createTitle', { type: type === 'purchase' ? t('modals.createOrder.purchase') : t('modals.createOrder.sale'), defaultValue: 'Create Order' })}
          </DialogTitle>
          <DialogDescription>
            {order
              ? t('modals.createOrder.editDesc', { type: type === 'purchase' ? t('modals.createOrder.procurement') : t('modals.createOrder.customerSale'), defaultValue: 'Update details for this order.' })
              : t('modals.createOrder.createDesc', { type: type === 'purchase' ? t('modals.createOrder.procurement') : t('modals.createOrder.customerSale'), defaultValue: 'Start a new order.' })}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="partnerId"
              render={({ field }) => {
                const partnerList = type === 'purchase' ? providers : customers;
                const placeholder = type === 'purchase'
                  ? t('modals.createOrder.selectProviderPlaceholder', { defaultValue: 'Sélectionner un fournisseur' })
                  : t('modals.createOrder.selectCustomerPlaceholder', { defaultValue: 'Sélectionner un client' });
                return (
                <FormItem>
                  <FormLabel>{type === 'purchase' ? t('modals.createOrder.providerLabel') : t('modals.createOrder.customerLabel')}</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      options={partnerList.map((p) => ({ value: p.id, label: p.name }))}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={placeholder}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );}}
            />

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <FormLabel>{t('modals.createOrder.itemsLabel')}</FormLabel>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => append({ productId: '', quantity: '1', unitPrice: '0' })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('modals.createOrder.addProduct')}
                </Button>
              </div>
              
              <div className="max-h-[240px] overflow-y-auto space-y-4 pr-2">
              {fields.map((field, index) => {
                const currentProductId = watchedItems?.[index]?.productId;
                const availableStock = type === 'sale' && currentProductId 
                    ? stockBatches
                        .filter(b => b.productId === currentProductId)
                        .reduce((sum, b) => sum + b.quantity, 0)
                    : null;

                return (
                <div key={field.id} className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:items-end border p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                  <FormField
                    control={form.control}
                    name={`items.${index}.productId`}
                    rules={{ required: t('modals.createOrder.errors.productRequired', { defaultValue: 'Select a product' }) }}
                    render={({ field }) => (
                      <FormItem className="flex-1 w-full">
                        <FormLabel className="text-xs">{t('modals.createOrder.productLabel')}</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            options={products.map((p) => ({ value: p.id, label: p.name }))}
                            value={field.value}
                            onChange={(val) => {
                              field.onChange(val);
                              const prod = products.find(pr => pr.id === val);
                              if (prod && type === 'sale') {
                                form.setValue(`items.${index}.unitPrice`, prod.baseUnitPrice.toString());
                              }
                            }}
                            placeholder={t('modals.createOrder.selectProduct')}
                            triggerClassName="h-9 text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        rules={{
                          validate: (value) => {
                            const qty = parseFloat(String(value)) || 0;
                            if (qty < 1) return t('modals.createOrder.errors.qtyMin', { defaultValue: 'Min 1' });
                            return true;
                          },
                        }}
                        render={({ field }) => (
                        <FormItem className="flex-1 sm:w-24">
                            <FormLabel className="text-xs">
                                {t('modals.createOrder.qtyLabel')}
                                {availableStock !== null && (
                                    <span className="block text-[10px] font-normal text-slate-500 whitespace-nowrap">
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
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    
                    <FormField
                        control={form.control}
                        name={`items.${index}.unitPrice`}
                        render={({ field }) => (
                        <FormItem className="flex-1 sm:w-24">
                            <FormLabel className="text-xs">{t('modals.createOrder.priceLabel')}</FormLabel>
                            <FormControl>
                            <Input type="number" step="0.01" min="0" {...field} />
                            </FormControl>
                        </FormItem>
                        )}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="sm:mb-2 self-end sm:self-auto text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
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
                  <FormLabel>{t('modals.createOrder.totalLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={formatAmountForInput(field.value, amountLocale)}
                      onChange={(e) => field.onChange(parseAmountToInteger(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amountPaid"
              rules={{
                validate: (value) => {
                  const total = parseInt(form.getValues('totalAmount'), 10) || 0;
                  const paid = parseInt(String(value), 10) || 0;
                  if (paid > total) return t('modals.createOrder.errors.amountPaidExceedsTotal');
                  return true;
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('modals.createOrder.paidLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={formatAmountForInput(field.value, amountLocale)}
                      onChange={(e) => field.onChange(parseAmountToInteger(e.target.value))}
                    />
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
                  <FormLabel>{t('modals.createOrder.statusLabel')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={order?.status === 'completed'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('modals.createOrder.selectStatus')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">{t('modals.createOrder.status.pending')}</SelectItem>
                      <SelectItem value="completed">{type === 'purchase' ? t('modals.createOrder.status.received') : t('modals.createOrder.status.completed')}</SelectItem>
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
                  <FormLabel>{t('modals.createOrder.notesLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('modals.createOrder.notesPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isLoading || !hasAtLeastOneProduct}>
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

export { CreateOrderDialog };
export default CreateOrderDialog;
