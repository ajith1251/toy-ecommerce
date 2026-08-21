import { MapPin } from 'lucide-react';
import type { ShippingErrors, ShippingFormData } from '../../types/checkout';
import Input from '../ui/Input';

interface ShippingFormProps {
  value: ShippingFormData;
  errors: ShippingErrors;
  onChange: (field: keyof ShippingFormData, value: string) => void;
}

export default function ShippingForm({ value, errors, onChange }: ShippingFormProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <MapPin size={18} className="text-red-500" aria-hidden />
        Shipping Information
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="First Name"
          name="firstName"
          autoComplete="given-name"
          placeholder="Jane"
          value={value.firstName}
          onChange={e => onChange('firstName', e.target.value)}
          error={errors.firstName}
        />
        <Input
          label="Last Name"
          name="lastName"
          autoComplete="family-name"
          placeholder="Doe"
          value={value.lastName}
          onChange={e => onChange('lastName', e.target.value)}
          error={errors.lastName}
        />
      </div>

      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="jane@example.com"
        value={value.email}
        onChange={e => onChange('email', e.target.value)}
        error={errors.email}
        hint="Order confirmation will be sent here"
      />

      <Input
        label="Phone"
        name="phone"
        type="tel"
        autoComplete="tel"
        placeholder="+1 555 123 4567"
        value={value.phone}
        onChange={e => onChange('phone', e.target.value)}
        error={errors.phone}
      />

      <Input
        label="Address Line 1"
        name="line1"
        autoComplete="address-line1"
        placeholder="123 Toy Lane"
        value={value.line1}
        onChange={e => onChange('line1', e.target.value)}
        error={errors.line1}
      />

      <Input
        label="Address Line 2 (optional)"
        name="line2"
        autoComplete="address-line2"
        placeholder="Apt, Suite, Floor…"
        value={value.line2}
        onChange={e => onChange('line2', e.target.value)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="City"
          name="city"
          autoComplete="address-level2"
          placeholder="Springfield"
          value={value.city}
          onChange={e => onChange('city', e.target.value)}
          error={errors.city}
        />
        <Input
          label="State / Province"
          name="state"
          autoComplete="address-level1"
          placeholder="CA"
          value={value.state}
          onChange={e => onChange('state', e.target.value)}
          error={errors.state}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Postal Code"
          name="postalCode"
          autoComplete="postal-code"
          placeholder="90210"
          value={value.postalCode}
          onChange={e => onChange('postalCode', e.target.value)}
          error={errors.postalCode}
        />
        <Input
          label="Country"
          name="country"
          autoComplete="country-name"
          placeholder="United States"
          value={value.country}
          onChange={e => onChange('country', e.target.value)}
          error={errors.country}
        />
      </div>
    </div>
  );
}
