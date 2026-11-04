import { useState } from "react";

import { Button } from "@uni-stack/ui/components/button";
import { type RecallStatus } from "@uni-stack/ui/components/word-input/recall";
import { RecallInput } from "@uni-stack/ui/components/word-input/recall";

const WORD = "harmony";

export function RecallInputDemo() {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<RecallStatus>("idle");

  // A wrong answer is cleared, so the input shows the answer as its placeholder
  const check = () => {
    const correct = value.trim().toLowerCase() === WORD;
    setStatus(correct ? "correct" : "wrong");
    if (!correct) setValue("");
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-center text-base leading-10">
        Nature and history existed in perfect{" "}
        <RecallInput
          word={WORD}
          value={value}
          status={status}
          onValueChange={(next) => {
            setValue(next);
            setStatus("idle");
          }}
        />
        .
      </p>
      <Button size="sm" variant="outline" onClick={check}>
        Check
      </Button>
    </div>
  );
}
