# 日本票据识别系统 (Japanese Receipt Scanner)

这个项目用于识别日本各类票据（购物小票、餐饮单据、水电气费账单、交通费用等）中的明细信息。

## 项目结构

```
receipt-scanner/
├── api/                    # API相关代码
│   ├── __init__.py
│   ├── routes/            # API路由
│   │   ├── __init__.py
│   │   └── receipt.py     # 票据相关接口
│   └── schemas/           # 数据模型
│       ├── __init__.py
│       └── receipt.py
├── core/                  # 核心功能
│   ├── __init__.py
│   ├── config.py         # 配置文件
│   ├── scanner/          # 扫描识别相关
│   │   ├── __init__.py
│   │   ├── ocr.py       # OCR引擎
│   │   └── preprocessor.py  # 图像预处理
│   └── utils/            # 工具函数
│       ├── __init__.py
│       ├── image.py      # 图像处理工具
│       └── logger.py     # 日志工具
├── models/               # 模型存储目录
├── receipts/            # 票据图片存放目录
├── output/              # 输出结果目录
├── logs/                # 日志目录
├── tests/               # 测试代码
│   ├── __init__.py
│   └── test_scanner.py
├── main.py              # 主程序入口
├── api_server.py        # API服务入口
└── requirements.txt     # 项目依赖
```

## 功能特点

- 支持多种票据类型：
  - 购物小票 (スーパー、コンビニ等)
  - 餐饮单据 (飲食店の領収書)
  - 水电气费账单 (公共料金の請求書)
  - 交通费用票据 (交通費の領収書)
- 自动识别并提取关键信息：
  - 商家信息
  - 日期时间
  - 商品明细
  - 金额
  - 税额
  - 支付方式
- 支持图片格式：JPG、PNG、PDF
- 数据导出：CSV、Excel格式

## 安装要求

### 系统要求

- Python 3.8+
- CUDA支持（推荐使用GPU加速）
- 足够的磁盘空间（用于存储模型和处理图片）

### 安装步骤

1. 克隆项目：
```bash
git clone https://github.com/yourusername/receipt-scanner.git
cd receipt-scanner
```

2. 创建虚拟环境（可选但推荐）：
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate  # Windows
```

3. 安装依赖：
```bash
pip install -r requirements.txt
```

## 使用方法

### 本地处理模式

1. 将需要识别的票据图片放入 `receipts` 文件夹

2. 运行主程序：
```bash
python main.py
```

3. 处理结果将保存在 `output` 文件夹中

#### 命令行参数

可以使用命令行参数指定输入和输出目录：

```bash
# 使用默认目录（receipts 和 output）
python main.py

# 指定输入目录
python main.py --input /path/to/receipts

# 指定输出目录
python main.py --output /path/to/output

# 同时指定输入和输出目录
python main.py --input /path/to/receipts --output /path/to/results

# 使用缩写形式
python main.py -i /path/to/receipts -o /path/to/results
```

**参数说明：**

| 参数 | 缩写 | 说明 | 默认值 |
|------|------|------|--------|
| `--input` | `-i` | 输入目录路径（票据图片存放位置） | `receipts` |
| `--output` | `-o` | 输出目录路径（识别结果保存位置） | `output` |

### API服务模式

1. 启动API服务：
```bash
python api_server.py
```

2. API服务将在 http://localhost:8000 启动

3. 访问 http://localhost:8000/docs 查看API文档

### API接口说明

#### 上传并识别票据

- 接口：POST /api/v1/receipts/scan
- 请求格式：multipart/form-data
- 参数：file（图片文件）

```bash
# 使用curl测试
curl -X POST "http://localhost:8000/api/v1/receipts/scan" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@/path/to/receipt.jpg"
```

## 日志查看

- 程序运行日志保存在 `logs` 目录下
- 可通过查看日志文件了解程序运行状态和错误信息

## 注意事项

1. 图片要求：
   - 清晰度要求：至少300DPI
   - 支持格式：JPG、PNG、PDF
   - 建议大小：不超过4MB

2. 性能优化：
   - 使用GPU可显著提升处理速度
   - 批量处理时建议预留足够的系统内存

3. 网络要求：
   - 首次运行需要下载模型文件（约1GB）
   - API服务模式需要稳定的网络环境

## 常见问题

1. 模型下载失败
   - 检查网络连接
   - 尝试使用代理服务器
   - 手动下载模型文件并放入models目录

2. 识别准确率不高
   - 确保图片质量良好
   - 调整预处理参数
   - 使用更新的模型版本

3. GPU内存不足
   - 降低batch_size
   - 减小最大图片尺寸
   - 使用内存更大的GPU

