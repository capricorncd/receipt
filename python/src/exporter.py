import pandas as pd
import json

class DataExporter:
    def export_to_csv(self, data, output_path):
        # 将嵌套的数据结构展平
        flattened_data = []
        for receipt in data:
            base_info = {
                '日付': receipt['date'],
                '時間': receipt['time'],
                '店舗名': receipt['store_name'],
                '合計金額': receipt['total_amount'],
                '税額': receipt['tax_amount'],
                '支払方法': receipt['payment_method'],
                'レシート種類': receipt['type']
            }
            
            # 展开商品明细
            if receipt['items']:
                for item in receipt['items']:
                    row = base_info.copy()
                    row['商品名'] = item['name']
                    row['価格'] = item['price']
                    flattened_data.append(row)
            else:
                flattened_data.append(base_info)

        # 创建DataFrame并保存为CSV
        df = pd.DataFrame(flattened_data)
        df.to_csv(output_path, index=False, encoding='utf-8-sig')

    def export_to_excel(self, data, output_path):
        # 使用与CSV相同的数据结构，但保存为Excel
        flattened_data = []
        for receipt in data:
            base_info = {
                '日付': receipt['date'],
                '時間': receipt['time'],
                '店舗名': receipt['store_name'],
                '合計金額': receipt['total_amount'],
                '税額': receipt['tax_amount'],
                '支払方法': receipt['payment_method'],
                'レシート種類': receipt['type']
            }
            
            if receipt['items']:
                for item in receipt['items']:
                    row = base_info.copy()
                    row['商品名'] = item['name']
                    row['価格'] = item['price']
                    flattened_data.append(row)
            else:
                flattened_data.append(base_info)

        df = pd.DataFrame(flattened_data)
        df.to_excel(output_path, index=False, engine='openpyxl') 