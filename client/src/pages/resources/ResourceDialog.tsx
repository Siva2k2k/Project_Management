import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import resourceService, { ResourceStatus, Currency } from '../../services/resourceService';
import type { Resource, CreateResourceInput } from '../../services/resourceService';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui';

interface ResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: Resource | null;
  onSuccess: () => void;
}

export function ResourceDialog({ open, onOpenChange, resource, onSuccess }: ResourceDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateResourceInput>({
    defaultValues: resource
      ? {
          resource_name: resource.resource_name,
          email: resource.email,
          status: resource.status,
          per_hour_rate: resource.per_hour_rate,
          currency: resource.currency,
        }
      : {
          resource_name: '',
          email: '',
          status: ResourceStatus.ACTIVE,
          per_hour_rate: 0,
          currency: Currency.USD,
        },
  });

  const status = watch('status');
  const currency = watch('currency');

  useEffect(() => {
    if (resource) {
      reset({
        resource_name: resource.resource_name,
        email: resource.email,
        status: resource.status,
        per_hour_rate: resource.per_hour_rate,
        currency: resource.currency,
      });
    } else {
      reset({
        resource_name: '',
        email: '',
        status: ResourceStatus.ACTIVE,
        per_hour_rate: 0,
        currency: Currency.USD,
      });
    }
  }, [resource, reset]);

  const onSubmit = async (data: CreateResourceInput) => {
    try {
      if (resource) {
        await resourceService.update(resource._id, data);
      } else {
        await resourceService.create(data);
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save resource:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{resource ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
          <DialogDescription>
            {resource ? 'Update resource information' : 'Add a new resource to your system'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="resource_name">
                Resource Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="resource_name"
                {...register('resource_name', { required: 'Resource name is required' })}
                placeholder="Enter resource name"
              />
              {errors.resource_name && (
                <p className="text-sm text-red-600">{errors.resource_name.message}</p>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="per_hour_rate">
                  Hourly Rate <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="per_hour_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('per_hour_rate', {
                    required: 'Hourly rate is required',
                    min: { value: 0, message: 'Rate cannot be negative' },
                    valueAsNumber: true,
                  })}
                  placeholder="0.00"
                />
                {errors.per_hour_rate && (
                  <p className="text-sm text-red-600">{errors.per_hour_rate.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={currency}
                  onValueChange={(value) => setValue('currency', value as Currency)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Currency.USD}>USD</SelectItem>
                    <SelectItem value={Currency.INR}>INR</SelectItem>
                    <SelectItem value={Currency.EUR}>EUR</SelectItem>
                    <SelectItem value={Currency.GBP}>GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setValue('status', value as ResourceStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ResourceStatus.ACTIVE}>Active</SelectItem>
                  <SelectItem value={ResourceStatus.INACTIVE}>Inactive</SelectItem>
                </SelectContent>
              </Select>
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
              {isSubmitting ? 'Saving...' : resource ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
