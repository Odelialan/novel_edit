from fastapi import APIRouter, HTTPException, status, Depends
from app.models import APIResponse, CharacterCreate, CharacterInfo
from app.auth import get_current_user
from app.services.file_service import file_service

router = APIRouter()

@router.get("/novels/{novel_id}/characters", response_model=APIResponse)
async def list_characters(
    novel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """获取小说的所有角色"""
    try:
        # 检查小说是否存在
        config = file_service.get_novel_config(novel_id)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="小说不存在"
            )
        
        characters = file_service.list_characters(novel_id)
        return APIResponse(ok=True, data={"characters": characters})
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取角色列表失败: {str(e)}"}
        )

@router.post("/novels/{novel_id}/characters", response_model=APIResponse)
async def create_character(
    novel_id: str,
    character_data: CharacterCreate,
    current_user: dict = Depends(get_current_user)
):
    """创建新角色"""
    try:
        # 检查小说是否存在
        config = file_service.get_novel_config(novel_id)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="小说不存在"
            )
        
        # 创建角色数据
        character_dict = character_data.dict()
        character_dict["novel_id"] = novel_id
        
        character_id = file_service.write_character(novel_id, character_dict)
        
        if not character_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="角色创建失败"
            )
        
        return APIResponse(
            ok=True,
            data={
                "message": "角色创建成功",
                "character_id": character_id,
                "character": character_dict
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
            error={"code": "500", "msg": f"创建角色失败: {str(e)}"}
        )

@router.get("/novels/{novel_id}/characters/{character_id}", response_model=APIResponse)
async def get_character(
    novel_id: str,
    character_id: str,
    current_user: dict = Depends(get_current_user)
):
    """获取角色详情"""
    try:
        character = file_service.read_character(novel_id, character_id)
        if not character:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="角色不存在"
            )
        
        return APIResponse(ok=True, data={"character": character})
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取角色失败: {str(e)}"}
        )

@router.put("/novels/{novel_id}/characters/{character_id}", response_model=APIResponse)
async def update_character(
    novel_id: str,
    character_id: str,
    character_data: CharacterCreate,
    current_user: dict = Depends(get_current_user)
):
    """更新角色信息"""
    try:
        # 检查角色是否存在
        existing_character = file_service.read_character(novel_id, character_id)
        if not existing_character:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="角色不存在"
            )
        
        # 更新角色数据（就地覆盖）
        updated_character = existing_character.copy()
        updated_character.update(character_data.dict())
        success = file_service.update_character(novel_id, character_id, updated_character)
        if not success:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="角色更新失败")
        return APIResponse(ok=True, data={"message": "角色更新成功", "character": updated_character})
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"更新角色失败: {str(e)}"}
        )

@router.delete("/novels/{novel_id}/characters/{character_id}", response_model=APIResponse)
async def delete_character(
    novel_id: str,
    character_id: str,
    current_user: dict = Depends(get_current_user)
):
    """删除角色"""
    try:
        # 查找角色文件
        character = file_service.read_character(novel_id, character_id)
        if not character:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="角色不存在"
            )
        
        # 直接调用file_service的删除方法
        success = file_service.delete_character(novel_id, character_id)
        if success:
            return APIResponse(ok=True, data={"message": "角色已删除"})
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="删除角色失败"
            )
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"删除角色失败: {str(e)}"}
        ) 