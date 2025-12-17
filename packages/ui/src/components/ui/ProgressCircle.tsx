"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

// ============================================================================
// Constants & Configuration
// ============================================================================

const SIZE_CONFIG = {
  "3xs": { strokeWidth: 4, radius: 14 },
  "2xs": { strokeWidth: 6, radius: 20 },
  xs: { strokeWidth: 6, radius: 39 },
  sm: { strokeWidth: 20, radius: 90 },
  md: { strokeWidth: 24, radius: 108 },
  lg: { strokeWidth: 28, radius: 126 },
} as const;

const GAUGE_LABEL_POSITION = {
  xxs: "bottom-0",
  xs: "bottom-1",
  sm: "bottom-1",
  md: "bottom-1",
  lg: "bottom-1",
} as const;

// ============================================================================
// Helpers
// ============================================================================

const getProgressLabelClasses = (
  variant: ProgressCircleProps["variant"],
  size: ProgressCircleProps["size"],
) => {
  const baseClasses = "absolute left-1/2 -translate-x-1/2 text-center";

  if (variant === "circle") {
    return `${baseClasses} top-1/2 -translate-y-1/2`;
  }

  return `${baseClasses} ${GAUGE_LABEL_POSITION[size as keyof typeof GAUGE_LABEL_POSITION]}`;
};

// ============================================================================
// Types
// ============================================================================

export interface ProgressCircleProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The minimum value for all progress indicators
   * @default 0
   */
  min?: number;
  /**
   * The maximum value for all progress indicators
   * @default 100
   */
  max?: number;
  /**
   * Size of the progress circle
   * @default "md"
   */
  size?: "3xs" | "2xs" | "xs" | "sm" | "md" | "lg";
  /**
   * Variant of the progress circle
   * - `circle`: Full circle (default)
   * - `gauge`: Circle with 15 degree gap at the bottom
   * @default "circle"
   */
  variant?: "circle" | "gauge";
}

export interface ProgressProps {
  /**
   * The current value of the progress indicator
   */
  value: number;
  /**
   * Optional color class for this specific progress indicator
   * @default "stroke-foreground"
   */
  className?: string;
}

export type ProgressLabelProps = React.HTMLAttributes<HTMLDivElement>;

interface ProgressCircleContextValue {
  min: number;
  max: number;
  variant: ProgressCircleProps["variant"];
  size: ProgressCircleProps["size"];
  strokeWidth: number;
  radius: number;
  svgSize: number;
}

// ============================================================================
// Context & Hook
// ============================================================================

const ProgressCircleContext =
  React.createContext<ProgressCircleContextValue | null>(null);

const useProgressCircle = () => {
  const context = React.useContext(ProgressCircleContext);
  if (!context) {
    throw new Error(
      "Progress/ProgressLabel must be used within a ProgressCircle",
    );
  }
  return context;
};

// ============================================================================
// Components
// ============================================================================

/**
 * Circular progress container that can hold multiple Progress indicators
 *
 * @example
 * ```tsx
 * <ProgressCircle size="md" variant="circle" min={0} max={100}>
 *   <Progress value={50} className="stroke-blue-500" />
 *   <Progress value={30} className="stroke-green-500" />
 *   <ProgressLabel>
 *     <div>Custom Label</div>
 *   </ProgressLabel>
 * </ProgressCircle>
 * ```
 */
export const ProgressCircle = React.forwardRef<
  HTMLDivElement,
  ProgressCircleProps
>(
  (
    {
      children,
      min = 0,
      max = 100,
      variant = "circle",
      size = "md",
      className,
      ...props
    },
    ref,
  ) => {
    const config = SIZE_CONFIG[size || "md"];
    const { strokeWidth, radius } = config;

    // Calculate SVG dimensions
    const diameter = 2 * (radius + strokeWidth / 2);
    const svgSize = variant === "gauge" ? radius + strokeWidth : diameter;

    // Separate Progress and ProgressLabel children and calculate total value
    const { progressChildren, labelChildren, totalValue } =
      React.useMemo(() => {
        const progress: React.ReactNode[] = [];
        const labels: React.ReactNode[] = [];
        let sum = 0;

        React.Children.forEach(children, (child) => {
          if (React.isValidElement(child)) {
            if (child.type === ProgressLabel) {
              labels.push(child);
            } else {
              progress.push(child);
              if (React.isValidElement<ProgressProps>(child)) {
                sum += child.props.value;
              }
            }
          }
        });

        return {
          progressChildren: progress,
          labelChildren: labels,
          totalValue: sum,
        };
      }, [children]);

    return (
      <ProgressCircleContext.Provider
        value={{
          min,
          max,
          variant,
          size: size || "md",
          strokeWidth,
          radius,
          svgSize: diameter,
        }}
      >
        <div
          ref={ref}
          className={cn("flex flex-col items-center gap-0.5", className)}
          {...props}
        >
          <div
            role="progressbar"
            aria-valuenow={totalValue}
            aria-valuemin={min}
            aria-valuemax={max}
            className="relative flex w-max items-center justify-center"
          >
            <svg
              width={diameter}
              height={svgSize}
              viewBox={`0 0 ${diameter} ${svgSize}`}
              className={cn(variant === "circle" && "-rotate-90")}
            >
              {/* Background circle/arc */}
              <circle
                cx={variant === "gauge" ? "50%" : diameter / 2}
                cy={
                  variant === "gauge" ? radius + strokeWidth / 2 : diameter / 2
                }
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                pathLength="100"
                strokeDasharray="100"
                strokeDashoffset={variant === "gauge" ? "-50" : undefined}
                strokeLinecap="round"
                className="text-muted-foreground/20"
              />
              {progressChildren}
            </svg>

            {/* Label children */}
            {labelChildren}
          </div>
        </div>
      </ProgressCircleContext.Provider>
    );
  },
);
ProgressCircle.displayName = "ProgressCircle";

/**
 * Individual progress indicator to be used inside ProgressCircle
 *
 * @example
 * ```tsx
 * <Progress value={50} className="stroke-blue-500" />
 * ```
 */
export const Progress = React.forwardRef<SVGCircleElement, ProgressProps>(
  ({ value, className }, ref) => {
    const { min, max, variant, strokeWidth, radius, svgSize } =
      useProgressCircle();

    const cx = variant === "gauge" ? "50%" : svgSize / 2;
    const cy = variant === "gauge" ? radius + strokeWidth / 2 : svgSize / 2;

    // Calculate percentage
    const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);

    if (variant === "gauge") {
      // Gauge variant: 15 degree gap at bottom (half-circle with gap)
      const strokeDashoffset = -50 - ((1 - percentage) * 100) / 2;

      return (
        <circle
          ref={ref}
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn(
            "text-foreground origin-center -scale-x-100 transition-all duration-300 ease-in-out",
            className,
          )}
        />
      );
    }

    // Circle variant: Full circle
    const strokeDashoffset = 100 - percentage * 100;

    return (
      <circle
        ref={ref}
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        pathLength="100"
        strokeDasharray="100"
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className={cn(
          "text-foreground transition-all duration-300 ease-in-out",
          className,
        )}
      />
    );
  },
);
Progress.displayName = "Progress";

/**
 * Label component to display custom content inside ProgressCircle
 * - For gauge variant: label is positioned at the bottom inside the gauge arc
 * - For circle variant: label is centered in the circle
 *
 * @example
 * ```tsx
 * <ProgressCircle size="md" variant="gauge">
 *   <Progress value={75} />
 *   <ProgressLabel>
 *     <div className="text-sm font-semibold">75%</div>
 *     <div className="text-xs text-muted-foreground">Complete</div>
 *   </ProgressLabel>
 * </ProgressCircle>
 * ```
 */
export const ProgressLabel = React.forwardRef<
  HTMLDivElement,
  ProgressLabelProps
>(({ className, children, ...props }, ref) => {
  const { variant, size } = useProgressCircle();

  return (
    <div
      ref={ref}
      className={cn(getProgressLabelClasses(variant, size), className)}
      {...props}
    >
      {children}
    </div>
  );
});
ProgressLabel.displayName = "ProgressLabel";
