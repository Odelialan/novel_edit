from fastapi import APIRouter, HTTPException, status, Depends
from app.models import APIResponse, SyncPushRequest, SyncPullResponse
from app.auth import get_current_user
from app.services.file_service import file_service
import os
from pathlib import Path

router = APIRouter()

@router.post("/push", response_model=APIResponse)
async def sync_push(
    request: SyncPushRequest,
    current_user: dict = Depends(get_current_user)
):
    """同步推送文件到服务器"""
    try:
        # 验证路径安全性（防止路径遍历攻击）
        if ".." in request.path or request.path.startswith("/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="无效的文件路径"
            )
        
        # 验证小说存在
        config = file_service.get_novel_config(request.novel_id)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="小说不存在"
            )
        
        # 确保路径在小说目录下
        novel_path = file_service.novel_repo_path / request.novel_id
        full_path = novel_path / request.path
        
        # 检查路径是否在小说目录内
        try:
            full_path.resolve().relative_to(novel_path.resolve())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="路径不在小说目录范围内"
            )
        
        # 确保目录存在
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 如果是outlines目录下的文件，检查是否需要自动编号
        if request.path.startswith("outlines/") and request.path.endswith(".md"):
            from app.utils.file_naming import FileNamingUtils
            
            # 检查文件是否已存在
            if not full_path.exists():
                # 文件不存在，使用自动编号创建新文件
                base_filename = request.path[9:-3]  # 去掉 "outlines/" 和 ".md"
                
                # 生成带编号的文件名
                numbered_filename = FileNamingUtils.generate_numbered_filename(
                    base_name=base_filename,
                    directory=full_path.parent,
                    extension='.md'
                )
                
                # 更新文件路径
                full_path = full_path.parent / numbered_filename
                # 更新返回的路径
                request.path = f"outlines/{numbered_filename}"
            # 如果文件已存在，直接使用原路径进行更新
        
        # 写入文件
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(request.content)
        
        # 创建版本快照（如果是chapters目录下的txt文件）
        version_id = ""
        if request.path.startswith("chapters/") and request.path.endswith(".txt"):
            version_id = file_service.create_version_snapshot(request.novel_id, full_path)
        
        return APIResponse(
            ok=True,
            data={
                "message": "文件同步成功",
                "version_id": version_id,
                "path": request.path
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
            error={"code": "500", "msg": f"同步推送失败: {str(e)}"}
        )

@router.get("/pull", response_model=APIResponse)
async def sync_pull(
    novel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """同步拉取文件列表和元数据"""
    try:
        # 验证小说存在
        config = file_service.get_novel_config(novel_id)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="小说不存在"
            )
        
        novel_path = file_service.novel_repo_path / novel_id
        files_info = {}
        
        # 遍历小说目录下的所有文件
        for file_path in novel_path.rglob("*"):
            if file_path.is_file() and not file_path.name.startswith('.'):
                # 跳过隐藏目录和系统目录
                if any(part.startswith('.') for part in file_path.parts):
                    continue
                    
                relative_path = str(file_path.relative_to(novel_path))
                stat = file_path.stat()
                
                # 计算文件的ETag（使用修改时间和大小）
                etag = f"{stat.st_mtime}-{stat.st_size}"
                
                files_info[relative_path] = {
                    "etag": etag,
                    "mtime": stat.st_mtime,
                    "size": stat.st_size,
                    "modified": __import__("datetime").datetime.fromtimestamp(stat.st_mtime).isoformat()
                }
        
        print(f"Found {len(files_info)} files for novel {novel_id}: {list(files_info.keys())}")
        
        return APIResponse(
            ok=True,
            data={
                "novel_id": novel_id,
                "files": files_info,
                "total_files": len(files_info)
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
            error={"code": "500", "msg": f"同步拉取失败: {str(e)}"}
        )

@router.get("/download/{novel_id}/{path:path}")
async def download_file(
    novel_id: str,
    path: str,
    current_user: dict = Depends(get_current_user)
):
    """下载特定文件"""
    try:
        # 验证路径安全性
        if ".." in path or path.startswith("/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="无效的文件路径"
            )
        
        # 验证小说存在
        config = file_service.get_novel_config(novel_id)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="小说不存在"
            )
        
        novel_path = file_service.novel_repo_path / novel_id
        file_path = novel_path / path
        
        # 检查文件是否存在
        if not file_path.exists() or not file_path.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="文件不存在"
            )
        
        # 检查路径是否在小说目录内
        try:
            file_path.resolve().relative_to(novel_path.resolve())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="路径不在小说目录范围内"
            )
        
        # 读取文件内容
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return APIResponse(
            ok=True,
            data={
                "path": path,
                "content": content,
                "size": len(content.encode('utf-8'))
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
            error={"code": "500", "msg": f"下载文件失败: {str(e)}"}
        ) 

@router.post("/clear-cache")
async def clear_cache(
    novel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """清理小说相关的缓存和临时文件"""
    try:
        # 验证小说存在
        config = file_service.get_novel_config(novel_id)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="小说不存在"
            )
        
        novel_path = file_service.novel_repo_path / novel_id
        
        # 清理 .versions 目录
        versions_dir = novel_path / ".versions"
        if versions_dir.exists():
            import shutil
            shutil.rmtree(versions_dir)
            print(f"已清理版本目录: {versions_dir}")
        
        # 清理 deleted 目录
        deleted_dir = novel_path / "deleted"
        if deleted_dir.exists():
            import shutil
            shutil.rmtree(deleted_dir)
            print(f"已清理删除目录: {deleted_dir}")
        
        # 清理其他可能的缓存目录
        cache_dirs = [".cache", "temp", "tmp"]
        for cache_dir_name in cache_dirs:
            cache_dir = novel_path / cache_dir_name
            if cache_dir.exists():
                import shutil
                shutil.rmtree(cache_dir)
                print(f"已清理缓存目录: {cache_dir}")
        
        return APIResponse(
            ok=True,
            data={
                "message": "缓存清理成功",
                "novel_id": novel_id,
                "cleaned_dirs": ["deleted", ".versions", ".cache", "temp", "tmp"]
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
            error={"code": "500", "msg": f"缓存清理失败: {str(e)}"}
        )

@router.delete("/outlines/{novel_id}/{outline_path:path}")
async def delete_outline(
    novel_id: str,
    outline_path: str,
    current_user: dict = Depends(get_current_user)
):
    """删除单个大纲文件（移动到deleted目录）"""
    try:
        # 验证路径安全性（防止路径遍历攻击）
        if ".." in outline_path or outline_path.startswith("/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="无效的文件路径"
            )
        
        # 验证小说存在
        config = file_service.get_novel_config(novel_id)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="小说不存在"
            )
        
        # 构建完整路径
        full_path = f"outlines/{outline_path}"
        
        # 使用 file_service 删除文件
        success = file_service.delete_file(novel_id, full_path)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="大纲文件不存在或删除失败"
            )
        
        return APIResponse(
            ok=True,
            data={
                "message": "大纲删除成功",
                "novel_id": novel_id,
                "deleted_path": full_path
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
            error={"code": "500", "msg": f"删除大纲失败: {str(e)}"}
        )