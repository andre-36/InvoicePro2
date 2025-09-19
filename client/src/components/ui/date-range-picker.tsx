import { useState } from "react";
import { addDays, format, subDays } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { DateRange, DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export interface DateRangePickerProps {
  className?: string;
  date?: DateRange;
  onDateChange?: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  className,
  date,
  onDateChange,
}: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("last-30-days");

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const today = new Date();
    let from: Date;
    let to: Date = today;

    switch (preset) {
      case "today":
        from = today;
        break;
      case "yesterday":
        from = subDays(today, 1);
        to = subDays(today, 1);
        break;
      case "last-7-days":
        from = subDays(today, 6);
        break;
      case "last-30-days":
        from = subDays(today, 29);
        break;
      case "this-month":
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case "last-month":
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        from = lastMonth;
        to = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "this-quarter":
        const quarterStart = Math.floor(today.getMonth() / 3) * 3;
        from = new Date(today.getFullYear(), quarterStart, 1);
        break;
      case "this-year":
        from = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        return;
    }

    onDateChange?.({ from, to });
  };

  return (
    <div className={cn("flex flex-col sm:flex-row gap-3", className)}>
      {/* Quick Presets */}
      <div className="flex flex-wrap gap-2 sm:order-2">
        <Badge 
          variant={selectedPreset === "today" ? "default" : "outline"}
          className="cursor-pointer hover:bg-primary/10 transition-colors"
          onClick={() => handlePresetChange("today")}
        >
          Today
        </Badge>
        <Badge 
          variant={selectedPreset === "last-7-days" ? "default" : "outline"}
          className="cursor-pointer hover:bg-primary/10 transition-colors"
          onClick={() => handlePresetChange("last-7-days")}
        >
          7 days
        </Badge>
        <Badge 
          variant={selectedPreset === "last-30-days" ? "default" : "outline"}
          className="cursor-pointer hover:bg-primary/10 transition-colors"
          onClick={() => handlePresetChange("last-30-days")}
        >
          30 days
        </Badge>
        <Badge 
          variant={selectedPreset === "this-month" ? "default" : "outline"}
          className="cursor-pointer hover:bg-primary/10 transition-colors"
          onClick={() => handlePresetChange("this-month")}
        >
          This month
        </Badge>
      </div>

      <Separator orientation="vertical" className="hidden sm:block h-6 self-center" />
      
      {/* Custom Date Range Picker */}
      <div className="sm:order-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-[300px] justify-start text-left font-normal border-dashed hover:border-solid transition-all",
                !date && "text-muted-foreground",
                "data-[testid=button-date-range]:border-primary/50"
              )}
              data-testid="button-date-range"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <span className="font-medium">
                    {format(date.from, "MMM dd")} - {format(date.to, "MMM dd, yyyy")}
                  </span>
                ) : (
                  <span className="font-medium">{format(date.from, "MMM dd, yyyy")}</span>
                )
              ) : (
                <span>Select date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="mb-4">
                  <h4 className="font-medium text-sm text-gray-900 mb-2">Quick select</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handlePresetChange("yesterday")}
                      className="justify-start text-xs"
                    >
                      Yesterday
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handlePresetChange("last-month")}
                      className="justify-start text-xs"
                    >
                      Last month
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handlePresetChange("this-quarter")}
                      className="justify-start text-xs"
                    >
                      This quarter
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handlePresetChange("this-year")}
                      className="justify-start text-xs"
                    >
                      This year
                    </Button>
                  </div>
                </div>
                <Separator className="mb-4" />
                <DayPicker
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={onDateChange}
                  numberOfMonths={2}
                  className="rdp-months_flex_row"
                  styles={{
                    months: { display: 'flex', gap: '1rem' },
                    month: { width: 'auto' },
                    table: { fontSize: '0.875rem' },
                    day_selected: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' },
                    day_range_middle: { backgroundColor: 'hsl(var(--primary) / 0.1)' }
                  }}
                />
              </CardContent>
            </Card>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}