import { AudioLines, ChevronDown, FlaskConical, Mic, Square, Volume2 } from "lucide-react";

import { Button } from "#/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "#/components/dropdown-menu";
import {
  HeadphonesGate,
  RateToggle,
  SHADOWING_LABELS,
  type ShadowingCardProps,
  SettingsPopover,
  ShadowingFrame,
  actionLook,
  isRecording,
  runningAction,
  useShadowingActions
} from "#/components/shadowing/frame";

type ModeItemProps = {
  icon: React.ReactNode;
  title: string;
  hint: string;
  tag?: string;
  onClick: () => void;
};

function ModeItem({ icon, title, hint, tag, onClick }: ModeItemProps) {
  return (
    <DropdownMenuItem onClick={onClick} className="items-start gap-2.5 py-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-1.5 font-medium">
          {title}
          {tag && (
            <span className="rounded bg-secondary px-1.5 text-[10px] font-normal text-muted-foreground">
              {tag}
            </span>
          )}
        </span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </span>
    </DropdownMenuItem>
  );
}

/**
 * Sentence card with the fewest buttons: a speaker before the first word plays the original,
 * and one split button below shadows, with "listen, then speak" in its menu (opens on hover or on the arrow).
 */
export function ShadowingCompactCard({ labels, ...props }: ShadowingCardProps) {
  const t = { ...SHADOWING_LABELS, ...labels };
  const { activity, onSimulate } = props;
  const { gate, press } = useShadowingActions(props);
  const running = runningAction(activity);
  // The split button shows whichever way of speaking runs, so pressing it stops that one
  const mainAction = running === "retell" ? "retell" : "shadow";
  const main = actionLook(mainAction, activity, t);
  const listening = running === "listen";

  const speaker = (
    <Button
      variant="secondary"
      size="icon"
      radius="full"
      aria-label={listening ? t.stop : t.speaker}
      aria-pressed={listening}
      onClick={() => press("listen")}
      className="mr-2 -translate-y-0.5 align-middle"
    >
      {listening ? <Square /> : <Volume2 />}
    </Button>
  );

  const controls = (
    <div className="flex flex-wrap items-center gap-2 border-t bg-muted/40 px-4 py-3 @lg:px-6">
      <div className="inline-flex">
        <HeadphonesGate
          open={gate.open}
          onOpenChange={(open) => (open ? press(mainAction) : gate.setOpen(false))}
          onConfirm={gate.onConfirm}
          onRetell={gate.onRetell}
          t={t}
          trigger={
            <Button
              size="lg"
              variant={isRecording(activity) ? "destructive" : "default"}
              aria-pressed={running === mainAction}
              className="rounded-r-none"
            >
              {main.icon}
              {main.label}
            </Button>
          }
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            openOnHover
            render={
              <Button
                size="lg"
                variant={isRecording(activity) ? "destructive" : "default"}
                aria-label={t.moreModes}
                className="rounded-l-none border-l border-primary-foreground/20 px-2.5"
              />
            }
          >
            <ChevronDown />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <ModeItem
              icon={<AudioLines />}
              title={t.shadow}
              tag={t.defaultTag}
              hint={t.shadowMenuHint}
              onClick={() => press("shadow")}
            />
            <ModeItem
              icon={<Mic />}
              title={t.retell}
              hint={t.retellMenuHint}
              onClick={() => press("retell")}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-1">
        <RateToggle rate={props.rate} rates={props.rates} onRateChange={props.onRateChange} t={t} />
        <SettingsPopover
          loop={props.loop}
          onLoopChange={props.onLoopChange}
          voices={props.voices}
          voice={props.voice}
          onVoiceChange={props.onVoiceChange}
          headphonesConfirmed={props.headphonesConfirmed}
          t={t}
        />
        {onSimulate && (
          <Button variant="ghost" size="sm" onClick={onSimulate}>
            <FlaskConical />
            {t.simulate}
          </Button>
        )}
      </div>
    </div>
  );

  return <ShadowingFrame {...props} t={t} lead={speaker} controls={controls} />;
}
