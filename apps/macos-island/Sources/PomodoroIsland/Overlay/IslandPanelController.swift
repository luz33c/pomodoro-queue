import AppKit
import SwiftUI

@MainActor
final class IslandPanelController {
    private static let horizontalShadowInset: CGFloat = 18
    private static let bottomShadowInset: CGFloat = 22

    private var panel: NotchPanel?
    private var monitors = IslandEventMonitors()

    weak var store: PomodoroStore?
    private(set) var notchRect = NSRect.zero

    func ensurePanel(store: PomodoroStore) {
        self.store = store
        let panel = self.panel ?? makePanel(store: store)
        self.panel = panel
        positionPanel(panel)
        updatePanelInteractivity()
        panel.orderFrontRegardless()
        startMonitoring()
    }

    func refresh() {
        guard let panel else { return }
        positionPanel(panel)
        updatePanelInteractivity()
        panel.orderFrontRegardless()
    }

    private func makePanel(store: PomodoroStore) -> NotchPanel {
        let screen = ScreenResolver.targetScreen() ?? NSScreen.main
        let frame = screen.map(panelFrame(on:)) ?? .zero

        let panel = NotchPanel(
            contentRect: frame,
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        panel.isFloatingPanel = true
        panel.level = .statusBar
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .ignoresCycle]
        panel.backgroundColor = .clear
        panel.isOpaque = false
        panel.hasShadow = false
        panel.hidesOnDeactivate = false
        panel.isMovable = false
        panel.titleVisibility = .hidden
        panel.titlebarAppearsTransparent = true
        panel.acceptsMouseMovedEvents = true
        panel.sharingType = .readOnly

        let hostingView = IslandHostingView(rootView: IslandPanelView(store: store))
        hostingView.controller = self
        panel.contentView = hostingView

        computeNotchRect(screen: screen)
        return panel
    }

    private func positionPanel(_ panel: NSPanel) {
        guard let screen = ScreenResolver.targetScreen() else { return }
        let frame = panelFrame(on: screen)
        if panel.frame != frame {
            panel.setFrame(frame, display: true)
        }
        computeNotchRect(screen: screen)
        updateStoreMetrics(screen: screen, panelFrame: frame)
    }

    private func panelFrame(on screen: NSScreen) -> NSRect {
        let size = panelSize(on: screen)
        let y: CGFloat = screen.hasHardwareNotch
            ? screen.frame.maxY - size.height
            : screen.visibleFrame.maxY - size.height - 8

        return NSRect(
            x: screen.frame.midX - size.width / 2,
            y: y,
            width: size.width,
            height: size.height
        )
    }

    private func panelSize(on screen: NSScreen) -> CGSize {
        let openWidth = min(max(screen.visibleFrame.width * 0.48, 680), min(820, screen.visibleFrame.width - 32))
        let contentHeight: CGFloat = 430
        return CGSize(
            width: openWidth + Self.horizontalShadowInset * 2,
            height: contentHeight + Self.bottomShadowInset
        )
    }

    private func updateStoreMetrics(screen: NSScreen, panelFrame: NSRect) {
        let openWidth = max(0, panelFrame.width - Self.horizontalShadowInset * 2)
        let metrics = IslandMetrics(
            openWidth: openWidth,
            maxHeight: max(0, panelFrame.height - Self.bottomShadowInset),
            notchWidth: screen.islandNotchSize.width,
            notchHeight: screen.islandClosedHeight,
            hasHardwareNotch: screen.hasHardwareNotch
        )
        store?.updateMetrics(metrics)
    }

    private func computeNotchRect(screen: NSScreen?) {
        guard let screen else {
            notchRect = .zero
            return
        }

        let size = screen.islandNotchSize
        notchRect = NSRect(
            x: screen.frame.midX - size.width / 2,
            y: screen.frame.maxY - screen.islandClosedHeight,
            width: size.width,
            height: screen.islandClosedHeight
        )
    }

    private func updatePanelInteractivity() {
        guard let panel, let store else { return }
        let interactive = store.islandStatus == .opened || store.phase.isBreak || store.phase == .idle
        panel.ignoresMouseEvents = !interactive
        panel.acceptsMouseMovedEvents = interactive
    }

    private func startMonitoring() {
        guard !monitors.isActive else { return }
        monitors.start { [weak self] location in
            self?.handleMouseMoved(location)
        } mouseDownHandler: { [weak self] location in
            self?.handleMouseDown(location)
        }
    }

    private func handleMouseMoved(_ location: NSPoint) {
        guard let store else { return }

        if store.phase == .work, store.islandStatus == .closed {
            if isPointInClosedIsland(location) {
                store.openForHover()
            }
            return
        }

        guard store.phase == .work, store.islandStatus == .opened else { return }
        if !isPointInExpandedIsland(location) {
            store.closeAfterHoverIfAllowed()
        }
    }

    private func handleMouseDown(_ location: NSPoint) {
        guard let store else { return }

        if store.phase == .work, store.islandStatus == .closed, isPointInClosedIsland(location) {
            store.openForHover()
            return
        }

        if store.phase == .work, store.islandStatus == .opened, !isPointInExpandedIsland(location) {
            store.closeAfterHoverIfAllowed()
        }
    }

    private func isPointInClosedIsland(_ point: NSPoint) -> Bool {
        guard let store else { return false }
        let rect = Self.closedSurfaceRect(
            notchRect: notchRect,
            closedWidth: store.islandMetrics.closedWidth
        )
        return Self.contains(rect, point: point)
    }

    private func isPointInExpandedIsland(_ point: NSPoint) -> Bool {
        guard let panel, let store else { return false }
        let visibleSize = visibleSurfaceSize(for: store)
        let rect = NSRect(
            x: panel.frame.midX - visibleSize.width / 2,
            y: panel.frame.maxY - visibleSize.height,
            width: visibleSize.width,
            height: visibleSize.height
        )
        return Self.contains(rect, point: point)
    }

    private func visibleSurfaceSize(for store: PomodoroStore) -> CGSize {
        let horizontalInset: CGFloat = 14
        let bottomInset: CGFloat = 14
        let height: CGFloat = store.phase.isBreak ? 388 : 254
        return CGSize(
            width: store.islandMetrics.openWidth + horizontalInset * 2,
            height: height + bottomInset
        )
    }

    func contentRect(in bounds: NSRect) -> NSRect {
        NSRect(
            x: bounds.minX + Self.horizontalShadowInset,
            y: bounds.minY + Self.bottomShadowInset,
            width: max(0, bounds.width - Self.horizontalShadowInset * 2),
            height: max(0, bounds.height - Self.bottomShadowInset)
        )
    }

    private static func contains(_ rect: NSRect, point: NSPoint) -> Bool {
        point.x >= rect.minX
            && point.x <= rect.maxX
            && point.y >= rect.minY
            && point.y <= rect.maxY
    }

    nonisolated static func closedSurfaceRect(
        notchRect: NSRect,
        closedWidth: CGFloat
    ) -> NSRect {
        NSRect(
            x: notchRect.midX - closedWidth / 2,
            y: notchRect.minY,
            width: closedWidth,
            height: notchRect.height
        )
    }
}

private final class NotchPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }
}

final class IslandHostingView<Content: View>: NSHostingView<Content> {
    weak var controller: IslandPanelController?

    override var isOpaque: Bool { false }

    required init(rootView: Content) {
        super.init(rootView: rootView)
        configure()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func acceptsFirstMouse(for event: NSEvent?) -> Bool {
        true
    }

    override func mouseDown(with event: NSEvent) {
        window?.makeKey()
        super.mouseDown(with: event)
    }

    override func hitTest(_ point: NSPoint) -> NSView? {
        guard let controller else { return nil }
        let contentRect = controller.contentRect(in: bounds)
        guard contentRect.contains(point) else { return nil }
        return super.hitTest(point) ?? self
    }

    override func viewDidMoveToWindow() {
        super.viewDidMoveToWindow()
        configure()
    }

    private func configure() {
        wantsLayer = true
        layer?.backgroundColor = NSColor.clear.cgColor
    }
}

@MainActor
final class IslandEventMonitors {
    private var globalMoveMonitor: Any?
    private var localMoveMonitor: Any?
    private var globalClickMonitor: Any?
    private var localClickMonitor: Any?

    var isActive: Bool { globalMoveMonitor != nil }

    func start(
        mouseMoveHandler: @MainActor @escaping @Sendable (NSPoint) -> Void,
        mouseDownHandler: @MainActor @escaping @Sendable (NSPoint) -> Void
    ) {
        let throttleInterval: TimeInterval = 0.05
        nonisolated(unsafe) var lastMoveTime: TimeInterval = 0

        globalMoveMonitor = NSEvent.addGlobalMonitorForEvents(matching: .mouseMoved) { _ in
            let now = ProcessInfo.processInfo.systemUptime
            guard now - lastMoveTime >= throttleInterval else { return }
            lastMoveTime = now
            let location = NSEvent.mouseLocation
            Task { @MainActor in mouseMoveHandler(location) }
        }

        localMoveMonitor = NSEvent.addLocalMonitorForEvents(matching: .mouseMoved) { event in
            let now = ProcessInfo.processInfo.systemUptime
            guard now - lastMoveTime >= throttleInterval else { return event }
            lastMoveTime = now
            let location = NSEvent.mouseLocation
            Task { @MainActor in mouseMoveHandler(location) }
            return event
        }

        globalClickMonitor = NSEvent.addGlobalMonitorForEvents(matching: .leftMouseDown) { _ in
            let location = NSEvent.mouseLocation
            Task { @MainActor in mouseDownHandler(location) }
        }

        localClickMonitor = NSEvent.addLocalMonitorForEvents(matching: .leftMouseDown) { event in
            let location = NSEvent.mouseLocation
            Task { @MainActor in mouseDownHandler(location) }
            return event
        }
    }

    func stop() {
        if let globalMoveMonitor { NSEvent.removeMonitor(globalMoveMonitor) }
        if let localMoveMonitor { NSEvent.removeMonitor(localMoveMonitor) }
        if let globalClickMonitor { NSEvent.removeMonitor(globalClickMonitor) }
        if let localClickMonitor { NSEvent.removeMonitor(localClickMonitor) }
        globalMoveMonitor = nil
        localMoveMonitor = nil
        globalClickMonitor = nil
        localClickMonitor = nil
    }
}
