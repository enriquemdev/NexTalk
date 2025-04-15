import * as React from "react";

import { cn } from "@/lib/utils";
import { forwardRef, HTMLAttributes } from "react";

export const Kbd = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => {
    return (
      <kbd
        className={cn(
          "inline-flex h-5 select-none items-center justify-center rounded border border-muted bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Kbd.displayName = "Kbd";
