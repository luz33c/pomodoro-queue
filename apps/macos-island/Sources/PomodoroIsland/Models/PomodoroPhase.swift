import Foundation
import SwiftUI

enum PomodoroPhase: String, CaseIterable, Identifiable {
    case idle
    case work
    case shortBreak
    case longBreak

    var id: String { rawValue }

    var isBreak: Bool {
        self == .shortBreak || self == .longBreak
    }

    var displayName: String {
        switch self {
        case .idle:
            "待开始"
        case .work:
            "工作中"
        case .shortBreak:
            "休息中"
        case .longBreak:
            "长休息"
        }
    }

    var accentColor: Color {
        switch self {
        case .work:
            Color(red: 1.0, green: 0.43, blue: 0.28)
        case .shortBreak, .longBreak:
            Color(red: 0.36, green: 0.82, blue: 0.92)
        case .idle:
            Color(red: 0.55, green: 0.58, blue: 0.64)
        }
    }
}

enum IslandStatus: String {
    case closed
    case opened
}

struct PomodoroConfiguration: Equatable {
    var workMinutes: Int
    var shortBreakMinutes: Int
    var longBreakMinutes: Int
    var longBreakInterval: Int
    var autoStartNextPhase: Bool

    static let defaults = PomodoroConfiguration(
        workMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        autoStartNextPhase: true
    )
}

struct IslandMetrics: Equatable {
    static let closedHorizontalPadding: CGFloat = 20
    static let closedLeftLaneWidth: CGFloat = 78
    static let closedRightLaneWidth: CGFloat = 86
    static let closedNotchVisualTrim: CGFloat = 6
    static let openedNotchLaneSafetyInset: CGFloat = 12

    var openWidth: CGFloat
    var maxHeight: CGFloat
    var notchWidth: CGFloat
    var notchHeight: CGFloat
    var hasHardwareNotch: Bool

    static let defaults = IslandMetrics(
        openWidth: 680,
        maxHeight: 420,
        notchWidth: 190,
        notchHeight: 38,
        hasHardwareNotch: false
    )

    var sideSafeWidth: CGFloat {
        max(112, (openWidth - notchWidth) / 2)
    }

    var closedNotchGapWidth: CGFloat {
        max(120, notchWidth - Self.closedNotchVisualTrim)
    }

    var openedNotchGapWidth: CGFloat {
        guard hasHardwareNotch else { return notchWidth }
        return max(closedNotchGapWidth, notchWidth + (Self.openedNotchLaneSafetyInset * 2) - 4)
    }

    var closedContentWidth: CGFloat {
        Self.closedLeftLaneWidth + closedNotchGapWidth + Self.closedRightLaneWidth
    }

    var closedWidth: CGFloat {
        closedContentWidth + Self.closedHorizontalPadding * 2
    }
}
