import React from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
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
  const { providers, customers, products, refresh } = useStore();
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
             toast.error("Cannot change status of a completed order");
             setIsLoading(false);
             return;
        }

        // Allow updates to payment for completed orders, but prevent other critical changes if needed.
        // For now, we rely on the backend/logic to handle what's safe. 
        // We will just enforce that if it WAS completed, it MUST STAY completed.
        // And if it is completed, we don't re-add stock (logic below handles this by checking status change).

        if (!data.partnerId) {
             toast.error(`Please select a ${type === 'purchase' ? 'provider' : 'customer'}`);
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
                                toast.error(`Failed to create stock for one item`);
                            }
                        }
                    }
                    if (batchesCreated > 0) {
                        toast.success(`${batchesCreated} stock batches created`);
                    }
                }

                await api.updatePO(order.id, {
                    ...order,
                    ...payload,
                    providerId: data.partnerId, // Ensure we send current partnerId
                });
                toast.success("Purchase order updated");
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
                toast.success("Purchase order created");
            }
        } else {
            if (order) {
                await api.updateSale(order.id, {
                    ...order,
                    ...payload,
                    customerId: data.partnerId,
                });
                toast.success("Sale order updated");
            } else {
                await api.createSale({
                    ...payload,
                    customerId: data.partnerId,
                    amountPaid: Number(data.amountPaid)
                });
                toast.success("Sale order created");
            }
        }
        await refresh();
        onOpenChange(false);
        form.reset();
    } catch (error: any) {
        console.error('Failed to save order', error);
        toast.error(`Failed to save order: ${error.message || 'Unknown error'}`);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? 'Edit' : 'Create'} {type === 'purchase' ? 'Purchase' : 'Sales'} Order</DialogTitle>
          <DialogDescription>
             {order ? 'Update details for this' : 'Start a new'} {type === 'purchase' ? 'procurement order' : 'customer sale'}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="partnerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{type === 'purchase' ? 'Provider' : 'Customer'}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select a ${type === 'purchase' ? 'provider' : 'customer'}`} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {type === 'purchase' 
                        ? providers.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))
                        : customers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
                <FormLabel>Items</FormLabel>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => append({ productId: '', quantity: '1', unitPrice: '0' })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </div>
              
              <div className="max-h-[240px] overflow-y-auto space-y-2 pr-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-end border p-2 rounded-md bg-slate-50 dark:bg-slate-900">
                  <FormField
                    control={form.control}
                    name={`items.${index}.productId`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-xs">Product</FormLabel>
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
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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
                      <FormItem className="w-20">
                        <FormLabel className="text-xs">Qty</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name={`items.${index}.unitPrice`}
                    render={({ field }) => (
                      <FormItem className="w-24">
                        <FormLabel className="text-xs">Price</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mb-2"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="totalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Amount ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
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
                  <FormLabel>Amount Paid ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
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
                  <FormLabel>Status</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={order?.status === 'completed'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">{type === 'purchase' ? 'Received' : 'Completed'}</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {order ? 'Save Changes' : 'Create Order'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
