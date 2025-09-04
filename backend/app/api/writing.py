from fastapi import APIRouter, HTTPException, status, Depends
from app.models import APIResponse
from app.auth import get_current_user
from app.services.writing_service import writing_service

router = APIRouter()

@router.get("/global/stats", response_model=APIResponse)
async def get_global_writing_stats(
    current_user: dict = Depends(get_current_user)
):
    """获取全局写作统计"""
    try:
        stats = writing_service.get_global_writing_stats()
        return APIResponse(ok=True, data={"stats": stats})
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取全局统计失败: {str(e)}"}
        )

@router.get("/global/goals", response_model=APIResponse)
async def get_global_writing_goals(
    current_user: dict = Depends(get_current_user)
):
    """获取全局写作目标"""
    try:
        goals = writing_service.get_global_writing_goals()
        return APIResponse(ok=True, data={"goals": goals})
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取全局目标失败: {str(e)}"}
        )

@router.post("/global/goals", response_model=APIResponse)
async def update_global_writing_goals(
    goals: dict,
    current_user: dict = Depends(get_current_user)
):
    """更新全局写作目标"""
    try:
        success = writing_service.update_global_writing_goals(goals)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="更新全局目标失败"
            )
        
        return APIResponse(
            ok=True,
            data={"message": "全局写作目标更新成功"}
        )
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"更新全局目标失败: {str(e)}"}
        )

@router.get("/global/daily", response_model=APIResponse)
async def get_global_daily_stats(
    days: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """获取全局每日写作统计"""
    try:
        stats = writing_service.get_global_daily_stats(days)
        return APIResponse(ok=True, data={"stats": stats})
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取每日统计失败: {str(e)}"}
        )

@router.get("/global/novels-progress", response_model=APIResponse)
async def get_global_novels_progress(
    current_user: dict = Depends(get_current_user)
):
    """获取所有小说的进度概览"""
    try:
        novels = writing_service.get_global_novels_progress()
        return APIResponse(ok=True, data={"novels": novels})
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取小说进度失败: {str(e)}"}
        )


@router.get("/novels/{novel_id}/calendar-stats", response_model=APIResponse)
async def get_novel_calendar_stats(
    novel_id: str,
    days: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """获取小说的写作日历统计"""
    try:
        stats = writing_service.get_novel_calendar_stats(novel_id, days)
        return APIResponse(ok=True, data={"stats": stats})
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取日历统计失败: {str(e)}"}
        )
