use regex::Regex;
use std::sync::OnceLock;
use crate::models::{ArticleNode, NodeType};

static PART_PATTERN: OnceLock<Regex> = OnceLock::new();
static CHAPTER_PATTERN: OnceLock<Regex> = OnceLock::new();
static SECTION_PATTERN: OnceLock<Regex> = OnceLock::new();
static ARTICLE_PATTERN: OnceLock<Regex> = OnceLock::new();
static CLAUSE_PATTERN: OnceLock<Regex> = OnceLock::new();
static ITEM_PATTERN: OnceLock<Regex> = OnceLock::new();

fn get_part_pattern() -> &'static Regex {
    PART_PATTERN.get_or_init(|| Regex::new(r"^第([一二三四五六七八九十百\d]+)编\s*(.*)").unwrap())
}

fn get_chapter_pattern() -> &'static Regex {
    CHAPTER_PATTERN.get_or_init(|| Regex::new(r"^第([一二三四五六七八九十百\d]+)章\s*(.*)").unwrap())
}

fn get_section_pattern() -> &'static Regex {
    SECTION_PATTERN.get_or_init(|| Regex::new(r"^第([一二三四五六七八九十百\d]+)节\s*(.*)").unwrap())
}

fn get_article_pattern() -> &'static Regex {
    ARTICLE_PATTERN.get_or_init(|| Regex::new(r"^第([一二三四五六七八九十百\d]+)条\s*(.*)").unwrap())
}

fn get_clause_pattern() -> &'static Regex {
    CLAUSE_PATTERN.get_or_init(|| Regex::new(r"^[（(]([一二三四五六七八九十\d]+)[)）]\s*(.*)").unwrap())
}

fn get_item_pattern() -> &'static Regex {
    ITEM_PATTERN.get_or_init(|| Regex::new(r"^(\d+)\.\s*(.+)").unwrap())
}

/// Parse legal article text into AST structure
pub fn parse_article(text: &str) -> ArticleNode {
    let lines: Vec<&str> = text.lines().collect();

    let mut root = ArticleNode {
        node_type: NodeType::Article,
        number: "root".to_string(),
        title: Some("Document Root".to_string()),
        content: String::new(),
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

    for (line_idx, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        // Helper to flush preamble if needed
        let mut check_preamble = |root: &mut ArticleNode| {
            if !structure_started && !preamble_buffer.is_empty() {
                root.children.push(ArticleNode {
                    node_type: NodeType::Preamble,
                    number: "0".to_string(),
                    title: Some("序言/目录".to_string()),
                    content: preamble_buffer.join("\n"),
                    children: Vec::new(),
                    start_line: 0, // Preamble usually starts at top
                });
                preamble_buffer.clear();
            }
            structure_started = true;
        };

        // Check for Part (编)
        if let Some(caps) = get_part_pattern().captures(trimmed) {
            check_preamble(&mut root);
            // Save previous part if exists (and its children)
            if let Some(mut part) = current_part.take() {
                if let Some(chapter) = current_chapter.take() {
                    part.children.push(chapter);
                }
                root.children.push(part);
            } else if let Some(chapter) = current_chapter.take() {
                // If there was a stray chapter before any part
                root.children.push(chapter);
            }

            let number = caps.get(1).unwrap().as_str().to_string();
            let title = caps.get(2).map(|m| m.as_str().to_string());

            current_part = Some(ArticleNode {
                node_type: NodeType::Part,
                number,
                title,
                content: String::new(),
                children: Vec::new(),
                start_line: line_idx + 1,
            });
            current_chapter = None;
            current_section = None;
            current_article = None;
            current_clause = None;
            continue;
        }

        // Check for chapter
        if let Some(caps) = get_chapter_pattern().captures(trimmed) {
            check_preamble(&mut root);
            if let Some(mut chapter) = current_chapter.take() {
                 if let Some(ref mut part) = current_part {
                    part.children.push(chapter);
                 } else {
                    root.children.push(chapter);
                 }
            } else if let Some(r) = current_section.take() {
                 // edge case cleanup
            }

            let number = caps.get(1).unwrap().as_str().to_string();
            let title = caps.get(2).map(|m| m.as_str().to_string());

            current_chapter = Some(ArticleNode {
                node_type: NodeType::Chapter,
                number,
                title,
                content: String::new(),
                children: Vec::new(),
                start_line: line_idx + 1,
            });
            current_section = None;
            current_article = None;
            current_clause = None;
            continue;
        }

        // Check for section
        if let Some(caps) = get_section_pattern().captures(trimmed) {
            check_preamble(&mut root);
            if let Some(mut section) = current_section.take() {
                if let Some(ref mut chapter) = current_chapter {
                    chapter.children.push(section);
                }
            }

            let number = caps.get(1).unwrap().as_str().to_string();
            let title = caps.get(2).map(|m| m.as_str().to_string());

            current_section = Some(ArticleNode {
                node_type: NodeType::Section,
                number,
                title,
                content: String::new(),
                children: Vec::new(),
                start_line: line_idx + 1,
            });
            current_article = None;
            current_clause = None;
            continue;
        }

        // Check for article (条)
        if let Some(caps) = get_article_pattern().captures(trimmed) {
            check_preamble(&mut root);
            if let Some(article) = current_article.take() {
                if let Some(ref mut section) = current_section {
                    section.children.push(article);
                } else if let Some(ref mut chapter) = current_chapter {
                    chapter.children.push(article);
                } else if let Some(ref mut part) = current_part {
                    part.children.push(article); // Direct article under part
                } else {
                    root.children.push(article);
                }
            }

            let number = caps.get(1).unwrap().as_str().to_string();
            let content = caps.get(2).unwrap().as_str().to_string();

            current_article = Some(ArticleNode {
                node_type: NodeType::Article,
                number,
                title: None,
                content,
                children: Vec::new(),
                start_line: line_idx + 1,
            });
            current_clause = None;
            continue;
        }

        // Check for clause (款)
        if let Some(caps) = get_clause_pattern().captures(trimmed) {
            check_preamble(&mut root); // Theoretically possible for clause start?
            if let Some(clause) = current_clause.take() {
                if let Some(ref mut article) = current_article {
                    article.children.push(clause);
                }
            }

            let number = caps.get(1).unwrap().as_str().to_string();
            let content = caps.get(2).unwrap().as_str().to_string();

            current_clause = Some(ArticleNode {
                node_type: NodeType::Clause,
                number,
                title: None,
                content,
                children: Vec::new(),
                start_line: line_idx + 1,
            });
            continue;
        }

        // Check for item (项)
        if let Some(caps) = get_item_pattern().captures(trimmed) {
            let number = caps.get(1).unwrap().as_str().to_string();
            let content = caps.get(2).unwrap().as_str().to_string();

            let item = ArticleNode {
                node_type: NodeType::Item,
                number,
                title: None,
                content,
                children: Vec::new(),
                start_line: line_idx + 1,
            };

            if let Some(ref mut clause) = current_clause {
                clause.children.push(item);
            } else if let Some(ref mut article) = current_article {
                article.children.push(item);
            }
            continue;
        }

        // Fallback: Preamble or Content continuation
        if !structure_started {
            preamble_buffer.push(trimmed.to_string());
        } else {
            // TODO: Append to current active node's content?
            // Currently we ignore noise lines inside structure to keep it clean,
            // but for legal texts, lines often wrap.
            // Let's safe append to current article/clause if active.
             if let Some(ref mut clause) = current_clause {
                clause.content.push('\n');
                clause.content.push_str(trimmed);
            } else if let Some(ref mut article) = current_article {
                article.content.push('\n');
                article.content.push_str(trimmed);
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
mod repro_issue;

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
        assert_eq!(ast.children[0].number, "一");
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
        assert_eq!(first_node.number, "一", "Chapter number should be 1");

        assert!(!first_node.children.is_empty(), "Chapter should have children");
        let article = &first_node.children[0];
        assert_eq!(article.node_type, NodeType::Article, "Chapter child should be Article");
        assert_eq!(article.number, "一", "Article number should be 1");
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
        assert_eq!(article.number, "一");
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

        assert_eq!(article.number, "四");
        assert_eq!(article.children.len(), 0, "Inline clauses should not become child nodes");
        assert!(article.content.contains("（一）义务一"), "Content should be preserved inline");
    }
}
