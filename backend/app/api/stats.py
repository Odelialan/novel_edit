from fastapi import APIRouter, HTTPException, status, Depends
from app.models import APIResponse
from app.auth import get_current_user
from app.services.stats_service import stats_service

router = APIRouter()

@router.get("/novels/{novel_id}/stats/daily", response_model=APIResponse)
async def get_daily_stats(
    novel_id: str,
    days: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """获取每日写作统计"""
    try:
        stats = stats_service.get_daily_stats(novel_id, days)
        return APIResponse(ok=True, data={"stats": stats})
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取统计失败: {str(e)}"}
        )

@router.get("/novels/{novel_id}/stats/progress", response_model=APIResponse)
async def get_novel_progress(
    novel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """获取小说写作进度"""
    try:
        progress = stats_service.get_novel_progress(novel_id)
        return APIResponse(ok=True, data={"progress": progress})
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取进度失败: {str(e)}"}
        )

@router.get("/novels/{novel_id}/stats/streak", response_model=APIResponse)
async def get_writing_streak(
    novel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """获取连续写作天数"""
    try:
        streak = stats_service.get_writing_streak(novel_id)
        return APIResponse(ok=True, data={"streak": streak})
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取连续天数失败: {str(e)}"}
        )

@router.get("/novels/{novel_id}/stats/goals", response_model=APIResponse)
async def get_writing_goals(
    novel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """获取写作目标"""
    try:
        goals = stats_service.get_writing_goal(novel_id)
        return APIResponse(ok=True, data={"goals": goals})
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取目标失败: {str(e)}"}
        )

@router.post("/novels/{novel_id}/stats/goals", response_model=APIResponse)
async def set_writing_goals(
    novel_id: str,
    goal_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """设置写作目标"""
    try:
        success = stats_service.set_writing_goal(novel_id, goal_data)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="设置目标失败"
            )
        
        return APIResponse(
            ok=True,
            data={"message": "写作目标设置成功"}
        )
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"设置目标失败: {str(e)}"}
        )

@router.post("/novels/{novel_id}/stats/update", response_model=APIResponse)
async def update_daily_stats(
    novel_id: str,
    stats_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """更新每日写作统计"""
    try:
        word_count = stats_data.get("word_count", 0)
        chapters_updated = stats_data.get("chapters_updated", 0)
        writing_time = stats_data.get("writing_time", 0)
        
        success = stats_service.update_daily_stats(
            novel_id, word_count, chapters_updated, writing_time
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="更新统计失败"
            )
        
        return APIResponse(
            ok=True,
            data={"message": "统计更新成功"}
        )
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"更新统计失败: {str(e)}"}
        )

@router.get("/novels/{novel_id}/stats/weekly", response_model=APIResponse)
async def get_weekly_stats(
    novel_id: str,
    weeks: int = 12,
    current_user: dict = Depends(get_current_user)
):
    """获取每周写作统计"""
    try:
        stats = stats_service.get_weekly_stats(novel_id, weeks)
        return APIResponse(ok=True, data={"stats": stats})
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取周统计失败: {str(e)}"}
        )

@router.get("/novels/{novel_id}/stats/monthly", response_model=APIResponse)
async def get_monthly_stats(
    novel_id: str,
    months: int = 12,
    current_user: dict = Depends(get_current_user)
):
    """获取每月写作统计"""
    try:
        stats = stats_service.get_monthly_stats(novel_id, months)
        return APIResponse(ok=True, data={"stats": stats})
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取月统计失败: {str(e)}"}
        )

@router.get("/novels/{novel_id}/stats/yearly", response_model=APIResponse)
async def get_yearly_stats(
    novel_id: str,
    years: int = 3,
    current_user: dict = Depends(get_current_user)
):
    """获取每年写作统计"""
    try:
        stats = stats_service.get_yearly_stats(novel_id, years)
        return APIResponse(ok=True, data={"stats": stats})
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取年统计失败: {str(e)}"}
        )

@router.get("/novels/{novel_id}/stats/comprehensive", response_model=APIResponse)
async def get_comprehensive_stats(
    novel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """获取综合统计数据"""
    try:
        stats = stats_service.get_comprehensive_stats(novel_id)
        return APIResponse(ok=True, data=stats)
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取综合统计失败: {str(e)}"}
        )