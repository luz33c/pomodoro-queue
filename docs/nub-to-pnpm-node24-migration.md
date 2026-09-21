# Nub 到 pnpm + Node.js 24 迁移记录

## 结论

`@nubjs/nub` 已从仓库完全移除。它原本承担的工作可以直接由 pnpm 和 Node.js 24 完成，因此没有保留额外的运行时、任务编排器或 TypeScript runner。

迁移后的职责划分：

- pnpm 11.22.0：依赖安装、workspace 脚本、筛选包、并行执行和命令行工具。
- Node.js 24.18.0：项目运行时、Server 的原生 TypeScript 执行、文件监听和 `.env` 加载。
- Vite：仅继续作为 Web 应用的开发服务器与构建器；本次迁移没有用 Node.js 替代它。

## 命令替换

| 原有 Nub 命令                            | 迁移后命令                                 | 用途                             |
| ---------------------------------------- | ------------------------------------------ | -------------------------------- |
| `nub run <script>`                       | `pnpm run <script>`                        | 运行根脚本                       |
| `nub run -r --if-present <script>`       | `pnpm -r --if-present run <script>`        | 递归运行 workspace 脚本          |
| `nub run -r --parallel --if-present dev` | `pnpm -r --parallel --if-present run dev`  | 并行启动各包开发脚本             |
| `nub run --filter <package> <script>`    | `pnpm --filter <package> run <script>`     | 运行指定包脚本                   |
| `nubx -y <package>`                      | `pnpm dlx <package>`                       | 一次性执行未安装的 CLI           |
| Nub 提供的已安装 CLI                     | `pnpm exec <command>`                      | 执行项目已安装的二进制文件       |
| `nub --env-file ... watch src/index.ts`  | `node --env-file ... --watch src/index.ts` | 使用 Node 24 原生功能运行 Server |

其中 `pnpm dlx` 只用于临时下载并运行 CLI；项目依赖已提供的 CLI 使用 `pnpm exec`，避免重复下载。

## 具体改动

### 根工具链与依赖

- [package.json](../package.json) 删除 `@nubjs/nub`，全部根脚本改为 pnpm 命令。
- 将 `devEngines.runtime` 设为 Node.js `24.18.0`，由 pnpm 安装并锁定项目运行时。
- 保持 `engines.node`、[.node-version](../.node-version) 和 Docker 基础镜像使用同一 Node 24.18 版本范围。
- [pnpm-workspace.yaml](../pnpm-workspace.yaml) 删除 Nub 的 catalog、构建许可和发布年龄例外。
- [pnpm-lock.yaml](../pnpm-lock.yaml) 移除 Nub 的解析记录，并记录 pnpm 管理的 Node 24.18.0 运行时。

### Server

- [apps/server/package.json](../apps/server/package.json) 的开发命令改为：

  ```sh
  node --env-file=../../packages/env/.env --watch src/index.ts
  ```

- [apps/server/tsconfig.json](../apps/server/tsconfig.json) 启用 `erasableSyntaxOnly`，使源码只使用 Node 24 原生 TypeScript 去类型后的语法子集。

### Web、Docker 与本地工作流

- [apps/web/package.json](../apps/web/package.json) 的 i18n 生命周期脚本改用 pnpm 的 workspace filter。
- [apps/server/Dockerfile](../apps/server/Dockerfile) 和 [apps/web/Dockerfile](../apps/web/Dockerfile) 改为 Node 24.18 + pnpm 11.22，不再安装 Nub。
- [.githooks/pre-commit](../.githooks/pre-commit) 改为执行 `pnpm run check`。
- 项目指南、环境示例和界面文案中的 Nub 命令同步改为 pnpm / Node 24 表述，包括 [.agents/toolchain.md](../.agents/toolchain.md)。

## 运行方式

在仓库根目录执行：

```sh
pnpm install
pnpm run dev
pnpm run check
pnpm run test:unit:run
pnpm run build
```

按包执行时使用 pnpm filter，例如：

```sh
pnpm --filter @tsu-stack/server run dev
pnpm --filter @tsu-stack/db run db --version
```

项目命令应通过 pnpm 进入，以使用被锁定的 Node 24.18.0。终端直接运行 `node` 时，使用的是机器全局 Node，版本可能不同。

## 已验证结果

- `pnpm install --frozen-lockfile --registry=https://registry.npmjs.org` 通过。
- `pnpm run check` 通过。
- `pnpm run test:unit:run` 通过，共 27 个单元测试。
- `pnpm run build` 通过，Web、Server 和 Extension 均完成构建。
- Server 以 Node 24 原生 TypeScript watch 模式启动，并且 `/health/live` 返回健康状态。
- Server 与 Web 的 Docker `builder` 阶段均构建通过。
- 除本迁移记录外，源码、配置、锁文件与安装目录中均不再存在 `@nubjs/nub`、`nubx` 或 Nub 命令引用。

## 为什么不保留 Nub

在本项目中，Nub 没有提供 pnpm 或 Node 24 无法覆盖的能力：workspace 调度由 pnpm 处理，Server 的 TypeScript 运行、watch 和 env 文件加载由 Node 24 原生提供。移除后减少一个运行时依赖与一套命令语义，同时保留原有开发、检查、测试、构建和 Docker 流程。
