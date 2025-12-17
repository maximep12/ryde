import type { DateInputProps as AriaDateInputProps } from "react-aria-components";
import {
  DateField as DateFieldAria,
  DateInput as DateInputAria,
  DateSegment as DateSegmentAria,
} from "react-aria-components";
import { cn } from "../../lib/utils";

function InputDateGroup({
  className,
  ...props
}: React.ComponentProps<typeof DateFieldAria>) {
  return <DateFieldAria {...props} className={cn(className)} />;
}

interface DateInputProps extends Omit<AriaDateInputProps, "children"> {
  className?: string;
  ariaLabel?: string;
}

function InputDateInput({
  className,
  ariaLabel = "date",
  ...props
}: DateInputProps) {
  return (
    <DateInputAria
      {...props}
      className={cn(
        "flex items-center",
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input shadow-xs h-9 w-full min-w-0 rounded-md border bg-transparent px-2 py-1 text-base outline-none transition-[color,box-shadow] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className,
      )}
      aria-label={ariaLabel}
    >
      {(segment) => (
        <DateSegmentAria
          segment={segment}
          className={cn(
            "text-foreground font-medium tabular-nums caret-transparent",
            "focus:bg-primary focus:outline-hidden focus:text-background rounded px-1 py-0.5",
            // The placeholder segment.
            segment.isPlaceholder && "text-muted-foreground uppercase",
            // The separator "/" segment.
            segment.type === "literal" && "text-muted-foreground px-1",
          )}
        />
      )}
    </DateInputAria>
  );
}

export { InputDateGroup, InputDateInput };
