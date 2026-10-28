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

## 方式一：一键安装（推荐，无需 Node 生态）

```powershell
# 解压后
./install.ps1
```

一条命令做完四件事，装完自动重启 DSH，不需要再手动关开：

1. 把 `dsh-fairy-splash` / `dsh-fairy-composer` / `dsh-fairy-voice` / `dsh-agent-md` **整目录替换**进 `%USERPROFILE%\.dsh\plugins`——旧副本先删掉，不会再残留 1.0.0 的旧界面。
2. 重连 profile 的 `node_modules` 与 `package.json`：依赖指向新副本，`dsh.profile.bundles` 自动去重。
3. 逐包自检：版本号、`exports` 是否放行 `./package.json`、`client.js` 里的界面标记（`chat-bg`、`data-fairy-voice-rail`、`_composerSeat`），全过才继续。
4. 自检通过后 8 秒自动关闭并重开 DeepSeek Harness，新界面直接生效。

自检不通过会打 FAIL 并以退出码 1 停下，不会留下「装了但界面还是旧的」这种状态。
`--dry-run` 看计划，`--verify-only` 只自检，`--no-restart` 不自动重启，`--no-persona` 跳过人格，`--profile <名字>` 指定非 desktop 的 profile。

## 方式二：npm 安装（有 DSH 插件管理时）

```bash
dsh plugin add dsh-fairy-pack        # 或 pnpm add dsh-fairy-pack -w
```

只装一个就是元包，三个内核跟依赖一起进来。人格仍需手动：把 `persona/Fairy.md` 复制到 `~/.dsh/AGENT.md`。

## 更新记录

### 1.0.9

- **滚动修复**：1.0.8 用 `:has([class*="_menu"])` 判断菜单开关，菜单关闭后节点仍在，条件恒为真，滚动容器被锁成 `overflow: visible`，对话无法滚动。改为客户端实测可见弹层后写 `data-fairy-menu-open`，CSS 只认该属性。
- 皮肤 1.0.5、元包 1.0.9；语音 1.0.3、composer 1.0.1 未变。

### 1.0.8

- **输入区加号修复**：`+` 菜单（添加文件 / 调用指令）此前整块不显示或只露一半。原因是输入卡片带着 `overflow: hidden`，而菜单是**绝对定位在卡片内往上展开**的；卡片与它上层的滚动容器都把菜单上半截裁掉了。
- 现在卡片不再裁剪；`_scrollBody` 与 `_root` 只在**菜单真的打开时**（`:has([role="menu"])`）放开 `overflow`，关闭即恢复，圆角裁剪与滚动行为不变。
- **语音插件 1.0.3**：语音卡整卡 `pointer-events: none`、层级 9000 → 60，只有「语音」开关和「音量」滑块可点，不会再挡住任何弹出层。
- 皮肤 1.0.4、composer 1.0.1 之外无其他改动；安装器行为不变。

### 1.0.7

- **语音插件 1.0.2**：提问卡（`ask_user_question` 的选项界面）出现时，语音卡与审批卡一样整张隐藏，问题答完自动回来；此前会被甩到窗口左上角。
- 定位逻辑加了尺寸守卫：量到 0×0 的输入卡不再当锚点，改为隐藏，坐标不会再落回 `0,0`。
- 皮肤（1.0.3）与 composer（1.0.1）未改动，安装器行为不变。

### 1.0.6

- **安装器重写**：旧包整目录替换 → 装完逐项自检 → 通过后自动重启 DSH。别人装完不需要任何手动操作。
- 自检覆盖：包版本、`exports` 是否放行 `./package.json`、`client.js` 里的界面标记、`node_modules` 链接是否指向新副本。
- `dsh-fairy-splash` 升到 1.0.3、`dsh-fairy-composer` 升到 1.0.1：两包都补上 `exports` 的 `./package.json`（此前按包名解析 manifest 会被导出表挡住，皮肤可能整块不加载）。
- profile 里重复的 bundle 记录会被去重；`--verify-only` 可单独复检。

### 1.0.5

- 重打版本：源码与 1.0.4 逐字节一致（只有元包版本号 +1），给已验证的当前状态一个独立版本号。
- 三个内核版本不变：皮肤 1.0.2、composer 1.0.0、语音 1.0.1；运行时 / 模型仍沿用 v1.0.0。

### 1.0.4

- 语音插件补上输入区右侧的语音卡：`语音`开关、`音量`滑块、`自动朗读`开关收在灰底带右端，不再占用输入框左下的工具行。
- 卡片贴在输入区里，高度跟输入框对齐；切会话、拖窗口、开审批提示时自行复位或让位。
- 语音插件版本 1.0.1；皮肤（1.0.2）与 composer（1.0.0）包体未改动。

### 1.0.3

- 新增输入区插件 `dsh-fairy-composer`：给输入框外围的灰色底带加圆角，并把底带与蓝色输入卡片之间的间隔交还给 CSS 变量（默认 `12px / 10px / 6px`）。
- 元包改为三件套：`dsh-fairy-pack` 依赖 `dsh-fairy-splash`、`dsh-fairy-composer`、`dsh-fairy-voice`，`install.mjs` / `uninstall.mjs` 同步收录。
- 皮肤与语音包体未改动，版本仍是 1.0.2 / 1.0.0（语音在 1.0.4 里更新到 1.0.1）。

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
