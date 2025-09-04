from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import logging

from app.config import settings
from app.api import auth, novels, chapters, characters, ai, sync, tunnel, utils, versions, timeline, stats, power, reminders, writing, character_design

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(settings.LOGS_PATH, "app.log")),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# 创建FastAPI应用
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="小说写作云端平台 - 支持多设备同步和AI辅助",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None
)

# CORS中间件配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS + ["*"] if settings.DEBUG else settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件服务
static_dir = "static"
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

app.mount("/static", StaticFiles(directory=static_dir), name="static")

# 注册API路由
app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(novels.router, prefix="/api/novels", tags=["小说管理"])
app.include_router(chapters.router, prefix="/api", tags=["章节管理"])
app.include_router(characters.router, prefix="/api", tags=["角色管理"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI辅助"])
app.include_router(sync.router, prefix="/api/sync", tags=["同步"])
app.include_router(tunnel.router, prefix="/api/tunnel", tags=["隧道穿透"])
app.include_router(utils.router, prefix="/api/utils", tags=["工具"])
app.include_router(versions.router, prefix="/api", tags=["版本管理"])
app.include_router(timeline.router, prefix="/api", tags=["时间线管理"])
app.include_router(stats.router, prefix="/api", tags=["写作统计"])
app.include_router(power.router, prefix="/api", tags=["力量体系"])
app.include_router(reminders.router, prefix="/api", tags=["写作提醒"])
app.include_router(writing.router, prefix="/api/writing", tags=["写作管理"])
app.include_router(character_design.router, prefix="/api/character-design", tags=["角色设计"])

@app.get("/")
async def root():
    return {
        "message": f"{settings.APP_NAME} API is running",
        "version": settings.VERSION,
        "docs": "/docs" if settings.DEBUG else "disabled"
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "novel_repo": os.path.exists(settings.NOVEL_REPO_PATH)
    }

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting {settings.APP_NAME} on {settings.HOST}:{settings.PORT}")
    uvicorn.run(app, host=settings.HOST, port=settings.PORT) 