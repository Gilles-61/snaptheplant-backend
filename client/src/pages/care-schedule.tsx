import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  parseISO,
  isToday,
  isAfter,
  isBefore,
  subDays,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";

export default function CareSchedule() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");

  // Fetch plants
  const { data: plants } = useQuery({
    queryKey: ['/api/plants'],
    enabled: !!user,
  });

  // Fetch care actions
  const { data: careActions, refetch: refetchCareActions } = useQuery({
    queryKey: ['/api/care-actions'],
    enabled: !!user,
  });

  // Mark care action as complete
  const handleMarkComplete = async (actionId: number) => {
    try {
      await fetch(`/api/care-actions/${actionId}/complete`, {
        method: 'POST',
        credentials: 'include',
      });
      
      await refetchCareActions();
      await queryClient.invalidateQueries({ queryKey: ['/api/plants'] });
      
      toast({
        title: "Care action completed",
        description: "The care action has been marked as complete.",
      });
    } catch (error) {
      console.error("Error completing care action:", error);
      toast({
        title: "Error",
        description: "Failed to complete care action. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Generate week days (Sunday to Saturday)
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    return format(addDays(startOfWeek(currentDate), i), "EEE");
  });

  // Generate week view dates
  const weekDates = Array.from({ length: 7 }).map((_, i) => {
    return addDays(startOfWeek(currentDate), i);
  });

  // Generate month view dates
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const monthDates = eachDayOfInterval({ start: startDate, end: endOfMonth(addDays(monthEnd, 7)) });

  // Group care actions by date
  const careActionsByDate: Record<string, any[]> = {};
  
  if (careActions) {
    careActions.forEach((action: any) => {
      const dateStr = format(parseISO(action.dueDate), "yyyy-MM-dd");
      if (!careActionsByDate[dateStr]) {
        careActionsByDate[dateStr] = [];
      }
      careActionsByDate[dateStr].push(action);
    });
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="font-[Outfit] text-2xl md:text-3xl font-bold text-[#1A1A1A]">Care Schedule</h1>
          <p className="text-[#4A4A4A] mt-1">Track and manage your plant care activities.</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-2">
          <div className="flex bg-[#FAFAF2] rounded-lg p-1">
            <button
              className={`px-3 py-1.5 rounded-md text-sm ${
                viewMode === "week" ? "bg-white shadow-sm font-medium" : "text-[#4A4A4A]"
              }`}
              onClick={() => setViewMode("week")}
            >
              Week
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm ${
                viewMode === "month" ? "bg-white shadow-sm font-medium" : "text-[#4A4A4A]"
              }`}
              onClick={() => setViewMode("month")}
            >
              Month
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              className="p-1.5 rounded-full hover:bg-white"
              onClick={() => setCurrentDate(viewMode === "week" ? addDays(currentDate, -7) : addDays(currentDate, -30))}
            >
              <span className="material-icons">chevron_left</span>
            </button>
            <span className="font-medium">
              {viewMode === "week" 
                ? `${format(weekDates[0], "MMM d")} - ${format(weekDates[6], "MMM d, yyyy")}`
                : format(currentDate, "MMMM yyyy")
              }
            </span>
            <button
              className="p-1.5 rounded-full hover:bg-white"
              onClick={() => setCurrentDate(viewMode === "week" ? addDays(currentDate, 7) : addDays(currentDate, 30))}
            >
              <span className="material-icons">chevron_right</span>
            </button>
            <button
              className="p-1.5 rounded-full hover:bg-white ml-2"
              onClick={() => setCurrentDate(new Date())}
            >
              <span className="material-icons text-[#4CAF50]">today</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === "week" ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Week view header */}
          <div className="grid grid-cols-7 bg-[#FAFAF2] border-b border-[#DEDED8]">
            {weekDays.map((day, i) => (
              <div key={i} className="py-3 text-center font-medium text-sm">
                <div>{day}</div>
                <div 
                  className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mt-1 ${
                    isSameDay(weekDates[i], new Date())
                      ? "bg-[#4CAF50] text-white"
                      : ""
                  }`}
                >
                  {format(weekDates[i], "d")}
                </div>
              </div>
            ))}
          </div>
          
          {/* Week view body */}
          <div className="grid grid-cols-7 divide-x divide-[#DEDED8] min-h-[50vh]">
            {weekDates.map((date, i) => {
              const dayStr = format(date, "yyyy-MM-dd");
              const todayActions = careActionsByDate[dayStr] || [];
              
              return (
                <div key={i} className={`min-h-[200px] p-2 ${isSameDay(date, new Date()) ? "bg-[#FAFAF2]/50" : ""}`}>
                  {todayActions.length > 0 ? (
                    <div className="space-y-2">
                      {todayActions.map((action: any) => {
                        const plant = plants?.find((p: any) => p.id === action.plantId);
                        if (!plant) return null;
                        
                        const isPast = isBefore(parseISO(action.dueDate), subDays(new Date(), 1));
                        const isToday = isSameDay(parseISO(action.dueDate), new Date());
                        
                        return (
                          <div 
                            key={action.id} 
                            className={`p-2 rounded-lg text-xs ${
                              action.isCompleted 
                                ? "bg-[#4CAF50]/10 border border-[#4CAF50]/20" 
                                : isPast
                                ? "bg-[#E53935]/10 border border-[#E53935]/20"
                                : isToday
                                ? "bg-[#FF9800]/10 border border-[#FF9800]/20"
                                : "bg-[#2196F3]/10 border border-[#2196F3]/20"
                            }`}
                          >
                            <div className="font-medium mb-1">{plant.name}</div>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center">
                                <span className="material-icons text-xs mr-1">
                                  {action.actionType === "water" ? "water_drop" : "eco"}
                                </span>
                                {action.actionType === "water" ? "Water" : "Fertilize"}
                              </span>
                              
                              {!action.isCompleted && (
                                <button 
                                  className="text-[#4CAF50] hover:text-[#3B8C3F]"
                                  onClick={() => handleMarkComplete(action.id)}
                                >
                                  <span className="material-icons text-xs">check_circle</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-[#4A4A4A] text-xs opacity-50">
                      No tasks
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Month view header */}
          <div className="grid grid-cols-7 bg-[#FAFAF2] border-b border-[#DEDED8]">
            {weekDays.map((day, i) => (
              <div key={i} className="py-3 text-center font-medium text-sm">
                {day}
              </div>
            ))}
          </div>
          
          {/* Month view body */}
          <div className="grid grid-cols-7 divide-x divide-y divide-[#DEDED8]">
            {monthDates.slice(0, 42).map((date, i) => {
              const dayStr = format(date, "yyyy-MM-dd");
              const todayActions = careActionsByDate[dayStr] || [];
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              
              return (
                <div 
                  key={i} 
                  className={`min-h-[100px] p-2 ${
                    !isCurrentMonth 
                      ? "bg-[#F5F5F0]/50 text-[#4A4A4A]/40" 
                      : isSameDay(date, new Date())
                      ? "bg-[#FAFAF2]"
                      : ""
                  }`}
                >
                  <div className={`text-right mb-1 ${
                    isSameDay(date, new Date())
                      ? "bg-[#4CAF50] text-white w-7 h-7 rounded-full ml-auto flex items-center justify-center"
                      : ""
                  }`}>
                    {format(date, "d")}
                  </div>
                  
                  {todayActions.length > 0 && isCurrentMonth ? (
                    <div className="space-y-1">
                      {todayActions.slice(0, 3).map((action: any) => {
                        const plant = plants?.find((p: any) => p.id === action.plantId);
                        if (!plant) return null;
                        
                        return (
                          <div 
                            key={action.id} 
                            className={`px-1.5 py-1 rounded text-xs truncate ${
                              action.isCompleted 
                                ? "bg-[#4CAF50]/10 text-[#4CAF50]" 
                                : action.actionType === "water"
                                ? "bg-[#2196F3]/10 text-[#2196F3]"
                                : "bg-[#FF9800]/10 text-[#FF9800]"
                            }`}
                          >
                            <span className="material-icons text-xs mr-1 align-text-top">
                              {action.actionType === "water" ? "water_drop" : "eco"}
                            </span>
                            {plant.name}
                          </div>
                        );
                      })}
                      
                      {todayActions.length > 3 && (
                        <div className="text-xs text-[#4A4A4A]">+{todayActions.length - 3} more</div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Care actions summary */}
      <div className="mt-8">
        <h2 className="font-[Outfit] text-xl font-semibold mb-4">Upcoming Care Activities</h2>
        
        {careActions && careActions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {careActions
              .filter((action: any) => !action.isCompleted)
              .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
              .slice(0, 6)
              .map((action: any) => {
                const plant = plants?.find((p: any) => p.id === action.plantId);
                if (!plant) return null;
                
                const dueDate = parseISO(action.dueDate);
                const isPast = isBefore(dueDate, subDays(new Date(), 1));
                const isToday = isSameDay(dueDate, new Date());
                const isTomorrow = isSameDay(dueDate, addDays(new Date(), 1));
                
                let dateLabel = format(dueDate, "MMM d");
                let statusColor = "#2196F3";
                let statusLabel = "Upcoming";
                
                if (isPast) {
                  statusColor = "#E53935";
                  statusLabel = "Overdue";
                } else if (isToday) {
                  statusColor = "#FF9800";
                  statusLabel = "Today";
                } else if (isTomorrow) {
                  statusColor = "#FF9800";
                  statusLabel = "Tomorrow";
                }
                
                return (
                  <div 
                    key={action.id} 
                    className="bg-white rounded-xl shadow-sm overflow-hidden flex"
                  >
                    <div className="w-2" style={{ backgroundColor: statusColor }}></div>
                    <div className="p-4 flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{plant.name} needs {action.actionType}</h3>
                        <span 
                          className="text-xs font-medium px-2 py-1 rounded-full" 
                          style={{ 
                            backgroundColor: `${statusColor}10`, 
                            color: statusColor 
                          }}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      
                      <p className="text-sm text-[#4A4A4A] mb-3">
                        {action.actionType === "water" 
                          ? plant.lastWatered 
                            ? `Last watered ${format(parseISO(plant.lastWatered), "MMM d")}`
                            : "Not watered yet"
                          : plant.lastFertilized
                            ? `Last fertilized ${format(parseISO(plant.lastFertilized), "MMM d")}`
                            : "Not fertilized yet"
                        }
                      </p>
                      
                      <button 
                        className="text-[#4CAF50] hover:text-[#3B8C3F] text-sm font-medium flex items-center"
                        onClick={() => handleMarkComplete(action.id)}
                      >
                        <span className="material-icons text-sm mr-1">check_circle</span>
                        Mark as done
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <span className="material-icons text-[#4CAF50] text-4xl mb-2">check_circle</span>
            <h3 className="font-medium text-lg mb-1">All caught up!</h3>
            <p className="text-[#4A4A4A]">No plant care actions needed right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}
