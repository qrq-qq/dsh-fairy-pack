# Fairy Pack · 给 DeepSeek Harness 的 H.D.D. 套装

把《绝区零》里 Fairy 的那套东西搬进 DeepSeek Harness：

- **界面皮肤** — 开机影片、新会话界面的全息核心、侧边栏徽标、对话区溶解带
- **语音** — 回复下方播放按钮与自动朗读，本地 GPT-SoVITS 合成
- **人格** — 依据游戏剧情重建的 Fairy 人格档案

---

## 安装（三步）

### 1. 下载

到 [Releases](../../releases) 下载 **`dsh-fairy-pack-1.0.0.zip`**（7 MB）。

### 2. 运行

解压后右键 `install.ps1` →「使用 PowerShell 运行」。

如果提示脚本被阻止，在 PowerShell 里执行：

```powershell
cd <解压目录>
Get-ChildItem -Recurse | Unblock-File
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

### 3. 重启

**托盘右键退出** DeepSeek Harness（关窗口不算），重新打开。新会话界面应出现全息核心与开机影片。

---

## 让 AI 帮你装

把 [INSTALL-FOR-AI.md](INSTALL-FOR-AI.md) 里的提示词交给你的 AI 助手（需要有命令执行权限的，如 DSH、Claude Code、Cursor、Cline）。里面写了前置检查、哈希校验、安装命令与验证步骤。

---

## 安装器会改动什么

| 位置 | 改动 | 备份 |
| --- | --- | --- |
| `%USERPROFILE%\.dsh\plugins\` | 新增 `dsh-agent-md`（人格注入）、`dsh-fairy-splash`（皮肤）、`dsh-fairy-voice`（语音） | — |
| `%USERPROFILE%\.dsh\profiles\desktop\package.json` | 加依赖与 `dsh.profile.bundles` 条目 | `*.bak-fairy-pack-<时间戳>` |
| `%USERPROFILE%\.dsh\profiles\desktop\node_modules\` | 三个目录联结（junction） | — |
| `%USERPROFILE%\.dsh\AGENT.md` | 写入人格档案 | `AGENT.md.bak-fairy-pack-<时间戳>` |

**不想要人格被覆盖**：`.\install.ps1 --no-persona`。

**卸载**：

```powershell
node .\uninstall.mjs
```

会摘掉 bundles 与依赖、删除插件目录、用最近一次备份还原人格。

---

## 兼容性

皮肤的部分样式依赖 DeepSeek Harness 前端打包后的类名（形如 `.Dc7zOa_root`），这些名字每版构建会变。
当前版本针对 **DSH 0.2.1-rc.3** 校验过；DSH 升级后，界面内的核心、溶解带等细节可能失效，语音与人格不受影响。
遇到这种情况：在仓库提 issue，附上 DSH 版本号与 `resources/app.asar` 的修改时间。

## 环境要求

- Windows 10 / 11
- DeepSeek Harness 桌面版，**已至少启动过一次**（否则没有 `profiles\desktop`）
- Node.js 18+；没有也行，安装器会自动找 DSH 自带的 node

---

## 语音说明

首次启动会在后台下载两部分，合计约 **1.9 GB**（不影响使用其他功能）：

| 内容 | 大小 |
| --- | --- |
| 运行时（Python + GPT-SoVITS + 预训练） | 1.73 GB |
| 音色模型 | 212 MB |

下载、校验、解包、写配置都由插件自动完成，日志在 `%USERPROFILE%\.dsh\fairy-voice\service.log`。

如果你在代理或带 TLS 审计的网络后面，Node 可能报 `UNABLE_TO_VERIFY_LEAF_SIGNATURE`：把代理根证书路径设进环境变量 `NODE_EXTRA_CA_CERTS` 再启动。

音色模型由游戏语音训练而来；开屏动画为游戏实机画面。自用没问题，**公开发布有被下架的风险**，请自行判断分发范围。

---

## 可选：应用图标

插件能控制界面内的图标与浏览器标签页图标，但任务栏与托盘图标在安装目录里，需要单独替换：

```powershell
node .\fairy-pack\scripts\apply-app-icon.mjs
```

改前自动备份，`--restore` 可还原。客户端升级会覆盖，升级后重跑一次。

---

## 目录结构

```
fairy-pack/
  packages/
    dsh-agent-md/       人格：把 AGENT.md 注入系统提示词
    dsh-fairy-splash/   皮肤：开机影片、核心、徽标、标签页图标
    dsh-fairy-voice/    语音：播放按钮、自动朗读、GPT-SoVITS 桥接、运行时自举
    dsh-fairy-pack/     元包：把上面几个一起登记
  persona/              人格档案
  scripts/              打包、发布、构建发布件、替换应用图标
  install.mjs           安装器（install.ps1 会调用它）
  uninstall.mjs         卸载器
```

发布维护：`node scripts/publish.mjs --pack` / `--publish`；构建发布件：`node scripts/build-release.mjs`。

---

## 许可

代码 MIT。游戏相关的美术与音色素材版权归原权利人，仅作个人使用与学习用途。
