import SwiftUI

enum SettingsTab: String, CaseIterable, Identifiable {
    case general
    case display
    case sound
    case appearance
    case pomodoro
    case about

    var id: String { rawValue }

    var title: String {
        switch self {
        case .general:
            "通用"
        case .display:
            "显示"
        case .sound:
            "声音"
        case .appearance:
            "个性化"
        case .pomodoro:
            "番茄钟"
        case .about:
            "关于"
        }
    }

    var icon: String {
        switch self {
        case .general:
            "gearshape.fill"
        case .display:
            "textformat.size"
        case .sound:
            "speaker.wave.2.fill"
        case .appearance:
            "paintbrush.fill"
        case .pomodoro:
            "timer"
        case .about:
            "info.circle.fill"
        }
    }

    var color: Color {
        switch self {
        case .general:
            .gray
        case .display, .about:
            .blue
        case .sound:
            .green
        case .appearance:
            .purple
        case .pomodoro:
            Color(red: 1.0, green: 0.43, blue: 0.28)
        }
    }
}

struct SettingsView: View {
    @ObservedObject var store: PomodoroStore
    @State private var selection: SettingsTab = .pomodoro

    var body: some View {
        NavigationSplitView {
            List(selection: $selection) {
                Section("系统") {
                    ForEach([SettingsTab.general, .display, .sound, .appearance]) { tab in
                        tabRow(tab)
                    }
                }

                Section("Open Island") {
                    tabRow(.pomodoro)
                    tabRow(.about)
                }
            }
            .listStyle(.sidebar)
            .navigationSplitViewColumnWidth(min: 184, ideal: 210, max: 240)
        } detail: {
            detail
        }
        .frame(minWidth: 760, idealWidth: 860, minHeight: 520, idealHeight: 580)
        .preferredColorScheme(.dark)
    }

    private func tabRow(_ tab: SettingsTab) -> some View {
        Label {
            Text(tab.title)
        } icon: {
            Image(systemName: tab.icon)
                .foregroundStyle(tab.color)
        }
        .tag(tab)
    }

    @ViewBuilder
    private var detail: some View {
        switch selection {
        case .pomodoro:
            PomodoroSettingsPane(store: store)
        case .about:
            AboutPane()
        default:
            PlaceholderSettingsPane(title: selection.title)
        }
    }
}

private struct PomodoroSettingsPane: View {
    @ObservedObject var store: PomodoroStore

    var body: some View {
        Form {
            Section("计时") {
                Stepper(value: configurationBinding(\.workMinutes), in: 1...180) {
                    LabeledContent("工作时长", value: "\(store.configuration.workMinutes) 分钟")
                }

                Stepper(value: configurationBinding(\.shortBreakMinutes), in: 1...60) {
                    LabeledContent("休息时长", value: "\(store.configuration.shortBreakMinutes) 分钟")
                }

                Stepper(value: configurationBinding(\.longBreakMinutes), in: 1...120) {
                    LabeledContent("每 \(store.configuration.longBreakInterval) 轮长休息", value: "\(store.configuration.longBreakMinutes) 分钟")
                }

                Stepper(value: configurationBinding(\.longBreakInterval), in: 1...12) {
                    LabeledContent("长休息间隔", value: "\(store.configuration.longBreakInterval) 轮")
                }
            }

            Section("Island 行为") {
                LabeledContent("工作时显示方式", value: "岛模式，悬停展开")
                LabeledContent("休息时显示方式", value: "默认展开")
                Toggle("自动开始下一阶段", isOn: configurationBinding(\.autoStartNextPhase))
            }

            Section("当前任务") {
                TextField("任务名称", text: $store.currentTaskTitle)
                HStack {
                    Button("开始工作") {
                        store.startWork()
                    }
                    Button(store.isPaused ? "继续" : "暂停") {
                        store.togglePause()
                    }
                    .disabled(store.phase == .idle)
                    Button("跳过当前阶段") {
                        store.skipPhase()
                    }
                    .disabled(store.phase == .idle)
                    Button("停止") {
                        store.stop()
                    }
                    .disabled(store.phase == .idle)
                }
            }

            Section("预览") {
                IslandPreviewStrip(store: store)
                    .padding(.vertical, 8)
            }
        }
        .formStyle(.grouped)
        .navigationTitle("番茄钟")
    }

    private func configurationBinding<Value>(_ keyPath: WritableKeyPath<PomodoroConfiguration, Value>) -> Binding<Value> {
        Binding {
            store.configuration[keyPath: keyPath]
        } set: { value in
            var configuration = store.configuration
            configuration[keyPath: keyPath] = value
            store.updateConfiguration(configuration)
        }
    }
}

private struct IslandPreviewStrip: View {
    @ObservedObject var store: PomodoroStore
    private let metrics = IslandMetrics.defaults

    var body: some View {
        HStack(spacing: 0) {
            HStack(spacing: 7) {
                TomatoGlyph(size: 16)
                Text("工作中")
                    .font(.system(size: 12, weight: .semibold))
            }
            .frame(width: IslandMetrics.closedLeftLaneWidth, alignment: .leading)

            Color.clear
                .frame(width: metrics.closedNotchGapWidth, height: 24)

            HStack(spacing: 8) {
                Text(store.remainingText)
                    .monospacedDigit()
                ProgressRing(progress: store.progress, color: store.phase.accentColor, lineWidth: 2.2)
                    .frame(width: 16, height: 16)
            }
            .font(.system(size: 12, weight: .semibold))
            .frame(width: IslandMetrics.closedRightLaneWidth, alignment: .trailing)
        }
        .padding(.horizontal, IslandMetrics.closedHorizontalPadding)
        .frame(width: metrics.closedWidth, height: 30)
        .background(.black, in: Capsule())
        .foregroundStyle(.white.opacity(0.9))
    }
}

private struct PlaceholderSettingsPane: View {
    let title: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.largeTitle.bold())
            Text("这个页面保留 macOS 设置结构，番茄钟相关选项集中在「番茄钟」页。")
                .foregroundStyle(.secondary)
            Spacer()
        }
        .padding(28)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .navigationTitle(title)
    }
}

private struct AboutPane: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "timer")
                .font(.system(size: 56, weight: .bold))
                .foregroundStyle(Color(red: 1.0, green: 0.43, blue: 0.28))
            Text("Pomodoro Island")
                .font(.title.bold())
            Text("基于 Open Island 的刘海屏岛交互实现，业务层为本地番茄钟。")
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .navigationTitle("关于")
    }
}
