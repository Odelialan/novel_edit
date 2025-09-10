from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from app.models import APIResponse, NovelCreate, NovelInfo, NovelOverview
from app.auth import get_current_user
from app.services.file_service import file_service

router = APIRouter()

@router.get("", response_model=APIResponse)
async def list_novels(current_user: dict = Depends(get_current_user)):
    """获取小说列表"""
    try:
        # 使用全局 file_service（其内部已按项目根解析路径）
        novels = file_service.list_novels()
        return APIResponse(ok=True, data={"novels": novels})
    except Exception as e:
        print(f"ERROR: Exception in list_novels: {str(e)}")
        import traceback
        traceback.print_exc()
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取小说列表失败: {str(e)}"}
        )

@router.post("", response_model=APIResponse)
async def create_novel(
    novel_data: NovelCreate,
    current_user: dict = Depends(get_current_user)
):
    """创建新小说"""
    try:
        success = file_service.create_novel_directory(
            novel_data.slug, 
            novel_data.title, 
            novel_data.meta
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"小说 '{novel_data.slug}' 已存在"
            )
        
        # 获取创建的小说配置
        config = file_service.get_novel_config(novel_data.slug)
        
        return APIResponse(
            ok=True, 
            data={
                "message": "小说创建成功",
                "novel": {
                    "id": novel_data.slug,
                    "title": novel_data.title,
                    "slug": novel_data.slug,
                    "meta": novel_data.meta,
                    "created_at": config.get("created_at") if config else None
                }
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
            error={"code": "500", "msg": f"创建小说失败: {str(e)}"}
        )

@router.get("/{novel_id}", response_model=APIResponse)
async def get_novel_overview(
    novel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """获取小说概览（包含章节、角色等统计信息）"""
    try:
        # 获取小说配置
        config = file_service.get_novel_config(novel_id)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="小说不存在"
            )
        
        # 获取统计信息
        chapters = file_service.list_chapters(novel_id)
        characters = file_service.list_characters(novel_id)
        
        overview = {
            "novel_info": {
                "id": novel_id,
                "title": config.get("title", novel_id),
                "slug": config.get("slug", novel_id),
                "meta": config.get("meta", {}),
                "created_at": config.get("created_at"),
                "updated_at": config.get("updated_at")
            },
            "chapters": chapters,
            "characters": characters,
            "statistics": {
                "chapters_count": len(chapters),
                "characters_count": len(characters),
                "total_words": sum(chapter.get("size", 0) for chapter in chapters)
            }
        }
        
        return APIResponse(ok=True, data=overview)
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取小说概览失败: {str(e)}"}
        )

@router.get("/{novel_id}/stats/overview", response_model=APIResponse)
async def get_novel_stats_overview(
    novel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """获取小说统计概览（包含基本参数和统计信息）"""
    try:
        # 获取小说配置
        config = file_service.get_novel_config(novel_id)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="小说不存在"
            )
        
        # 获取统计信息
        chapters = file_service.list_chapters(novel_id)
        characters = file_service.list_characters(novel_id)
        
        # 计算字数统计
        total_words = sum(chapter.get("size", 0) for chapter in chapters)
        total_words_no_punctuation = int(total_words * 0.85)  # 估算不含标点的字数
        
        # 获取小说基本参数
        meta = config.get("meta", {})
        
        stats = {
            "title": config.get("title", novel_id),
            "slug": config.get("slug", novel_id),
            "total_words": total_words,
            "total_words_no_punctuation": total_words_no_punctuation,
            "total_chapters": len(chapters),
            "chapters_with_content": len([c for c in chapters if c.get("size", 0) > 0]),
            "last_updated": config.get("updated_at", "未知"),
            "novel_meta": {
                "genre": meta.get("genre", "未设置"),
                "target_length": meta.get("target_length", "未设置"),
                "tags": meta.get("tags", []),
                "description": meta.get("description", "未设置"),
                # 新增小说性质字段
                "plot_points": meta.get("plot_points", []),
                "theme": meta.get("theme", []),
                "world_setting": meta.get("world_setting", []),
                "time_period": meta.get("time_period", []),
                "location": meta.get("location", []),
                "social_context": meta.get("social_context", []),
                "emotional_tone": meta.get("emotional_tone", []),
                "writing_style": meta.get("writing_style", []),
                "target_audience": meta.get("target_audience", []),
                "reader_expectation": meta.get("reader_expectation", []),
                "pov": meta.get("pov", ""),
                "pacing": meta.get("pacing", ""),
                "conflict_type": meta.get("conflict_type", ""),
                "resolution_style": meta.get("resolution_style", "")
            }
        }
        
        return APIResponse(ok=True, data={"stats": stats})
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取小说统计概览失败: {str(e)}"}
        )

@router.put("/{novel_id}", response_model=APIResponse)
async def update_novel(
    novel_id: str,
    novel_data: NovelCreate,
    current_user: dict = Depends(get_current_user)
):
    """更新小说信息"""
    try:
        config = file_service.get_novel_config(novel_id)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="小说不存在"
            )
        
        # 更新配置
        config.update({
            "title": novel_data.title,
            "meta": novel_data.meta
        })
        
        success = file_service.update_novel_config(novel_id, config)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="更新小说配置失败"
            )
        
        return APIResponse(
            ok=True,
            data={"message": "小说信息更新成功", "novel": config}
        )
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"更新小说失败: {str(e)}"}
        ) 

@router.delete("/{novel_id}", response_model=APIResponse)
async def delete_novel(
    novel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """删除小说（移动到仓库 deleted 目录）"""
    try:
        config = file_service.get_novel_config(novel_id)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="小说不存在"
            )
        success = file_service.delete_novel(novel_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="删除小说失败"
            )
        return APIResponse(ok=True, data={"message": "小说已删除"})
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"删除小说失败: {str(e)}"}
        )