import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CustomVariant = "logout";

interface CustomButtonProps extends ButtonProps {
  customVariant?: CustomVariant;
}

const customVariantMap: Record<
  CustomVariant,
  {
    variant: ButtonProps["variant"];
    className: string;
  }
> = {
  logout: {
    variant: "ghost", // keeps shadcn neutral behavior
    className: cn(
      // base styles
      "px-5 py-2.5 text-sm font-medium",
      "bg-[var(--bg-light)] text-[var(--text-secondary)]",
      "border border-[var(--border)] rounded-[var(--radius-sm)]",
      "transition-all duration-200",

      // hover styles
      "hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)]",
    ),
  },
};

export const CustomButton = React.forwardRef<
  HTMLButtonElement,
  CustomButtonProps
>(({ customVariant, className, variant, ...props }, ref) => {
  const mapped = customVariant ? customVariantMap[customVariant] : null;

  return (
    <Button
      ref={ref}
      variant={mapped?.variant ?? variant}
      className={cn(mapped?.className, className)}
      {...props}
    />
  );
});

CustomButton.displayName = "CustomButton";
