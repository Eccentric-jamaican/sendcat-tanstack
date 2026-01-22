import { useSmoothStreaming } from '../hooks/useSmoothStreaming';
import { Markdown } from './Markdown';

interface StreamingMessageProps {
  content: string;
  isStreaming: boolean;
}

export const StreamingMessage = ({ content, isStreaming }: StreamingMessageProps) => {
  // Speed: 5ms per character for a very snappy but smooth feel
  // Increase number to make it slower/smoother (e.g. 10 or 15)
  const smoothContent = useSmoothStreaming(content, isStreaming);

  return <Markdown content={smoothContent} />;
};
