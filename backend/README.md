# Law Compare Backend (Rust)

高性能法律条文对比后端服务，使用 Rust 实现。本服务专注于提供精确、快速的中文法律文本比对和实体识别功能。

## 功能特性

- **高效 Diff 算法**: 使用 `similar` crate 进行词级对比。
- **中文分词**: 基于 `jieba-rs` 的中文分词引擎。
- **AST 解析**: 结构化解析法律条文（章节条款项）。
- **实体识别 (NER)**: 识别日期、金额、处罚等关键法律信息。

## 核心逻辑与算法 (Core Logic & Algorithms)

### 1. 为什么选择这些算法？ (Why these algorithms?)

#### 词级 Diff (Word-level Diff)
传统的 Diff 算法（如 Git 默认的）通常基于**行 (Line)**。对于法律文本，通过简单的换行符分割会导致对比粒度过粗，无法精确展示"某条款中修改了几个字"的细节。
另一方面，基于**字符 (Character)** 的 Diff 虽然精确，但生成的差异过于琐碎，难以阅读（例如 "Apple" -> "Apply" 可能会显示为 "Appl~~e~~**y**"）。
**解决方案**: 我们使用 **中文分词 (Jieba)** + **Myers Diff 算法**。
- **Jieba**: 将中文句子切分为有意义的词汇（Token）。
- **Similar**: 在词汇序列上运行 Myers 算法，既保证了语义的连贯性，又提供了足够的精确度。

#### Myers Diff 算法
Myers 算法是一种寻找两个序列之间最短编辑脚本（Shortest Edit Script, SES）的经典算法。它的时间复杂度为 `O(ND)`，其中 `N` 是序列长度，`D` 是差异数量。对于法律文本这种大部分内容相同、仅有少量修改的场景，效率极高。

### 2. 处理流程 (Processing Pipeline)

当后端接收到对比请求时，数据流经以下步骤：

1.  **预处理 (Preprocessing)**:
    -   规范化文本（去除多余空白）。
    -   **分词**: 调用 `jieba-rs` 对文本进行切词，生成 Token 序列。

2.  **Diff 计算 (Diff Calculation)** (`src/diff/mod.rs`):
    -   使用 `similar::TextDiff` 对比两个 Token 序列。
    -   生成原始的 Change 列表 (Insert, Delete, Equal)。
    -   **合并逻辑**: 也就是 `merge_adjacent_changes` 函数。我们会自动检测相邻的 "删除" 和 "新增"，如果它们位置紧邻，则将其合并为 "修改 (Modify)" 操作。这对于前端展示非常重要，因为它能告诉用户"这一段被改成了那一段"，而不是"删了这一段，又加了那一段"。

3.  **实体识别 (NER)** (`src/nlp/ner.rs`):
    -   并行运行 NER 引擎（Regex 或 BERT）。
    -   识别文本中的关键实体（如 `2023年5月1日`，`5000元`）。
    -   这些实体信息会被附带在 Diff 结果中，前端可用于高亮显示。

4.  **结构化对齐 (Structural Alignment)** (可选):
    -   如果请求包含结构化分析，系统会先解析 AST（章节条款项）。
    -   然后基于 AST 的层级结构进行对比，而不是纯文本对比。这能处理"整条移动"或"整章删除"的复杂情况。

> *[Placeholder: Screenshot or Diagram showing the data pipeline: Request -> Tokenizer -> Myers Diff -> Merge Logic -> Response]*

## 项目结构

```
backend/
├── src/
│   ├── main.rs          # 服务器入口点
│   ├── models/          # 数据结构定义 (Change, DiffResult, etc.)
│   ├── api/             # REST API 路由处理
│   ├── diff/            # 核心比对算法与结果合并逻辑
│   ├── nlp/             # 自然语言处理 (分词, NER)
│   └── ast/             # 法律文本 AST 解析器
└── Cargo.toml           # 依赖管理
```

## API 接口

### POST `/api/compare`
最核心的接口。

**请求 (Request):**
```json
{
  "old_text": "第一条 为了规范...",
  "new_text": "第一条 为了更好地规范...",
  "options": {
    "type": "git" // 或 "structure"
  }
}
```

**响应 (Response):**
```json
{
  "similarity": 0.95,
  "changes": [
    { "type": "equal", "content": "第一条 为了" },
    { "type": "add", "content": "更好地" },
    { "type": "equal", "content": "规范..." }
  ]
}
```

## 部署与运行

1.  **构建**: `cargo build --release`
2.  **运行**: `cargo run --release`
3.  **环境要求**: Linux/macOS/Windows, Rust 1.70+

## 性能优化

- **零拷贝**: 尽量使用 Rust 的引用和切片，减少字符串复制。
- **Lazy Initialization**: Jieba 分词实例和 NER 模型全局只初始化一次。
- **Async/Await**: 基于 Tokio 的全异步处理，支持高并发请求。
