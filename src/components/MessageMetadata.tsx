import { Zap, Clock, Wrench, Cpu } from 'lucide-react';

interface MetadataChipProps {
  label: string;
  icon?: React.ReactNode;
  color?: string;
  className?: string;
  minWidth?: string;
}

export const MetadataChip = ({ label, icon, color = "text-fuchsia-900/60", className = "", minWidth }: MetadataChipProps) => (
  <div
    className={`flex items-center gap-1.5 text-[11.5px] font-medium tracking-tight whitespace-nowrap ${color} ${className}`}
    style={minWidth ? { minWidth } : undefined}
  >
    {icon && <span className="opacity-80 shrink-0">{icon}</span>}
    <span className="tabular-nums">{label}</span>
  </div>
);

export const MessageMetadata = ({ modelName, toolCalls, wordCount }: { modelName: string, toolCalls?: number, wordCount?: number }) => {
  // Mock data for visual matching until backend sends real metrics
  const tokens = wordCount ? Math.round(wordCount * 1.3) : 0;
  const time = (tokens / 60).toFixed(1); // Rough estimate

  return (
    <div className="flex items-center gap-x-3 ml-0 md:ml-4 select-none group/meta mt-1 overflow-x-auto scrollbar-hide">
       {/* Model Name */}
       <MetadataChip
         label={modelName}
         color="text-fuchsia-700 font-bold uppercase tracking-wider shrink-0"
       />

       {/* Separator */}
       <div className="hidden sm:block h-2.5 w-[1.5px] bg-fuchsia-200/60 shrink-0" />

       {/* Metrics - nowrap to prevent jitter */}
       <div className="flex items-center gap-x-3.5 shrink-0">
        <MetadataChip
            icon={<Zap size={11.5} />}
            label={`${(tokens/1.2).toFixed(1)} tok/s`}
            color="text-fuchsia-800/70 group-hover/meta:text-fuchsia-800"
            minWidth="70px"
        />
        <MetadataChip
            icon={<Cpu size={11.5} />}
            label={`${tokens} tokens`}
            color="text-fuchsia-800/70 group-hover/meta:text-fuchsia-800"
            minWidth="75px"
        />
        <MetadataChip
            icon={<Clock size={11.5} />}
            label={`${time}s`}
            color="text-fuchsia-800/70 group-hover/meta:text-fuchsia-800"
            minWidth="40px"
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
