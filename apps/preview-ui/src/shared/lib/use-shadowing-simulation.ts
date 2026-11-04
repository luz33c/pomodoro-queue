import { useEffect, useRef, useState } from "react";

import {
  type ShadowingAction,
  type ShadowingActivity,
  type ShadowingCardProps,
  type ShadowingScore,
  type ShadowingToken
} from "@uni-stack/ui/components/shadowing/frame";

const VOICES = ["Samantha · US", "Daniel · UK"];

const RESULTS = {
  retell: { grade: "Easy", note: "Repeat · Passed", passed: true, total: 92 },
  shadow: { grade: "Good", note: "Shadowing · Passed", passed: true, total: 86 },
  simulate: { grade: "Hard", note: "Simulated · Missed a key word", passed: false, total: 68 }
} satisfies Record<string, ShadowingScore>;

/** Gap between loops of the original, in ms */
const LOOP_PAUSE_MS = 800;

/** Time the learner gets to speak after "listen, then speak" plays the original, in ms */
const RETELL_RECORD_MS = 2600;

const plain = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");

/**
 * Fakes audio and speech for the shadowing cards: words light up one by one, a recording echoes
 * the sentence back as if heard, and each run ends with a fixed score.
 * Returns the props a card needs besides its tokens.
 */
export function useShadowingSimulation(
  tokens: ShadowingToken[],
  /** Called with each new score */
  onScore?: (score: ShadowingScore) => void
): Omit<ShadowingCardProps, "tokens"> {
  const [activity, setActivity] = useState<ShadowingActivity | null>(null);
  const [spokenIndex, setSpokenIndex] = useState(-1);
  const [status, setStatus] = useState<string>();
  const [score, setScore] = useState<ShadowingScore | null>(null);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [voice, setVoice] = useState(VOICES[0]);
  const [headphonesConfirmed, setHeadphonesConfirmed] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      for (const timer of timers.current) clearTimeout(timer);
    },
    []
  );

  const wordMs = rate === 1 ? 260 : 350;

  const later = (ms: number, run: () => void) => {
    timers.current.push(setTimeout(run, ms));
  };

  const clear = () => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
  };

  const showScore = (result: ShadowingScore) => {
    setScore(result);
    onScore?.(result);
  };

  const stop = () => {
    clear();
    setActivity(null);
    setSpokenIndex(-1);
    setStatus(undefined);
  };

  // Lights up each word in turn, then calls onEnd
  const play = (onEnd?: () => void) => {
    tokens.forEach((_, index) => later(index * wordMs, () => setSpokenIndex(index)));
    later(tokens.length * wordMs, () => {
      setSpokenIndex(-1);
      onEnd?.();
    });
  };

  // Echoes the sentence back word by word, then shows the result
  const record = (ms: number, result: ShadowingScore) => {
    const heard = tokens.map((token) => plain(token.text));
    setStatus("Listening…");
    heard.forEach((_, index) =>
      later(((index + 1) * ms) / heard.length, () =>
        setStatus(`Heard: ${heard.slice(0, index + 1).join(" ")}`)
      )
    );
    later(ms + 200, () => {
      setActivity(null);
      setStatus(undefined);
      showScore(result);
    });
  };

  const start = (action: ShadowingAction) => {
    clear();
    setSpokenIndex(-1);
    if (action === "listen") {
      setActivity("listen");
      setStatus("Playing the original");
      const playOnce = () => play(() => (loop ? later(LOOP_PAUSE_MS, playOnce) : stop()));
      playOnce();
    } else if (action === "shadow") {
      setActivity("shadow");
      play();
      record(tokens.length * wordMs + 300, RESULTS.shadow);
    } else {
      setActivity("retell-listen");
      setStatus("Listen first; your turn comes when it ends");
      play(() => {
        setActivity("retell-record");
        record(RETELL_RECORD_MS, RESULTS.retell);
      });
    }
  };

  return {
    activity,
    headphonesConfirmed,
    loop,
    onHeadphonesConfirm: () => setHeadphonesConfirmed(true),
    onLoopChange: setLoop,
    onRateChange: setRate,
    onSimulate: () => {
      stop();
      showScore(RESULTS.simulate);
    },
    onStart: start,
    onStop: stop,
    onVoiceChange: setVoice,
    rate,
    score,
    spokenIndex,
    status,
    voice,
    voices: VOICES
  };
}
