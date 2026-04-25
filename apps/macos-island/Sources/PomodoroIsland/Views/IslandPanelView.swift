import SwiftUI

struct IslandPanelView: View {
    private static let openAnimation = Animation.spring(response: 0.42, dampingFraction: 0.8, blendDuration: 0)
    private static let closeAnimation = Animation.smooth(duration: 0.3)
    private static let shadowHorizontalInset: CGFloat = 18
    private static let shadowBottomInset: CGFloat = 22
    private static let openedHeaderHorizontalPadding: CGFloat = 40
    private static let openedContentHorizontalPadding: CGFloat = 40

    @ObservedObject var store: PomodoroStore

    private var metrics: IslandMetrics { store.islandMetrics }
    private var isOpened: Bool { store.islandStatus == .opened || store.phase.isBreak || store.phase == .idle }
    private var openedHeight: CGFloat { store.phase.isBreak ? 388 : 254 }
    private var currentWidth: CGFloat { isOpened ? metrics.openWidth : metrics.closedWidth }
    private var currentHeight: CGFloat { isOpened ? openedHeight : metrics.notchHeight }
    private var headerHeight: CGFloat { metrics.notchHeight }
    private var currentShape: NotchShape { isOpened ? .opened : .closed }
    private var openedHeaderGapWidth: CGFloat { metrics.openedNotchGapWidth }
    private var openedSideLaneWidth: CGFloat {
        let contentWidth = max(0, metrics.openWidth - Self.openedHeaderHorizontalPadding * 2)
        return max(118, (contentWidth - openedHeaderGapWidth) / 2)
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .top) {
                Color.clear

                islandSurface
                    .padding(.horizontal, Self.shadowHorizontalInset)
                    .padding(.bottom, Self.shadowBottomInset)
            }
            .frame(width: geometry.size.width, height: geometry.size.height, alignment: .top)
        }
        .ignoresSafeArea()
        .preferredColorScheme(.dark)
        .animation(isOpened ? Self.openAnimation : Self.closeAnimation, value: store.islandStatus)
        .animation(Self.openAnimation, value: store.phase)
    }

    private var islandSurface: some View {
        let shape = currentShape
        let horizontalInset = isOpened ? 14.0 : 0.0
        let bottomInset = isOpened ? 14.0 : 0.0
        let surfaceWidth = currentWidth + horizontalInset * 2
        let surfaceHeight = currentHeight + bottomInset

        return ZStack(alignment: .top) {
            shape
                .fill(.black)
                .frame(width: surfaceWidth, height: surfaceHeight)

            VStack(spacing: 0) {
                headerRow
                    .frame(width: currentWidth, height: headerHeight)

                openedBody
                    .padding(.horizontal, Self.openedContentHorizontalPadding)
                    .padding(.top, isOpened ? 14 : 0)
                    .frame(width: currentWidth)
                    .frame(maxHeight: isOpened ? max(0, currentHeight - headerHeight - 8) : 0, alignment: .top)
                    .opacity(isOpened ? 1 : 0)
                    .clipped()
            }
            .frame(width: currentWidth, height: currentHeight, alignment: .top)
            .padding(.horizontal, horizontalInset)
            .padding(.bottom, bottomInset)
            .clipShape(shape)
            .overlay(alignment: .top) {
                Rectangle()
                    .fill(.black)
                    .frame(height: 1)
                    .padding(.horizontal, isOpened ? 22 : 6)
            }
        }
        .frame(width: surfaceWidth, height: surfaceHeight, alignment: .top)
        .overlay {
            shape.stroke(.white.opacity(isOpened ? 0.08 : 0.05), lineWidth: 1)
        }
        .shadow(color: .black.opacity(isOpened ? 0.52 : 0.42), radius: isOpened ? 26 : 18, y: isOpened ? 18 : 8)
        .accessibilityLabel("\(store.phase.displayName)，剩余 \(store.remainingText)")
    }

    private var headerRow: some View {
        ZStack(alignment: .top) {
            closedHeader
                .frame(width: metrics.closedWidth, height: metrics.notchHeight)
                .opacity(isOpened ? 0 : 1)
                .scaleEffect(isOpened ? 0.97 : 1, anchor: .top)

            openedHeader
                .frame(width: metrics.openWidth, height: headerHeight)
                .opacity(isOpened ? 1 : 0)
                .offset(y: isOpened ? 0 : -2)
        }
        .clipped()
    }

    private var closedHeader: some View {
        HStack(spacing: 0) {
            closedLeftLane
                .frame(width: IslandMetrics.closedLeftLaneWidth, alignment: .leading)

            Color.clear
                .frame(width: metrics.closedNotchGapWidth)
                .accessibilityHidden(true)

            closedRightLane
                .frame(width: IslandMetrics.closedRightLaneWidth, alignment: .trailing)
        }
        .padding(.horizontal, IslandMetrics.closedHorizontalPadding)
        .frame(width: metrics.closedWidth, height: metrics.notchHeight)
    }

    private var closedLeftLane: some View {
        HStack(spacing: 8) {
            TomatoGlyph(size: 18)
            Text("工作中")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.white.opacity(0.92))
                .lineLimit(1)
        }
    }

    private var closedRightLane: some View {
        HStack(spacing: 8) {
            Text(store.remainingText)
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.95))
                .monospacedDigit()
            ProgressRing(progress: store.progress, color: store.phase.accentColor, lineWidth: 2.5)
                .frame(width: 17, height: 17)
        }
    }

    private var openedHeader: some View {
        HStack(spacing: 0) {
            openedHeaderStatus
                .frame(width: openedSideLaneWidth, alignment: .leading)

            Color.clear
                .frame(width: openedHeaderGapWidth)
                .accessibilityHidden(true)

            HStack(spacing: 8) {
                roundHeaderButton(
                    systemName: store.isPaused ? "play.fill" : "pause.fill",
                    accessibilityLabel: store.isPaused ? "继续" : "暂停",
                    action: store.togglePause
                )
                roundHeaderButton(systemName: "gearshape.fill", accessibilityLabel: "设置") {
                    store.showSettings?()
                }
                roundHeaderButton(systemName: "xmark", accessibilityLabel: "退出 Pomodoro Island") {
                    store.quit?()
                }
            }
            .frame(width: openedSideLaneWidth, alignment: .trailing)
        }
        .padding(.horizontal, Self.openedHeaderHorizontalPadding)
    }

    private var openedHeaderStatus: some View {
        HStack(spacing: 10) {
            statusDot
            HStack(spacing: 8) {
                Text(store.phase.displayName)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.95))
                Text(store.remainingText)
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .foregroundStyle(store.phase.accentColor)
                    .monospacedDigit()
                if store.phase == .work {
                    Text("\(store.configuration.workMinutes)m · \(Int(store.progress * 100))%")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.45))
                }
            }
            .lineLimit(1)
        }
    }

    @ViewBuilder
    private var statusDot: some View {
        if store.phase.isBreak {
            Circle()
                .fill(store.phase.accentColor)
                .frame(width: 18, height: 18)
                .overlay {
                    Image(systemName: "moon.zzz.fill")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.black.opacity(0.55))
                }
        } else if store.phase == .work {
            Circle()
                .fill(Color(red: 0.36, green: 0.6, blue: 1.0))
                .frame(width: 8, height: 8)
        } else {
            Circle()
                .fill(.white.opacity(0.42))
                .frame(width: 8, height: 8)
        }
    }

    @ViewBuilder
    private var openedBody: some View {
        if store.phase.isBreak {
            breakContent
        } else {
            workContent
        }
    }

    private var workContent: some View {
        detailCard(accent: store.phase.accentColor) {
            HStack(alignment: .top, spacing: 14) {
                Circle()
                    .fill(Color(red: 0.36, green: 0.6, blue: 1.0))
                    .frame(width: 8, height: 8)
                    .padding(.top, 8)

                VStack(alignment: .leading, spacing: 9) {
                    HStack(alignment: .firstTextBaseline) {
                        Text("番茄钟 · \(store.currentTaskTitle)")
                            .font(.system(size: 17, weight: .bold))
                            .foregroundStyle(.white.opacity(0.95))
                            .lineLimit(1)
                        Spacer()
                        pill("工作")
                        pill("\(store.configuration.workMinutes)m")
                        pill("\(Int(store.progress * 100))%")
                    }

                    Text("本轮剩余 \(store.remainingText)，\(store.nextPhaseSummary)")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(.white.opacity(0.54))
                        .lineLimit(1)

                    progressBar(color: store.phase.accentColor)

                    HStack(spacing: 22) {
                        Button(store.isPaused ? "继续" : "暂停") {
                            store.togglePause()
                        }
                        Button("跳过") {
                            store.skipPhase()
                        }
                    }
                    .buttonStyle(.plain)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color(red: 0.36, green: 0.6, blue: 1.0))
                }
            }
        }
        .frame(height: 142)
    }

    private var breakContent: some View {
        VStack(spacing: 18) {
            detailCard(accent: store.phase.accentColor) {
                HStack(alignment: .top, spacing: 14) {
                    Circle()
                        .fill(store.phase.accentColor)
                        .frame(width: 9, height: 9)
                        .padding(.top, 8)

                    VStack(alignment: .leading, spacing: 10) {
                        HStack(alignment: .firstTextBaseline) {
                            Text("休息建议 · 起身喝水")
                                .font(.system(size: 19, weight: .bold))
                                .foregroundStyle(.white.opacity(0.96))
                                .lineLimit(1)
                            Spacer()
                            pill("休息")
                            pill(store.phase == .longBreak ? "\(store.configuration.longBreakMinutes)m" : "\(store.configuration.shortBreakMinutes)m")
                        }

                        Text("第 \(store.completedWorkSessions) / \(store.configuration.longBreakInterval) 个番茄钟完成，离下一轮工作 \(store.remainingText)")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(.white.opacity(0.54))
                            .lineLimit(1)

                        progressBar(color: store.phase.accentColor)

                        HStack(spacing: 22) {
                            Button("开始工作") {
                                store.startWork()
                            }
                            Button("跳过休息") {
                                store.skipPhase()
                            }
                        }
                        .buttonStyle(.plain)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(store.phase.accentColor)
                    }
                }
            }
            .frame(height: 148)

            HStack(spacing: 12) {
                Circle()
                    .fill(store.phase.accentColor)
                    .frame(width: 18, height: 18)
                Text("自动保持展开，提醒你真的休息")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.86))
            }
            .padding(.horizontal, 22)
            .frame(height: 58)
            .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
    }

    private func detailCard<Content: View>(
        accent: Color,
        @ViewBuilder content: () -> Content
    ) -> some View {
        content()
            .padding(.horizontal, 22)
            .padding(.vertical, 18)
            .background {
                RoundedRectangle(cornerRadius: 26, style: .continuous)
                    .fill(Color(red: 0.04, green: 0.04, blue: 0.045))
                    .overlay {
                        RoundedRectangle(cornerRadius: 26, style: .continuous)
                            .stroke(.white.opacity(0.18), lineWidth: 1)
                    }
                    .overlay(alignment: .leading) {
                        Capsule()
                            .fill(accent.opacity(0.9))
                            .frame(width: 3)
                            .padding(.vertical, 18)
                    }
            }
    }

    private func progressBar(color: Color) -> some View {
        ZStack(alignment: .leading) {
            Capsule()
                .fill(.white.opacity(0.1))
            GeometryReader { geometry in
                Capsule()
                    .fill(color)
                    .frame(width: max(8, geometry.size.width * store.progress))
            }
        }
        .frame(height: 8)
        .clipShape(Capsule())
    }

    private func pill(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(.white.opacity(0.62))
            .padding(.horizontal, 10)
            .frame(height: 22)
            .background(.white.opacity(0.12), in: Capsule())
    }

    private func roundHeaderButton(
        systemName: String,
        accessibilityLabel: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(.white.opacity(0.72))
                .frame(width: 28, height: 28)
                .background(.white.opacity(0.1), in: Circle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(accessibilityLabel)
    }
}

struct TomatoGlyph: View {
    let size: CGFloat

    var body: some View {
        let fruitSize = size * 0.8

        ZStack(alignment: .top) {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 1.0, green: 0.42, blue: 0.28),
                            Color(red: 1.0, green: 0.72, blue: 0.28)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: fruitSize, height: fruitSize)
                .offset(y: size * 0.18)

            Image(systemName: "leaf.fill")
                .font(.system(size: size * 0.46, weight: .bold))
                .foregroundStyle(Color(red: 0.22, green: 0.9, blue: 0.38))
                .rotationEffect(.degrees(-20))
                .offset(y: -size * 0.02)
        }
        .frame(width: size, height: size)
    }
}
