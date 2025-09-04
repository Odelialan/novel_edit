from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict

from app.models import APIResponse
from app.auth import get_current_user
from app.services.power_service import power_service


router = APIRouter()


@router.get("/novels/{novel_id}/powers", response_model=APIResponse)
async def list_powers(novel_id: str, current_user: Dict = Depends(get_current_user)):
    try:
        items = power_service.list_powers(novel_id)
        return APIResponse(ok=True, data={"powers": items})
    except HTTPException as e:
        return APIResponse(ok=False, error={"code": str(e.status_code), "msg": e.detail})
    except Exception as e:
        return APIResponse(ok=False, error={"code": "500", "msg": f"获取力量体系失败: {str(e)}"})


@router.post("/novels/{novel_id}/powers", response_model=APIResponse)
async def create_power(novel_id: str, payload: Dict, current_user: Dict = Depends(get_current_user)):
    try:
        pid = power_service.create_power(novel_id, payload)
        if not pid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="创建失败")
        return APIResponse(ok=True, data={"power_id": pid})
    except HTTPException as e:
        return APIResponse(ok=False, error={"code": str(e.status_code), "msg": e.detail})
    except Exception as e:
        return APIResponse(ok=False, error={"code": "500", "msg": f"创建失败: {str(e)}"})


@router.get("/novels/{novel_id}/powers/{power_id}", response_model=APIResponse)
async def get_power(novel_id: str, power_id: str, current_user: Dict = Depends(get_current_user)):
    try:
        data = power_service.get_power(novel_id, power_id)
        if not data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="不存在")
        return APIResponse(ok=True, data={"power": data})
    except HTTPException as e:
        return APIResponse(ok=False, error={"code": str(e.status_code), "msg": e.detail})
    except Exception as e:
        return APIResponse(ok=False, error={"code": "500", "msg": f"获取失败: {str(e)}"})


@router.put("/novels/{novel_id}/powers/{power_id}", response_model=APIResponse)
async def update_power(novel_id: str, power_id: str, payload: Dict, current_user: Dict = Depends(get_current_user)):
    try:
        ok = power_service.update_power(novel_id, power_id, payload)
        if not ok:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="更新失败")
        return APIResponse(ok=True, data={"updated": True})
    except HTTPException as e:
        return APIResponse(ok=False, error={"code": str(e.status_code), "msg": e.detail})
    except Exception as e:
        return APIResponse(ok=False, error={"code": "500", "msg": f"更新失败: {str(e)}"})


@router.delete("/novels/{novel_id}/powers/{power_id}", response_model=APIResponse)
async def delete_power(novel_id: str, power_id: str, current_user: Dict = Depends(get_current_user)):
    try:
        ok = power_service.delete_power(novel_id, power_id)
        if not ok:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="删除失败")
        return APIResponse(ok=True, data={"deleted": True})
    except HTTPException as e:
        return APIResponse(ok=False, error={"code": str(e.status_code), "msg": e.detail})
    except Exception as e:
        return APIResponse(ok=False, error={"code": "500", "msg": f"删除失败: {str(e)}"})


