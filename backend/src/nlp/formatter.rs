use regex::Regex;
use std::sync::OnceLock;

static FORMAT_PATTERN: OnceLock<Regex> = OnceLock::new();

/// Normalize legal text by ensuring standard structural components (Articles, Clauses)
/// start on their own lines. This improves diff granularity.
pub fn normalize_legal_text(text: &str) -> String {
    let pattern = FORMAT_PATTERN.get_or_init(|| {
        // Matches:
        // 1. "第X条" (Article)
        // 2. "（X）" or "(X)" (Clause in parens)
        // 3. "X." (Item list)
        // occurring possibly in the middle of a line
        Regex::new(r"(\s*)(第[一二三四五六七八九十百\d]+条|[（(][一二三四五六七八九十\d]+[)）]|\d+\.)").unwrap()
    });

    // Replace matches with a newline + match (if not already at start of line)
    // We do a simple pass: split by the pattern and reconstruct, or use replace_all
    // Logic: If a match is found and it's NOT preceded by a newline (ignoring whitespace), add one.

    // Using regex replace is effective here.
    // We want to make sure we don't double-newline if it's already there.
    // Simpler approach:
    // 1. Replace all matches with "\n" + match
    // 2. Then cleanup multiple newlines

    let phase1 = pattern.replace_all(text, "\n$2").to_string();

    // Cleanup: remove empty lines or excessive newlines potentially created
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
