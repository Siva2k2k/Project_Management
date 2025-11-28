import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import customerService from '../../services/customerService';
import type { Customer, CreateCustomerInput } from '../../services/customerService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
} from '../../components/ui';

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onSuccess: () => void;
}

export function CustomerDialog({ open, onOpenChange, customer, onSuccess }: CustomerDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCustomerInput>({
    defaultValues: customer
      ? {
          customer_name: customer.customer_name,
          email: customer.email,
          contact_info: customer.contact_info || '',
        }
      : {
          customer_name: '',
          email: '',
          contact_info: '',
        },
  });

  useEffect(() => {
    if (customer) {
      reset({
        customer_name: customer.customer_name,
        email: customer.email,
        contact_info: customer.contact_info || '',
      });
    } else {
      reset({
        customer_name: '',
        email: '',
        contact_info: '',
      });
    }
  }, [customer, reset]);

  const onSubmit = async (data: CreateCustomerInput) => {
    try {
      if (customer) {
        await customerService.update(customer._id, data);
      } else {
        await customerService.create(data);
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save customer:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          <DialogDescription>
            {customer ? 'Update customer information' : 'Add a new customer to your system'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="customer_name">
                Customer Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="customer_name"
                {...register('customer_name', { 
                  required: 'Customer name is required',
                  pattern: {
                    value: /^[A-Za-z].*[A-Za-z]/,
                    message: 'Customer name must start with a letter and contain at least one letter'
                  }
                })}
                placeholder="Enter customer name"
              />
              {errors.customer_name && (
                <p className="text-sm text-red-600">{errors.customer_name.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">
                Email <span className="text-red-600">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: 'Please enter a valid email',
                  },
                })}
                placeholder="Enter email address"
              />
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contact_info">Contact Info</Label>
              <Input
                id="contact_info"
                {...register('contact_info')}
                placeholder="Enter additional contact information"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : customer ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
