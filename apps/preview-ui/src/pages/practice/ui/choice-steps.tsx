import { useState } from "react";

import { MeaningChoiceInput } from "@uni-stack/ui/components/word-input/meaning-choice";
import { WordChoiceInput } from "@uni-stack/ui/components/word-input/word-choice";

import { GAPS, MEANINGS, MEANING_OPTIONS } from "#/pages/practice/model/lesson";

import { StepCard } from "./step-card";

/** Step 1: pick what the highlighted words mean in the passage */
export function MeaningStep() {
  const [done, setDone] = useState(0);
  const pass = () => setDone((count) => count + 1);

  return (
    <StepCard
      number={1}
      title="Meaning"
      hint="Pick what each highlighted word means here. Keys 1–4 pick; the next word gets focus."
      done={done}
      total={2}
    >
      <p className="text-base leading-10">
        Our{" "}
        <MeaningChoiceInput
          word="landlord"
          meaning={MEANINGS.landlord}
          candidates={MEANING_OPTIONS}
          onResult={pass}
        />{" "}
        signed the{" "}
        <MeaningChoiceInput
          word="tenancy"
          meaning={MEANINGS.tenancy}
          candidates={MEANING_OPTIONS}
          onResult={pass}
        />{" "}
        agreement, and the new tenant paid a deposit.
      </p>
    </StepCard>
  );
}

/** Step 2: pick the missing word in each sentence */
export function GapStep() {
  const [done, setDone] = useState(0);

  return (
    <StepCard
      number={2}
      title="Fill the gap"
      hint="Every blank has the same width, so its length gives nothing away."
      done={done}
      total={GAPS.length}
    >
      <div className="flex flex-col gap-1">
        {GAPS.map((gap) => (
          <p key={gap.word} className="text-base leading-10">
            {gap.before}{" "}
            <WordChoiceInput
              word={gap.word}
              candidates={gap.candidates}
              slotWidthCh={10}
              onResult={() => setDone((count) => count + 1)}
            />{" "}
            {gap.after}
          </p>
        ))}
      </div>
    </StepCard>
  );
}
