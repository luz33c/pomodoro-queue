import { DemoHeader } from "#/shared/ui/demo-header";

import { GapStep, MeaningStep } from "./choice-steps";
import { SpeakStep } from "./speak-step";
import { WriteStep } from "./write-step";

/** One short lesson composed from the word input and shadowing components. */
export function PracticePage() {
  return (
    <div className="flex h-dvh flex-col bg-muted/30">
      <DemoHeader />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Renting a flat</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Learn what the words mean, pick them, write them, then say them.
            </p>
          </div>
          <MeaningStep />
          <GapStep />
          <WriteStep />
          <SpeakStep />
        </div>
      </main>
    </div>
  );
}
