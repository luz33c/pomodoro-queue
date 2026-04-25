import AppKit
import XCTest
@testable import PomodoroIsland

final class PomodoroStoreTests: XCTestCase {
    func testTimeFormattingPadsMinutesAndSeconds() {
        XCTAssertEqual(TimeFormatting.minutesAndSeconds(65), "01:05")
        XCTAssertEqual(TimeFormatting.minutesAndSeconds(0), "00:00")
    }

    func testWorkStartsCollapsedAndBreakStartsOpened() async {
        await MainActor.run {
            let store = PomodoroStore(startsTimerAutomatically: false)
            store.startWork()
            XCTAssertEqual(store.phase, .work)
            XCTAssertEqual(store.islandStatus, .closed)

            store.startBreak(long: false)
            XCTAssertEqual(store.phase, .shortBreak)
            XCTAssertEqual(store.islandStatus, .opened)
        }
    }

    func testNotchWidthFallsBackWhenSafeAreaLanesAreUnavailable() {
        let width = NSScreen.visualIslandNotchWidth(
            frameWidth: 1_512,
            leftSafeAreaWidth: 0,
            rightSafeAreaWidth: 0,
            hasHardwareNotch: true
        )

        XCTAssertEqual(width, NSScreen.fallbackNotchWidth)
    }

    func testNotchWidthMatchesOpenIslandAuxiliaryAreaFormula() {
        let width = NSScreen.visualIslandNotchWidth(
            frameWidth: 1_352,
            leftSafeAreaWidth: 593,
            rightSafeAreaWidth: 593,
            hasHardwareNotch: true
        )

        XCTAssertEqual(width, 170)
    }

    func testClosedIslandGapUsesOpenIslandClosedNotchTrim() {
        let metrics = IslandMetrics(
            openWidth: 760,
            maxHeight: 420,
            notchWidth: 170,
            notchHeight: 38,
            hasHardwareNotch: true
        )

        XCTAssertEqual(metrics.closedNotchGapWidth, 164)
        XCTAssertEqual(metrics.openedNotchGapWidth, 190)
        XCTAssertEqual(metrics.closedWidth, 368)
    }

    func testClosedSurfaceRectCentersOnNotch() {
        let notchRect = NSRect(x: 400, y: 1_000, width: 170, height: 29)
        let rect = IslandPanelController.closedSurfaceRect(
            notchRect: notchRect,
            closedWidth: 356
        )

        XCTAssertEqual(rect.midX, notchRect.midX)
        XCTAssertEqual(rect.minY, notchRect.minY)
        XCTAssertEqual(rect.width, 356)
        XCTAssertEqual(rect.height, 29)
    }
}
