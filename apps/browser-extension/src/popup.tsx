import '@/style.css';

import { useState } from 'react';
import { Toaster, toast } from 'sonner';
import { authClient } from './auth/auth-client';
import { Home } from './components/Home';
import { SignIn } from './components/SignIn';
import { SignUp } from './components/SignUp';
import { Button } from './components/ui/button';
import { Separator } from './components/ui/separator';

function IndexPopup() {
  const [page, setPage] = useState<'home' | 'sign-in' | 'sign-up'>('home');

  return (
    <div className="dark h-fit min-h-[500px] w-fit min-w-[400px] overflow-hidden bg-background text-foreground">
      <Toaster />
      {page === 'home' && <Home setPage={setPage} />}
      {page === 'sign-in' && <SignIn setPage={setPage} />}
      {page === 'sign-up' && <SignUp setPage={setPage} />}
      <PageControls page={page} setPage={setPage} />
    </div>
  );
}

export default IndexPopup;

export function PageControls({
  setPage,
  page,
}: {
  setPage: (page: 'home' | 'sign-in' | 'sign-up') => void;
  page: 'home' | 'sign-in' | 'sign-up';
}) {
  return (
    <div className="mt-5 flex h-fit w-full flex-col gap-5 px-10">
      <Separator />
      <div className="flex justify-center gap-4">
        {page === 'home' && (
          <>
            <Button onClick={() => setPage('sign-in')}>Sign-in</Button>
            <Button onClick={() => setPage('sign-up')}>Sign-Up</Button>
            <Button
              onClick={() => {
                authClient.signOut().then(({ data, error }) => {
                  if (error) {
                    toast.error(error.message);
                  } else {
                    toast.success("You've been signed out");
                  }
                });
              }}
            >
              Sign-Out
            </Button>
          </>
        )}
        {page === 'sign-in' && (
          <>
            <Button onClick={() => setPage('sign-up')}>Sign-Up</Button>
            <Button onClick={() => setPage('home')}>Home</Button>
          </>
        )}
        {page === 'sign-up' && (
          <>
            <Button onClick={() => setPage('sign-in')}>Sign-in</Button>
            <Button onClick={() => setPage('home')}>Home</Button>
          </>
        )}
      </div>

      <div className="flex justify-center bg-background">
        <a
          className="underline"
          href="https://www.better-auth.com/docs/integrations/browser-extensions"
          rel="noopener"
          target="_blank"
        >
          Learn more about better-auth extensions
        </a>
      </div>
      <div className="h-5" />
    </div>
  );
}
