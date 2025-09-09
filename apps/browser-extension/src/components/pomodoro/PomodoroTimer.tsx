import { Button } from "@/components/ui/button"
import { usePomodoro } from "@/hooks/pomodoro/usePomodoro"
import { useI18n } from "@/hooks/useI18n"
import { Settings } from "lucide-react"
import { useState } from "react"

import { CreateQueueModal } from "./CreateQueueModal"

function phaseLabel(phase: string, t: (key: string) => string) {
  if (phase === "focus") {
    return t("phaseFocus")
  }
  if (phase === "short") {
    return t("phaseShortBreak")
  }
  if (phase === "long") {
    return t("phaseLongBreak")
  }
  return t("phaseIdle")
}

interface PomodoroTimerProps {
  onOpenSettings?: () => void
}

export function PomodoroTimer({ onOpenSettings }: PomodoroTimerProps) {
  const { state, progress, mmss, pause, resume, stop, skip } = usePomodoro()
  const { t } = useI18n()
  const [createModalOpen, setCreateModalOpen] = useState(false)

  // 先定义phase变量
  const running = state?.running
  const paused = Boolean(state?.paused)
  const phase = state?.phase ?? "idle"


  return (
    <div className="w-full text-white">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-lg text-white">
          {t("pomodoroTimer")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-white/80 hover:text-white hover:bg-white/15 rounded-full transition-all duration-200 backdrop-blur-sm"
          onClick={onOpenSettings}
          title={t("settings")}
          aria-label={t("tooltipOpenSettings")}>
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="relative h-52 w-52">
          {/* 简化的SVG圆环实现 */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* 背景圆环 */}
            <circle 
              cx="50" 
              cy="50" 
              r="42" 
              fill="none" 
              stroke="rgba(255, 255, 255, 0.15)" 
              strokeWidth="6"
            />
            {/* 进度圆环 */}
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="rgba(255, 255, 255, 0.9)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress)}`}
              className="transition-all duration-500 ease-out"
              style={{
                filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.4))'
              }}
            />
          </svg>
          
          {/* 文字内容 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-bold text-5xl tabular-nums text-white drop-shadow-lg">
              {mmss}
            </div>
            <div className="text-white/95 text-sm mt-2 font-medium drop-shadow-md">
              {phaseLabel(phase, t)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 px-4">
          {!running && (
            <Button
              size="sm"
              aria-label={t("buttonStart")}
              onClick={() => setCreateModalOpen(true)}
              className="bg-white text-black hover:bg-white/90 font-medium px-6 py-2 rounded-lg border-0 shadow-none transition-colors duration-200">
              {t("buttonStart")}
            </Button>
          )}
          {running && !paused && (
            <Button
              size="sm"
              aria-label={t("buttonPause")}
              onClick={() => pause()}
              className="bg-white/25 text-white hover:bg-white/35 px-5 py-2 rounded-lg border-0 shadow-none transition-colors duration-200">
              {t("buttonPause")}
            </Button>
          )}
          {running && paused && (
            <Button
              size="sm"
              aria-label={t("buttonResume")}
              onClick={() => resume()}
              className="bg-white text-black hover:bg-white/90 font-medium px-6 py-2 rounded-lg border-0 shadow-none transition-colors duration-200">
              {t("buttonResume")}
            </Button>
          )}
          {running && (
            <Button
              size="sm"
              aria-label={t("buttonStop")}
              onClick={() => stop()}
              className="bg-red-500 text-white hover:bg-red-600 px-5 py-2 rounded-lg border-0 shadow-none transition-colors duration-200">
              {t("buttonStop")}
            </Button>
          )}
          {running && (
            <Button
              size="sm"
              aria-label={t("buttonSkip")}
              onClick={() => skip()}
              className="bg-white/25 text-white hover:bg-white/35 px-5 py-2 rounded-lg border-0 shadow-none transition-colors duration-200">
              {t("buttonSkip")}
            </Button>
          )}
        </div>
      </div>

      <CreateQueueModal
        onOpenChange={setCreateModalOpen}
        open={createModalOpen}
      />
    </div>
  )
}
