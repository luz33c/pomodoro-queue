import { MeaningChoiceInput } from "@tsu-stack/ui/components/word-input/meaning-choice";

export function MeaningChoiceInputDemo() {
  return (
    <p className="text-center text-base leading-10">
      Our{" "}
      <MeaningChoiceInput
        word="landlord"
        meaning="房东；地主"
        candidates={["租客；房客", "房东；地主", "和谐；融洽", "押金；定金"]}
      />{" "}
      fixed the heating within a day.
    </p>
  );
}
