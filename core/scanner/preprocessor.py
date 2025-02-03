import cv2
import numpy as np
from core.config import settings

class ImagePreprocessor:
    @staticmethod
    def resize_image(image: np.ndarray) -> np.ndarray:
        height, width = image.shape[:2]
        scale = min(settings.MAX_IMAGE_SIZE / max(height, width), 1.0)
        if scale != 1.0:
            new_height = int(height * scale)
            new_width = int(width * scale)
            return cv2.resize(image, (new_width, new_height), 
                            interpolation=cv2.INTER_AREA)
        return image

    @staticmethod
    def enhance_image(image: np.ndarray) -> np.ndarray:
        # 转换为灰度图
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # 自适应直方图均衡化
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        gray = clahe.apply(gray)
        
        # 降噪
        denoised = cv2.fastNlMeansDenoising(gray)
        
        # 自适应阈值处理
        thresh = cv2.adaptiveThreshold(
            denoised, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )
        
        # 形态学操作
        kernel = np.ones((1, 1), np.uint8)
        processed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        return processed 