from fastapi import APIRouter, HTTPException, status, Depends
from app.models import APIResponse, ChapterCreate, ChapterUpdate
from app.auth import get_current_user
from app.services.file_service import file_service
from app.services.stats_service import stats_service
import os
import re

router = APIRouter()

def parse_chapter_filename(filename: str):
    """解析章节文件名，提取order和title"""
    name_without_ext = filename.replace('.txt', '')
    parts = name_without_ext.split('_', 1)
    if len(parts) >= 2 and parts[0].isdigit():
        return int(parts[0]), parts[1]
    return 1, name_without_ext

def calculate_word_count(text: str):
    """计算字数（包含和不包含标点符号）"""
    if not text:
        return {"total": 0, "no_punctuation": 0}
    
    # 总字数
    total_count = len(text.replace('\n', '').replace('\r', '').replace(' ', ''))
    
    # 不含标点符号的字数
    # 定义标点符号
    punctuation = r'[，。！？；：""''（）【】《》、,.\!?\;:"\'\(\)\[\]<>]'
    text_no_punct = re.sub(punctuation, '', text)
    text_no_punct = text_no_punct.replace('\n', '').replace('\r', '').replace(' ', '')
    no_punct_count = len(text_no_punct)
    
    return {
        "total": total_count,
        "no_punctuation": no_punct_count
    }

@router.get("/novels/{novel_id}/chapters", response_model=APIResponse)
async def list_chapters(
    novel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """获取小说章节列表"""
    try:
        # 检查小说是否存在
        config = file_service.get_novel_config(novel_id)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="小说不存在"
            )
        
        # 获取章节文件列表
        chapters_data = file_service.list_chapters(novel_id)
        
        # 格式化章节数据
        chapters = []
        for chapter_file in chapters_data:
            filename = chapter_file["filename"]
            order, title = parse_chapter_filename(filename)
            
            # 读取章节内容以计算字数
            content = file_service.read_chapter(novel_id, filename)
            word_count = calculate_word_count(content or "")
            
            chapters.append({
                "id": filename,  # 使用filename作为ID
                "title": title,
                "order": order,
                "content": content or "",
                "novel_id": novel_id,
                "file_path": chapter_file["path"],
                "created_at": chapter_file["modified_time"],
                "updated_at": chapter_file["modified_time"],
                "word_count": word_count
            })
        
        # 按order排序
        chapters.sort(key=lambda x: x["order"])
        
        return {"ok": True, "data": {"chapters": chapters}, "error": None}
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取章节列表失败: {str(e)}"}
        )

@router.post("/novels/{novel_id}/chapters", response_model=APIResponse)
async def create_chapter(
    novel_id: str,
    chapter_data: ChapterCreate,
    current_user: dict = Depends(get_current_user)
):
    """创建新章节"""
    try:
        # 检查小说是否存在
        config = file_service.get_novel_config(novel_id)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="小说不存在"
            )
        
        # 写入章节
        version_id = file_service.write_chapter(
            novel_id,
            chapter_data.title,
            chapter_data.content,
            chapter_data.order
        )
        
        if not version_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="章节创建失败"
            )
        
        # 生成章节文件名作为ID
        chapter_filename = f"{chapter_data.order:03d}_{chapter_data.title}.txt"
        word_count = calculate_word_count(chapter_data.content)
        
        # 更新每日统计数据
        stats_service.update_daily_stats(
            novel_id, 
            word_count["total"], 
            chapters_updated=1, 
            writing_time=0
        )
        
        # 创建后返回最新的章节列表，前端可直接刷新本地状态
        chapters = file_service.list_chapters(novel_id)
        enriched = []
        for item in chapters:
            order, title = parse_chapter_filename(item["filename"])
            content = file_service.read_chapter(novel_id, item["filename"]) or ""
            enriched.append({
                "id": item["filename"],
                "title": title,
                "order": order,
                "content": content,
                "novel_id": novel_id,
                "file_path": item["path"],
                "created_at": item["modified_time"],
                "updated_at": item["modified_time"],
                "word_count": calculate_word_count(content)
            })
        enriched.sort(key=lambda x: x["order"])        
        return {"ok": True, "data": {"message": "章节创建成功", "version_id": version_id, "chapters": enriched}, "error": None}
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"创建章节失败: {str(e)}"}
        )

@router.get("/novels/{novel_id}/chapters/{chapter_id}", response_model=APIResponse)
async def get_chapter(
    novel_id: str,
    chapter_id: str,
    current_user: dict = Depends(get_current_user)
):
    """获取章节内容"""
    try:
        content = file_service.read_chapter(novel_id, chapter_id)
        if content is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="章节不存在"
            )
        
        # 解析章节信息
        order, title = parse_chapter_filename(chapter_id)
        word_count = calculate_word_count(content)
        
        return {"ok": True, "data": {"id": chapter_id, "title": title, "order": order, "novel_id": novel_id, "content": content, "word_count": word_count}, "error": None}
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取章节失败: {str(e)}"}
        )

@router.put("/novels/{novel_id}/chapters/{chapter_id}", response_model=APIResponse)
async def update_chapter(
    novel_id: str,
    chapter_id: str,
    chapter_data: ChapterUpdate,
    current_user: dict = Depends(get_current_user)
):
    """更新章节内容"""
    try:
        # 检查章节是否存在
        existing_content = file_service.read_chapter(novel_id, chapter_id)
        if existing_content is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="章节不存在"
            )
        
        # 解析文件名获取order和title
        current_order, current_title = parse_chapter_filename(chapter_id)
        
        # 使用新数据或保持原有数据
        new_content = chapter_data.content if chapter_data.content is not None else existing_content
        new_title = chapter_data.title if chapter_data.title is not None else current_title
        new_order = chapter_data.order if chapter_data.order is not None else current_order
        
        # 如果标题或顺序改变，需要重命名文件
        new_filename = f"{new_order:03d}_{new_title}.txt"
        
        # 写入新文件（先写后删，避免并发读到空文件）
        version_id = file_service.write_chapter(novel_id, new_title, new_content, new_order)
        if new_filename != chapter_id:
            file_service.delete_file(novel_id, f"chapters/{chapter_id}")
        
        if not version_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="章节更新失败"
            )
        
        # 计算字数
        word_count = calculate_word_count(new_content)
        old_word_count = calculate_word_count(existing_content)
        
        # 计算字数差异并更新每日统计数据
        word_count_diff = word_count["total"] - old_word_count["total"]
        if word_count_diff != 0:
            stats_service.update_daily_stats(
                novel_id, 
                word_count_diff, 
                chapters_updated=1 if word_count_diff > 0 else 0, 
                writing_time=0
            )
        
        return APIResponse(
            ok=True,
            data={
                "message": "章节更新成功",
                "version_id": version_id,
                "chapter": {
                    "id": new_filename,
                    "title": new_title,
                    "order": new_order,
                    "novel_id": novel_id,
                    "content": new_content,
                    "word_count": word_count
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
            error={"code": "500", "msg": f"更新章节失败: {str(e)}"}
        )

@router.delete("/novels/{novel_id}/chapters/{chapter_id}", response_model=APIResponse)
async def delete_chapter(
    novel_id: str,
    chapter_id: str,
    current_user: dict = Depends(get_current_user)
):
    """删除章节（移动到deleted目录）"""
    try:
        success = file_service.delete_file(novel_id, f"chapters/{chapter_id}")
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="章节不存在或删除失败"
            )
        
        return APIResponse(
            ok=True,
            data={"message": "章节已删除"}
        )
    except HTTPException as e:
        return APIResponse(
            ok=False,
            error={"code": str(e.status_code), "msg": e.detail}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"删除章节失败: {str(e)}"}
        ) 