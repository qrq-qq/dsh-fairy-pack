# 上传到 GitHub · 一步一步

> 全程只需要浏览器。只有第 6 步遇到 1.73 GB 上传失败时，才需要装一个命令行工具作为后备。

## 0. 准备

打开 https://github.com ，注册或登录。没验证邮箱的话先去验证，否则 Releases 功能受限。

## 1. 建仓库

1. 右上角 **+** → **New repository**
2. **Repository name** 填 `dsh-fairy-pack`
3. 选 **Public**（必须公开，否则别人下载要登录）
4. 不要勾 Add a README
5. 点 **Create repository**

## 2. 上传源码

1. 进入刚建好的仓库，点 **uploading an existing file**（或 **Add file** → **Upload files**）
2. 打开资源管理器，进入 `F:\Fairy\github`
3. 选中里面**全部的文件夹和文件**（不要选 `UPLOAD-GUIDE.md` 也可以一起传），拖进浏览器窗口
4. 等文件列表加载完，底部 **Commit changes**

## 3. 建 Release

1. 仓库首页右侧点 **Releases** → **Create a new release**
2. **Choose a tag** 输入 `v1.0.0`，点 **Create new tag**
3. **Release title** 填 `Fairy Pack v1.0.0`
4. 先不要传文件，直接点 **Publish release**

## 4. 先传模型（212 MB）

1. 在刚发布的 Release 页面点 **Edit release**
2. 下方 **Attach binaries** 区域，把 `F:\Fairy\dist\fairy-model.zip` 拖进去
3. 等进度条走完，点 **Update release**
4. 在附件上右键 → **Copy link address**，得到类似：
   `https://github.com/你的用户名/dsh-fairy-pack/releases/download/v1.0.0/fairy-model.zip`

## 5. 停一下

把这个链接发给我。我要把它写进运行时包的清单里，否则别人装完只有运行时、没有音色。

## 6. 传运行时（1.73 GB）

回到 Release → **Edit release** → 拖 `fairy-runtime.zip` → **Update release**。

如果网页上传失败（转圈卡住 / 报错），改用命令行：

```powershell
winget install --id GitHub.cli
gh auth login          # 选 GitHub.com → HTTPS → 浏览器登录
gh release upload v1.0.0 "F:\Fairy\dist\fairy-runtime.zip"
```

## 7. 传剩下两个小包

同样在 Edit release 里拖入：
- `dsh-fairy-pack-1.0.0.zip`
- `fairy-splash.zip`

## 8. 核对

打开无痕窗口，逐个点附件链接，能直接下载就说明权限没问题。

## 9. 收尾

把两个链接和各自的 SHA256 发我，我把 `voice.config.snippet.json` 填好，随安装包一起发出去。
