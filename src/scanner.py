import easyocr
import cv2
import numpy as np
import torch
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class ReceiptScanner:
    def __init__(self):
        # 检查CUDA是否可用
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        logger.info(f"使用设备: {self.device}")
        
        # 初始化OCR读取器，支持日语和英语
        self.reader = easyocr.Reader(
            ['ja', 'en'],
            gpu=True if self.device == 'cuda' else False,
            model_storage_directory='./models',
            download_enabled=True
        )
        
        # 设置图像处理参数
        self.min_size = 800  # 最小图像尺寸
        self.max_size = 2400  # 最大图像尺寸

    def preprocess_image(self, image):
        """增强的图像预处理"""
        # 调整图像大小
        height, width = image.shape[:2]
        scale = min(self.max_size / max(height, width), 1.0)
        if scale != 1.0:
            new_height = int(height * scale)
            new_width = int(width * scale)
            image = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)

        # 转换为灰度图
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # 自适应直方图均衡化
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        gray = clahe.apply(gray)
        
        # 降噪
        denoised = cv2.fastNlMeansDenoising(gray)
        
        # 自适应阈值处理
        thresh = cv2.adaptiveThreshold(
            denoised, 
            255, 
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 
            11, 
            2
        )
        
        # 形态学操作改善文本质量
        kernel = np.ones((1, 1), np.uint8)
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        return thresh

    def scan_directory(self, directory_path):
        """扫描指定目录下的所有图片"""
        directory = Path(directory_path)
        supported_formats = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff'}
        
        results = []
        for image_path in directory.glob('*'):
            if image_path.suffix.lower() in supported_formats:
                try:
                    result = self.scan(str(image_path))
                    results.append({
                        'path': str(image_path),
                        'text': result
                    })
                    logger.info(f"成功处理: {image_path.name}")
                except Exception as e:
                    logger.error(f"处理 {image_path.name} 时出错: {str(e)}")
        
        return results

    def scan(self, image_path):
        """处理单个图片"""
        # 读取图像
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"无法读取图像: {image_path}")

        # 预处理图像
        processed_image = self.preprocess_image(image)
        
        # 执行OCR识别
        try:
            results = self.reader.readtext(
                processed_image,
                batch_size=4,  # 利用GPU并行处理
                paragraph=True,  # 将相邻文本组合成段落
                detail=0  # 只返回文本内容
            )
            
            # 合并文本结果
            text = '\n'.join(results)
            return text
            
        except Exception as e:
            logger.error(f"OCR识别失败: {str(e)}")
            raise

    def __del__(self):
        # 清理GPU内存
        if hasattr(self, 'reader'):
            torch.cuda.empty_cache() 