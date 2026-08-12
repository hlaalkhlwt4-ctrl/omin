import { otherCurrencyCodes, priorityCurrencies } from '@/lib/currencies';

export function CurrencySelect({ name = 'currency', value, defaultValue, onChange, className, id }: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  id?: string;
}) {
  return <select id={id} name={name} value={value} defaultValue={defaultValue} onChange={onChange} className={className}>
    <optgroup label="العملات العربية والأكثر استخدامًا">
      {priorityCurrencies.map(([code, label]) => <option key={code} value={code}>{label} ({code})</option>)}
    </optgroup>
    <optgroup label="جميع العملات الأخرى">
      {otherCurrencyCodes.map((code) => <option key={code} value={code}>{code}</option>)}
    </optgroup>
  </select>;
}
