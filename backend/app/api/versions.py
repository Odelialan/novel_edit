from fastapi import APIRouter, HTTPException, status, Depends
from app.models import APIResponse
from app.auth import get_current_user
from app.services.file_service import file_service

router = APIRouter()

@router.get("/novels/{novel_id}/versions", response_model=APIResponse)
async def list_versions(
    novel_id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        config = file_service.get_novel_config(novel_id)
        if not config:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="小说不存在")
        versions = file_service.list_versions(novel_id)
        return APIResponse(ok=True, data={"versions": versions})
    except HTTPException as e:
        return APIResponse(ok=False, error={"code": str(e.status_code), "msg": e.detail})
    except Exception as e:
        return APIResponse(ok=False, error={"code": "500", "msg": f"获取版本失败: {str(e)}"})

@router.post("/novels/{novel_id}/versions/{version_id}/restore", response_model=APIResponse)
async def restore_version(
    novel_id: str,
    version_id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        config = file_service.get_novel_config(novel_id)
        if not config:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="小说不存在")
        ok = file_service.restore_version(novel_id, version_id)
        if not ok:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="恢复失败")
        return APIResponse(ok=True, data={"message": "恢复成功"})
    except HTTPException as e:
        return APIResponse(ok=False, error={"code": str(e.status_code), "msg": e.detail})
    except Exception as e:
        return APIResponse(ok=False, error={"code": "500", "msg": f"恢复失败: {str(e)}"})


