import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { usePomodoro } from '@/hooks/pomodoro/usePomodoro';
import { useI18n } from '@/hooks/useI18n';
import type { PomodoroConfig } from '@/model/pomodoro/types';
import { DEFAULT_CONFIG } from '@/model/pomodoro/types';

export function CreateQueueModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { state, updateConfig, start } = usePomodoro();
  const { t } = useI18n();
  const [form, setForm] = useState<PomodoroConfig>(
    state?.config ?? DEFAULT_CONFIG
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (state?.config) setForm(state.config);
  }, [state?.config]);

  const setField =
    (k: keyof PomodoroConfig, allowZero = false, min = 1) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^\d]/g, '');
      const v = raw === '' ? Number.NaN : Number(raw);
      setForm((prev) => ({
        ...prev,
        [k]: Number.isFinite(v)
          ? Math.max(allowZero ? 0 : 1, v)
          : allowZero
            ? 0
            : min,
      }));
    };

  const isValid = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!(form.focusMin >= 1)) errs.focusMin = t('validationFocusMin');
    if (!(form.shortMin >= 0)) errs.shortMin = t('validationShortMin');
    if (!(form.longMin >= 0)) errs.longMin = t('validationLongMin');
    if (!(form.longEvery >= 2)) errs.longEvery = t('validationLongEvery');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form, t]);

  if (!open) return null;

  // 统一输入框的观感：与设置页一致的白色系边界与焦点样式（更紧凑）
  const flatInputClass = [
    // 尺寸与按钮 size=sm 对齐（h-8, px-3）
    'h-8 px-3',
    'rounded-md',
    'border-white/30 bg-white/10',
    // 字号略收紧以匹配整体密度
    'text-sm text-white placeholder:text-white/70',
    'focus-visible:ring-1 focus-visible:ring-white/60',
    'shadow-none',
  ].join(' ');

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col pomodoro-focus-bg"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex h-full w-full flex-col p-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold text-white">
            {t('createQueueTitle')}
          </div>
          <Button
            aria-label={t('buttonClose')}
            className="text-white hover:bg-white/20"
            onClick={() => onOpenChange(false)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {t('buttonClose')}
          </Button>
        </div>
        <p className="mb-4 text-sm text-white/70">{t('createQueueDesc')}</p>
        <Separator className="mb-4 bg-white/30" />
        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto pr-1">
          {/* 专注时长 */}
          <div>
            <Label
              className="mb-1 block text-sm font-medium text-white"
              htmlFor="focus-min"
            >
              {t('focusDuration')}
            </Label>
            <Input
              aria-describedby={errors.focusMin ? 'err-focus-min' : undefined}
              aria-invalid={!!errors.focusMin}
              className={flatInputClass}
              id="focus-min"
              inputMode="numeric"
              onChange={setField('focusMin', false, 1)}
              value={form.focusMin}
            />
            {errors.focusMin && (
              <span
                className="mt-1 block text-xs text-yellow-200"
                id="err-focus-min"
              >
                {errors.focusMin}
              </span>
            )}
          </div>

          {/* 短休息 */}
          <div>
            <Label
              className="mb-1 block text-sm font-medium text-white"
              htmlFor="short-min"
            >
              {t('shortBreakDuration')}
            </Label>
            <Input
              aria-describedby={errors.shortMin ? 'err-short-min' : undefined}
              aria-invalid={!!errors.shortMin}
              className={flatInputClass}
              id="short-min"
              inputMode="numeric"
              onChange={setField('shortMin', true, 0)}
              value={form.shortMin}
            />
            {errors.shortMin && (
              <span
                className="mt-1 block text-xs text-yellow-200"
                id="err-short-min"
              >
                {errors.shortMin}
              </span>
            )}
          </div>

          {/* 长休息 */}
          <div>
            <Label
              className="mb-1 block text-sm font-medium text-white"
              htmlFor="long-min"
            >
              {t('longBreakDuration')}
            </Label>
            <Input
              aria-describedby={errors.longMin ? 'err-long-min' : undefined}
              aria-invalid={!!errors.longMin}
              className={flatInputClass}
              id="long-min"
              inputMode="numeric"
              onChange={setField('longMin', true, 0)}
              value={form.longMin}
            />
            {errors.longMin && (
              <span
                className="mt-1 block text-xs text-yellow-200"
                id="err-long-min"
              >
                {errors.longMin}
              </span>
            )}
          </div>

          {/* 长休息间隔 */}
          <div>
            <Label
              className="mb-1 block text-sm font-medium text-white"
              htmlFor="long-every"
            >
              {t('longBreakInterval')}
            </Label>
            <Input
              aria-describedby={errors.longEvery ? 'err-long-every' : undefined}
              aria-invalid={!!errors.longEvery}
              className={flatInputClass}
              id="long-every"
              inputMode="numeric"
              onChange={setField('longEvery', false, 2)}
              value={form.longEvery}
            />
            {errors.longEvery && (
              <span
                className="mt-1 block text-xs text-yellow-200"
                id="err-long-every"
              >
                {errors.longEvery}
              </span>
            )}
          </div>
        </div>
        <Separator className="my-4 bg-white/30" />
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            className="rounded-lg border-0 shadow-none bg-white/20 text-white hover:bg-white/30"
            onClick={() => onOpenChange(false)}
            size="sm"
            type="button"
          >
            {t('buttonCancel')}
          </Button>
          <Button
            disabled={!isValid}
            className="rounded-lg border-0 shadow-none bg-white text-black hover:bg-white/90"
            onClick={async () => {
              if (!isValid) return;
              await updateConfig(form);
              onOpenChange(false);
              if (!state?.running) await start('focus');
            }}
            size="sm"
            type="button"
          >
            {t('createQueueGenerate')}
          </Button>
        </div>
      </div>
    </div>
  );
}
