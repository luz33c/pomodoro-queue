import { useEffect, useState } from "react";

import { LoadingState } from "@tsu-stack/ui/components/chat/loading-state";
import { Thinking } from "@tsu-stack/ui/components/chat/thinking";
import { ToolChips } from "@tsu-stack/ui/components/chat/tool-chips";

import { BEAT_DURATIONS_MS, TOOL_CALLS, describeRun } from "#/pages/demo/model/scripted-run";

/** One assistant reply, played beat by beat from the script. */
export function AssistantRun() {
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (beat >= BEAT_DURATIONS_MS.length) return;
    const timer = setTimeout(() => setBeat((current) => current + 1), BEAT_DURATIONS_MS[beat]);
    return () => clearTimeout(timer);
  }, [beat]);

  const run = describeRun(beat);

  return (
    <div className="flex flex-col gap-4">
      {run.loading && <LoadingState label="Reading the workspace" />}
      {run.thinkingRows.length > 0 && (
        <Thinking
          status={run.thinkingStatus}
          label="Thinking"
          doneLabel="Thought for 3 seconds"
          rows={run.thinkingRows}
        />
      )}
      {run.calls.length > 0 && (
        <ToolChips calls={run.calls} diffs={run.diffs} header={`${TOOL_CALLS.length} tool calls`} />
      )}
      {run.answer && (
        <p className="animate-in text-sm leading-relaxed duration-300 fade-in-0 slide-in-from-bottom-1">
          {run.answer}
        </p>
      )}
    </div>
  );
}
