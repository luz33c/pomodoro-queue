import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@uni-stack/ui/components/button";
import { Input } from "@uni-stack/ui/components/input";

import { DemoHeader } from "#/shared/ui/demo-header";

import { FIRST_PROMPT } from "#/pages/demo/model/scripted-run";

import { AssistantRun } from "./assistant-run";

type Turn = {
  id: number;
  prompt: string;
};

/** A chat that answers every message with the same scripted run, composed from the chat components. */
export function DemoPage() {
  const [turns, setTurns] = useState<Turn[]>([{ id: 0, prompt: FIRST_PROMPT }]);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length]);

  const send = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = draft.trim();
    if (!prompt) return;
    setTurns((current) => [...current, { id: current.length, prompt }]);
    setDraft("");
  };

  return (
    <div className="flex h-dvh flex-col bg-muted/30">
      <DemoHeader />

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-10 px-4 py-10">
          {turns.map((turn) => (
            <div key={turn.id} className="flex flex-col gap-5">
              <p className="max-w-[80%] self-end rounded-2xl bg-secondary px-4 py-2.5 text-sm text-secondary-foreground">
                {turn.prompt}
              </p>
              <AssistantRun />
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </main>

      <form onSubmit={send} className="border-t bg-background p-4">
        <div className="mx-auto flex max-w-2xl gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask anything; the reply is scripted"
            aria-label="Message"
          />
          <Button type="submit" size="icon" aria-label="Send" disabled={!draft.trim()}>
            <ArrowUp />
          </Button>
        </div>
      </form>
    </div>
  );
}
