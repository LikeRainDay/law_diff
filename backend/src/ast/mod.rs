use regex::Regex;
use std::sync::OnceLock;
use crate::models::{ArticleNode, NodeType};

static CHAPTER_PATTERN: OnceLock<Regex> = OnceLock::new();
static SECTION_PATTERN: OnceLock<Regex> = OnceLock::new();
static ARTICLE_PATTERN: OnceLock<Regex> = OnceLock::new();
static CLAUSE_PATTERN: OnceLock<Regex> = OnceLock::new();
static ITEM_PATTERN: OnceLock<Regex> = OnceLock::new();

fn get_chapter_pattern() -> &'static Regex {
    CHAPTER_PATTERN.get_or_init(|| Regex::new(r"第([一二三四五六七八九十百\d]+)章\s*(.*)").unwrap())
}

fn get_section_pattern() -> &'static Regex {
    SECTION_PATTERN.get_or_init(|| Regex::new(r"第([一二三四五六七八九十百\d]+)节\s*(.*)").unwrap())
}

fn get_article_pattern() -> &'static Regex {
    ARTICLE_PATTERN.get_or_init(|| Regex::new(r"第([一二三四五六七八九十百\d]+)条\s+(.+)").unwrap())
}

fn get_clause_pattern() -> &'static Regex {
    CLAUSE_PATTERN.get_or_init(|| Regex::new(r"（([一二三四五六七八九十\d]+)）\s*(.+)").unwrap())
}

fn get_item_pattern() -> &'static Regex {
    ITEM_PATTERN.get_or_init(|| Regex::new(r"(\d+)\.\s*(.+)").unwrap())
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
    };

    let mut current_chapter: Option<ArticleNode> = None;
    let mut current_section: Option<ArticleNode> = None;
    let mut current_article: Option<ArticleNode> = None;
    let mut current_clause: Option<ArticleNode> = None;

    for line in lines {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        // Check for chapter
        if let Some(caps) = get_chapter_pattern().captures(trimmed) {
            // Save previous chapter if exists
            if let Some(chapter) = current_chapter.take() {
                root.children.push(chapter);
            }

            let number = caps.get(1).unwrap().as_str().to_string();
            let title = caps.get(2).map(|m| m.as_str().to_string());

            current_chapter = Some(ArticleNode {
                node_type: NodeType::Chapter,
                number,
                title,
                content: String::new(),
                children: Vec::new(),
            });
            current_section = None;
            current_article = None;
            current_clause = None;
            continue;
        }

        // Check for section
        if let Some(caps) = get_section_pattern().captures(trimmed) {
            // Save previous section if exists
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
            });
            current_article = None;
            current_clause = None;
            continue;
        }

        // Check for article (条)
        if let Some(caps) = get_article_pattern().captures(trimmed) {
            // Save previous article if exists
            if let Some(article) = current_article.take() {
                if let Some(ref mut section) = current_section {
                    section.children.push(article);
                } else if let Some(ref mut chapter) = current_chapter {
                    chapter.children.push(article);
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
            });
            current_clause = None;
            continue;
        }

        // Check for clause (款)
        if let Some(caps) = get_clause_pattern().captures(trimmed) {
            // Save previous clause if exists
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
            };

            // Add to current clause or article
            if let Some(ref mut clause) = current_clause {
                clause.children.push(item);
            } else if let Some(ref mut article) = current_article {
                article.children.push(item);
            }
        }
    }

    // Save remaining nodes
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
        root.children.push(chapter);
    }

    root
}

#[cfg(test)]
mod tests {
    use super::*;

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
}
