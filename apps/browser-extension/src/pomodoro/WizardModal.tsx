import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { QueueRules } from './types';
import { DEFAULT_RULES } from './types';

export function WizardModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (rules: QueueRules) => void | Promise<void>;
}) {
  const [work, setWork] = useState(DEFAULT_RULES.workDuration / 60);
  const [shortBreak, setShortBreak] = useState(DEFAULT_RULES.shortBreak / 60);
  const [longBreak, setLongBreak] = useState(DEFAULT_RULES.longBreak / 60);
  const [every, setEvery] = useState(DEFAULT_RULES.longEvery);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
    >
      <Card className="w-full max-w-md border-0">
        <CardHeader>
          <CardTitle>番茄钟设置</CardTitle>
          <CardDescription>
            自定义专注/休息时长，创建适合自己的节奏
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="work">专注时长（分钟）</Label>
              <Input
                id="work"
                min={1}
                onChange={(e) =>
                  setWork(Number.parseInt(e.target.value || '0', 10))
                }
                type="number"
                value={work}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="short">短休息时长（分钟）</Label>
              <Input
                id="short"
                min={0}
                onChange={(e) =>
                  setShortBreak(Number.parseInt(e.target.value || '0', 10))
                }
                type="number"
                value={shortBreak}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="long">长休息时长（分钟）</Label>
              <Input
                id="long"
                min={0}
                onChange={(e) =>
                  setLongBreak(Number.parseInt(e.target.value || '0', 10))
                }
                type="number"
                value={longBreak}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="every">长休间隔（每几个专注后）</Label>
              <Input
                id="every"
                min={2}
                onChange={(e) =>
                  setEvery(Number.parseInt(e.target.value || '0', 10))
                }
                type="number"
                value={every}
              />
            </div>

            <div className="mt-2 flex justify-end gap-3">
              <Button onClick={onClose} type="button" variant="outline">
                取消
              </Button>
              <Button
                onClick={() => {
                  const rules: QueueRules = {
                    workDuration: Math.max(60, work * 60),
                    shortBreak: Math.max(0, shortBreak * 60),
                    longBreak: Math.max(0, longBreak * 60),
                    longEvery: Math.max(2, every),
                  };
                  onConfirm(rules);
                }}
                type="button"
              >
                生成并开始
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
