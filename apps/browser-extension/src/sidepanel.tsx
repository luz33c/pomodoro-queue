import '@/style.css';

import { Toaster } from 'sonner';
import { Home } from './components/Home';

function IndexSidePanel() {
  return (
    <div className="dark h-fit min-h-[500px] w-fit min-w-[400px] overflow-hidden bg-background text-foreground">
      <Toaster />
      <Home />
    </div>
  );
}

export default IndexSidePanel;

export {};
