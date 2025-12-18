use crate::diff::aligner::align_articles;
use crate::models::ArticleChangeType;

#[cfg(test)]
mod alignment_tests {
    use super::*;

    #[test]
    fn test_split_scenario() {
        let old_text = "第五条 网络运营者应当建立安全管理制度，采取技术措施。";
        let new_text = "第五条 网络运营者应当建立安全管理制度。\n第六条 网络运营者应当采取技术措施。";

        let changes = align_articles(old_text, new_text);
        assert!(!changes.is_empty(), "Should detect changes for split scenario");
    }

    #[test]
    fn test_merge_scenario() {
        let old_text = "第二十条 应当登记。\n第二十一条 应当备案。";
        let new_text = "第二十条 应当登记和备案。";

        let changes = align_articles(old_text, new_text);
        assert!(!changes.is_empty(), "Should detect merge scenario");
    }

    #[test]
    fn test_renumbered_detection() {
        let old_text = "第五条 测试内容保持不变";
        let new_text = "第六条 测试内容保持不变";

        let changes = align_articles(old_text, new_text);
        let has_high_sim = changes.iter().any(|c| {
            c.similarity.map_or(false, |s| s > 0.8)
        });
        assert!(has_high_sim, "Renumbered should have high similarity");
    }

    #[test]
    fn test_modified_detection() {
        let old_text = "第三条 网络运营者应当制定应急预案。";
        let new_text = "第三条 网络运营者应当制定网络安全应急预案，并定期演练。";

        let changes = align_articles(old_text, new_text);
        assert!(!changes.is_empty(), "Should detect modification");
    }

    #[test]
    fn test_added_deleted() {
        let old_text = "第一条 旧条款内容。\n第二条 将被删除的条款。";
        let new_text = "第一条 旧条款内容。\n第三条 新增的条款。";

        let changes = align_articles(old_text, new_text);
        assert!(!changes.is_empty(), "Should detect added/deleted");
    }

    #[test]
    fn test_unchanged_or_similar() {
        let old_text = "第一条 这是一条完全没有变化的法条。";
        let new_text = "第一条 这是一条完全没有变化的法条。";

        let changes = align_articles(old_text, new_text);

        // Should have at least one change with very high similarity
        let has_high_similarity = changes.iter().any(|c| {
            c.similarity.map_or(false, |s| s >= 0.95)
        });
        assert!(has_high_similarity, "Unchanged text should have high similarity");
    }

    #[test]
    fn test_complex_multi_change() {
        let old_text = r#"第一条 应当建立制度。
第二条 应当采取措施。
第三条 应当加强管理。
第四条 将被删除。"#;

        let new_text = r#"第一条 应当建立健全制度。
第二条 应当采取措施。
第五条 新增条款内容。"#;

        let changes = align_articles(old_text, new_text);
        assert!(changes.len() >= 3, "Should detect multiple changes");
    }
}
