class ReceiptClassifier:
    def __init__(self):
        self.keywords = {
            'shopping': ['スーパー', 'コンビニ', 'レシート', '店舗', '商品'],
            'restaurant': ['飲食', 'レストラン', 'メニュー', '注文', 'お食事'],
            'utility': ['電気', 'ガス', '水道', '料金', '使用量'],
            'transport': ['交通', '運賃', 'バス', '電車', 'タクシー']
        }

    def classify(self, text):
        # 计算每种类型的关键词匹配数
        scores = {
            receipt_type: sum(1 for keyword in keywords if keyword in text)
            for receipt_type, keywords in self.keywords.items()
        }
        
        # 返回匹配度最高的类型
        if any(scores.values()):
            return max(scores.items(), key=lambda x: x[1])[0]
        
        return 'unknown' 