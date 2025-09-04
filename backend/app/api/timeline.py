from fastapi import APIRouter, HTTPException, status, Depends
from app.models import APIResponse
from app.auth import get_current_user
from app.services.timeline_service import timeline_service

router = APIRouter()

@router.get("/novels/{novel_id}/timelines", response_model=APIResponse)
async def list_timelines(
    novel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """获取小说的时间线列表"""
    try:
        timelines = timeline_service.list_timelines(novel_id)
        return APIResponse(ok=True, data={"timelines": timelines})
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取时间线失败: {str(e)}"}
        )

@router.post("/novels/{novel_id}/timelines", response_model=APIResponse)
async def create_timeline(
    novel_id: str,
    timeline_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """创建新时间线"""
    try:
        timeline_id = timeline_service.create_timeline(novel_id, timeline_data)
        if not timeline_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="创建时间线失败"
            )
        
        return APIResponse(
            ok=True,
            data={"message": "时间线创建成功", "timeline_id": timeline_id}
        )
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"创建时间线失败: {str(e)}"}
        )

@router.get("/novels/{novel_id}/timelines/{timeline_id}", response_model=APIResponse)
async def get_timeline(
    novel_id: str,
    timeline_id: str,
    current_user: dict = Depends(get_current_user)
):
    """获取时间线详情"""
    try:
        timeline = timeline_service.get_timeline(novel_id, timeline_id)
        if not timeline:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="时间线不存在"
            )
        
        return APIResponse(ok=True, data={"timeline": timeline})
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取时间线失败: {str(e)}"}
        )

@router.post("/novels/{novel_id}/timelines/{timeline_id}/events", response_model=APIResponse)
async def add_event(
    novel_id: str,
    timeline_id: str,
    event_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """添加事件到时间线"""
    try:
        event_id = timeline_service.add_event(novel_id, timeline_id, event_data)
        if not event_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="添加事件失败"
            )
        
        return APIResponse(
            ok=True,
            data={"message": "事件添加成功", "event_id": event_id}
        )
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"添加事件失败: {str(e)}"}
        )

@router.post("/novels/{novel_id}/timelines/{timeline_id}/auto-generate", response_model=APIResponse)
async def auto_generate_events(
    novel_id: str,
    timeline_id: str,
    current_user: dict = Depends(get_current_user)
):
    """自动从章节生成事件"""
    try:
        success = timeline_service.auto_generate_events(novel_id, timeline_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="自动生成事件失败"
            )
        
        return APIResponse(
            ok=True,
            data={"message": "事件自动生成成功"}
        )
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"自动生成事件失败: {str(e)}"}
        )
