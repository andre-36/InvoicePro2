import { cn } from "@/lib/utils";
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
}

export function StatsCard({ title, value, change, secondaryText, status }: StatsCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    return val;
  };

  const statusColors = {
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    yellow: "bg-yellow-100 text-yellow-800",
    blue: "bg-blue-100 text-blue-800"
  };

  return (
    <Card className="border border-gray-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
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
          <span className="text-2xl font-bold text-gray-900">
            {formatValue(value)}
          </span>
          {secondaryText && (
            <span className="text-base text-gray-500">{secondaryText}</span>
          )}
        </div>
        {change && (
          <div className="mt-3 text-xs text-gray-500">
            <span className={cn(
              "font-medium",
              change.positive ? "text-green-600" : "text-red-600"
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
