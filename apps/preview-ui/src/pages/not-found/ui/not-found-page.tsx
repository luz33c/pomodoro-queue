import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@uni-stack/ui/components/button";

export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-mono text-xs text-muted-foreground">404</p>
      <h1 className="text-lg font-semibold">This page does not exist.</h1>
      <Link to="/" className={buttonVariants({ size: "sm", variant: "outline" })}>
        <ArrowLeft />
        Back to the components
      </Link>
    </main>
  );
}
