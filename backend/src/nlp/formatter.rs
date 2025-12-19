use regex::Regex;
use std::sync::OnceLock;

static FORMAT_PATTERN: OnceLock<Regex> = OnceLock::new();

/// Normalize legal text by ensuring standard structural components (Articles, Clauses)
/// start on their own lines. This improves diff granularity.
pub fn normalize_legal_text(text: &str) -> String {
    // Stage 0: Normalize full-width spaces to standard spaces
    let text = text.replace('\u{3000}', " ");

    let pattern = FORMAT_PATTERN.get_or_init(|| {
        // Matches:
        // 1. "第X[条编章节]" (Article, Part, Chapter, Section)
        // 2. "（X）" or "(X)" (Clause in parens)
        // 3. "X." (Item list)
        Regex::new(r"(\s*)(第[一二三四五六七八九十百\d]+[条编章节]|[（(][一二三四五六七八九十\d]+[)）]|\d+\.)").unwrap()
    });

    // Replace matches with a newline + match (if not already at start of line)
    let phase1 = pattern.replace_all(&text, "\n$2").to_string();

    // Cleanup: remove empty lines
    let mut result = String::new();
    for line in phase1.lines() {
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
        // Note: The logic puts newlines before parens
        let expected = "第一条 内容。\n（一）款一；\n（二）款二。\n";
        assert_eq!(normalize_legal_text(input), expected);
    }
}
