import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { maskCurrencyInput } from "@/lib/format";

type CurrencyInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type"
> & {
  value: string;
  onValueChange: (masked: string) => void;
};

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput({ value, onValueChange, ...props }, ref) {
    return (
      <Input
        {...props}
        ref={ref}
        inputMode="numeric"
        value={value}
        placeholder={props.placeholder ?? "R$ 0,00"}
        onChange={(event) => onValueChange(maskCurrencyInput(event.target.value))}
      />
    );
  }
);
