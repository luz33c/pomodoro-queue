import { FlaskConical } from "lucide-react";

import { Button } from "#/components/button";
import {
  HeadphonesGate,
  RateToggle,
  SHADOWING_LABELS,
  type ShadowingAction,
  type ShadowingActivity,
  type ShadowingCardProps,
  type ShadowingLabels,
  SettingsPopover,
  ShadowingFrame,
  actionLook,
  isRecording,
  runningAction,
  useShadowingActions
} from "#/components/shadowing/frame";
import { cn } from "#/lib/utils";

type CircleActionProps = React.ComponentProps<"button"> & {
  action: ShadowingAction;
  activity: ShadowingActivity | null | undefined;
  /** The larger, filled button in the middle */
  primary?: boolean;
  t: ShadowingLabels;
};

/** Round icon with a label and a one-line hint under it; it also serves as a popover trigger */
function CircleAction({
  action,
  activity,
  primary = false,
  t,
  className,
  ...props
}: CircleActionProps) {
  const look = actionLook(action, activity, t);
  const running = runningAction(activity) === action;
  const hint = { listen: t.listenHint, retell: t.retellHint, shadow: t.shadowHint }[action];

  return (
    <button
      type="button"
      aria-pressed={running}
      className={cn("group flex flex-col items-center gap-1 text-center outline-none", className)}
      {...props}
    >
      <span
        className={cn(
          "mb-1 grid place-items-center rounded-full transition-colors group-focus-visible:ring-3 group-focus-visible:ring-ring/30",
          primary ? "size-15 [&_svg]:size-6" : "size-12 [&_svg]:size-5",
          running && isRecording(activity)
            ? "bg-destructive text-white"
            : running
              ? "bg-info/15 text-info ring-2 ring-info/30"
              : primary
                ? "bg-primary text-primary-foreground group-hover:bg-primary/90"
                : "bg-secondary text-foreground group-hover:bg-accent"
        )}
      >
        {look.icon}
      </span>
      <span className="text-sm font-semibold">{look.label}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </button>
  );
}

/**
 * Sentence card with player-style controls: shadowing in the middle as the main button,
 * listening and "listen, then speak" on either side, and speed, settings, and simulation in a row below.
 */
export function ShadowingPlayerCard({ labels, ...props }: ShadowingCardProps) {
  const t = { ...SHADOWING_LABELS, ...labels };
  const { activity, onSimulate } = props;
  const { gate, press } = useShadowingActions(props);

  const controls = (
    <div className="flex flex-col items-center gap-4 px-4 pb-5">
      {/* Tops line up, so the larger middle circle drops its label below the side ones */}
      <div className="grid w-full max-w-sm grid-cols-3 items-start justify-items-center gap-2">
        <CircleAction action="listen" activity={activity} t={t} onClick={() => press("listen")} />
        <HeadphonesGate
          open={gate.open}
          onOpenChange={(open) => (open ? press("shadow") : gate.setOpen(false))}
          onConfirm={gate.onConfirm}
          onRetell={gate.onRetell}
          t={t}
          trigger={<CircleAction action="shadow" activity={activity} t={t} primary />}
        />
        <CircleAction action="retell" activity={activity} t={t} onClick={() => press("retell")} />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1">
        <RateToggle rate={props.rate} rates={props.rates} onRateChange={props.onRateChange} t={t} />
        <SettingsPopover
          loop={props.loop}
          onLoopChange={props.onLoopChange}
          voices={props.voices}
          voice={props.voice}
          onVoiceChange={props.onVoiceChange}
          headphonesConfirmed={props.headphonesConfirmed}
          withLabel
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

  return <ShadowingFrame {...props} t={t} controls={controls} />;
}
