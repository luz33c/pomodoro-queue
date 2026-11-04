import { WordChoiceInput } from "@uni-stack/ui/components/word-input/word-choice";

export function WordChoiceInputDemo() {
  return (
    <p className="text-center text-base leading-10">
      We plan to{" "}
      <WordChoiceInput
        word="explore"
        candidates={["exploit", "harmony", "explore", "curiosity"]}
        slotWidthCh={11}
      />{" "}
      the coast by bike next summer.
    </p>
  );
}
