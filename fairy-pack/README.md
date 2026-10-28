# Fairy Pack · H.D.D. 界面皮肤 + Fairy 语音 + Fairy 人格

把整套「Fairy」体验装进本地 DeepSeek Harness：新会话界面的全息核心与开机影片、回复朗读、以及依据游戏剧情重建的人格档案。

## 内容

| 模块 | npm 包 | 作用 |
| --- | --- | --- |
| 界面皮肤 | `dsh-fairy-splash` | H.D.D. 开机动画、标题条字标、玻璃侧边栏与 rail、对话区背景图与核心 |
| 输入区 | `dsh-fairy-composer` | 灰色底带圆角、底带与蓝色输入卡片之间留出间隔 |
| 语音 | `dsh-fairy-voice` | 回复播放按钮、自动朗读、GPT-SoVITS 桥接、首次启动自举运行时 |
| 元包 | `dsh-fairy-pack` | 只做登记：把上面三个一起挂进插件树 |
| 人格 | `persona/Fairy.md` | 写入 `~/.dsh/AGENT.md` |

## 方式一：一键安装（不装 Node 生态）

```powershell
# 解压后
./install.ps1
```

脚本会把三个插件复制到 `%USERPROFILE%\.dsh\plugins`、写进 profile 的 `package.json` 与 `dsh.profile.bundles`、链接进 `node_modules`，最后写入人格（旧文件自动备份）。
`node install.mjs --dry-run` 可先看计划；`--no-persona` 跳过人格。

## 方式二：npm 安装（有 DSH 插件管理时）

```bash
dsh plugin add dsh-fairy-pack        # 或 pnpm add dsh-fairy-pack -w
```

只装一个就是元包，三个内核跟依赖一起进来。人格仍需手动：把 `persona/Fairy.md` 复制到 `~/.dsh/AGENT.md`。

## 更新记录

### 1.0.3

- 新增输入区插件 `dsh-fairy-composer`：给输入框外围的灰色底带加圆角，并把底带与蓝色输入卡片之间的间隔交还给 CSS 变量（默认 `12px / 10px / 6px`）。
- 元包改为三件套：`dsh-fairy-pack` 依赖 `dsh-fairy-splash`、`dsh-fairy-composer`、`dsh-fairy-voice`，`install.mjs` / `uninstall.mjs` 同步收录。
- 皮肤与语音包体未改动，版本仍是 1.0.2 / 1.0.0。

### 1.0.2

- 标题条：实心条 + 渐变字标（软描边与 10px 挤出），避开 Windows 原生命名区。
- 侧边栏：四个面板入口合并成一块玻璃板，rail 与侧栏分层，暗色与浅色两套都跟着走。
- 对话区：背景图 `assets/chat-bg.jpg` 铺满，压暗渐变保正文对比度；关闭旧溶解带，图片上下贯通。
- 滚动条：透明轨 + 悬浮胶囊滑块，只有会话列表预留 gutter，滚动条出现不再把正文挤偏。
- 拖拽：拖分隔条期间挂 `html[data-fairy-resizing]`，暂关模糊、阴影与过渡，避免玻璃叠三层 backdrop blur 卡成幻灯片。
- 字体：Latin 走 Segoe UI，CJK 走随 Windows 分发的 Noto Sans SC 可变字面。
- 开屏：在影片最后一帧仍是活画时交接，不再等 `ended` 后的约 1.9 秒黑场。

## 发布（维护者）

```bash
npm login
node scripts/publish.mjs --pack                 # 只打包，检查内容
node scripts/publish.mjs --publish              # 发布四个包
node scripts/publish.mjs --publish --bump patch # 先升版本再发
```

四个包的 `repository` 已指向仓库 `qrq-qq/dsh-fairy-pack`，并各自带上 `directory` 子路径，发布前不需要再改。发布顺序按依赖来：composer → splash → voice → 元包。

## 语音：两条路

### A. 自举（推荐）

编辑 `~/.dsh/fairy-voice/voice.config.json` 的 `runtime` 块，填运行时 zip 地址与 sha256；zip 根目录放 `fairy-runtime.json` 清单。首次启动自动下载、校验、解包、把绝对路径写回配置，之后不再联网。
模型另打一个 zip，由清单里的 `model.url` 指向。格式见 [packages/dsh-fairy-voice/README.md](packages/dsh-fairy-voice/README.md)。

### B. 手填

把 11 个路径填成你本地 GPT-SoVITS 的绝对路径，`autoStart` 改 `true`。

不启用语音不影响皮肤与人格，点播放只会亮红灯。

## 开屏动画与应用图标

- **开屏动画**：`assets/boot.mp4`（6 MB）随皮肤包一起分发，只在应用冷启动时播一次，F5 不重播。
- **标签页图标**：插件启动时把 favicon 换成 `/fairy-splash/v1/icon-64.png`，无需额外操作。
- **应用图标 / 托盘图标**：需要改安装目录，插件做不到，用附带脚本：

```powershell
node scripts/apply-app-icon.mjs            # 备份并替换 resources/icon.png 与 tray.ico
node scripts/apply-app-icon.mjs --restore  # 还原
```

客户端升级会覆盖这两个文件，升级后重跑一次即可。

## 自定义

- 皮肤尺寸与配色在 `packages/dsh-fairy-splash/client.js` 的 CSS 段，改完重启。
- 人格在 `persona/Fairy.md`，改完重跑 `install.mjs`。
- 运行时清单可加 `nltkData` 等字段，未填的按空处理。

## 卸载

```bash
node uninstall.mjs
```

摘掉 bundles 与依赖、删除插件目录、用最近一次备份还原 `AGENT.md`。

## 已知限制

- 模型权重不随包分发（体积 + 自定义音色），必须自己托管 zip。
- 皮肤、输入区与语音是三个插件内核；元包只负责一起登记，别指望它们合成一个 bundle。
- 开机影片只在冷启动播一次，F5 不重播。
