import AppKit

extension NSScreen {
    static let fallbackNotchWidth: CGFloat = 210
    static let fallbackNotchHeight: CGFloat = 38

    var hasHardwareNotch: Bool {
        safeAreaInsets.top > 0
            || auxiliaryTopLeftArea?.isEmpty == false
            || auxiliaryTopRightArea?.isEmpty == false
    }

    var islandNotchSize: CGSize {
        guard hasHardwareNotch else {
            return CGSize(width: Self.fallbackNotchWidth, height: Self.fallbackNotchHeight)
        }

        let notchHeight = max(28, safeAreaInsets.top)
        let leftSafeAreaWidth = auxiliaryTopLeftArea?.width ?? 0
        let rightSafeAreaWidth = auxiliaryTopRightArea?.width ?? 0
        let notchWidth = Self.visualIslandNotchWidth(
            frameWidth: frame.width,
            leftSafeAreaWidth: leftSafeAreaWidth,
            rightSafeAreaWidth: rightSafeAreaWidth,
            hasHardwareNotch: hasHardwareNotch
        )

        return CGSize(width: notchWidth, height: notchHeight)
    }

    var islandClosedHeight: CGFloat {
        if hasHardwareNotch {
            return max(28, safeAreaInsets.top)
        }

        let reservedTopInset = max(0, frame.maxY - visibleFrame.maxY)
        return max(Self.fallbackNotchHeight, reservedTopInset)
    }

    static func visualIslandNotchWidth(
        frameWidth: CGFloat,
        leftSafeAreaWidth: CGFloat,
        rightSafeAreaWidth: CGFloat,
        hasHardwareNotch: Bool
    ) -> CGFloat {
        guard hasHardwareNotch else {
            return fallbackNotchWidth
        }

        let measuredWidth = frameWidth - leftSafeAreaWidth - rightSafeAreaWidth + 4
        guard leftSafeAreaWidth > 0,
              rightSafeAreaWidth > 0,
              measuredWidth.isFinite,
              measuredWidth > 0 else {
            return fallbackNotchWidth
        }

        return measuredWidth
    }
}

enum ScreenResolver {
    static func targetScreen() -> NSScreen? {
        if let notched = NSScreen.screens.first(where: \.hasHardwareNotch) {
            return notched
        }

        return NSScreen.main ?? NSScreen.screens.first
    }

    static func screenID(for screen: NSScreen) -> String {
        let key = NSDeviceDescriptionKey("NSScreenNumber")
        if let number = screen.deviceDescription[key] as? NSNumber {
            return "display-\(number.uint32Value)"
        }
        return screen.localizedName
    }
}
