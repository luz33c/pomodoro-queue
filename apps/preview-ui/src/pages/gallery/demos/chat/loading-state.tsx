import { type LoadingStateVariant } from "@uni-stack/ui/components/chat/loading-state";
import { LoadingState } from "@uni-stack/ui/components/chat/loading-state";

export function LoadingStateDemo({ variant }: { variant?: LoadingStateVariant }) {
  return <LoadingState label="Churning" variant={variant} />;
}
