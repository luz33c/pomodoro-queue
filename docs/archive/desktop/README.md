# 桌面架构历史方案

此目录保留架构决策过程，**历史讨论不代表当前实现，也不是待执行的实施计划**。2026-10-24 已选定方案 C：产品界面位于 `apps/app`，浏览器与 Electrobun 桌面壳共用产品源码，分别使用浏览器与桌面构建产物。

当前入口：[方案 C 实现说明](../../desktop-plan-c-product-app.md) · [方案 C 当前图解](../../show-me-desktop-plan-c-final.html)。

方案 A（Web 双构建）与方案 B（共享产品页面包）均未采纳。早期 C 的部署选择图也已被当前实现说明与确认稿替代；其中的“尚未实施”等表述仅说明起草时的状态。

| 历史文件                                                          | 保留用途                            |
| ----------------------------------------------------------------- | ----------------------------------- |
| [三条路线对比](./desktop-architecture-options.md)                 | A / B / C 的取舍与选定 C 的决策记录 |
| [三条路线对比图](./desktop-architecture-options.html)             | 路线比较的历史图解                  |
| [方案 A：Web 双构建](./desktop-plan-a-web-dual-build.md)          | 未采纳提案                          |
| [方案 B：共享包](./desktop-architecture-plan.md)                  | 未采纳提案及当时的配置草图          |
| [方案 B 架构图](./desktop-architecture-plan.html)                 | 未采纳提案的图解                    |
| [方案 B 运行时详解](./desktop-architecture-plan-walkthrough.html) | 未采纳提案的运行时推演              |
| [早期 C：部署选择](./show-me-desktop-plan-c.html)                 | 确认稿之前的部署讨论                |

不将这些历史代码片段、目录树、待办与验证记录作为当前仓库事实。后续维护应更新当前文档，并以源码与实际运行结果为准。
