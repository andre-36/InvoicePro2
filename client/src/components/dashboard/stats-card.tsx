import { cn, formatCurrency } from "@/lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string | number;
    percentage: string | number;
    positive: boolean;
  };
  secondaryText?: string;
  status?: {
    label: string;
    color: "green" | "red" | "yellow" | "blue";
  };
  noCurrency?: boolean;
}

export function StatsCard({ title, value, change, secondaryText, status, noCurrency }: StatsCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number' && !noCurrency) {
      return formatCurrency(val);
    }
    return val;
  };

  const statusColors = {
    green: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
    red: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
    yellow: "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200",
    blue: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
  };

  return (
    <Card className="border border-gray-200 dark:border-gray-700">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
          {status && (
            <span className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
              statusColors[status.color]
            )}>
              {change?.positive ? (
                <ArrowUp className="mr-0.5 h-3 w-3" />
              ) : (
                <ArrowDown className="mr-0.5 h-3 w-3" />
              )}
              {status.label}
            </span>
          )}
        </div>
        <div className="flex items-baseline space-x-1">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatValue(value)}
          </span>
          {secondaryText && (
            <span className="text-base text-gray-500 dark:text-gray-400">{secondaryText}</span>
          )}
        </div>
        {change && (
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            <span className={cn(
              "font-medium",
              change.positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              {change.positive ? "↑ " : "↓ "}
              {formatValue(change.value)}
            </span>
            {" vs previous period"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
