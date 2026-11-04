import { cn } from "@uni-stack/ui/lib/utils";

import { Footer } from "#/features/footer/index";
import { Navbar } from "#/features/navbar/index";

export function RootLayout({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      <div className={cn("flex min-h-screen flex-col", className)}>
        <Navbar />
        <main className="flex-1">{children}</main>
      </div>
      <Footer className="lg:mt-12" />
    </>
  );
}
