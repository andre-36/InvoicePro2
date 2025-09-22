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
    <div className={cn("flex items-center gap-3", className)}>
      {/* Simplified Quick Presets */}
      <div className="flex items-center gap-2">
        <Badge 
          variant={selectedPreset === "last-7-days" ? "default" : "outline"}
          className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
          onClick={() => handlePresetChange("last-7-days")}
        >
          7 days
        </Badge>
        <Badge 
          variant={selectedPreset === "last-30-days" ? "default" : "outline"}
          className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
          onClick={() => handlePresetChange("last-30-days")}
        >
          30 days
        </Badge>
        <Badge 
          variant={selectedPreset === "this-month" ? "default" : "outline"}
          className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
          onClick={() => handlePresetChange("this-month")}
        >
          This month
        </Badge>
      </div>

      {/* Custom Date Range Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
            data-testid="button-date-range"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <span>
                  {format(date.from, "MMM dd")} - {format(date.to, "MMM dd, yyyy")}
                </span>
              ) : (
                <span>{format(date.from, "MMM dd, yyyy")}</span>
              )
            ) : (
              <span>Select date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-3">
              {/* Simplified preset options */}
              <div className="mb-3">
                <div className="flex flex-wrap gap-1.5">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handlePresetChange("today")}
                    className="text-xs h-7"
                  >
                    Today
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handlePresetChange("yesterday")}
                    className="text-xs h-7"
                  >
                    Yesterday
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handlePresetChange("last-month")}
                    className="text-xs h-7"
                  >
                    Last month
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handlePresetChange("this-year")}
                    className="text-xs h-7"
                  >
                    This year
                  </Button>
                </div>
              </div>
              <Separator className="mb-3" />
              <DayPicker
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={onDateChange}
                numberOfMonths={1}
                className="m-0"
                classNames={{
                  months: "flex",
                  month: "w-auto",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-sm font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button: "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 w-7",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "text-sm border-collapse",
                  head_row: "flex",
                  head_cell: "text-muted-foreground rounded-md w-8 font-normal text-xs flex-1",
                  row: "flex w-full mt-1",
                  cell: "h-8 w-8 text-center text-sm p-0 relative flex-1",
                  day: "h-8 w-8 p-0 font-normal text-sm hover:bg-accent rounded-md",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary",
                  day_today: "bg-accent text-accent-foreground font-semibold",
                  day_range_middle: "bg-primary/20 text-primary-foreground",
                  day_range_start: "bg-primary text-primary-foreground rounded-l-md",
                  day_range_end: "bg-primary text-primary-foreground rounded-r-md"
                }}
              />
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}