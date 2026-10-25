# dsh-fairy-voice

Fairy 语音回复：回复下方播放按钮 + 自动朗读，桥接本地 GPT-SoVITS。

## 配置在哪

优先级：`~/.dsh/fairy-voice/voice.config.json` → 包内 `voice.config.json` → 内置默认值。
自举成功后插件会把最终配置写回前者，之后改那一份就够，升级插件不会丢。

## 两种接法

### A. 自带运行时（推荐给分发）

在 `voice.config.json` 里打开 `runtime`：

```json
"runtime": {
  "enabled": true,
  "url": "https://your.host/fairy-runtime.zip",
  "sha256": "…",
  "root": "C:/Users/you/.dsh/fairy-voice/runtime",
  "modelRoot": ""
}
```

运行时 zip 根目录必须放 `fairy-runtime.json`：

```json
{
  "python": "python/python.exe",
  "apiScript": "GPT-SoVITS/api_v2.py",
  "serviceDir": "GPT-SoVITS",
  "bertPath": "GPT-SoVITS/GPT_SoVITS/pretrained_models/chinese-roberta-wwm-ext-large",
  "hubertPath": "GPT-SoVITS/GPT_SoVITS/pretrained_models/chinese-hubert-base",
  "nltkData": "",
  "model": { "url": "https://your.host/fairy-model.zip", "sha256": "…" }
}
```

模型 zip 根目录放 `fairy-model.json`：`{ "t2sWeights": "...", "vitsWeights": "...", "refAudio": "...", "refText": "..." }`。
清单里的路径一律相对各自 zip 根目录；首次启动会自动下载、校验、解包、回写配置，之后不再联网。

### B. 已有运行时

直接把 `python`、`apiScript`、`serviceDir`、`bertPath`、`hubertPath`、`t2sWeights`、`vitsWeights`、`refAudio`、`refText` 填成绝对路径，`autoStart` 改 `true`。

## 说明

- 模型权重体积大且通常带自定义音色，不适合塞进 npm 包；用上面的 zip 分发。
- 解包走内置实现（stored/deflate），不依赖系统 unzip 或 PowerShell。
- 下载与解包日志写在 `~/.dsh/fairy-voice/service.log`。
