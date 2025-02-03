import os
import logging
from src.scanner import ReceiptScanner
import time

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    # 创建receipts目录（如果不存在）
    receipts_dir = "receipts"
    os.makedirs(receipts_dir, exist_ok=True)
    
    # 初始化扫描器
    scanner = ReceiptScanner()
    
    # 检查receipts目录是否为空
    if not any(os.scandir(receipts_dir)):
        logger.warning(f"目录 {receipts_dir} 为空，请添加图片后再运行")
        return
    
    # 记录开始时间
    start_time = time.time()
    
    # 扫描目录中的所有图片
    results = scanner.scan_directory(receipts_dir)
    
    # 计算处理时间
    elapsed_time = time.time() - start_time
    
    # 输出结果
    logger.info(f"处理完成 {len(results)} 个文件，用时 {elapsed_time:.2f} 秒")
    
    # 保存识别结果
    output_dir = "output"
    os.makedirs(output_dir, exist_ok=True)
    
    for result in results:
        filename = os.path.basename(result['path'])
        output_path = os.path.join(output_dir, f"{os.path.splitext(filename)[0]}_ocr.txt")
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(result['text'])
        
        logger.info(f"结果已保存到: {output_path}")

if __name__ == "__main__":
    main() 