import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { usePomodoro } from "@/hooks/pomodoro/usePomodoro"
import { useI18n } from "@/hooks/useI18n"
import type { PomodoroConfig } from "@/model/pomodoro/types"
import { DEFAULT_CONFIG } from "@/model/pomodoro/types"

export function CreateQueueModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, updateConfig, start } = usePomodoro()
  const { t } = useI18n()
  const [form, setForm] = useState<PomodoroConfig>(state?.config ?? DEFAULT_CONFIG)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (state?.config) setForm(state.config)
  }, [state?.config])

  const setField = (k: keyof PomodoroConfig, allowZero = false, min = 1) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, "")
    const v = raw === "" ? NaN : Number(raw)
    setForm((prev) => ({ ...prev, [k]: Number.isFinite(v) ? Math.max(allowZero ? 0 : 1, v) : (allowZero ? 0 : min) }))
  }

  const isValid = useMemo(() => {
    const errs: Record<string, string> = {}
    if (!(form.focusMin >= 1)) errs.focusMin = t('validationFocusMin')
    if (!(form.shortMin >= 0)) errs.shortMin = t('validationShortMin')
    if (!(form.longMin >= 0)) errs.longMin = t('validationLongMin')
    if (!(form.longEvery >= 2)) errs.longEvery = t('validationLongEvery')
    setErrors(errs)
    return Object.keys(errs).length === 0
  }, [form, t])

  if (!open) return null

  return (
      <div className="absolute inset-0 z-50 flex flex-col pomodoro-focus-bg" role="dialog" aria-modal="true">
        <div className="flex h-full w-full flex-col p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-lg font-semibold">{t('createQueueTitle')}</div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} aria-label={t('buttonClose')}>{t('buttonClose')}</Button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t('createQueueDesc')}</p>
          <Separator className="mb-4" />
          <div className="flex-1 space-y-4 overflow-y-auto">
            <label className="block">
              <span className="text-sm font-medium mb-2 block">{t('focusDuration')}</span>
              <Input inputMode="numeric" value={form.focusMin} onChange={setField("focusMin", false, 1)} aria-invalid={!!errors.focusMin} />
              {errors.focusMin && <span className="text-xs text-destructive mt-1 block">{errors.focusMin}</span>}
            </label>
            <label className="block">
              <span className="text-sm font-medium mb-2 block">{t('shortBreakDuration')}</span>
              <Input inputMode="numeric" value={form.shortMin} onChange={setField("shortMin", true, 0)} aria-invalid={!!errors.shortMin} />
              {errors.shortMin && <span className="text-xs text-destructive mt-1 block">{errors.shortMin}</span>}
            </label>
            <label className="block">
              <span className="text-sm font-medium mb-2 block">{t('longBreakDuration')}</span>
              <Input inputMode="numeric" value={form.longMin} onChange={setField("longMin", true, 0)} aria-invalid={!!errors.longMin} />
              {errors.longMin && <span className="text-xs text-destructive mt-1 block">{errors.longMin}</span>}
            </label>
            <label className="block">
              <span className="text-sm font-medium mb-2 block">{t('longBreakInterval')}</span>
              <Input inputMode="numeric" value={form.longEvery} onChange={setField("longEvery", false, 2)} aria-invalid={!!errors.longEvery} />
              {errors.longEvery && <span className="text-xs text-destructive mt-1 block">{errors.longEvery}</span>}
            </label>
          </div>
          <Separator className="my-4" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('buttonCancel')}</Button>
            <Button
              disabled={!isValid}
              onClick={async () => {
                if (!isValid) return
                await updateConfig(form)
                onOpenChange(false)
                if (!state?.running) await start("focus")
              }}
            >
              {t('createQueueGenerate')}
            </Button>
          </div>
        </div>
      </div>
  )
}
