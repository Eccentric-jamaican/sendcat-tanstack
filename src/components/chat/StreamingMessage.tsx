import { useMemo } from 'react';
import { Markdown } from './Markdown';

interface StreamingMessageProps {
  content: string;
  isStreaming: boolean;
}

export const StreamingMessage = ({ content, isStreaming }: StreamingMessageProps) => {
  // During streaming: plain text for maximum speed (like ChatGPT/Claude)
  // After streaming: full Markdown rendering
  const renderedContent = useMemo(() => {
    if (isStreaming) {
      // Plain text with basic whitespace handling - no heavy parsing
      return (
        <div className="prose max-w-none dark:prose-invert whitespace-pre-wrap break-words">
          {content}
          <span className="inline-block w-2 h-4 ml-0.5 bg-foreground/70 animate-pulse" />
        </div>
      );
    }
    // Full markdown rendering only when complete
    return <Markdown content={content} />;
  }, [content, isStreaming]);

  return (
    <div
      style={{
        // Minimal style during streaming for performance
        contain: isStreaming ? 'layout style' : 'none',
      }}
    >
      {renderedContent}
    </div>
  );
};
