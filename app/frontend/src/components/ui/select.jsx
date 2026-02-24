import * as React from "react";
import { cn } from "../../lib/utils";

const Select = ({ children, value, onValueChange, ...props }) => {
  return (
    <select value={value} onChange={(e) => onValueChange(e.target.value)} className={cn("flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400", props.className)} {...props}>
      {children}
    </select>
  );
};

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm", className)} {...props}>
    {children}
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 opacity-50"><path d="m6 9 6 6 6-6"/></svg>
  </div>
));
SelectTrigger.displayName = "SelectTrigger";

const SelectContent = ({ children, className, ...props }) => (
  <div className={cn("absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-slate-200 bg-white shadow-md", className)} {...props}>
    {children}
  </div>
);

const SelectItem = React.forwardRef(({ className, children, value, ...props }, ref) => (
  <option value={value} className={cn("relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-slate-100", className)} {...props}>
    {children}
  </option>
));
SelectItem.displayName = "SelectItem";

const SelectValue = ({ children, placeholder }) => (
  <span className="text-slate-500">{children || placeholder}</span>
);

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
