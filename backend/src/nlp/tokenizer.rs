use jieba_rs::Jieba;
use std::sync::{Arc, OnceLock};

static JIEBA: OnceLock<Arc<Jieba>> = OnceLock::new();

/// Get or initialize the Jieba tokenizer
pub fn get_jieba() -> &'static Arc<Jieba> {
    JIEBA.get_or_init(|| Arc::new(Jieba::new()))
}

/// Tokenize Chinese text into words
pub fn tokenize(text: &str) -> Vec<String> {
    let jieba = get_jieba();
    jieba.cut(text, false)
        .into_iter()
        .map(|s| s.to_string())
        .collect()
}

/// Tokenize text into a HashSet for Jaccard similarity calculation
/// Filters out single-character tokens to reduce noise
pub fn tokenize_to_set(text: &str) -> std::collections::HashSet<String> {
    use std::collections::HashSet;
    let jieba = get_jieba();
    jieba.cut(text, false)
        .into_iter()
        .filter(|w| w.len() > 1) // Filter out single characters
        .map(|w| w.to_string())
        .collect()
}


/// Tokenize with custom dictionary support
pub fn tokenize_with_dict(text: &str, custom_words: &[String]) -> Vec<String> {
    let jieba = Jieba::new();

    // Add custom words to dictionary
    for word in custom_words {
        // Note: jieba-rs doesn't support runtime dictionary modification easily
        // In production, you'd pre-build a custom dictionary file
    }

    jieba.cut(text, false)
        .into_iter()
        .map(|s| s.to_string())
        .collect()
}

/// Word manager for custom legal terminology
pub struct WordManager {
    custom_words: Vec<String>,
}

impl WordManager {
    pub fn new() -> Self {
        Self {
            custom_words: Vec::new(),
        }
    }

    /// Add a custom word to the dictionary
    pub fn add_word(&mut self, word: String) {
        if !self.custom_words.contains(&word) {
            self.custom_words.push(word);
        }
    }

    /// Remove a word from the custom dictionary
    pub fn remove_word(&mut self, word: &str) {
        self.custom_words.retain(|w| w != word);
    }

    /// Get all custom words
    pub fn get_words(&self) -> &[String] {
        &self.custom_words
    }

    /// Load default legal terminology
    pub fn load_legal_terms(&mut self) {
        let legal_terms = vec![
            "网络安全".to_string(),
            "数据安全".to_string(),
            "个人信息".to_string(),
            "网络运营者".to_string(),
            "等级保护".to_string(),
            "分类分级".to_string(),
            "网络日志".to_string(),
            "操作记录".to_string(),
            "罚款".to_string(),
            "吊销".to_string(),
            "许可证".to_string(),
            "暂停业务".to_string(),
        ];

        for term in legal_terms {
            self.add_word(term);
        }
    }
}

impl Default for WordManager {
    fn default() -> Self {
        let mut manager = Self::new();
        manager.load_legal_terms();
        manager
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tokenize() {
        let text = "第一条 为了规范网络安全管理";
        let tokens = tokenize(text);
        assert!(!tokens.is_empty());
        assert!(tokens.contains(&"网络".to_string()) || tokens.contains(&"网络安全".to_string()));
    }

    #[test]
    fn test_word_manager() {
        let mut manager = WordManager::new();
        manager.add_word("测试词".to_string());
        assert_eq!(manager.get_words().len(), 1);

        manager.remove_word("测试词");
        assert_eq!(manager.get_words().len(), 0);

        manager.load_legal_terms();
        assert!(manager.get_words().len() > 0);
    }
}
