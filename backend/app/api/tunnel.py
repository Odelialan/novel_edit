from fastapi import APIRouter, HTTPException, status, Depends
from app.models import APIResponse, TunnelStartRequest, TunnelResponse
from app.auth import get_current_user
from app.services.tunnel_service import tunnel_service

router = APIRouter()

@router.post("/start", response_model=APIResponse)
async def start_tunnel(
    request: TunnelStartRequest,
    current_user: dict = Depends(get_current_user)
):
    """启动隧道穿透"""
    try:
        if request.provider == "ngrok":
            result = await tunnel_service.start_ngrok()
            
            if result:
                return APIResponse(
                    ok=True,
                    data={
                        "message": "隧道启动成功",
                        "public_url": result["public_url"],
                        "provider": result["provider"],
                        "status": result["status"]
                    }
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="隧道启动失败"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"暂不支持{request.provider}隧道提供者"
            )
            
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"启动隧道失败: {str(e)}"}
        )

@router.post("/stop", response_model=APIResponse)
async def stop_tunnel(
    current_user: dict = Depends(get_current_user)
):
    """停止隧道穿透"""
    try:
        success = await tunnel_service.stop_ngrok()
        
        if success:
            return APIResponse(
                ok=True,
                data={"message": "隧道已停止"}
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="停止隧道失败"
            )
            
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"停止隧道失败: {str(e)}"}
        )

@router.get("/status", response_model=APIResponse)
async def get_tunnel_status(
    current_user: dict = Depends(get_current_user)
):
    """获取隧道状态"""
    try:
        status_info = await tunnel_service.get_tunnel_status()
        
        return APIResponse(
            ok=True,
            data={
                "tunnels": status_info,
                "active_count": len([t for t in status_info.values() if t.get("status") == "active"])
            }
        )
        
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取隧道状态失败: {str(e)}"}
        ) 