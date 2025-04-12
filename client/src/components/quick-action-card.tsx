interface QuickActionCardProps {
  icon: string;
  label: string;
  color: string;
  onClick?: () => void;
}

export function QuickActionCard({ icon, label, color, onClick }: QuickActionCardProps) {
  return (
    <button 
      className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center justify-center hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div 
        className="rounded-full p-3 mb-3" 
        style={{ backgroundColor: `${color}10` }}
      >
        <span className="material-icons" style={{ color: color }}>{icon}</span>
      </div>
      <span className="text-center font-medium">{label}</span>
    </button>
  );
}
