use regex::Regex;
use std::sync::OnceLock;
use std::collections::HashSet;
use crate::models::{ArticleNode, NodeType};

static PART_PATTERN: OnceLock<Regex> = OnceLock::new();
static CHAPTER_PATTERN: OnceLock<Regex> = OnceLock::new();
static SECTION_PATTERN: OnceLock<Regex> = OnceLock::new();
static ARTICLE_PATTERN: OnceLock<Regex> = OnceLock::new();
static CLAUSE_PATTERN: OnceLock<Regex> = OnceLock::new();
static ITEM_PATTERN: OnceLock<Regex> = OnceLock::new();

fn get_part_pattern() -> &'static Regex {
    PART_PATTERN.get_or_init(|| Regex::new(r"^第([一二三四五六七八九十百千万零两\d]+)编").unwrap())
}

fn get_chapter_pattern() -> &'static Regex {
    CHAPTER_PATTERN.get_or_init(|| Regex::new(r"^第([一二三四五六七八九十百千万零两\d]+)章").unwrap())
}

fn get_section_pattern() -> &'static Regex {
    SECTION_PATTERN.get_or_init(|| Regex::new(r"^第([一二三四五六七八九十百千万零两\d]+)节").unwrap())
}

fn get_article_pattern() -> &'static Regex {
    // Capture both number and optional title/content starting with space or bracket
    ARTICLE_PATTERN.get_or_init(|| Regex::new(r"^第([一二三四五六七八九十百千万零两\d]+)条([\s　]*)(.*)").unwrap())
}

fn get_clause_pattern() -> &'static Regex {
    CLAUSE_PATTERN.get_or_init(|| Regex::new(r"^[（(]([一二三四五六七八九十百千万零\d]+)[)）]").unwrap())
}

fn get_item_pattern() -> &'static Regex {
    ITEM_PATTERN.get_or_init(|| Regex::new(r"^(\d+)\.").unwrap())
}

/// Parse legal article text into AST structure
pub fn parse_article(text: &str) -> ArticleNode {
    let lines: Vec<&str> = text.lines().collect();

    let mut root = ArticleNode {
        node_type: NodeType::Article,
        number: "root".into(),
        title: Some("Document Root".into()),
        content: "".into(),
        children: Vec::new(),
        start_line: 0,
    };

    let mut current_part: Option<ArticleNode> = None;
    let mut current_chapter: Option<ArticleNode> = None;
    let mut current_section: Option<ArticleNode> = None;
    let mut current_article: Option<ArticleNode> = None;
    let mut current_clause: Option<ArticleNode> = None;

    let mut preamble_buffer: Vec<String> = Vec::new();
    let mut structure_started = false;
    let mut in_toc = false;
    let mut seen_markers = HashSet::new();

    let is_likely_toc_entry = |text: &str| -> bool {
        let t = text.trim();
        if t.is_empty() { return false; }

        // Classic markers: dots, ellipsis, trailing page numbers
        if t.contains("...") || t.contains("···") || t.contains("..") ||
           t.chars().last().map(|c| c.is_ascii_digit()).unwrap_or(false) {
            return true;
        }

        // Heuristic: Indented structural elements in the preamble are almost always TOC entries
        let is_indented = text.starts_with(' ') || text.starts_with('\u{3000}') || text.starts_with('\t');
        let is_structural = get_chapter_pattern().is_match(t) ||
                           get_section_pattern().is_match(t) ||
                           get_part_pattern().is_match(t) ||
                           get_article_pattern().is_match(t);

        if is_indented && is_structural {
            return true;
        }

        // High-level structural markers (non-article) that are short and appear right after "目录"
        // Articles are usually not in TOC unless they have dots/page numbers or are indented.
        let is_high_structural = get_chapter_pattern().is_match(t) ||
                                get_section_pattern().is_match(t) ||
                                get_part_pattern().is_match(t);

        if is_high_structural && t.chars().count() < 30 {
            return true;
        }

        false
    };

    for (line_idx, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        // TOC Detection
        if !structure_started && (trimmed.contains("目录") || trimmed == "目 录") {
            in_toc = true;
        }

        if let Some(caps) = get_article_pattern().captures(trimmed) {
            let after_marker = caps.get(3).map(|m| m.as_str()).unwrap_or("");
            if !after_marker.starts_with("规定") && !after_marker.starts_with("之") {
                // If we are in TOC, only breakout if this isn't a likely TOC entry
                let should_breakout = if in_toc { !is_likely_toc_entry(line) } else { true };

                if should_breakout {
                    // Inline check_preamble
                    if !structure_started && !preamble_buffer.is_empty() {
                        root.children.push(ArticleNode {
                            node_type: NodeType::Preamble,
                            number: "0".into(),
                            title: Some("序言/目录".into()),
                            content: preamble_buffer.join("\n").into(),
                            children: Vec::new(),
                            start_line: 1,
                        });
                        preamble_buffer.clear();
                    }
                    structure_started = true;
                    in_toc = false;

                    if let Some(clause) = current_clause.take() {
                        if let Some(ref mut article) = current_article { article.children.push(clause); }
                    }
                    if let Some(article) = current_article.take() {
                        if let Some(ref mut section) = current_section { section.children.push(article); }
                        else if let Some(ref mut chapter) = current_chapter { chapter.children.push(article); }
                        else if let Some(ref mut part) = current_part { part.children.push(article); }
                        else { root.children.push(article); }
                    }

                    current_article = Some(ArticleNode {
                        node_type: NodeType::Article,
                        number: caps.get(1).unwrap().as_str().into(),
                        title: None,
                        content: after_marker.trim().into(),
                        children: Vec::new(),
                        start_line: line_idx + 1,
                    });
                    current_clause = None;
                    continue;
                }
            }
        }

        // Structural breakout check for TOC
        if in_toc {
            let is_structural = get_chapter_pattern().is_match(trimmed) ||
                               get_section_pattern().is_match(trimmed) ||
                               get_part_pattern().is_match(trimmed);
            if is_structural {
                let marker = if let Some(caps) = get_chapter_pattern().captures(trimmed) {
                    format!("CH_{}", caps.get(1).unwrap().as_str())
                } else if let Some(caps) = get_section_pattern().captures(trimmed) {
                    format!("SEC_{}", caps.get(1).unwrap().as_str())
                } else if let Some(caps) = get_part_pattern().captures(trimmed) {
                    format!("PART_{}", caps.get(1).unwrap().as_str())
                } else { String::new() };

                if !marker.is_empty() {
                    // Break out of TOC if we see a repeat of a high-level marker (Chapter/Part)
                    // OR if it's clearly not a TOC line (e.g. has body content or lacks TOC characteristics)
                    let is_high_level = marker.starts_with("CH_") || marker.starts_with("PART_");
                    let is_repeat = is_high_level && seen_markers.contains(&marker);
                    let clearly_not_toc = !is_likely_toc_entry(line);

                    if is_repeat || clearly_not_toc {
                        in_toc = false;
                    } else {
                        seen_markers.insert(marker);
                    }
                }
            }
        }

        // 2. High-level Structural Elements (Part, Chapter, Section) - Ignored in TOC
        if !in_toc {
            // Check for Part (编)
            if let Some(caps) = get_part_pattern().captures(trimmed) {
                if !structure_started && !preamble_buffer.is_empty() {
                    root.children.push(ArticleNode {
                        node_type: NodeType::Preamble,
                        number: "0".into(),
                        title: Some("序言/目录".into()),
                        content: preamble_buffer.join("\n").into(),
                        children: Vec::new(),
                        start_line: 1,
                    });
                    preamble_buffer.clear();
                }
                structure_started = true;
                in_toc = false;
                if let Some(clause) = current_clause.take() {
                    if let Some(ref mut article) = current_article { article.children.push(clause); }
                }
                if let Some(article) = current_article.take() {
                    if let Some(ref mut section) = current_section { section.children.push(article); }
                    else if let Some(ref mut chapter) = current_chapter { chapter.children.push(article); }
                    else { root.children.push(article); }
                }
                if let Some(section) = current_section.take() {
                    if let Some(ref mut chapter) = current_chapter { chapter.children.push(section); }
                    else { root.children.push(section); }
                }
                if let Some(chapter) = current_chapter.take() {
                    if let Some(ref mut part) = current_part { part.children.push(chapter); }
                    else { root.children.push(chapter); }
                }

                current_part = Some(ArticleNode {
                    node_type: NodeType::Part,
                    number: caps.get(1).unwrap().as_str().into(),
                    title: caps.get(2).map(|m| m.as_str().into()),
                    content: "".into(),
                    children: Vec::new(),
                    start_line: line_idx + 1,
                });
                current_chapter = None;
                current_section = None;
                current_article = None;
                current_clause = None;
                continue;
            }

            // Check for Chapter (章)
            if let Some(caps) = get_chapter_pattern().captures(trimmed) {
                let after_marker = trimmed.get(caps.get(0).unwrap().end()..).unwrap_or("");
                if !after_marker.starts_with("规定") && !after_marker.starts_with("之") {
                    if !structure_started && !preamble_buffer.is_empty() {
                    root.children.push(ArticleNode {
                        node_type: NodeType::Preamble,
                        number: "0".into(),
                        title: Some("序言/目录".into()),
                        content: preamble_buffer.join("\n").into(),
                        children: Vec::new(),
                        start_line: 1,
                    });
                    preamble_buffer.clear();
                }
                structure_started = true;
                in_toc = false;
                    if let Some(clause) = current_clause.take() {
                        if let Some(ref mut article) = current_article { article.children.push(clause); }
                    }
                    if let Some(article) = current_article.take() {
                        if let Some(ref mut section) = current_section { section.children.push(article); }
                        else if let Some(ref mut chapter) = current_chapter { chapter.children.push(article); }
                        else { root.children.push(article); }
                    }
                    if let Some(section) = current_section.take() {
                        if let Some(ref mut chapter) = current_chapter { chapter.children.push(section); }
                        else { root.children.push(section); }
                    }
                    if let Some(chapter) = current_chapter.take() {
                         if let Some(ref mut part) = current_part { part.children.push(chapter); }
                         else { root.children.push(chapter); }
                    }

                    current_chapter = Some(ArticleNode {
                        node_type: NodeType::Chapter,
                        number: caps.get(1).unwrap().as_str().into(),
                        title: if after_marker.is_empty() { None } else { Some(after_marker.trim().into()) },
                        content: "".into(),
                        children: Vec::new(),
                        start_line: line_idx + 1,
                    });
                    current_section = None;
                    current_article = None;
                    current_clause = None;
                    continue;
                }
            }

            // Check for Section (节)
            if let Some(caps) = get_section_pattern().captures(trimmed) {
                if !structure_started && !preamble_buffer.is_empty() {
                    root.children.push(ArticleNode {
                        node_type: NodeType::Preamble,
                        number: "0".into(),
                        title: Some("序言/目录".into()),
                        content: preamble_buffer.join("\n").into(),
                        children: Vec::new(),
                        start_line: 1,
                    });
                    preamble_buffer.clear();
                }
                structure_started = true;
                in_toc = false;
                if let Some(clause) = current_clause.take() {
                    if let Some(ref mut article) = current_article { article.children.push(clause); }
                }
                if let Some(article) = current_article.take() {
                    if let Some(ref mut section) = current_section { section.children.push(article); }
                    else if let Some(ref mut chapter) = current_chapter { chapter.children.push(article); }
                    else { root.children.push(article); }
                }
                if let Some(section) = current_section.take() {
                    if let Some(ref mut chapter) = current_chapter { chapter.children.push(section); }
                }

                current_section = Some(ArticleNode {
                    node_type: NodeType::Section,
                    number: caps.get(1).unwrap().as_str().into(),
                    title: caps.get(2).map(|m| m.as_str().into()),
                    content: "".into(),
                    children: Vec::new(),
                    start_line: line_idx + 1,
                });
                current_article = None;
                current_clause = None;
                continue;
            }
        }

        if !in_toc {
            // 3. Clause (款)
        if let Some(caps) = get_clause_pattern().captures(trimmed) {
            let full_marker = caps.get(0).unwrap().as_str();
            let after_marker = trimmed.get(full_marker.len()..).unwrap_or("");
            if !after_marker.starts_with("规定") && !after_marker.starts_with("之") {
                if !structure_started && !preamble_buffer.is_empty() {
                    root.children.push(ArticleNode {
                        node_type: NodeType::Preamble,
                        number: "0".into(),
                        title: Some("序言/目录".into()),
                        content: preamble_buffer.join("\n").into(),
                        children: Vec::new(),
                        start_line: 1,
                    });
                    preamble_buffer.clear();
                }
                structure_started = true;
                in_toc = false;
                if let Some(clause) = current_clause.take() {
                    if let Some(ref mut article) = current_article { article.children.push(clause); }
                }
                current_clause = Some(ArticleNode {
                    node_type: NodeType::Clause,
                    number: caps.get(1).unwrap().as_str().into(),
                    title: None,
                    content: format!("{}{}", full_marker, after_marker.trim()).into(),
                    children: Vec::new(),
                    start_line: line_idx + 1,
                });
                continue;
            }
        } }

        if !in_toc {
            // 4. Item (项)
        if let Some(caps) = get_item_pattern().captures(trimmed) {
            let full_marker = caps.get(0).unwrap().as_str();
            let after_marker = trimmed.get(full_marker.len()..).unwrap_or("");
            let item = ArticleNode {
                node_type: NodeType::Item,
                number: caps.get(1).unwrap().as_str().into(),
                title: None,
                content: format!("{}{}", full_marker, after_marker.trim()).into(),
                children: Vec::new(),
                start_line: line_idx + 1,
            };
            if let Some(ref mut clause) = current_clause { clause.children.push(item); }
            else if let Some(ref mut article) = current_article { article.children.push(item); }
            continue;
        } }

        // 5. Fallback: Content continuation
        if !structure_started {
            preamble_buffer.push(trimmed.to_string());
        } else {
            // To append to Arc<str>, we must convert back to String, append, then convert again.
            // This is slightly inefficient but only happens for continuation lines.
            if let Some(ref mut clause) = current_clause {
                let mut content = clause.content.to_string();
                content.push('\n');
                content.push_str(trimmed);
                clause.content = content.into();
            } else if let Some(ref mut article) = current_article {
                let mut content = article.content.to_string();
                content.push('\n');
                content.push_str(trimmed);
                article.content = content.into();
            } else if let Some(ref mut chapter) = current_chapter {
                let mut content = chapter.content.to_string();
                content.push('\n');
                content.push_str(trimmed);
                chapter.content = content.into();
            }
        }
    }

    // Flush remaining nodes in reverse order
    if let Some(clause) = current_clause {
        if let Some(ref mut article) = current_article {
            article.children.push(clause);
        }
    }

    if let Some(article) = current_article {
        if let Some(ref mut section) = current_section {
            section.children.push(article);
        } else if let Some(ref mut chapter) = current_chapter {
            chapter.children.push(article);
        } else if let Some(ref mut part) = current_part {
            part.children.push(article);
        } else {
            root.children.push(article);
        }
    }

    if let Some(section) = current_section {
        if let Some(ref mut chapter) = current_chapter {
            chapter.children.push(section);
        } else {
            root.children.push(section);
        }
    }

    if let Some(chapter) = current_chapter {
        if let Some(ref mut part) = current_part {
            part.children.push(chapter);
        } else {
            root.children.push(chapter);
        }
    }

    if let Some(part) = current_part {
        root.children.push(part);
    }

    // If we finished and still have preamble content that was never flushed
    if !preamble_buffer.is_empty() {
        root.children.insert(0, ArticleNode {
            node_type: NodeType::Preamble,
            number: "0".into(),
            title: Some("序言/目录".into()),
            content: preamble_buffer.join("\n").into(),
            children: Vec::new(),
            start_line: 1,
        });
    }

    prune_empty_nodes(&mut root);
    root
}

/// Recursively remove structural nodes that have no content and no children.
/// This is primarily to remove "Table of Contents" entries that are parsed as structural nodes
/// but contain no actual legal text or articles.
fn prune_empty_nodes(node: &mut ArticleNode) {
    // 1. Prune children first (bottom-up)
    for child in &mut node.children {
        prune_empty_nodes(child);
    }

    // 2. Filter out empty children
    // We only remove Structural Nodes (Part, Chapter, Section).
    // profound Article/Clause/Item/Preamble usually mean something even if empty (though rare).
    // TOC entries appear as empty Chapters/Sections.
    node.children.retain(|child| {
        let is_structural = matches!(
            child.node_type,
            NodeType::Part | NodeType::Chapter | NodeType::Section
        );

        if is_structural {
            let has_content = !child.content.trim().is_empty();
            let has_children = !child.children.is_empty();
            has_content || has_children
        } else {
            true // Keep non-structural nodes (like Preamble, Article)
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::nlp::formatter::normalize_legal_text;

    #[test]
    fn test_parse_simple_article() {
        let text = "第一条 为了规范管理，制定本办法。";
        let ast = parse_article(text);

        assert_eq!(ast.children.len(), 1);
        assert_eq!(ast.children[0].node_type, NodeType::Article);
        assert_eq!(ast.children[0].number.as_ref(), "一");
    }

    #[test]
    fn test_parse_article_with_clauses() {
        let text = r#"第三条 应当履行下列义务：
（一）建立管理制度；
（二）采取技术措施；"#;

        let ast = parse_article(text);
        assert_eq!(ast.children.len(), 1);

        let article = &ast.children[0];
        assert_eq!(article.node_type, NodeType::Article);
        assert_eq!(article.children.len(), 2);
        assert_eq!(article.children[0].node_type, NodeType::Clause);
        assert_eq!(article.children[1].node_type, NodeType::Clause);
    }

    #[test]
    fn test_repro_user_issue_chapter_detection() {
        // User provided raw text with full-width spaces
        let raw = "第一章　总 则\n　　第一条　为了规范公司的组织和行为，保护公司、股东和债权人的合法权益，维护社会经济秩序，促进社会主义市场经济的发展，制定本法。";

        // 1. Normalize
        let normalized = normalize_legal_text(raw);
        println!("Normalized: {:?}", normalized);

        // 2. Parse
        let ast = parse_article(&normalized);
        println!("AST: {:?}", ast);

        // Expectation: Root -> Chapter -> Article
        // NOT Root -> Article (which means Chapter was missed)

        assert!(!ast.children.is_empty(), "Root should have children");

        let first_node = &ast.children[0];
        assert_eq!(first_node.node_type, NodeType::Chapter, "First node should be Chapter");
        assert_eq!(first_node.number.as_ref(), "一", "Chapter number should be 1");

        assert!(!first_node.children.is_empty(), "Chapter should have children");
        let article = &first_node.children[0];
        assert_eq!(article.node_type, NodeType::Article, "Chapter child should be Article");
        assert_eq!(article.number.as_ref(), "一", "Article number should be 1");
    }

    #[test]
    fn test_repro_user_issue_new_modified_article() {
        // New version with titles
        let raw = "第一章　总则\n　　第一条　【立法目的】为了规范公司的组织和行为...";

        let normalized = normalize_legal_text(raw);
        let ast = parse_article(&normalized);

        let chapter = &ast.children[0];
        assert_eq!(chapter.node_type, NodeType::Chapter);

        let article = &chapter.children[0];
        assert_eq!(article.node_type, NodeType::Article);
        assert_eq!(article.number.as_ref(), "一");
        assert!(article.content.contains("【立法目的】"), "Content should contain title");
    }
    #[test]
    fn test_parse_inline_structure_preserved() {
        // User wants "structure preserved", meaning inline clauses stay inline.
        let raw = "第四条 应当履行下列义务：（一）义务一；（二）义务二。";
        // 1. Normalize (should NOT insert newlines for clauses now)
        let normalized = normalize_legal_text(raw);
        assert!(!normalized.contains("\n（一）"), "Formatter should NOT force newline for inline clause");

        // 2. Parse (should NOT create Clause nodes for inline text)
        let ast = parse_article(&normalized);
        let article = &ast.children[0];

        assert_eq!(article.number.as_ref(), "四");
        assert_eq!(article.children.len(), 0, "Inline clauses should not become child nodes");
        assert!(article.content.contains("（一）义务一"), "Content should be preserved inline");
    }

    #[test]
    fn test_parse_article_with_tail_clauses() {
        // Test that clauses followed by a new article are not lost
        let text = r#"第一条 内容：
（一）第一款；
（二）第二款。
第二条 接下来。
"#;
        let ast = parse_article(text);
        assert_eq!(ast.children.len(), 2);

        let art1 = &ast.children[0];
        assert_eq!(art1.children.len(), 2, "Article 1 should have 2 clauses");
        assert!(art1.children[0].content.contains("（一）"), "Marker should be preserved");
        assert!(art1.children[1].content.contains("（二）"), "Marker should be preserved");

        let art2 = &ast.children[1];
        assert_eq!(art2.number.as_ref(), "二");
    }

    #[test]
    fn test_article_renumbering_alignment() {
        use crate::diff::aligner::align_articles;

        let old = "第一条 A\n第二条 B";
        let new = "第一条 新内容\n第二条 A\n第三条 B";

        // Threshold 0.6
        let changes = align_articles(old, new, 0.6, false);

        // Expect:
        // New 1: Added (or Modified if matches something? No, it's new)
        // New 2: Modified (Matched to Old 1)
        // New 3: Modified (Matched to Old 2)

        // Find match for Old 1
        let match_old1 = changes.iter().find(|c| c.old_article.as_ref().map(|a| a.number.as_ref()) == Some("一")).unwrap();
        assert_eq!(match_old1.new_articles.as_ref().unwrap()[0].number.as_ref(), "二", "Old 1 should match New 2 due to similarity");

        let match_old2 = changes.iter().find(|c| c.old_article.as_ref().map(|a| a.number.as_ref()) == Some("二")).unwrap();
        assert_eq!(match_old2.new_articles.as_ref().unwrap()[0].number.as_ref(), "三", "Old 2 should match New 3 due to similarity");
    }

    #[test]
    fn test_parse_articles_with_zero() {
        let text = r#"第二百条 内容
第二百零一条 零一内容
第二百零二条 零二内容
"#;
        let ast = parse_article(text);
        assert_eq!(ast.children.len(), 3);
        assert_eq!(ast.children[1].number.as_ref(), "二百零一");
        assert_eq!(ast.children[2].number.as_ref(), "二百零二");
    }

    #[test]
    fn test_toc_detection() {
        let text = r#"目 录
第一章 总则
（一）第一款
第二章 细则
第一条 正式内容"#;
        let ast = parse_article(text);
        // Expect Preamble then Article 1
        assert_eq!(ast.children.len(), 2);
        assert_eq!(ast.children[0].node_type, NodeType::Preamble);
        assert!(ast.children[0].content.contains("第一章"));
        assert!(ast.children[0].content.contains("第二章"));
        assert!(ast.children[0].content.contains("（一）"));
        assert_eq!(ast.children[1].node_type, NodeType::Article);
        assert_eq!(ast.children[1].number.as_ref(), "一");
    }

    #[test]
    fn test_toc_breakout_repetition() {
        let text = r#"目 录
第一章 总则
第二章 细则
第一章 总则
第一条 正式内容"#;
        let ast = parse_article(text);
        // Expect Preamble (TOC), then Chapter 1, which contains Article 1
        // Children: Preamble, Chapter 1
        assert_eq!(ast.children.len(), 2, "Should have Preamble and Chapter 1");
        assert_eq!(ast.children[0].node_type, NodeType::Preamble);
        assert_eq!(ast.children[1].node_type, NodeType::Chapter);
        assert_eq!(ast.children[1].number.as_ref(), "一");
        assert_eq!(ast.children[1].children.len(), 1);
        assert_eq!(ast.children[1].children[0].number.as_ref(), "一");
    }
}
