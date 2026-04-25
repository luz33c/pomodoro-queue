// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "PomodoroIsland",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(name: "PomodoroIsland", targets: ["PomodoroIsland"])
    ],
    targets: [
        .executableTarget(
            name: "PomodoroIsland",
            path: "Sources/PomodoroIsland"
        ),
        .testTarget(
            name: "PomodoroIslandTests",
            dependencies: ["PomodoroIsland"],
            path: "Tests/PomodoroIslandTests"
        )
    ]
)
