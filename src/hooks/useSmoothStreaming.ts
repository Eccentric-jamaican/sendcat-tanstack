import { useEffect, useState, useRef } from 'react';

export function useSmoothStreaming(
  text: string, 
  streaming: boolean, 
) {
  const [displayedText, setDisplayedText] = useState(streaming ? '' : text);
  // Use a float to track position for sub-pixel smooth interpolation
  const currentLength = useRef(0);
  const targetLength = useRef(0);
  const animationFrameId = useRef<number | undefined>(undefined);

  // Update target length whenever text changes
  useEffect(() => {
    targetLength.current = text.length;
    
    // If not streaming (or just loaded), jump to end
    if (!streaming) {
      currentLength.current = text.length;
      setDisplayedText(text);
      return;
    }
    
    // If text shrunk (reset/cleared), reset immediately
    if (text.length < currentLength.current) {
       currentLength.current = text.length;
       setDisplayedText(text);
       return;
    }
  }, [text, streaming]);

  useEffect(() => {
    if (!streaming) return;

    const animate = () => {
      const distance = targetLength.current - currentLength.current;
      
      if (distance <= 0) {
        if (distance < 0) {
            // Correct overshoot if any (rare)
            currentLength.current = targetLength.current;
            setDisplayedText(text.slice(0, Math.floor(currentLength.current)));
        }
        return; 
      }

      // Elastic speed: The further behind, the faster we go.
      // 60fps target. 
      // Minimum speed: 0.5 chars per frame (approx 30 chars/sec minimum) -> keeps it moving.
      // Factor 0.1 means we cover 10% of the remaining distance per frame.
      const speed = Math.max(0.5, distance * 0.15);
      
      currentLength.current += speed;
      
      // Clamp to target
      if (currentLength.current > targetLength.current) {
        currentLength.current = targetLength.current;
      }

      setDisplayedText(text.slice(0, Math.floor(currentLength.current)));

      if (currentLength.current < targetLength.current) {
        animationFrameId.current = requestAnimationFrame(animate);
      }
    };

    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [text, streaming]); // Re-run animation loop when text (target) updates

  return displayedText;
}
