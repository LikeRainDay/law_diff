#[cfg(test)]
mod sorting_tests {
    use super::*;
    use crate::diff::aligner::align_articles;
    use crate::models::ArticleChangeType;

    #[test]
    fn test_sorting_order_mixed_changes() {
        // We construct a scenario where "Added" comes PHYSICALLY before "Modified".
        // If sorting by TYPE (default/insertion), Added (Stage 4) usually comes LAST (or after mod).
        // Wait, Stage 1 is Mod, Stage 5 is Added. So Mod comes before Added by default.
        // We want Added to come BEFORE Mod.

        // Old Text:
        // Article 2
        // Article 3

        // New Text:
        // Article 1 (Added)
        // Article 2 (Modified)
        // Article 3 (Unchanged)

        // Expected Order: Art 1, Art 2, Art 3.
        // Default (Type) Order: Art 2 (Mod), Art 3 (Unchanged), Art 1 (Added).

        let old_text = "第二条 内容 B。\n第三条 内容 C。";
        let new_text = "第一条 内容 A。\n第二条 内容 B Changed。\n第三条 内容 C。";

        let changes = align_articles(old_text, new_text, 0.6, false);

        // Verification
        assert_eq!(changes.len(), 3);

        // Check 1st item -> Should be Art 1 (Added)
        assert_eq!(changes[0].change_type, ArticleChangeType::Added, "First item should be Added Article 1");
        assert_eq!(changes[0].new_articles.as_ref().unwrap()[0].number, "一");

        // Check 2nd item -> Should be Art 2 (Modified)
        assert_eq!(changes[1].change_type, ArticleChangeType::Modified, "Second item should be Modified Article 2");
        assert_eq!(changes[1].old_article.as_ref().unwrap().number, "二");

        // Check 3rd item -> Should be Art 3 (Unchanged)
        assert_eq!(changes[2].change_type, ArticleChangeType::Unchanged, "Third item should be Unchanged Article 3");
    }
}
