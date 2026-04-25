import Combine
import Foundation

@MainActor
final class PomodoroStore: ObservableObject {
    @Published var phase: PomodoroPhase = .idle
    @Published var islandStatus: IslandStatus = .opened
    @Published var isPaused = false
    @Published var remainingSeconds = PomodoroConfiguration.defaults.workMinutes * 60
    @Published var phaseTotalSeconds = PomodoroConfiguration.defaults.workMinutes * 60
    @Published var completedWorkSessions = 0
    @Published var currentTaskTitle = "写实现方案"
    @Published var configuration = PomodoroConfiguration.defaults {
        didSet {
            persistConfiguration()
            if phase == .idle {
                resetIdleDuration()
            }
        }
    }
    @Published var islandMetrics = IslandMetrics.defaults

    var onOverlayStateChanged: (() -> Void)?
    var showSettings: (() -> Void)?
    var quit: (() -> Void)?

    private var timer: Timer?
    private var previousConfiguration = PomodoroConfiguration.defaults
    private let startsTimerAutomatically: Bool

    var progress: Double {
        guard phaseTotalSeconds > 0 else { return 0 }
        let elapsed = phaseTotalSeconds - remainingSeconds
        return min(1, max(0, Double(elapsed) / Double(phaseTotalSeconds)))
    }

    var remainingText: String {
        TimeFormatting.minutesAndSeconds(remainingSeconds)
    }

    var nextPhaseSummary: String {
        switch phase {
        case .work:
            "结束后自动进入 \(configuration.shortBreakMinutes) 分钟休息"
        case .shortBreak, .longBreak:
            "下一轮工作 \(configuration.workMinutes) 分钟"
        case .idle:
            "准备开始 \(configuration.workMinutes) 分钟专注"
        }
    }

    init(startsTimerAutomatically: Bool = true) {
        self.startsTimerAutomatically = startsTimerAutomatically
        configuration = Self.loadConfiguration()
        previousConfiguration = configuration
        resetIdleDuration()
    }

    func startDemoSession() {
        guard phase == .idle else { return }
        startWork()
    }

    func startWork() {
        startPhase(.work, seconds: configuration.workMinutes * 60)
        islandStatus = .closed
        notifyOverlayStateChanged()
    }

    func startBreak(long: Bool) {
        let nextPhase: PomodoroPhase = long ? .longBreak : .shortBreak
        let minutes = long ? configuration.longBreakMinutes : configuration.shortBreakMinutes
        startPhase(nextPhase, seconds: minutes * 60)
        islandStatus = .opened
        notifyOverlayStateChanged()
    }

    func togglePause() {
        guard phase != .idle else { return }
        isPaused.toggle()
        if isPaused {
            stopTimer()
        } else {
            startTimer()
        }
    }

    func skipPhase() {
        guard phase != .idle else {
            startWork()
            return
        }

        completeCurrentPhase()
    }

    func stop() {
        stopTimer()
        phase = .idle
        isPaused = false
        islandStatus = .opened
        resetIdleDuration()
        notifyOverlayStateChanged()
    }

    func openForHover() {
        guard phase == .work, islandStatus == .closed else { return }
        islandStatus = .opened
        notifyOverlayStateChanged()
    }

    func closeAfterHoverIfAllowed() {
        guard phase == .work, islandStatus == .opened else { return }
        islandStatus = .closed
        notifyOverlayStateChanged()
    }

    func updateMetrics(_ metrics: IslandMetrics) {
        guard islandMetrics != metrics else { return }
        islandMetrics = metrics
    }

    func updateConfiguration(_ configuration: PomodoroConfiguration) {
        self.configuration = Self.normalized(configuration)
    }

    private func startPhase(_ newPhase: PomodoroPhase, seconds: Int) {
        stopTimer()
        phase = newPhase
        isPaused = false
        remainingSeconds = max(1, seconds)
        phaseTotalSeconds = remainingSeconds
        startTimer()
    }

    private func startTimer() {
        guard startsTimerAutomatically else { return }
        stopTimer()
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.tick()
            }
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    private func tick() {
        guard phase != .idle, !isPaused else { return }
        if remainingSeconds > 1 {
            remainingSeconds -= 1
            return
        }
        remainingSeconds = 0
        completeCurrentPhase()
    }

    private func completeCurrentPhase() {
        switch phase {
        case .work:
            completedWorkSessions += 1
            let shouldTakeLongBreak = completedWorkSessions.isMultiple(of: configuration.longBreakInterval)
            startBreak(long: shouldTakeLongBreak)
        case .shortBreak, .longBreak:
            if configuration.autoStartNextPhase {
                startWork()
            } else {
                stop()
            }
        case .idle:
            startWork()
        }
    }

    private func resetIdleDuration() {
        remainingSeconds = configuration.workMinutes * 60
        phaseTotalSeconds = remainingSeconds
    }

    private func notifyOverlayStateChanged() {
        onOverlayStateChanged?()
    }

    private func persistConfiguration() {
        guard configuration != previousConfiguration else { return }
        previousConfiguration = configuration
        let defaults = UserDefaults.standard
        defaults.set(configuration.workMinutes, forKey: "pomodoro.workMinutes")
        defaults.set(configuration.shortBreakMinutes, forKey: "pomodoro.shortBreakMinutes")
        defaults.set(configuration.longBreakMinutes, forKey: "pomodoro.longBreakMinutes")
        defaults.set(configuration.longBreakInterval, forKey: "pomodoro.longBreakInterval")
        defaults.set(configuration.autoStartNextPhase, forKey: "pomodoro.autoStartNextPhase")
    }

    private static func loadConfiguration() -> PomodoroConfiguration {
        let defaults = UserDefaults.standard
        let configuration = PomodoroConfiguration(
            workMinutes: defaults.integer(forKey: "pomodoro.workMinutes"),
            shortBreakMinutes: defaults.integer(forKey: "pomodoro.shortBreakMinutes"),
            longBreakMinutes: defaults.integer(forKey: "pomodoro.longBreakMinutes"),
            longBreakInterval: defaults.integer(forKey: "pomodoro.longBreakInterval"),
            autoStartNextPhase: defaults.object(forKey: "pomodoro.autoStartNextPhase") as? Bool ?? true
        )
        return normalized(configuration)
    }

    private static func normalized(_ configuration: PomodoroConfiguration) -> PomodoroConfiguration {
        PomodoroConfiguration(
            workMinutes: clamp(configuration.workMinutes, min: 1, max: 180, fallback: 25),
            shortBreakMinutes: clamp(configuration.shortBreakMinutes, min: 1, max: 60, fallback: 5),
            longBreakMinutes: clamp(configuration.longBreakMinutes, min: 1, max: 120, fallback: 15),
            longBreakInterval: clamp(configuration.longBreakInterval, min: 1, max: 12, fallback: 4),
            autoStartNextPhase: configuration.autoStartNextPhase
        )
    }

    private static func clamp(_ value: Int, min: Int, max: Int, fallback: Int) -> Int {
        guard value > 0 else { return fallback }
        if value < min { return min }
        if value > max { return max }
        return value
    }
}
