pub mod tokenizer;
pub mod ner_trait;
pub mod regex_ner;
pub mod bert_ner;

#[cfg(feature = "bert")]
pub mod hybrid_ner;

pub use tokenizer::{tokenize, tokenize_with_dict, WordManager};
pub use ner_trait::{NEREngine, NERMode, create_ner_engine};
pub use regex_ner::RegexNER;
pub use bert_ner::BertNER;

#[cfg(feature = "bert")]
pub use hybrid_ner::HybridNER;

// Convenience function for backward compatibility
pub fn extract_entities(text: &str) -> Vec<crate::models::Entity> {
    let engine = RegexNER::new();
    engine.extract_entities(text).unwrap_or_default()
}
