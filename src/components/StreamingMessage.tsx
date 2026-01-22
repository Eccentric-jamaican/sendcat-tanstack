import { useMemo } from 'react';
import { useSmoothStreaming } from '../hooks/useSmoothStreaming';
import { Markdown } from './Markdown';

interface StreamingMessageProps {
  content: string;
  isStreaming: boolean;
}

export const StreamingMessage = ({ content, isStreaming }: StreamingMessageProps) => {
  const smoothContent = useSmoothStreaming(content, isStreaming);

  // Memoize markdown to prevent unnecessary re-renders
  const memoizedMarkdown = useMemo(() => (
    <Markdown content={smoothContent} />
  ), [smoothContent]);

  return (
    <div
      style={{
        // GPU acceleration hints during streaming
        willChange: isStreaming ? 'contents' : 'auto',
        // CSS containment to isolate reflows
        contain: isStreaming ? 'layout style paint' : 'none',
        // Force GPU layer
        transform: 'translateZ(0)',
      }}
    >
      {memoizedMarkdown}
    </div>
  );
};
