import os
import json
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from jose import JWTError, jwt
import bcrypt

from app.config import settings
from app.models import UserInfo

# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT 安全依赖
security = HTTPBearer()

class AuthService:
    def __init__(self):
        self.users_file = os.path.join(settings.SECRETS_PATH, "users.json")
        self.ensure_secrets_dir()
    
    def ensure_secrets_dir(self):
        """确保secrets目录存在"""
        os.makedirs(settings.SECRETS_PATH, exist_ok=True)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """验证密码"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """获取密码哈希"""
        return pwd_context.hash(password)
    
    def load_users(self) -> dict:
        """加载用户数据"""
        if not os.path.exists(self.users_file):
            return {}
        try:
            with open(self.users_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    
    def save_users(self, users: dict):
        """保存用户数据"""
        with open(self.users_file, 'w', encoding='utf-8') as f:
            json.dump(users, f, ensure_ascii=False, indent=2, default=str)
    
    def is_setup_required(self) -> bool:
        """检查是否需要初始化设置"""
        users = self.load_users()
        return len(users) == 0
    
    def setup_user(self, email: str, password: str) -> bool:
        """初始化用户（仅在空仓库时允许）"""
        if not self.is_setup_required():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="用户已存在，无法重复初始化"
            )
        
        users = self.load_users()
        user_id = "admin"
        users[user_id] = {
            "email": email,
            "password_hash": self.get_password_hash(password),
            "created_at": datetime.utcnow().isoformat(),
            "is_admin": True
        }
        self.save_users(users)
        return True
    
    def authenticate_user(self, email: str, password: str) -> Optional[dict]:
        """认证用户"""
        users = self.load_users()
        if not users:
            return None
            
        # 查找匹配的邮箱
        user_id = None
        user = None
        for uid, user_data in users.items():
            if user_data["email"] == email:
                user_id = uid
                user = user_data
                break
        
        if not user:
            return None
        
        if self.verify_password(password, user["password_hash"]):
            return {
                "user_id": user_id,
                "email": user["email"],
                "created_at": user["created_at"]
            }
        return None
    
    def create_access_token(self, data: dict) -> str:
        """创建访问令牌"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[dict]:
        """验证令牌"""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id: str = payload.get("user_id")
            if user_id is None:
                return None
            return payload
        except JWTError:
            return None
    
    def change_password(self, user_id: str, old_password: str, new_password: str) -> bool:
        """修改密码"""
        users = self.load_users()
        if user_id not in users:
            return False
        
        user = users[user_id]
        if not self.verify_password(old_password, user["password_hash"]):
            return False
        
        users[user_id]["password_hash"] = self.get_password_hash(new_password)
        self.save_users(users)
        return True
    
    def get_user_info(self, user_id: str) -> Optional[UserInfo]:
        """获取用户信息"""
        users = self.load_users()
        if user_id not in users:
            return None
        
        user = users[user_id]
        return UserInfo(
            email=user["email"],
            created_at=datetime.fromisoformat(user["created_at"])
        )

# 创建认证服务实例
auth_service = AuthService()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """获取当前用户（依赖注入）"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无效的认证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    payload = auth_service.verify_token(token)
    if payload is None:
        raise credentials_exception
    
    return payload 