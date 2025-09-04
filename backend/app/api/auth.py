from fastapi import APIRouter, HTTPException, status, Depends
from app.models import (
    APIResponse, UserSetup, UserLogin, Token, UserInfo, ChangePassword
)
from app.auth import auth_service, get_current_user

router = APIRouter()

@router.post("/setup", response_model=APIResponse)
async def setup_user(user_data: UserSetup):
    """初始化用户（仅在空仓库时允许）"""
    try:
        auth_service.setup_user(user_data.email, user_data.password)
        return APIResponse(ok=True, data={"message": "用户初始化成功"})
    except HTTPException as e:
        return APIResponse(
            ok=False, 
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"初始化失败: {str(e)}"}
        )

@router.post("/login", response_model=APIResponse)
async def login(user_data: UserLogin):
    """用户登录"""
    try:
        user = auth_service.authenticate_user(user_data.email, user_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="邮箱或密码错误"
            )
        
        access_token = auth_service.create_access_token(
            data={"user_id": user["user_id"], "email": user["email"]}
        )
        
        return APIResponse(
            ok=True, 
            data={
                "token": access_token,
                "token_type": "bearer",
                "user": user
            }
        )
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"登录失败: {str(e)}"}
        )

@router.get("/me", response_model=APIResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """获取当前用户信息"""
    try:
        user_info = auth_service.get_user_info(current_user["user_id"])
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )
        
        return APIResponse(
            ok=True,
            data={
                "email": user_info.email,
                "created_at": user_info.created_at.isoformat()
            }
        )
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取用户信息失败: {str(e)}"}
        )

@router.post("/change-password", response_model=APIResponse)
async def change_password(
    password_data: ChangePassword,
    current_user: dict = Depends(get_current_user)
):
    """修改密码"""
    try:
        success = auth_service.change_password(
            current_user["user_id"],
            password_data.old_password,
            password_data.new_password
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="原密码错误"
            )
        
        return APIResponse(ok=True, data={"message": "密码修改成功"})
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"密码修改失败: {str(e)}"}
        )

@router.post("/reset", response_model=APIResponse)
async def reset_password():
    """重置密码（生成本地重置令牌）"""
    # 本地重置流程：生成一次性token写入secrets/
    # 实际实现中可以生成一个临时token文件，用户需要到服务器上手动确认
    return APIResponse(
        ok=True, 
        data={"message": "密码重置功能需要服务器管理员手动操作"}
    ) 