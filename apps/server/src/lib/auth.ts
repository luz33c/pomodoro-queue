import { env } from 'cloudflare:workers';
import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import { account, session, user, verification } from '../db/schema/auth';

// Compose the schema object without namespace imports to satisfy lint rules
const schema = { user, session, account, verification };

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema,
  }),
  // Allow web origin plus browser extensions (wildcard for dev). Prefer listing explicit IDs in prod.
  trustedOrigins: [
    env.CORS_ORIGIN,
    'chrome-extension://iammdhbelmnohmpopffhabagnppbcpje',
  ],
  emailAndPassword: {
    enabled: true,
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  plugins: [expo()],
});
