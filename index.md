# Footprint Map

**职责：** 说明可移植 Markdown 互动足迹地图的项目范围、当前状态与文档入口。

## 项目状态

- 状态：MVP 已实现并通过类型检查、自动化测试与生产构建；待 Obsidian Desktop/Mobile 和真实照片样本验收。
- 关联需求：[[../../Requirements/REQ-004-可移植Markdown互动足迹地图|REQ-004：可移植 Markdown 互动足迹地图]]
- 当前范围：Obsidian 日记内嵌互动地图、Leaflet/OpenStreetMap 与高德 JS API 2.0 双渲染器、照片缩略图点位与地图外横向照片浏览、200 米连续照片聚合、Vault 内 JPEG/HEIC/PNG 的 TypeScript EXIF 解析、GeoJSON 通用数据、独立 HTML 查看器与静态降级图。
- 项目边界：独立编写与构建，不依赖工作区内其他本地项目。
- 非目标：操作系统后台任务、Apple 原生框架、原生配套 App 及 Python/Swift 外部运行时。
- 实施基线：单日地图、Leaflet、外部 GeoJSON、可关闭的 OpenStreetMap 在线瓦片、缺失时区不猜测、HEIC 无法显示时占位。

## 项目文档

- [[trd|技术需求与代码层级]]
- [[design|设计图与组件边界]]
- [[interaction|交互图与状态说明]]
- [[visual|页面效果图与视觉约束]]

## 当前交付

- 桌面端 Markdown 日记内嵌足迹地图效果图。
- 从笔记加载到地图互动、错误降级的 Mermaid 交互图。
- 通用数据、渲染核心、Obsidian 适配器与其他输出的 Mermaid 设计图。
- 包含预期代码目录、核心接口、依赖、测试与打包的 TRD。
- 可手动安装的 Obsidian 插件产物与独立 HTML 查看器。
- 从笔记照片生成 GeoJSON、互动渲染与静态 SVG 导出的 TypeScript 源码。
- 核心校验、排序、连线、路径、EXIF 时间和静态降级自动化测试。

## 下一步

在真实 Obsidian Vault 中继续验收高德 Web Key、Desktop/Mobile、照片资源 URL、EXIF 时区和 HEIC 预览后，再准备公开发布；`securityJsCode` 仅在控制台实际提供时配置。
