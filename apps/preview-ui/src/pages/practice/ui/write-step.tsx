import { useState } from "react";

import { Button } from "@uni-stack/ui/components/button";
import { HintInput } from "@uni-stack/ui/components/word-input/hint";
import { type RecallStatus } from "@uni-stack/ui/components/word-input/recall";
import { RecallInput } from "@uni-stack/ui/components/word-input/recall";

import { RECALL_ITEMS } from "#/pages/practice/model/lesson";

import { StepCard } from "./step-card";

/**
 * Step 3: write the words from memory. A word that fails the check turns into letter cells,
 * the same rule the product app applies; the components themselves know nothing about it.
 */
export function WriteStep() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, RecallStatus>>({});
  // Words that failed a check and are now typed letter by letter
  const [missed, setMissed] = useState<string[]>([]);
  const [hinted, setHinted] = useState<string[]>([]);

  const done = RECALL_ITEMS.filter(
    ({ word }) => statuses[word] === "correct" || hinted.includes(word)
  ).length;
  const open = RECALL_ITEMS.filter(
    ({ word }) => !missed.includes(word) && statuses[word] !== "correct"
  );

  const check = () => {
    const next = { ...statuses };
    const failed: string[] = [];
    for (const { word } of open) {
      const correct = (values[word] ?? "").trim().toLowerCase() === word;
      next[word] = correct ? "correct" : "wrong";
      if (!correct) failed.push(word);
    }
    setStatuses(next);
    setMissed([...missed, ...failed]);
  };

  return (
    <StepCard
      number={3}
      title="Write"
      hint="Type each word from memory, then check. A miss turns into letter cells."
      done={done}
      total={RECALL_ITEMS.length}
    >
      <div className="flex flex-col gap-1">
        {RECALL_ITEMS.map(({ before, word, after }) => (
          <p key={word} className="text-base leading-10">
            {before}{" "}
            {missed.includes(word) ? (
              <HintInput word={word} onComplete={() => setHinted([...hinted, word])} />
            ) : (
              <RecallInput
                word={word}
                value={values[word] ?? ""}
                status={statuses[word]}
                onValueChange={(value) => {
                  setValues({ ...values, [word]: value });
                  setStatuses({ ...statuses, [word]: "idle" });
                }}
              />
            )}{" "}
            {after}
          </p>
        ))}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="mt-3"
        disabled={open.length === 0}
        onClick={check}
      >
        Check
      </Button>
    </StepCard>
  );
}
