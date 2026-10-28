import {
  AudioLines,
  Check,
  Eye,
  EyeOff,
  Headphones,
  Mic,
  PenLine,
  Play,
  SlidersHorizontal,
  Square
} from "lucide-react";
import { Fragment, useRef, useState } from "react";

import { Button } from "#/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/popover";
import { TraceInput } from "#/components/word-input/trace";
import { cn } from "#/lib/utils";

// The success and warning tokens are too light for text and lines; mixing in the foreground keeps them readable in both themes
const SUCCESS_TEXT = "text-[color-mix(in_oklab,var(--color-success)_55%,var(--color-foreground))]";
const SUCCESS_BORDER =
  "border-[color-mix(in_oklab,var(--color-success)_55%,var(--color-foreground))]";
const WARNING_BORDER =
  "border-[color-mix(in_oklab,var(--color-warning)_55%,var(--color-foreground))]";

/** What the learner asks for: hear the original, speak along with it, or hear it and then speak */
export type ShadowingAction = "listen" | "shadow" | "retell";

/** What runs now; `retell` plays the original first, then records */
export type ShadowingActivity = "listen" | "shadow" | "retell-listen" | "retell-record";

export type ShadowingToken = {
  text: string;
  /** Copy this word in place; it shows as a dashed blank until typed */
  slot?: boolean;
  /** Punctuation right after the word, kept outside the blank */
  trail?: string;
};

export type ShadowingScore = {
  total: number;
  grade: string;
  passed: boolean;
  /** Text next to the grade, for example "Shadowing · Passed" */
  note?: string;
};

export const SHADOWING_LABELS = {
  copy: "Copy",
  defaultTag: "Default",
  headphones: "Headphones",
  headphonesBody: "Without them the mic also records the original, and the score will be off.",
  headphonesConfirmed: "Confirmed",
  headphonesReady: "I'm wearing them",
  headphonesTitle: "Shadowing needs headphones",
  headphonesUnconfirmed: "Not confirmed",
  listen: "Listen",
  listenHint: "Original only",
  loop: "Loop",
  moreModes: "More ways to speak",
  notStarted: "Not started",
  playing: "Playing…",
  position: (index: number, count: number) => `Sentence ${index} / ${count}`,
  rate: "Speed",
  recording: "Recording",
  retell: "Repeat",
  retellHint: "Listen, then speak",
  retellMenuHint: "Plays once, then records. No headphones needed.",
  settings: "Loop · Voice",
  shadow: "Shadow",
  shadowHint: "Speak along",
  shadowing: "Shadowing",
  shadowMenuHint: "Audio and recording start together. Wear headphones.",
  simulate: "Simulate answer",
  speak: "Speak",
  speaker: "Play the original",
  stop: "Stop",
  translation: "Translation",
  useRetell: "Repeat instead",
  voice: "Voice"
};

export type ShadowingLabels = typeof SHADOWING_LABELS;

/** Props both shadowing cards take; the caller plays audio, records, and scores */
export type ShadowingCardProps = {
  tokens: ShadowingToken[];
  activity?: ShadowingActivity | null;
  /** Index of the token being read aloud; it gets a light green background */
  spokenIndex?: number;
  /** Line under the sentence while something runs, for example the words heard so far */
  status?: string;
  /** Starting one action while another runs should stop the running one */
  onStart: (action: ShadowingAction) => void;
  onStop: () => void;
  /** Shadowing asks once for headphones; the caller remembers the answer */
  headphonesConfirmed?: boolean;
  onHeadphonesConfirm?: () => void;
  rate?: number;
  rates?: number[];
  onRateChange?: (rate: number) => void;
  loop?: boolean;
  onLoopChange?: (loop: boolean) => void;
  voices?: string[];
  voice?: string;
  onVoiceChange?: (voice: string) => void;
  /** Shows a button that fakes an answer, for trying the card without a mic */
  onSimulate?: () => void;
  score?: ShadowingScore | null;
  /** Detail under the grade, such as sub-scores or a word-by-word comparison */
  scoreDetail?: React.ReactNode;
  /** 1-based position of the sentence in its text */
  position?: { index: number; count: number };
  translation?: string;
  /** Line under the sentence while nothing runs */
  hint?: string;
  /** Called with the token index once a blank is copied */
  onSlotComplete?: (tokenIndex: number) => void;
  labels?: Partial<ShadowingLabels>;
  className?: string;
};

/** The action a running activity belongs to */
export function runningAction(activity: ShadowingActivity | null | undefined) {
  if (!activity) return null;
  return activity === "retell-listen" || activity === "retell-record" ? "retell" : activity;
}

const IDLE_ICON: Record<ShadowingAction, React.ReactNode> = {
  listen: <Play />,
  retell: <Mic />,
  shadow: <AudioLines />
};

/** Icon and label of an action button; a running action turns into its stop button */
export function actionLook(
  action: ShadowingAction,
  activity: ShadowingActivity | null | undefined,
  t: ShadowingLabels
) {
  const idleLabel = { listen: t.listen, retell: t.retell, shadow: t.shadow }[action];
  if (runningAction(activity) !== action) return { icon: IDLE_ICON[action], label: idleLabel };
  const runningLabel = {
    listen: t.stop,
    "retell-listen": t.playing,
    "retell-record": t.recording,
    shadow: t.shadowing
  }[activity ?? "listen"];
  return { icon: <Square />, label: runningLabel };
}

export const isRecording = (activity: ShadowingActivity | null | undefined) =>
  activity === "shadow" || activity === "retell-record";

/**
 * Routes button presses: a running action stops, shadowing first asks for headphones, anything else starts.
 * Returns the press handler and the state of the headphones prompt.
 */
export function useShadowingActions({
  activity,
  headphonesConfirmed = false,
  onStart,
  onStop,
  onHeadphonesConfirm
}: Pick<
  ShadowingCardProps,
  "activity" | "headphonesConfirmed" | "onStart" | "onStop" | "onHeadphonesConfirm"
>) {
  const [gateOpen, setGateOpen] = useState(false);

  const press = (action: ShadowingAction) => {
    if (runningAction(activity) === action) {
      onStop();
      return;
    }
    if (action === "shadow" && !headphonesConfirmed) {
      setGateOpen(true);
      return;
    }
    setGateOpen(false);
    onStart(action);
  };

  const gate = {
    onConfirm: () => {
      setGateOpen(false);
      onHeadphonesConfirm?.();
      onStart("shadow");
    },
    onRetell: () => {
      setGateOpen(false);
      onStart("retell");
    },
    open: gateOpen,
    setOpen: setGateOpen
  };

  return { gate, press };
}

type HeadphonesGateProps = {
  open: boolean;
  /** The trigger asks to open; the card decides whether to start or to show the prompt */
  onOpenChange: (open: boolean) => void;
  /** The shadowing button the prompt points at */
  trigger: React.ReactElement;
  onConfirm: () => void;
  onRetell: () => void;
  t: ShadowingLabels;
};

/** Asks once whether headphones are on before shadowing, with a way to repeat instead */
export function HeadphonesGate({
  open,
  onOpenChange,
  trigger,
  onConfirm,
  onRetell,
  t
}: HeadphonesGateProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger render={trigger} />
      <PopoverContent side="top" className="w-72 gap-2 p-3">
        <p className="flex items-center gap-1.5 font-medium">
          <Headphones className="size-4" />
          {t.headphonesTitle}
        </p>
        <p className="text-muted-foreground">{t.headphonesBody}</p>
        <div className="mt-1 flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onRetell}>
            {t.useRetell}
          </Button>
          <Button size="sm" onClick={onConfirm}>
            {t.headphonesReady}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type RateToggleProps = Pick<ShadowingCardProps, "rate" | "rates" | "onRateChange"> & {
  t: ShadowingLabels;
};

export function RateToggle({ rate = 1, rates = [0.75, 1], onRateChange, t }: RateToggleProps) {
  return (
    <fieldset aria-label={t.rate} className="inline-flex rounded-lg bg-secondary p-0.5">
      {rates.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === rate}
          onClick={() => onRateChange?.(option)}
          className={cn(
            "rounded-md px-2.5 py-1 text-sm tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
            option === rate
              ? "bg-background font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option}×
        </button>
      ))}
    </fieldset>
  );
}

type SettingsPopoverProps = Pick<
  ShadowingCardProps,
  "loop" | "onLoopChange" | "voices" | "voice" | "onVoiceChange" | "headphonesConfirmed"
> & {
  /** Show the label next to the icon */
  withLabel?: boolean;
  t: ShadowingLabels;
};

/** Loop, voice, and the remembered headphones answer, kept out of the main controls */
export function SettingsPopover({
  loop = false,
  onLoopChange,
  voices = [],
  voice,
  onVoiceChange,
  headphonesConfirmed = false,
  withLabel = false,
  t
}: SettingsPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size={withLabel ? "sm" : "icon-sm"}
            aria-label={withLabel ? undefined : t.settings}
          />
        }
      >
        <SlidersHorizontal />
        {withLabel && t.settings}
      </PopoverTrigger>
      <PopoverContent side="top" className="w-64 gap-3 p-3">
        <label className="flex items-center justify-between gap-3">
          {t.loop}
          <input
            type="checkbox"
            checked={loop}
            onChange={(event) => onLoopChange?.(event.target.checked)}
            className="size-4 accent-primary"
          />
        </label>
        {voices.length > 0 && (
          <label className="flex items-center justify-between gap-3">
            {t.voice}
            <select
              value={voice}
              onChange={(event) => onVoiceChange?.(event.target.value)}
              className="h-8 min-w-0 rounded-md border bg-background px-2"
            >
              {voices.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )}
        <p className="flex items-center justify-between gap-3">
          {t.headphones}
          <span className="text-muted-foreground">
            {headphonesConfirmed ? t.headphonesConfirmed : t.headphonesUnconfirmed}
          </span>
        </p>
      </PopoverContent>
    </Popover>
  );
}

type StatusChipProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "done" | "partial" | "idle";
};

function StatusChip({ icon, label, value, tone }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs [&_svg]:size-3.5",
        tone === "done" && cn("bg-success/20", SUCCESS_TEXT),
        tone === "partial" && "bg-warning/25",
        tone === "idle" && "bg-secondary text-muted-foreground"
      )}
    >
      {tone === "done" ? <Check /> : icon}
      {label}
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function ScorePanel({ score, detail }: { score: ShadowingScore; detail?: React.ReactNode }) {
  return (
    <div className="flex animate-in items-start gap-4 rounded-xl border bg-background p-4 duration-300 fade-in-0 slide-in-from-bottom-1">
      <div
        className={cn(
          "grid size-16 shrink-0 place-items-center rounded-full border-4 text-xl font-semibold tabular-nums",
          score.passed ? SUCCESS_BORDER : WARNING_BORDER
        )}
      >
        {score.total}
      </div>
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-sm font-semibold",
              score.passed ? cn("bg-success/20", SUCCESS_TEXT) : "bg-warning/25"
            )}
          >
            {score.grade}
          </span>
          {score.note && <span className="text-sm text-muted-foreground">{score.note}</span>}
        </div>
        {detail && <div className="mt-2 text-sm text-muted-foreground">{detail}</div>}
      </div>
    </div>
  );
}

type ShadowingFrameProps = Omit<ShadowingCardProps, "labels" | "onStart" | "onStop"> & {
  t: ShadowingLabels;
  /** Placed before the first word, such as a speaker button */
  lead?: React.ReactNode;
  /** The card's action area */
  controls: React.ReactNode;
};

/**
 * Header with progress chips, the sentence with copy blanks and the spoken-word highlight,
 * a status line, the card's own controls, and the latest score.
 */
export function ShadowingFrame({
  tokens,
  activity,
  spokenIndex = -1,
  status,
  score,
  scoreDetail,
  position,
  translation,
  hint,
  onSlotComplete,
  t,
  lead,
  controls,
  className
}: ShadowingFrameProps) {
  const [copied, setCopied] = useState<number[]>([]);
  const [showTranslation, setShowTranslation] = useState(false);
  const sentenceRef = useRef<HTMLDivElement>(null);
  const slotCount = tokens.filter((token) => token.slot).length;

  // A copied blank moves focus to the next blank still to copy
  const completeSlot = (index: number) => {
    const done = [...copied, index];
    setCopied(done);
    onSlotComplete?.(index);
    const next = tokens.findIndex((token, i) => i > index && token.slot && !done.includes(i));
    if (next >= 0) {
      sentenceRef.current?.querySelector<HTMLInputElement>(`[data-token="${next}"] input`)?.focus();
    }
  };

  return (
    <div
      className={cn(
        "@container w-full overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5 @lg:px-6">
        {position && (
          <span className="mr-1 text-sm text-muted-foreground tabular-nums">
            {t.position(position.index, position.count)}
          </span>
        )}
        <StatusChip
          icon={<Mic />}
          label={t.speak}
          value={score ? `${score.grade} ${score.total}` : t.notStarted}
          tone={score?.passed ? "done" : score ? "partial" : "idle"}
        />
        {slotCount > 0 && (
          <StatusChip
            icon={<PenLine />}
            label={t.copy}
            value={`${copied.length}/${slotCount}`}
            tone={copied.length >= slotCount ? "done" : copied.length > 0 ? "partial" : "idle"}
          />
        )}
        {translation && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            aria-pressed={showTranslation}
            onClick={() => setShowTranslation((shown) => !shown)}
          >
            {showTranslation ? <EyeOff /> : <Eye />}
            {t.translation}
          </Button>
        )}
      </div>

      <div className="px-4 pt-6 pb-4 @lg:px-8 @lg:pt-8">
        <div ref={sentenceRef} className="text-xl leading-[2.1] @lg:text-[26px]">
          {lead}
          {tokens.map((token, index) => (
            <Fragment key={`${index}-${token.text}`}>
              {index > 0 && " "}
              <span
                data-token={index}
                className={cn(
                  "rounded-sm transition-colors",
                  // Background only: green text already means a copied word
                  index === spokenIndex && "bg-success/25"
                )}
              >
                {token.slot ? (
                  <TraceInput
                    variant="inline"
                    word={token.text}
                    onComplete={() => completeSlot(index)}
                  />
                ) : (
                  token.text
                )}
              </span>
              {token.trail}
            </Fragment>
          ))}
        </div>
        {showTranslation && translation && (
          <p className="mt-2 text-base text-muted-foreground">{translation}</p>
        )}
        <p className="mt-3 flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
          {status ? (
            <>
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  isRecording(activity) ? "bg-destructive motion-safe:animate-pulse" : "bg-info"
                )}
              />
              {status}
            </>
          ) : (
            hint
          )}
        </p>
      </div>

      {controls}

      {score && (
        <div className="px-4 pb-4 @lg:px-6 @lg:pb-6">
          <ScorePanel score={score} detail={scoreDetail} />
        </div>
      )}
    </div>
  );
}
