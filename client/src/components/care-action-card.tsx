import { format, parseISO, isBefore, isToday, isTomorrow, addDays } from "date-fns";

interface CareActionCardProps {
  action: any;
  onMarkDone: () => void;
}

export function CareActionCard({ action, onMarkDone }: CareActionCardProps) {
  const dueDate = parseISO(action.dueDate);
  const isPast = isBefore(dueDate, addDays(new Date(), -1));
  const isToday = isToday(dueDate);
  const isTomorrow = isTomorrow(dueDate);
  
  let statusColor = "#2196F3"; // Default blue for upcoming
  let borderColor = "bg-[#2196F3]";
  let statusClass = "bg-[#2196F3]/10 text-[#2196F3]";
  let statusLabel = format(dueDate, "MMM d");
  
  if (isPast) {
    statusColor = "#E53935"; // Red for overdue
    borderColor = "bg-[#E53935]";
    statusClass = "bg-[#E53935]/10 text-[#E53935]";
    statusLabel = "Overdue";
  } else if (isToday) {
    statusColor = "#FF9800"; // Orange for today
    borderColor = "bg-[#FF9800]";
    statusClass = "bg-[#FF9800]/10 text-[#FF9800]";
    statusLabel = "Today";
  } else if (isTomorrow) {
    statusColor = "#FF9800"; // Orange for tomorrow
    borderColor = "bg-[#FF9800]";
    statusClass = "bg-[#FF9800]/10 text-[#FF9800]";
    statusLabel = "Tomorrow";
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden flex">
      <div className={`w-2 ${borderColor}`}></div>
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">
            {action.plant?.name || "Plant"} needs {action.actionType}
          </h3>
          <span className={`text-xs font-medium ${statusClass} px-2 py-1 rounded-full`}>
            {statusLabel}
          </span>
        </div>
        <p className="text-sm text-[#4A4A4A] mb-3">
          {action.actionType === "water" 
            ? action.plant?.lastWatered 
              ? `Last watered ${format(parseISO(action.plant.lastWatered), "MMM d")}`
              : "Not watered yet"
            : action.plant?.lastFertilized
              ? `Last fertilized ${format(parseISO(action.plant.lastFertilized), "MMM d")}`
              : "Not fertilized yet"
          }
        </p>
        <button 
          className="text-[#4CAF50] hover:text-[#3B8C3F] text-sm font-medium flex items-center" 
          onClick={onMarkDone}
        >
          <span className="material-icons text-sm mr-1">check_circle</span>
          Mark as done
        </button>
      </div>
    </div>
  );
}
