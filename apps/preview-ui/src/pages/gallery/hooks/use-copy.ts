import { useEffect, useState } from "react";

const COPIED_MS = 1600;

/** Copies text to the clipboard and reports `copied` for a moment afterwards. */
export function useCopy() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard access was denied; the button keeps its label, which signals the failure
    }
  };

  return { copied, copy };
}
