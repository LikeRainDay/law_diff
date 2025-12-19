use regex::Regex;
use std::sync::OnceLock;

static FORMAT_PATTERN: OnceLock<Regex> = OnceLock::new();

/// Normalize legal text by ensuring standard structural components (Articles, Clauses)
/// start on their own lines. This improves diff granularity.
pub fn normalize_legal_text(text: &str) -> String {
    // Stage 0: Normalize full-width spaces
    let mut text = text.replace('\u{3000}', " ");

    // Stage 1: Major structural components (编, 章, 节) - always force newline
    let major_re = Regex::new(r"(\s*)(第[一二三四五六七八九十百\d]+[编章节])").unwrap();
    text = major_re.replace_all(&text, "\n$2").to_string();

    // Stage 1.1: Articles (条) - only force newline if they look like a NEW article
    // This means they follow punctuation or are clearly separate.
    // We match Article that follows 。！？ or another newline
    let article_re = Regex::new(r"([。！？])\s*(第[一二三四五六七八九十百\d]+条)").unwrap();
    text = article_re.replace_all(&text, "$1\n$2").to_string();

    // Cleanup: remove empty lines and trim each line
    let mut result = String::new();
    for line in text.lines() {
        let trimmed = line.trim();
        if !trimmed.is_empty() {
            result.push_str(trimmed);
            result.push('\n');
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_articles() {
        let input = "第一条 内容。第二条 内容。";
        let expected = "第一条 内容。\n第二条 内容。\n";
        assert_eq!(normalize_legal_text(input), expected);
    }

    #[test]
    fn test_normalize_clauses() {
        let input = "第一条 内容。（一）款一；（二）款二。";
        // Note: The logic NO LONGER puts newlines before parens for inline clauses
        let expected = "第一条 内容。（一）款一；（二）款二。\n";
        assert_eq!(normalize_legal_text(input), expected);
    }
}
