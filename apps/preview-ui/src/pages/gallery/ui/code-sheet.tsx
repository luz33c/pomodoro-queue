import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@uni-stack/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@uni-stack/ui/components/sheet";

import { SegmentedControl } from "#/shared/ui/segmented-control";

import { type DemoEntry } from "#/pages/gallery/demos/catalog";
import { useCopy } from "#/pages/gallery/hooks/use-copy";

const TABS = ["usage", "source"] as const;

type CodeSheetProps = {
  entry: DemoEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** The demo's source as a usage example, and the component's own source. */
export function CodeSheet({ entry, open, onOpenChange }: CodeSheetProps) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("usage");
  const { copied, copy } = useCopy();
  const code = tab === "usage" ? entry.usage : entry.source.code;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="border-b pr-14">
          <SheetTitle>{entry.title}</SheetTitle>
          <SheetDescription className="font-mono text-xs">
            {tab === "usage" ? entry.importPath : entry.source.path}
          </SheetDescription>
          <div className="mt-2 flex items-center justify-between gap-2">
            <SegmentedControl label="Code" options={TABS} value={tab} onValueChange={setTab} />
            <Button variant="outline" size="sm" onClick={() => void copy(code)}>
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </SheetHeader>
        <pre className="min-h-0 flex-1 overflow-auto bg-muted/40 p-4 font-mono text-xs leading-relaxed">
          <code>{code}</code>
        </pre>
      </SheetContent>
    </Sheet>
  );
}
