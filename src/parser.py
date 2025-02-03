import re
from datetime import datetime

class ReceiptParser:
    def __init__(self):
        self.patterns = {
            'date': r'\d{4}[-/年]\d{1,2}[-/月]\d{1,2}',
            'time': r'\d{1,2}:\d{2}',
            'amount': r'¥?\d{1,3}(,\d{3})*',
            'tax': r'消費税|税|TAX',
        }

    def parse(self, text, receipt_type):
        lines = text.split('\n')
        
        result = {
            'type': receipt_type,
            'date': self._extract_date(text),
            'time': self._extract_time(text),
            'store_name': self._extract_store_name(lines),
            'items': self._extract_items(lines),
            'total_amount': self._extract_total_amount(lines),
            'tax_amount': self._extract_tax_amount(lines),
            'payment_method': self._extract_payment_method(text)
        }
        
        return result

    def _extract_date(self, text):
        date_match = re.search(self.patterns['date'], text)
        if date_match:
            return date_match.group()
        return None

    def _extract_time(self, text):
        time_match = re.search(self.patterns['time'], text)
        if time_match:
            return time_match.group()
        return None

    def _extract_store_name(self, lines):
        # 通常店名在收据的开头几行
        for line in lines[:5]:
            if len(line.strip()) > 0 and not any(char.isdigit() for char in line):
                return line.strip()
        return None

    def _extract_items(self, lines):
        items = []
        for line in lines:
            # 查找商品名称和价格的模式
            amount_match = re.search(self.patterns['amount'], line)
            if amount_match and not any(keyword in line for keyword in ['合計', '税', 'TOTAL']):
                item_name = line[:amount_match.start()].strip()
                price = amount_match.group().replace('¥', '').replace(',', '')
                if item_name:
                    items.append({
                        'name': item_name,
                        'price': int(price)
                    })
        return items

    def _extract_total_amount(self, lines):
        for line in reversed(lines):
            if '合計' in line or 'TOTAL' in line:
                amount_match = re.search(self.patterns['amount'], line)
                if amount_match:
                    return int(amount_match.group().replace('¥', '').replace(',', ''))
        return None

    def _extract_tax_amount(self, lines):
        for line in lines:
            if re.search(self.patterns['tax'], line):
                amount_match = re.search(self.patterns['amount'], line)
                if amount_match:
                    return int(amount_match.group().replace('¥', '').replace(',', ''))
        return None

    def _extract_payment_method(self, text):
        payment_methods = ['現金', 'クレジット', 'CREDIT', 'カード', 'CARD', '電子マネー']
        for method in payment_methods:
            if method in text:
                return method
        return None 