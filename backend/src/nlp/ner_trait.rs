use crate::models::{Entity, EntityType, Position};
use anyhow::Result;

/// NER (Named Entity Recognition) trait abstraction
/// Allows switching between different NER implementations
pub trait NEREngine: Send + Sync {
    /// Extract named entities from text
    fn extract_entities(&self, text: &str) -> Result<Vec<Entity>>;

    /// Get the name of this NER engine
    fn name(&self) -> &'static str;

    /// Get the typical confidence range for this engine
    fn confidence_range(&self) -> (f32, f32);
}

/// NER engine type configuration
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NERMode {
    /// Fast regex-based NER (85-90% accuracy)
    Regex,
    /// BERT-based NER (95%+ accuracy, requires model)
    #[cfg(feature = "bert")]
    Bert,
    /// Hybrid mode: regex first, BERT for uncertain cases
    #[cfg(feature = "bert")]
    Hybrid,
}

impl Default for NERMode {
    fn default() -> Self {
        Self::Regex
    }
}

impl NERMode {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "regex" => Some(Self::Regex),
            #[cfg(feature = "bert")]
            "bert" => Some(Self::Bert),
            #[cfg(feature = "bert")]
            "hybrid" => Some(Self::Hybrid),
            _ => None,
        }
    }
}

/// Create NER engine based on mode
pub fn create_ner_engine(mode: NERMode) -> Result<Box<dyn NEREngine>> {
    match mode {
        NERMode::Regex => Ok(Box::new(super::regex_ner::RegexNER::new())),
        #[cfg(feature = "bert")]
        NERMode::Bert => {
            let model_path = std::env::var("BERT_MODEL_PATH")
                .unwrap_or_else(|_| "./models/chinese-ner".to_string());
            Ok(Box::new(super::bert_ner::BertNER::new(&model_path)?))
        }
        #[cfg(feature = "bert")]
        NERMode::Hybrid => {
            Ok(Box::new(super::hybrid_ner::HybridNER::new()?))
        }
    }
}
