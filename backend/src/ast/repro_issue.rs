
#[cfg(test)]
mod tests {
    use crate::ast::parse_article;
    use crate::nlp::formatter::normalize_legal_text;
    use crate::models::NodeType;

    #[test]
    fn test_repro_origin_txt_first_articles() {
        // Snippet from origin.txt including TOC
        let raw = r#"目录
　　第一章　总 则
　　第二章　有限责任公司的设立和组织机构
　　第一节　设 立
　　第二节　组织机构
第一章　总 则
　　第一条　为了规范公司的组织和行为，保护公司、股东和债权人的合法权益，维护社会经济秩序，促进社会主义市场经济的发展，制定本法。
　　第二条　本法所称公司是指依照本法在中国境内设立的有限责任公司和股份有限公司。
"#;

        // 1. Normalize
        let normalized = normalize_legal_text(raw);
        // Debug output
        println!("Normalized:\n{}", normalized);

        // 2. Parse
        let ast = parse_article(&normalized);

        // children[0] is Preamble ("目录")
        // children[1] should be the first REAL Chapter
        assert!(ast.children.len() >= 2);
        let chapter = &ast.children[1];
        assert_eq!(chapter.node_type, NodeType::Chapter);
        assert_eq!(chapter.number, "一");

        // Check Articles
        assert_eq!(chapter.children.len(), 2, "Should have 2 articles");
        assert_eq!(chapter.children[0].number, "一");
        assert_eq!(chapter.children[1].number, "二");
    }
    #[test]
    fn test_parse_cross_article_paragraphs() {
        let raw = r#"第六十八条　【国有独资公司的董事会】国有独资公司设董事会，依照本法第四十七条、第六十七条的规定行使职权。董事每届任期不得超过三年。董事会成员中应当有公司职工代表。
　　董事会成员由国有资产监督管理机构委派；但是，董事会成员中的职工代表由公司职工代表大会选举产生。
　　董事会设董事长一人，可以设副董事长。董事长、副董事长由国有资产监督管理机构从董事会成员中指定。
　　第六十九条　【国有独资公司经理】国有独资公司设经理，由董事会聘任或者解聘。经理依照本法第五十条规定行使职权。"#;

        // 1. Normalize
        let normalized = normalize_legal_text(raw);
        println!("Normalized:\n{}", normalized);

        // 2. Parse
        let ast = parse_article(&normalized);

        // We expect 2 articles: 68 and 69.
        assert_eq!(ast.children.len(), 2, "Should have exactly 2 articles");

        let art68 = &ast.children[0];
        assert_eq!(art68.number, "六十八");
        assert!(art68.content.contains("第四十七条"), "Reference to Art 47 should be in content");
        assert!(art68.content.contains("第六十七条"), "Reference to Art 67 should be in content");

        // These paragraphs should be appended to Article 68
        assert!(art68.content.contains("董事会成员由"), "Next paragraph should be in Art 68 content");
        assert!(art68.content.contains("董事会设董事长"), "Third paragraph should be in Art 68 content");

        let art69 = &ast.children[1];
        assert_eq!(art69.number, "六十九");
    }
}
