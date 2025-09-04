from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict

from app.models import APIResponse
from app.auth import get_current_user
from app.services.history_service import history_service


router = APIRouter()


@router.get("/novels/{novel_id}/histories", response_model=APIResponse)
async def list_histories(novel_id: str, current_user: Dict = Depends(get_current_user)):
    try:
        items = history_service.list_histories(novel_id)
        return APIResponse(ok=True, data={"histories": items})
    except Exception as e:
        return APIResponse(ok=False, error={"code": "500", "msg": f"获取历史背景失败: {str(e)}"})


@router.post("/novels/{novel_id}/histories", response_model=APIResponse)
async def create_history(novel_id: str, payload: Dict, current_user: Dict = Depends(get_current_user)):
    try:
        hid = history_service.create_history(novel_id, payload)
        if not hid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="创建失败")
        return APIResponse(ok=True, data={"history_id": hid})
    except HTTPException as e:
        return APIResponse(ok=False, error={"code": str(e.status_code), "msg": e.detail})
    except Exception as e:
        return APIResponse(ok=False, error={"code": "500", "msg": f"创建失败: {str(e)}"})


@router.get("/novels/{novel_id}/histories/{history_id}", response_model=APIResponse)
async def get_history(novel_id: str, history_id: str, current_user: Dict = Depends(get_current_user)):
    try:
        data = history_service.get_history(novel_id, history_id)
        if not data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="不存在")
        return APIResponse(ok=True, data={"history": data})
    except HTTPException as e:
        return APIResponse(ok=False, error={"code": str(e.status_code), "msg": e.detail})
    except Exception as e:
        return APIResponse(ok=False, error={"code": "500", "msg": f"获取失败: {str(e)}"})


@router.put("/novels/{novel_id}/histories/{history_id}", response_model=APIResponse)
async def update_history(novel_id: str, history_id: str, payload: Dict, current_user: Dict = Depends(get_current_user)):
    try:
        ok = history_service.update_history(novel_id, history_id, payload)
        if not ok:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="更新失败")
        return APIResponse(ok=True, data={"updated": True})
    except HTTPException as e:
        return APIResponse(ok=False, error={"code": str(e.status_code), "msg": e.detail})
    except Exception as e:
        return APIResponse(ok=False, error={"code": "500", "msg": f"更新失败: {str(e)}"})


@router.delete("/novels/{novel_id}/histories/{history_id}", response_model=APIResponse)
async def delete_history(novel_id: str, history_id: str, current_user: Dict = Depends(get_current_user)):
    try:
        ok = history_service.delete_history(novel_id, history_id)
        if not ok:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="删除失败")
        return APIResponse(ok=True, data={"deleted": True})
    except HTTPException as e:
        return APIResponse(ok=False, error={"code": str(e.status_code), "msg": e.detail})
    except Exception as e:
        return APIResponse(ok=False, error={"code": "500", "msg": f"删除失败: {str(e)}"})


