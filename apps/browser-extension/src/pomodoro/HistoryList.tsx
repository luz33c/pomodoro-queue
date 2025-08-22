import { useStorage } from '@plasmohq/storage/hook';

import { sharedStorage } from '@/lib/storage';
import type { Segment } from './types';
import { type QueueState, STORAGE_KEYS, segmentTitle } from './types';

export function HistoryList() {
  const [state] = useStorage<QueueState>(
    STORAGE_KEYS.STATE,
    {
      rules: null,
      current: null,
      status: 'idle',
      history: [],
      workCount: 0,
      deadline: null,
    },
    { instance: sharedStorage }
  );
  const items: Segment[] = state?.history ?? [];

  if (items.length === 0) {
    return (
      <div className="mx-auto mt-4 w-full max-w-md text-center text-muted-foreground text-sm">
        还没有完成的番茄钟，开始你的第一个专注时段吧！
      </div>
    );
  }

  return (
    <div className="mx-auto mt-6 w-full max-w-md px-2">
      <div className="mb-2 font-medium text-sm">历史记录</div>
      <ul className="flex flex-col gap-2">
        {items.map((s) => (
          <li
            className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2"
            key={s.id}
          >
            <div className="flex items-center gap-2 text-sm">
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-full bg-primary"
              />
              <span>{segmentTitle(s.type)}</span>
              <span className="text-muted-foreground text-sm">
                {Math.round(s.duration / 60)} 分钟
              </span>
            </div>
            <div className="text-muted-foreground text-xs">
              {s.endedAt ? new Date(s.endedAt).toLocaleTimeString() : ''}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
