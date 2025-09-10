import os
import json
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

class Settings:
    # 基础配置
    APP_NAME = "Novel Writing Platform"
    VERSION = "1.0.0"
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    
    # 服务器配置
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8000"))
    
    # 安全配置
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
    
    # 文件存储配置（默认定位到项目根下的 novel_repo）
    NOVEL_REPO_PATH = os.getenv("NOVEL_REPO_PATH", "../novel_repo")
    SECRETS_PATH = os.getenv("SECRETS_PATH", "./secrets")
    LOGS_PATH = os.getenv("LOGS_PATH", "./logs")
    MAX_VERSIONS = int(os.getenv("MAX_VERSIONS", "100"))
    
    # AI 配置
    AI_PROVIDER = os.getenv("AI_PROVIDER", "gemini")  # openai|gemini
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    OPENAI_BASE_URL: Optional[str] = os.getenv("OPENAI_BASE_URL")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", "AIzaSyCInbV8U7tLhPr-PU1SCtJ8c0vjv7gtlpQ")
    GEMINI_BASE_URL: Optional[str] = os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com")
    
    # ngrok 配置
    NGROK_AUTHTOKEN: Optional[str] = os.getenv("NGROK_AUTHTOKEN", "31rO5I3GTPQ0afK5dhTYG5Fiedl_5CSrB7fV6ganx8BfwzvaR")
    TUNNEL_TYPE = os.getenv("TUNNEL_TYPE", "none")  # none|ngrok|tailscale
    
    # 数据库配置
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./novel_platform.db")
    
    # CORS配置
    ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]
    
    def __init__(self):
        # 确保必要目录存在
        for path in [self.NOVEL_REPO_PATH, self.SECRETS_PATH, self.LOGS_PATH]:
            os.makedirs(path, exist_ok=True)

        # 从 JSON 文件加载 AI 密钥（若存在）
        try:
            ai_keys_path = os.path.join(self.SECRETS_PATH, "ai_keys.json")
            if os.path.exists(ai_keys_path):
                with open(ai_keys_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                # 若环境变量未设置，则采用文件中的值
                if not self.OPENAI_API_KEY:
                    self.OPENAI_API_KEY = data.get("OPENAI_API_KEY")
                if not self.OPENAI_BASE_URL:
                    self.OPENAI_BASE_URL = data.get("OPENAI_BASE_URL")
                if not self.GEMINI_API_KEY:
                    self.GEMINI_API_KEY = data.get("GEMINI_API_KEY")
                if not self.GEMINI_BASE_URL:
                    self.GEMINI_BASE_URL = data.get("GEMINI_BASE_URL")
        except Exception:
            # 出错时静默继续，使用环境变量
            pass

        # 若未显式指定且已提供 Gemini Key，则默认启用 gemini
        if (self.AI_PROVIDER is None or self.AI_PROVIDER == "mock") and self.GEMINI_API_KEY:
            self.AI_PROVIDER = "gemini"

settings = Settings() 