import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Button } from "@uni-stack/ui/components/button";
import { ShadowingCompactCard } from "@uni-stack/ui/components/shadowing/compact-card";
import { ShadowingPlayerCard } from "@uni-stack/ui/components/shadowing/player-card";

import { useShadowingSimulation } from "#/shared/lib/use-shadowing-simulation";
import { SegmentedControl } from "#/shared/ui/segmented-control";

import { SENTENCES, type Sentence } from "#/pages/practice/model/lesson";

import { StepCard } from "./step-card";

const LAYOUTS = ["compact", "player"] as const;

type Layout = (typeof LAYOUTS)[number];

type SentenceCardProps = {
  layout: Layout;
  sentence: Sentence;
  index: number;
  onPassed: () => void;
};

function SentenceCard({ layout, sentence, index, onPassed }: SentenceCardProps) {
  const simulation = useShadowingSimulation(sentence.tokens, (score) => {
    if (score.passed) onPassed();
  });
  const props = {
    ...simulation,
    hint: "Copy the dashed words in place, then speak the sentence.",
    position: { count: SENTENCES.length, index: index + 1 },
    scoreDetail: "Accuracy 90 · Fluency 84 · Completeness 100 · Key words 2/2",
    tokens: sentence.tokens,
    translation: sentence.translation
  };

  return layout === "compact" ? (
    <ShadowingCompactCard {...props} />
  ) : (
    <ShadowingPlayerCard {...props} />
  );
}

/** Step 4: copy the key words in each sentence and say it, in either card layout */
export function SpeakStep() {
  const [layout, setLayout] = useState<Layout>("compact");
  const [index, setIndex] = useState(0);
  const [passed, setPassed] = useState<number[]>([]);
  const sentence = SENTENCES[index];

  return (
    <StepCard
      number={4}
      title="Speak"
      hint="Shadow or repeat each sentence; playback and scoring are simulated."
      done={passed.length}
      total={SENTENCES.length}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <SegmentedControl
          label="Card layout"
          options={LAYOUTS}
          value={layout}
          onValueChange={setLayout}
        />
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous sentence"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next sentence"
            disabled={index === SENTENCES.length - 1}
            onClick={() => setIndex(index + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      {sentence && (
        <SentenceCard
          // A new sentence or layout starts a fresh card
          key={`${layout}-${index}`}
          layout={layout}
          sentence={sentence}
          index={index}
          onPassed={() =>
            setPassed((current) => (current.includes(index) ? current : [...current, index]))
          }
        />
      )}
    </StepCard>
  );
}
