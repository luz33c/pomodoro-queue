# Pomodoro Island

原生 macOS 刘海屏番茄钟实验端。这个子项目复用 `demo/open-vibe-island` 的实现原则：

- 使用顶层透明 `NSPanel` 贴合屏幕顶部与刘海区域。
- 优先选择内置刘海屏；外接屏回退为顶部居中黑色条。
- 固定最大窗口尺寸，关闭态与展开态由 SwiftUI 形状、透明度和内容切换驱动。
- 工作阶段默认收起成岛，鼠标悬停或点击岛区域展开。
- 休息阶段默认展开，提醒用户真正离屏休息。

业务层与 Open Island 不同：这里不监听 agent session，而是本地 `PomodoroStore` 维护工作、短休、长休、暂停、跳过和设置。

## 运行

```bash
cd apps/macos-island
./script/build_and_run.sh
```

验证：

```bash
swift build
```
