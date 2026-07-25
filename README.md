# JIYUGebit 个人主页

将主视频放到 `media/imjiyu.mp4`。示例封面可替换为自己的图片，路径在 `data/content.json` 内配置。

## 添加视频

电脑已安装 Node.js 时，在本目录执行：

```powershell
node tools/update-content.mjs
```

按提示输入资料即可更新视频列表。新封面请先复制到 `media/`，再输入相对路径，例如 `media/my-video.jpg`。

## 内容管理

双击 `内容管理.cmd`，输入 `1` 新增视频或输入 `2` 新增笔记。新增视频会引用 `media/vid/序号.png`；新增笔记会自动使用当前本地日期、创建 Markdown 正文并写入笔记列表。

## 预览

不要直接双击 `index.html` 后用 `file://` 地址预览；Edge 可能会阻止读取 JSON 视频资料。双击 `打开网站.cmd`，然后在 Edge 打开 `http://localhost:8080/`。也可使用 `npx serve .`。
