import * as React from "react";
import { cn } from "../../lib/utils";

const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
  const variants = {
    default: "bg-primary text-white hover:bg-primary-hover active:scale-95 shadow-sm hover:shadow-md transition-all duration-200",
    outline: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 border-input",
    ghost: "hover:bg-slate-100 text-slate-900",
    destructive: "bg-red-600 text-white hover:bg-red-700 active:scale-95 shadow-sm hover:shadow-md transition-all duration-200",
    accent: "bg-accent text-white hover:bg-blue-700 active:scale-95 shadow-sm hover:shadow-md transition-all duration-200",
    success: "bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 shadow-sm hover:shadow-md transition-all duration-200",
    warning: "bg-amber-500 text-white hover:bg-amber-600 active:scale-95 shadow-sm hover:shadow-md transition-all duration-200",
  };
  const sizes = {
    default: "h-10 px-6 py-2.5 rounded-md",
    sm: "h-9 rounded-md px-3",
    lg: "h-12 rounded-xl px-8 text-lg",
    icon: "h-10 w-10",
  };
  return (
    <button
      className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", variants[variant], sizes[size], className)}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button };
