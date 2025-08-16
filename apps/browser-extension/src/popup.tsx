import { CountButton } from '~features/count-button';
import { authClient } from './auth/auth-client';

import '~style.css';

function IndexPopup() {
  const { data, isPending, error } = authClient.useSession();
  console.log('---->>>', data);
  if (isPending) {
    return <div className="plasmo-p-3">Loading...</div>;
  }
  if (error) {
    return <div className="plasmo-p-3">Error: {error.message}</div>;
  }

  return (
    <div className="plasmo-flex plasmo-flex-col plasmo-gap-3 plasmo-p-3 plasmo-w-56">
      {data ? (
        <div className="plasmo-text-sm">Signed in as {data.user.name}</div>
      ) : (
        <button
          className="plasmo-rounded plasmo-bg-slate-800 plasmo-text-white plasmo-px-3 plasmo-py-2"
          onClick={() =>
            authClient.signIn.email({
              email: prompt('Email') || '',
              password: prompt('Password') || '',
            })
          }
          type="button"
        >
          Sign in with Email
        </button>
      )}
      <CountButton />
    </div>
  );
}

export default IndexPopup;
