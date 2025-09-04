from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# 通用响应模型
class APIResponse(BaseModel):
    ok: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[Dict[str, str]] = None

# 认证相关模型
class UserSetup(BaseModel):
    password: str
    email: EmailStr

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserInfo(BaseModel):
    email: str
    created_at: datetime

class ChangePassword(BaseModel):
    old_password: str
    new_password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# 小说相关模型
class NovelCreate(BaseModel):
    title: str
    slug: str
    meta: Optional[Dict[str, Any]] = {}

class NovelInfo(BaseModel):
    id: str
    title: str
    slug: str
    meta: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

class NovelOverview(BaseModel):
    novel_info: NovelInfo
    characters_count: int
    chapters_count: int
    outlines_count: int

# 章节相关模型
class ChapterCreate(BaseModel):
    title: str
    order: int
    content: str

class ChapterUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    order: Optional[int] = None

class ChapterInfo(BaseModel):
    id: str
    title: str
    order: int
    novel_id: str
    created_at: datetime
    updated_at: datetime
    file_path: str

# 角色相关模型
class CharacterCreate(BaseModel):
    name: str
    aliases: List[str] = []
    tags: List[str] = []
    importance: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    appearance: Optional[str] = None
    personality: Optional[str] = None
    relationships: List[Dict[str, str]] = []
    notes: Optional[str] = None
    # 角色类型（如：女主角/男主角/女二/男二/女三/男三/配角）
    role_type: Optional[str] = None
    # 结构化设定（可选，包含：身份职业/家庭关系/早年经历/观念信仰/优点/缺点/成就/社会阶层/习惯嗜好等）
    profile: Optional[Dict[str, Any]] = None

class CharacterInfo(BaseModel):
    id: str
    name: str
    aliases: List[str]
    tags: List[str] = []
    importance: Optional[str] = None
    gender: Optional[str]
    age: Optional[int]
    appearance: Optional[str]
    personality: Optional[str]
    relationships: List[Dict[str, str]]
    notes: Optional[str]
    novel_id: str
    created_at: datetime
    updated_at: datetime
    role_type: Optional[str] = None
    profile: Optional[Dict[str, Any]] = None

# AI相关模型
class AIExpandRequest(BaseModel):
    novel_id: str
    prompt_template: str
    input_summary: str
    style: Optional[str] = "default"
    max_tokens: int = 1000

class AIPolishRequest(BaseModel):
    text: str
    preserve_content: bool = True
    style: Optional[str] = "default"

class AISummarizeRequest(BaseModel):
    text: str
    max_sentences: int = 3

class AIResponse(BaseModel):
    result_text: str

class AICharacterGenerateRequest(BaseModel):
    novel_id: str
    # 角色类型（影响提示词选择）
    role_type: Optional[str] = None
    # 已输入的部分字段（从表单传入，用于AI补全）
    seed: Dict[str, Any] = {}
    # 故事信息/标签/设定（可选，增强上下文）
    story_info: Optional[str] = None
    # 指定提示词key（可选，不传则按 role_type 选择默认）
    prompt_key: Optional[str] = None

# 同步相关模型
class SyncPushRequest(BaseModel):
    novel_id: str
    path: str
    content: str
    timestamp: datetime

class SyncPullResponse(BaseModel):
    novel_id: str
    files: Dict[str, Dict[str, Any]]  # path -> {etag, mtime, size}

class VersionInfo(BaseModel):
    version_id: str
    timestamp: datetime
    file_path: str
    
# 隧道相关模型
class TunnelProvider(str, Enum):
    ngrok = "ngrok"
    tailscale = "tailscale" 
    cloudflared = "cloudflared"

class TunnelStartRequest(BaseModel):
    provider: TunnelProvider = TunnelProvider.ngrok

class TunnelResponse(BaseModel):
    public_url: str
    provider: str
    status: str

# 工具相关模型
class ReformatRequest(BaseModel):
    text: str
    novel_id: Optional[str] = None

class ReformatResponse(BaseModel):
    changed: bool
    formatted_text: str
    diff: Optional[str] = None 