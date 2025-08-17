'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { authClient } from '@/auth/auth-client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const { signIn } = authClient;

export function SignIn({
  setPage,
}: {
  setPage: (page: 'home' | 'sign-in' | 'sign-up') => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <Card className="max-w-md border-0">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Sign In</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Enter your email below to login to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              placeholder="m@example.com"
              required
              type="email"
              value={email}
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
              <a className="ml-auto inline-block text-sm underline" href="#">
                Forgot your password?
              </a>
            </div>

            <Input
              autoComplete="password"
              id="password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              type="password"
              value={password}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              onClick={() => {
                setRememberMe(!rememberMe);
              }}
            />
            <Label htmlFor="remember">Remember me</Label>
          </div>

          <Button
            className="w-full"
            disabled={loading}
            onClick={async () => {
              signIn.email({
                email,
                password,
                fetchOptions: {
                  onResponse: () => {
                    setLoading(false);
                  },
                  onRequest: () => {
                    setLoading(true);
                  },
                  onError: (ctx) => {
                    toast.error(ctx.error.message);
                  },
                  onSuccess: async () => {
                    setPage('home');
                  },
                },
              });
            }}
            type="submit"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Login'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
