import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PointCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/40 bg-primary/5" : undefined}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={cn("h-4 w-4", highlight ? "text-primary" : "text-muted-foreground")} />
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <p className={cn("text-2xl font-bold", highlight && "text-primary")}>{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}
