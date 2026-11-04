import { ShadowingCompactCard } from "@uni-stack/ui/components/shadowing/compact-card";
import { type ShadowingToken } from "@uni-stack/ui/components/shadowing/frame";

import { useShadowingSimulation } from "#/shared/lib/use-shadowing-simulation";

// Slot words are copied in place before or after speaking
const TOKENS: ShadowingToken[] = [
  { text: "An" },
  { text: "active", trail: "," },
  { text: "valid" },
  { text: "UK" },
  { slot: true, text: "tenancy" },
  { text: "agreement" },
  { text: "must" },
  { text: "be" },
  { text: "signed" },
  { text: "by" },
  { text: "both" },
  { text: "the" },
  { slot: true, text: "landlord" },
  { text: "and" },
  { text: "the" },
  { text: "tenant", trail: "." }
];

export function ShadowingCompactCardDemo() {
  // Fakes playback, recording, and scoring with timers
  const simulation = useShadowingSimulation(TOKENS);

  return (
    <ShadowingCompactCard
      {...simulation}
      tokens={TOKENS}
      position={{ count: 2, index: 1 }}
      translation="一份有效的英国租赁协议必须由房东和租客双方签署。"
      hint="Press the speaker to hear the original; copy the dashed words in place."
      scoreDetail="Accuracy 90 · Fluency 84 · Completeness 100 · Key words 2/2"
    />
  );
}
