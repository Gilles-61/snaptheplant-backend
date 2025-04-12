import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BetaTesterBadgeProps {
  className?: string;
  showTooltip?: boolean;
}

export function BetaTesterBadge({ className = "", showTooltip = true }: BetaTesterBadgeProps) {
  const badge = (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#6200EA] text-white ${className}`}>
      <span className="material-icons text-xs mr-1">science</span>
      Beta Tester
    </div>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            You are helping test SnapThePlant! Your feedback is valuable to us.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}