# dsh-fairy-composer

DeepSeek Harness Web UI 的输入区外观微调插件：把输入框外围那条灰色底带做成圆角，并在灰色底带与蓝色输入卡片之间留出间隔。

只改两件事：

| 项 | 变量 | 默认 |
| --- | --- | --- |
| 灰底带圆角 | `--dsh-composer-frame-radius` | `26px` |
| 灰底带与输入卡片的间隔 | `--dsh-composer-gap-x` / `-top` / `-bottom` | `12px` / `10px` / `6px` |

## 它改的是哪个元素

选择器是 `[class*="_composerSeat"]` —— 外壳钉在对话列底部的那条灰色底带，蓝色输入卡片是它的子元素。用类名片段而非完整哈希类名匹配，重建样式后不失效。

底带原本的底色是「自上而下从透明渐变到不透明」，顶端没有清晰边缘，圆角无处可落，所以这一版把底带底色换成它淡出到的基色 `--dsw-alias-bg-base`，四个角才有轮廓可切。除此之外不动颜色、边框、阴影，也不碰输入卡片本身。

## 安装

```bash
dsh plugin add dsh-fairy-composer
```

或在 Harness 的插件管理器里安装本包（bundle 名称 `dsh-fairy-composer`，patch 行 id `fairy-composer`）。安装后刷新页面生效。

## 调整

所有数值都在 `client.js` 顶部的 `:root` 块里，改完刷新页面即可；不需要重新安装。

## 已知边界

- 这是纯 CSS 注入插件，不注册任何 slot，页面上没有自己的可见控件。
- 与 `dsh-fairy-splash` 同装时，底带的灰色渐变由皮肤包以 `!important` 优先提供，本插件声明的 `--dsw-alias-bg-base` 底色只在没有皮肤时生效；圆角与间隔两项不受影响。
- 圆角与间隔按 Harness 桌面版（`desktop` profile）的类名结构编写并已在本机安装验证；未在浅色主题、移动宽度或其他发行版上验证。
- 该类名若在未来的 Harness 版本中改名，插件会静默失效（不报错、只是没效果）；届时需要改选择器片段。

## 开发

本目录就是唯一源码，直接改 `client.js` 后重装或刷新即可。注意 `client.js` 顶部的模块 id 必须与 `package.json` 的 `name` 完全一致（`dsh-fairy-composer`）：加载器按「id 等于包名」注册，写成别的名字浏览器端会静默不注册，页面看起来就是「没有效果」。

## License

MIT
