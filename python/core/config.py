from pathlib import Path
import torch

class Settings:
    # 项目路径
    BASE_DIR = Path(__file__).parent.parent
    
    # 目录配置
    RECEIPTS_DIR = BASE_DIR / "receipts"
    OUTPUT_DIR = BASE_DIR / "output"
    MODELS_DIR = BASE_DIR / "models"
    LOGS_DIR = BASE_DIR / "logs"
    
    # OCR配置
    OCR_LANGUAGES = ['ja', 'en']
    USE_GPU = torch.cuda.is_available()
    
    # 图像处理配置
    MIN_IMAGE_SIZE = 800
    MAX_IMAGE_SIZE = 2400
    
    # API配置
    API_HOST = "0.0.0.0"
    API_PORT = 8000
    
    def __init__(self):
        # 创建必要的目录
        self.RECEIPTS_DIR.mkdir(exist_ok=True)
        self.OUTPUT_DIR.mkdir(exist_ok=True)
        self.MODELS_DIR.mkdir(exist_ok=True)
        self.LOGS_DIR.mkdir(exist_ok=True)

settings = Settings() 