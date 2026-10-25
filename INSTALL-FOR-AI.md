# 给 AI 的安装说明

把这个文件（或下面的提示词）连同 Releases 链接一起交给对方的 AI 助手。
**前提**：对方使用的是能执行命令、能读写本地文件的编程类 AI（DSH、Claude Code、Cursor、Cline 等）。
纯聊天模型只能给你复述步骤，装不了。

---

## 提示词（中文，直接复制）

```text
请在这台 Windows 电脑上安装 Fairy Pack。步骤必须自己执行，不要只给我步骤让我手动做。

1. 先检查前置条件，缺哪项就停下来告诉我：
   - %USERPROFILE%\.dsh\profiles\desktop\package.json 必须存在（说明 DeepSeek Harness 已安装并运行过）
   - 找一个 node.exe：优先 PATH 里的 node；没有就在 %USERPROFILE%\.dsh\dsh-runtimes 下递归找

2. 下载这个文件到临时目录：
   https://github.com/qrq-qq/dsh-fairy-pack/releases/download/v1.0.0/dsh-fairy-pack-1.0.0.zip
   用 Get-FileHash 校验 SHA256 必须是：
   80c9500f244bc2f335272b28aeb456b1c553fd93b09bbc0ebb32b514862d2542

3. 解压到 %TEMP%\fairy-pack，然后解除网络隔离标记：
   Get-ChildItem -Recurse | Unblock-File

4. 执行安装（不要加 -no-persona，除非我明确说不要人格）：
   powershell -NoProfile -ExecutionPolicy Bypass -File "<解压目录>\install.ps1"

5. 安装成功后检查这三处并逐条报告：
   - %USERPROFILE%\.dsh\plugins\dsh-fairy-splash 与 dsh-fairy-voice 存在
   - %USERPROFILE%\.dsh\profiles\desktop\package.json 的 dsh.profile.bundles 含这两个包名
   - %USERPROFILE%\.dsh\AGENT.md 已写入（若原本存在，应留下 .bak-fairy-pack-* 备份）

6. 告诉我：需要完全退出 DeepSeek Harness（托盘退出）再重开才生效；
   语音首次可用时会自动下载约 1.9 GB，属正常现象。

遇到任何报错，把原始错误完整贴给我，不要自行猜测原因。
```

---

## 提示词（English）

```text
Install "Fairy Pack" on this Windows machine. Execute the steps yourself; do not just print instructions.

1. Preflight: %USERPROFILE%\.dsh\profiles\desktop\package.json must exist. Find node.exe (PATH, or search %USERPROFILE%\.dsh\dsh-runtimes).
2. Download https://github.com/qrq-qq/dsh-fairy-pack/releases/download/v1.0.0/dsh-fairy-pack-1.0.0.zip and verify SHA256 = 80c9500f244bc2f335272b28aeb456b1c553fd93b09bbc0ebb32b514862d2542
3. Extract to %TEMP%\fairy-pack and run: Get-ChildItem -Recurse | Unblock-File
4. Run: powershell -NoProfile -ExecutionPolicy Bypass -File "<extracted>\install.ps1"
5. Verify the two plugin folders exist under %USERPROFILE%\.dsh\plugins, both names appear in dsh.profile.bundles, and %USERPROFILE%\.dsh\AGENT.md was written (backup .bak-fairy-pack-* expected).
6. Report that the user must fully quit DeepSeek Harness (tray exit) and relaunch. First voice use downloads ~1.9 GB.
On any error, paste the raw error; do not guess.
```

---

## 安装器实际做了什么

`install.mjs`（由 `install.ps1` 调用）依次执行：

1. 把 `dsh-agent-md`（人格注入）、`dsh-fairy-splash`（皮肤）、`dsh-fairy-voice`（语音）复制到 `~/.dsh/plugins/`
2. 在 profile 的 `node_modules` 里建目录联结（junction，不需要管理员权限）
3. 改写 profile 的 `package.json`：依赖写成 `link:` 指向插件目录，并把三个包名加进 `dsh.profile.bundles`（改前自动备份）
4. 把 `persona/Fairy.md` 写入 `~/.dsh/AGENT.md`（原文件备份为 `AGENT.md.bak-fairy-pack-<时间戳>`）

支持参数：`--dry-run`、`--no-persona`、`--dsh-home <dir>`、`--profile <name>`。
卸载：`node uninstall.mjs`。

## 不会自动做的事

| 项 | 说明 |
| --- | --- |
| 安装 DeepSeek Harness | 必须先装好并至少启动过一次 |
| 下载语音运行时 | 首次启动后台触发，约 1.9 GB；日志在 ~/.dsh/fairy-voice/service.log |
| 改应用图标与托盘图标 | 需另跑 `scripts/apply-app-icon.mjs` |
| 重启应用 | 必须手动托盘退出再重开 |

## 兼容性

皮肤依赖 DSH 前端打包类名（`.Dc7zOa_root` 这类哈希），升级 DSH 后可能部分样式失效。
若安装后界面无变化，先确认 DSH 版本；0.2.1-rc.3 已实测，其余版本未验证。

## 装完打不开怎么办

DSH 的规则是：**任何一条客户端插件激活失败，整个界面都起不来**。遇到白屏或闪退：

1. 任务管理器结束 DeepSeek Harness
2. 打开 `%USERPROFILE%\.dsh\profiles\desktop\package.json`
3. 在 `dsh.profile.bundles` 里删掉 `dsh-agent-md`、`dsh-fairy-splash`、`dsh-fairy-voice` 三行
4. 或用同目录的 `package.json.bak-fairy-pack-<时间戳>` 覆盖回去
5. 重开确认能进界面后，用 `--only` 分步装，定位是哪一条：

```powershell
.\install.ps1 --only splash      # 先只装皮肤
.\install.ps1 --only voice       # 再加语音
.\install.ps1 --only agent-md    # 最后加人格注入
```

`%APPDATA%\@deepseek-ai\dsh-desktop\logs\crash-*-web-boot.log` 里会写明是哪个条目失败。

## 常见失败

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 提示"无法加载文件 install.ps1，未数字签名" | PowerShell 执行策略 | 用 `-ExecutionPolicy Bypass`，或先 `Unblock-File` |
| 找不到 profile | DSH 没装或没运行过 | 先启动一次 DSH |
| 找不到 node.exe | 未装 Node 且 DSH 运行时目录异常 | 装 Node 18+ |
| 重开后没有皮肤 | 没完全退出（托盘仍在） | 托盘图标右键退出 |
| 语音一直红灯 | 运行时未下载完或本机 TLS 代理拦截 | 看 `~/.dsh/fairy-voice/service.log` |
