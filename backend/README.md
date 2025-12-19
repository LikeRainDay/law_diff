# Law Compare Backend

The high-performance core of the Law Compare system, built with Rust. It provides the heavy-lifting logic for parsing, aligning, and analyzing legal documents.

[中文版本 (Chinese Version)](./README_CN.md)

---

## 🧠 Implementation Principles

### 1. AST (Abstract Syntax Tree) Parsing
The backend transforms raw unstructured legal text into a structured hierarchical tree.
- **Pattern Matching**: Uses optimized regular expressions to identify legal markers (e.g., "第一条", "第十章").
- **State Machine**: A custom parser traverses the text, maintaining a stack of parents (Chapters, Sections) to correctly attribute Article nodes.
- **Normalization**: Handles full-width/half-width characters and varied indentation styles prevalent in official legal publications.

### 2. Intelligent Structural Alignment
This is the core algorithm that links "Old" articles to "New" articles, even when they move.
- **Similarity Matrix**: Computes a weighted score between every article pair using Jaccard Similarity, Containment Score, and Character Overlap.
- **Multi-Stage Matching**:
  1. **Strict 1:1 Match**: Same number and high similarity.
  2. **Renumbering Detection**: High similarity but different numbering.
  3. **Contextual Bonus**: Boosting scores if surrounding articles or parents (titles) match.
  4. **Merge/Split Detection**: N:1 and 1:N patterns identifying complex legislative changes.

### 3. Performance & Concurrency
Engineered for scale and low-latency.
- **Zero-Copy Strings (`Arc<str>`)**: Textual data is wrapped in Atomic Reference Counters. Both versions point to the same memory segment when identical, reducing memory overhead.
- **Tokio Multi-threading**: API requests are handled asynchronously. CPU-intensive alignment tasks are offloaded to `spawn_blocking`.
- **Parallel Processing**: Uses `rayon` to calculate the N x M similarity matrix in parallel.

### 4. NER (Named Entity Recognition)
- A hybrid approach using optimized regex patterns to extract Dates, Amounts, and Legal Terms.
- Helps identify material changes (e.g., fee increases) vs. simple wording tweaks.

---

## 🛠️ Tech Stack
- **Framework**: [Axum](https://github.com/tokio-rs/axum)
- **NLP**: `jieba-rs`
- **Diff**: `similar`
- **Parallelism**: `rayon` & `tokio`
