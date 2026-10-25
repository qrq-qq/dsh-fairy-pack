# Fairy Pack

给 DeepSeek Harness 的 Fairy 套装：H.D.D. 界面皮肤（开屏动画、全息核心、应用图标）+ 本地语音 + 人格档案。

## 安装

1. 到 [Releases](../../releases) 下载 `dsh-fairy-pack-1.0.0.zip`。
2. 解压，右键 `install.ps1` →「使用 PowerShell 运行」。
3. 完全退出 DeepSeek Harness（托盘退出），重新打开。

细节见 [fairy-pack/README.md](fairy-pack/README.md)。

## 内容

| 目录 | 说明 |
| --- | --- |
| `fairy-pack/packages/dsh-fairy-splash` | 皮肤：开屏动画、核心与标题、侧边栏徽标、标签页图标 |
| `fairy-pack/packages/dsh-fairy-voice` | 语音：播放按钮、自动朗读、GPT-SoVITS 桥接、运行时自举 |
| `fairy-pack/packages/dsh-fairy-pack` | 元包：把上面两个一起登记 |
| `fairy-pack/persona` | 人格档案 |
| `fairy-pack/scripts` | 打包、发布、替换应用图标、构建发布件 |

## 说明

语音模型与运行时体积较大，放在 Releases 里，不进仓库。
