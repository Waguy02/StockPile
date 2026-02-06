import React from 'react';
import { useForm } from 'react-hook-form';
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
  SelectValue 
} from "@/components/ui/select";
import { useStore } from '../../lib/StoreContext';
import { api } from '../../lib/api';

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'purchase' | 'sale';
}

export function CreateOrderDialog({ open, onOpenChange, type }: CreateOrderDialogProps) {
  const { providers, customers, refresh } = useStore();
  const form = useForm({
    defaultValues: {
      partnerId: '',
      notes: '',
    }
  });

  const [isLoading, setIsLoading] = React.useState(false);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
        if (type === 'purchase') {
            await api.createPO({
                providerId: data.partnerId,
                totalAmount: 0, // Initial amount
                status: 'draft'
            });
        } else {
            await api.createSale({
                customerId: data.partnerId,
                totalAmount: 0,
                status: 'draft'
            });
        }
        await refresh();
        onOpenChange(false);
        form.reset();
    } catch (error) {
        console.error('Failed to create order', error);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create {type === 'purchase' ? 'Purchase' : 'Sales'} Order</DialogTitle>
          <DialogDescription>
            Start a new {type === 'purchase' ? 'procurement order' : 'customer sale'} draft.
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Draft
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
