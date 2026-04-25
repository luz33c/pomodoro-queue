import AppKit
import SwiftUI

@main
struct PomodoroIslandApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        Settings {
            EmptyView()
        }
    }
}

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    let store = PomodoroStore()

    private let panelController = IslandPanelController()
    private var settingsWindowController: SettingsWindowController?
    private var statusItem: NSStatusItem?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)

        settingsWindowController = SettingsWindowController(store: store)
        store.showSettings = { [weak self] in
            self?.settingsWindowController?.show()
        }
        store.quit = {
            NSApp.terminate(nil)
        }
        store.onOverlayStateChanged = { [weak self] in
            self?.panelController.refresh()
        }

        configureStatusItem()
        panelController.ensurePanel(store: store)
        store.startDemoSession()
    }

    func applicationWillTerminate(_ notification: Notification) {
        statusItem = nil
    }

    private func configureStatusItem() {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        item.button?.title = "🍅"
        item.button?.toolTip = "Pomodoro Island"

        let menu = NSMenu()
        menu.addItem(NSMenuItem(title: "显示设置", action: #selector(showSettings), keyEquivalent: ","))
        menu.addItem(NSMenuItem(title: "开始工作", action: #selector(startWork), keyEquivalent: ""))
        menu.addItem(NSMenuItem(title: "暂停/继续", action: #selector(togglePause), keyEquivalent: ""))
        menu.addItem(NSMenuItem(title: "跳过当前阶段", action: #selector(skipPhase), keyEquivalent: ""))
        menu.addItem(.separator())
        menu.addItem(NSMenuItem(title: "退出 Pomodoro Island", action: #selector(quit), keyEquivalent: "q"))
        item.menu = menu
        statusItem = item
    }

    @objc private func showSettings() {
        settingsWindowController?.show()
    }

    @objc private func startWork() {
        store.startWork()
    }

    @objc private func togglePause() {
        store.togglePause()
    }

    @objc private func skipPhase() {
        store.skipPhase()
    }

    @objc private func quit() {
        NSApp.terminate(nil)
    }
}
