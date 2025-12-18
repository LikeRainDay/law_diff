use similar::TextDiff;
use std::collections::HashSet;

/// Legal keywords that carry significant weight in similarity calculation
const LEGAL_KEYWORDS: &[&str] = &[
    "应当", "不得", "禁止", "违反", "处罚", "罚款",
    "吊销", "责令", "没收", "承担", "赔偿", "登记",
    "备案", "审批", "许可", "撤销", "行政", "民事",
    "刑事", "法律", "规定", "依法", "权利", "义务",
];

/// Multi-dimensional similarity score
#[derive(Debug, Clone)]
pub struct SimilarityScore {
    /// Character-level similarity (0.0 - 1.0)
    pub char_similarity: f32,
    /// Token-based Jaccard coefficient (0.0 - 1.0)
    pub jaccard_similarity: f32,
    /// Legal keyword overlap weight (0.0 - 1.0)
    pub keyword_weight: f32,
    /// Final composite score (0.0 - 1.0)
    pub composite: f32,
}

impl SimilarityScore {
    /// Create a new similarity score with calculated composite
    pub fn new(char_sim: f32, jaccard_sim: f32, keyword_weight: f32) -> Self {
        // Weighted average: 40% char, 40% jaccard, 20% keyword
        let composite = char_sim * 0.4 + jaccard_sim * 0.4 + keyword_weight * 0.2;

        Self {
            char_similarity: char_sim,
            jaccard_similarity: jaccard_sim,
            keyword_weight,
            composite,
        }
    }
}

/// Calculate character-level similarity using the similar crate
pub fn calculate_char_similarity(text1: &str, text2: &str) -> f32 {
    TextDiff::from_words(text1, text2).ratio() as f32
}

/// Calculate Jaccard similarity coefficient based on token sets
///
/// Jaccard = |A ∩ B| / |A ∪ B|
pub fn calculate_jaccard_similarity(tokens1: &HashSet<String>, tokens2: &HashSet<String>) -> f32 {
    if tokens1.is_empty() && tokens2.is_empty() {
        return 1.0; // Both empty = identical
    }

    if tokens1.is_empty() || tokens2.is_empty() {
        return 0.0; // One empty = no similarity
    }

    let intersection = tokens1.intersection(tokens2).count();
    let union = tokens1.union(tokens2).count();

    if union == 0 {
        return 0.0;
    }

    intersection as f32 / union as f32
}

/// Calculate legal keyword weight based on keyword overlap
/// This gives extra weight when important legal terms are preserved
pub fn calculate_legal_keyword_weight(text1: &str, text2: &str) -> f32 {
    let keywords1: HashSet<&str> = LEGAL_KEYWORDS.iter()
        .filter(|&kw| text1.contains(kw))
        .copied()
        .collect();

    let keywords2: HashSet<&str> = LEGAL_KEYWORDS.iter()
        .filter(|&kw| text2.contains(kw))
        .copied()
        .collect();

    if keywords1.is_empty() && keywords2.is_empty() {
        return 0.5; // No keywords in either = neutral weight
    }

    let intersection = keywords1.intersection(&keywords2).count();
    let union = keywords1.union(&keywords2).count();

    if union == 0 {
        return 0.5;
    }

    intersection as f32 / union as f32
}

/// Calculate comprehensive similarity score combining multiple dimensions
pub fn calculate_composite_similarity(
    text1: &str,
    text2: &str,
    tokens1: &HashSet<String>,
    tokens2: &HashSet<String>,
) -> SimilarityScore {
    let char_sim = calculate_char_similarity(text1, text2);
    let jaccard_sim = calculate_jaccard_similarity(tokens1, tokens2);
    let keyword_weight = calculate_legal_keyword_weight(text1, text2);

    SimilarityScore::new(char_sim, jaccard_sim, keyword_weight)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_char_similarity_identical() {
        let text = "第一条 测试内容";
        assert_eq!(calculate_char_similarity(text, text), 1.0);
    }

    #[test]
    fn test_char_similarity_different() {
        let text1 = "完全不同的内容ABC";
        let text2 = "XYZ其他文字";
        let score = calculate_char_similarity(text1, text2);
        assert!(score < 0.3);
    }

    #[test]
    fn test_char_similarity_partial() {
        let text1 = "第一条 应当建立管理制度";
        let text2 = "第一条 应当建立安全管理制度";
        let score = calculate_char_similarity(text1, text2);
        assert!(score > 0.6);
        assert!(score < 1.0);
    }

    #[test]
    fn test_jaccard_empty() {
        let set1 = HashSet::new();
        let set2 = HashSet::new();
        assert_eq!(calculate_jaccard_similarity(&set1, &set2), 1.0);
    }

    #[test]
    fn test_jaccard_no_overlap() {
        let set1: HashSet<String> = ["apple", "banana"].iter().map(|s| s.to_string()).collect();
        let set2: HashSet<String> = ["cat", "dog"].iter().map(|s| s.to_string()).collect();
        assert_eq!(calculate_jaccard_similarity(&set1, &set2), 0.0);
    }

    #[test]
    fn test_jaccard_partial_overlap() {
        let set1: HashSet<String> = ["应当", "建立", "制度"].iter().map(|s| s.to_string()).collect();
        let set2: HashSet<String> = ["应当", "建立", "安全", "制度"].iter().map(|s| s.to_string()).collect();
        let score = calculate_jaccard_similarity(&set1, &set2);
        // Intersection: {应当, 建立, 制度} = 3
        // Union: {应当, 建立, 制度, 安全} = 4
        // Score = 3/4 = 0.75
        assert!((score - 0.75).abs() < 0.01);
    }

    #[test]
    fn test_keyword_weight_with_keywords() {
        let text1 = "违反规定的，应当给予处罚";
        let text2 = "违反规定的，应当给予罚款处罚";
        let weight = calculate_legal_keyword_weight(text1, text2);
        // Both have: 违反, 规定, 应当, 处罚, 罚款
        assert!(weight > 0.7);
    }

    #[test]
    fn test_keyword_weight_no_keywords() {
        let text1 = "普通文本内容";
        let text2 = "另一段文字";
        let weight = calculate_legal_keyword_weight(text1, text2);
        // No keywords = neutral weight 0.5
        assert_eq!(weight, 0.5);
    }

    #[test]
    fn test_composite_similarity() {
        let text1 = "第五条 网络运营者应当建立安全管理制度";
        let text2 = "第五条 网络运营者应当建立管理制度";

        let tokens1: HashSet<String> = ["网络", "运营者", "应当", "建立", "安全", "管理", "制度"]
            .iter().map(|s| s.to_string()).collect();
        let tokens2: HashSet<String> = ["网络", "运营者", "应当", "建立", "管理", "制度"]
            .iter().map(|s| s.to_string()).collect();

        let score = calculate_composite_similarity(text1, text2, &tokens1, &tokens2);

        assert!(score.char_similarity > 0.6);
        assert!(score.jaccard_similarity > 0.8);
        assert!(score.composite > 0.65);
    }
}
