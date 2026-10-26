import { type LoadingStateVariant } from "@tsu-stack/ui/components/chat/loading-state";
import { LoadingState } from "@tsu-stack/ui/components/chat/loading-state";

export function LoadingStateDemo({ variant }: { variant?: LoadingStateVariant }) {
  return <LoadingState label="Churning" variant={variant} />;
}
