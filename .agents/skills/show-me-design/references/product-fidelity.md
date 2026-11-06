# 产品画面取值

演示要和真实产品一致，数值从源码里读，不要凭印象写。下面列出取值的位置，括号里是 2026-11 时的值，仅供快速起步。写页面前用命令核对一遍。

## 颜色 token

来源：`@citrolabs/ui-components` 的 `dist/styles/theme.css`。

```bash
f=$(readlink -f apps/agui/node_modules/@citrolabs/ui-components)/dist/styles/theme.css
grep -n -E "\-\-(bg-1|bg-2|fg-1|fg-2|fg-3|text-1|text-2|text-3|bg-alpha-[234]|accent|danger|blue-[45]|red-[45]|shadow-2-2|shadow-3)\s*:" "$f"
```

| token | 亮色 | 暗色 | 用途 |
| --- | --- | --- | --- |
| `--bg-2` | `hsl(0 0% 97%)` | `hsl(0 0% 10%)` | 侧边栏背景 |
| `--fg-1` / `--fg-2` / `--fg-3` | `#fff` / 96% / 93% | 18% / 21% / 26% | 浮层卡片、药丸，以及它们的 hover、按下态 |
| `--text-1` / `-2` / `-3` | 黑 .9 / .7 / .48 | 白 .9 / .7 / .48 | 正文、次要文字、弱化文字 |
| `--bg-alpha-2` / `-3` / `-4` | 黑 .04 / .06 / .08 | 白 .04 / .06 / .08 | 按钮底色、hover、分隔线 |
| `--accent` | `--blue-5` `#0880f7` | `--blue-4` `#519afb` | Agent 状态、链接 |
| `--danger` | `--red-5` `#ee4a3e` | `--red-4` `#f57261` | 危险操作的 hover、错误 |
| `--shadow-2-2` | `0 0 0 .5px var(--bg-alpha-3), 0 8px 32px 4px rgba(0,0,0,.08)` | | 药丸、卡片 |
| `--shadow-3` | `0 0 0 .5px rgba(0,0,0,.06), 0 16px 48px 0 rgba(0,0,0,.35)` | | 菜单、toast |

在演示里把它们定义成 `--p-*`，与页面自身的 token 分开。

## 组件

- 按钮：`apps/agui/src/applications/public/components/primitives/button.tsx`。默认 `neutral`：`--bg-alpha-2` 底，hover 时 `--bg-alpha-3`，`rounded-full`；`medium` 是 `min-h-8 px-3 py-1.5 text-sm`。另有 `ghost`、`danger` 等变体。
- 下拉菜单：同目录下的 `dropdown-menu.tsx`。浮层圆角 20px，阴影 `--shadow-3`，默认最宽 320px；菜单项高亮用 `--bg-alpha-2`。
- toast：`apps/agui/src/applications/chatbot/components/toast.tsx`，调用 `toast({ type, description })`，在侧边栏顶部居中显示。
- 图标：`@citrolabs/ui-components/icons`。查可用图标用 `ls $(readlink -f apps/agui/node_modules/@citrolabs/ui-components)/dist/icons`，例如 `AgentCursor`、`Hand`、`ArrowNe`。演示里用形状接近的内联 SVG 代替。
- 要改的组件，先读它的 `.module.css`，把真实的 padding、gap、字号抄进演示，只改方案要改的部分。

## Ego Lite 窗口

- 侧边栏（Ask ego）：默认宽 400px，最小 280px；挂在 `ego_frame_view` 上，与 mainland 平级。DOM 菜单出不了侧边栏的范围。
- mainland：顶部写"N Spaces ▾"，是 Spaces 总览的卡片网格；卡片标签前可能有黄色的 `Need your action` 徽标。进入某个 Space 后显示标签栏、地址栏和网页。
- 浏览器任务：任务条或药丸菜单在输入框上方，文案是 `You're in control` / `Agent is in control` / `Take over` / `Return to agent` / `End task`。
- 输入框占位文字：`Ask ego, @ for context, / for Skills`。
- 用户给了截图时，以截图为准；截图和 main 的代码不一致时，在页面上说明两者的差别。
