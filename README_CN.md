# 法条智能比对：智能法律文本分析工具

一个高性能、智能化的法律文档比对工具，专为分析法条变更而设计。与普通的文本比对工具不同，**Law Compare** 能够理解法律层级结构（编、章、节、条、款），并利用 NLP 算法在法条序号变动时依然实现精准对齐。

[English Version](./README.md)

---

## ✨ 核心特性

- **结构化比对**：自动识别章、节、条。检测新增、删除、修改，甚至能够识别跨条目的合并与拆分。
- **智能对齐**：使用加权相似度算法（Jaccard + 包含度 + 语义）追踪移动或重新编号的法条。
- **多维度视图**：
  - **结构视图**：全书变更的树状可视化导航。
  - **左右对照**：沉浸式的双栏阅读比对模式。
  - **Git 风格**：经典的逐行差异分析，适合技术复核。
- **高性能**：后端使用 Rust 编写，支持并行计算与基于 `Arc<str>` 的内存共享优化。
- **实体识别 (NER)**：自动检测变更内容中的日期、金额及法律专业术语。

## 📸 界面截图

| 结构化分析 | 左右对比模式 |
|:---:|:---:|
| ![结构视图](docs/screenshots/structural.png) | ![左右对照](docs/screenshots/side_by_side.png) |

| Git 风格差异 |
|:---:|
| ![Git 视图](docs/screenshots/git_diff.png) |

---

## 🚀 快速部署 (Docker)

使用 Docker 和内置的 Caddy 配置可以轻松部署本项目。

```bash
# 克隆仓库
git clone https://github.com/your-repo/law-compare.git
cd law-compare

# 使用 Docker 构建并运行
docker build -t law-compare .
docker run -d -p 8080:80 law-compare
```

访问 `http://localhost:8080` 即可开始使用。

---

## 🏗️ 架构设计

- **前端**：Next.js 15+、Tailwind CSS、Framer Motion，打造极简且流畅的 UI。
- **后端**：Rust (Axum)，包含以下核心模块：
  - **AST 解析器**：基于正则的层级解析引擎。
  - **对齐引擎**：处理文档演化的多阶段对齐策略。
  - **分词引擎**：基于 `jieba-rs` 的高效中文分词。
- **网关**：Caddy，负责高性能静态资源分发与 API 反向代理。

---

## 📖 模块详细文档

- [后端开发文档](./backend/README_CN.md) - 深入了解结构化对齐原理与性能优化。
- [前端开发文档](./frontend/README_CN.md) - UI 组件与可视化逻辑说明。
