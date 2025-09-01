import { createAuthClient } from 'better-auth/react';

// Base URL of Better Auth backend. Matches apps/server dev port.
export const authClient = createAuthClient({
  baseURL: 'http://localhost:3000',
  plugins: [],
});
