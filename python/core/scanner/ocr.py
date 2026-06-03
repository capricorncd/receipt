import easyocr
import torch
from core.config import settings
from core.utils.logger import setup_logger
from core.scanner.preprocessor import ImagePreprocessor
from typing import Dict, List
import cv2

logger = setup_logger(__name__)

class OCREngine:
    def __init__(self):
        self.device = 'cuda' if settings.USE_GPU else 'cpu'
        logger.info(f"使用设备: {self.device}")
        
        self.reader = easyocr.Reader(
            settings.OCR_LANGUAGES,
            gpu=settings.USE_GPU,
            model_storage_directory=str(settings.MODELS_DIR),
            download_enabled=True
        )
        
        self.preprocessor = ImagePreprocessor()

    def process_image(self, image_path: str) -> Dict:
        try:
            # 读取图像
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"无法读取图像: {image_path}")

            # 预处理
            image = self.preprocessor.resize_image(image)
            processed_image = self.preprocessor.enhance_image(image)
            
            # OCR识别
            results = self.reader.readtext(
                processed_image,
                batch_size=4,
                paragraph=True,
                detail=0
            )
            
            return {
                'status': 'success',
                'text': '\n'.join(results)
            }
            
        except Exception as e:
            logger.error(f"处理图像失败: {str(e)}")
            return {
                'status': 'error',
                'error': str(e)
            }

    def __del__(self):
        if hasattr(self, 'reader') and settings.USE_GPU:
            torch.cuda.empty_cache() 