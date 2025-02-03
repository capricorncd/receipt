from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.scanner.ocr import OCREngine
import uvicorn
from pathlib import Path
import shutil
import uuid

app = FastAPI(title="Receipt Scanner API")

# CORS设置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化OCR引擎
ocr_engine = OCREngine()

@app.post("/api/v1/receipts/scan")
async def scan_receipt(file: UploadFile = File(...)):
    # 生成唯一文件名
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = settings.RECEIPTS_DIR / unique_filename
    
    try:
        # 保存上传的文件
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 处理图像
        result = ocr_engine.process_image(str(file_path))
        
        return {
            "filename": file.filename,
            "result": result
        }
    
    except Exception as e:
        return {"error": str(e)}
    
    finally:
        # 清理临时文件
        if file_path.exists():
            file_path.unlink()

if __name__ == "__main__":
    uvicorn.run(
        "api_server:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True
    ) 