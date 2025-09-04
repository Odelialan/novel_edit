from fastapi import APIRouter, HTTPException, status, Depends
from app.models import APIResponse
from app.auth import get_current_user
from app.services.reminder_service import reminder_service

router = APIRouter()

@router.get("/novels/{novel_id}/reminders/settings", response_model=APIResponse)
async def get_reminder_settings(
    novel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """获取提醒设置"""
    try:
        settings = reminder_service.get_reminder_settings(novel_id)
        return APIResponse(ok=True, data={"settings": settings})
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取提醒设置失败: {str(e)}"}
        )

@router.post("/novels/{novel_id}/reminders/settings", response_model=APIResponse)
async def update_reminder_settings(
    novel_id: str,
    settings: dict,
    current_user: dict = Depends(get_current_user)
):
    """更新提醒设置"""
    try:
        success = reminder_service.update_reminder_settings(novel_id, settings)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="更新提醒设置失败"
            )
        
        return APIResponse(
            ok=True,
            data={"message": "提醒设置更新成功"}
        )
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"更新提醒设置失败: {str(e)}"}
        )

@router.post("/novels/{novel_id}/reminders/check", response_model=APIResponse)
async def check_reminders(
    novel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """检查当前提醒"""
    try:
        reminders = reminder_service.check_reminders(novel_id)
        return APIResponse(ok=True, data={"reminders": reminders})
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"检查提醒失败: {str(e)}"}
        )
