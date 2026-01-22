import { Zap, Clock, Wrench, Cpu } from 'lucide-react';

interface MetadataChipProps {
  label: string;
  icon?: React.ReactNode;
  color?: string;
  className?: string;
}

export const MetadataChip = ({ label, icon, color = "text-fuchsia-900/60", className = "" }: MetadataChipProps) => (
  <div className={`flex items-center gap-1.5 text-[11.5px] font-medium tracking-tight ${color} ${className}`}>
    {icon && <span className="opacity-80">{icon}</span>}
    <span>{label}</span>
  </div>
);

export const MessageMetadata = ({ modelName, toolCalls, wordCount }: { modelName: string, toolCalls?: number, wordCount?: number }) => {
  // Mock data for visual matching until backend sends real metrics
  const tokens = wordCount ? Math.round(wordCount * 1.3) : 0;
  const time = (tokens / 60).toFixed(1); // Rough estimate
  
  return (
    <div className="flex items-center gap-3 ml-4 select-none group/meta">
       {/* Model Name */}
       <MetadataChip 
         label={modelName} 
         color="text-fuchsia-700 font-bold uppercase tracking-wider"
       />
       
       {/* Separator */}
       <div className="h-2.5 w-[1.5px] bg-fuchsia-200/60" />

       {/* Metrics */}
       <div className="flex items-center gap-3.5">
        <MetadataChip 
            icon={<Zap size={11.5} />}
            label={`${(tokens/1.2).toFixed(1)} tok/s`}
            color="text-fuchsia-800/70 group-hover/meta:text-fuchsia-800"
        />
        <MetadataChip 
            icon={<Cpu size={11.5} />}
            label={`${tokens} tokens`}
            color="text-fuchsia-800/70 group-hover/meta:text-fuchsia-800"
        />
        <MetadataChip 
            icon={<Clock size={11.5} />}
            label={`${time}s`}
            color="text-fuchsia-800/70 group-hover/meta:text-fuchsia-800"
        />
        {toolCalls ? (
           <MetadataChip 
            icon={<Wrench size={11.5} />}
            label={`${toolCalls} tool${toolCalls > 1 ? 's' : ''}`}
            color="text-fuchsia-800/70 group-hover/meta:text-fuchsia-800"
           />
        ) : null}
       </div>
    </div>
  );
}
