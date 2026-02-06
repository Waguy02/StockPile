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

interface AddPartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: 'provider' | 'customer';
  partner?: any;
}

export function AddPartnerDialog({ open, onOpenChange, type = 'provider', partner }: AddPartnerDialogProps) {
  const { refresh } = useStore();
  const form = useForm({
    defaultValues: {
      name: '',
      contactInfo: '',
      email: '',
    }
  });

  React.useEffect(() => {
    if (partner) {
      form.reset({
        name: partner.name,
        contactInfo: partner.contactInfo || '',
        email: partner.email || '',
      });
    } else {
      form.reset({
        name: '',
        contactInfo: '',
        email: '',
      });
    }
  }, [partner, form]);

  const [isLoading, setIsLoading] = React.useState(false);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
        if (type === 'provider') {
          if (partner) {
            await api.updateProvider(partner.id, { ...partner, ...data });
          } else {
            await api.createProvider({ ...data, status: 'active' });
          }
        } else {
           if (partner) {
            await api.updateCustomer(partner.id, { ...partner, ...data });
          } else {
            await api.createCustomer({ ...data, status: 'active' });
          }
        }
        
        await refresh();
        onOpenChange(false);
        form.reset();
    } catch (error) {
        console.error('Failed to save partner', error);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{partner ? 'Edit' : 'Add New'} {type === 'provider' ? 'Provider' : 'Customer'}</DialogTitle>
          <DialogDescription>
             {partner ? 'Update details for this' : 'Register a new'}  {type === 'provider' ? 'supplier' : 'client'} in the system.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder={type === 'provider' ? "Company Name" : "Full Name"} {...field} />
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="contactInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone / Address</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 234..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Register {type === 'provider' ? 'Provider' : 'Customer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
