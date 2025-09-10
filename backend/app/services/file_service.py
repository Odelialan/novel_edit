import os
import json
import shutil
from datetime import datetime
from typing import Dict, List, Optional
import uuid
import hashlib
from pathlib import Path

from app.config import settings

class FileService:
    def __init__(self):
        # Resolve repo path with a stable base (project root), so runtime CWD does not affect it
        import os
        raw_repo_path = os.environ.get('NOVEL_REPO_PATH') or settings.NOVEL_REPO_PATH or '../novel_repo'

        # If the configured path is absolute, use it directly
        raw_path_obj = Path(raw_repo_path)
        if raw_path_obj.is_absolute():
            resolved = raw_path_obj
        else:
            # 使用更可靠的方法：从当前文件位置向上查找项目根目录
            current_file = Path(__file__).resolve()
            
            # 从 backend/app/services 向上查找项目根目录
            # 当前文件位置：I:\novel_edit\backend\app\services\file_service.py
            # 需要向上3级到：I:\novel_edit\
            project_root = current_file.parents[3]  # novel_edit/
            
            # 验证是否找到了正确的项目根目录（包含novel_repo目录）
            if not (project_root / "novel_repo").exists():
                # 如果方法1失败，尝试向上4级
                project_root = current_file.parents[4]
                
            # 如果还是找不到，使用当前工作目录的父目录
            if not (project_root / "novel_repo").exists():
                project_root = Path.cwd().parent
                
            # 如果使用相对路径，直接拼接项目根目录
            if raw_repo_path.startswith('../'):
                resolved = project_root / raw_repo_path[3:]  # 去掉 '../'
            else:
                resolved = (project_root / raw_repo_path).resolve()
            
            # 最终验证：确保路径存在
            if not resolved.exists():
                # 如果还是找不到，尝试直接使用绝对路径
                absolute_path = Path("I:/novel_edit/novel_repo")
                if absolute_path.exists():
                    resolved = absolute_path
                    print(f"Using fallback absolute path: {resolved}")

        self.novel_repo_path = resolved
        print(f"FileService initialized with path: {self.novel_repo_path}")
        
        # 验证路径是否正确
        if not self.novel_repo_path.exists():
            print(f"Warning: novel_repo_path does not exist: {self.novel_repo_path}")
        else:
            print(f"novel_repo_path exists and contains: {list(self.novel_repo_path.iterdir())}")
            
        self.ensure_repo_structure()
    
    def ensure_repo_structure(self):
        """确保小说仓库目录结构存在"""
        self.novel_repo_path.mkdir(exist_ok=True)
        
        # 创建全局配置文件
        global_config_path = self.novel_repo_path / "global_config.json"
        if not global_config_path.exists():
            global_config = {
                "ai_provider": "mock",
                "tunnel": "none",
                "max_versions": 100,
                "created_at": datetime.utcnow().isoformat()
            }
            with open(global_config_path, 'w', encoding='utf-8') as f:
                json.dump(global_config, f, ensure_ascii=False, indent=2)
    
    def create_novel_directory(self, slug: str, title: str, meta: dict) -> bool:
        """创建小说目录结构"""
        novel_path = self.novel_repo_path / slug
        if novel_path.exists():
            return False
        
        # 创建目录结构
        novel_path.mkdir()
        (novel_path / "characters").mkdir()
        (novel_path / "outlines").mkdir()
        (novel_path / "chapters").mkdir()
        (novel_path / "worldbuilding").mkdir()
        (novel_path / "ideas").mkdir()
        (novel_path / ".versions").mkdir()
        
        # 创建小说配置文件
        novel_config = {
            "title": title,
            "slug": slug,
            "meta": meta,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "settings": {
                "indent": 2,
                "auto_format": True
            }
        }
        
        config_path = novel_path / "novel_config.json"
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(novel_config, f, ensure_ascii=False, indent=2)
        
        return True
    
    def get_novel_config(self, novel_id: str) -> Optional[dict]:
        """获取小说配置"""
        config_path = self.novel_repo_path / novel_id / "novel_config.json"
        if not config_path.exists():
            return None
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return None
    
    def update_novel_config(self, novel_id: str, config: dict) -> bool:
        """更新小说配置"""
        config_path = self.novel_repo_path / novel_id / "novel_config.json"
        if not config_path.exists():
            return False
        
        config["updated_at"] = datetime.utcnow().isoformat()
        
        try:
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
            return True
        except Exception:
            return False
    
    def list_novels(self) -> List[dict]:
        """列出所有小说"""
        novels = []
        for novel_dir in self.novel_repo_path.iterdir():
            if novel_dir.is_dir() and not novel_dir.name.startswith('.'):
                config = self.get_novel_config(novel_dir.name)
                if config:
                    novels.append({
                        "id": novel_dir.name,
                        "title": config.get("title", novel_dir.name),
                        "slug": config.get("slug", novel_dir.name),
                        "updated_at": config.get("updated_at", ""),
                        "meta": config.get("meta", {})
                    })
        return novels
    
    def write_chapter(self, novel_id: str, chapter_title: str, content: str, order: int = None) -> Optional[str]:
        """写入章节文件"""
        novel_path = self.novel_repo_path / novel_id
        if not novel_path.exists():
            return None
        
        # 确保章节目录存在
        chapters_path = novel_path / "chapters"
        chapters_path.mkdir(exist_ok=True)
        
        # 使用自动编号工具生成文件名
        from app.utils.file_naming import FileNamingUtils
        chapter_filename = FileNamingUtils.generate_numbered_filename(
            base_name=chapter_title,
            directory=chapters_path,
            extension='.txt',
            custom_number=order
        )
        chapter_path = chapters_path / chapter_filename
        
        try:
            # 写入章节内容
            with open(chapter_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # 创建版本快照
            version_id = self.create_version_snapshot(novel_id, chapter_path)
            
            return version_id
        except Exception as e:
            # 改进错误处理，记录具体错误信息
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"写入章节失败: novel_id={novel_id}, title={chapter_title}, error={str(e)}")
            return None
    
    def read_chapter(self, novel_id: str, chapter_filename: str) -> Optional[str]:
        """读取章节内容"""
        chapter_path = self.novel_repo_path / novel_id / "chapters" / chapter_filename
        if not chapter_path.exists():
            return None
        
        try:
            with open(chapter_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception:
            return None
    
    def list_chapters(self, novel_id: str) -> List[dict]:
        """列出小说的所有章节"""
        chapters_path = self.novel_repo_path / novel_id / "chapters"
        if not chapters_path.exists():
            return []
        
        chapters = []
        for chapter_file in chapters_path.glob("*.txt"):
            stat = chapter_file.stat()
            chapters.append({
                "filename": chapter_file.name,
                "path": str(chapter_file.relative_to(self.novel_repo_path)),
                "modified_time": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "size": stat.st_size
            })
        
        # 排序：优先按三位数前缀排序，其次按文件名
        def sort_key(item: dict):
            name = item.get("filename", "")
            base = Path(name).stem
            # 兼容 001_ / 001. / 001 空格 等多种分隔
            num_part = base.split('_', 1)[0].split(' ', 1)[0].split('.', 1)[0]
            if num_part.isdigit():
                return (0, int(num_part), name)
            return (1, name)
        return sorted(chapters, key=sort_key)
    
    def create_version_snapshot(self, novel_id: str, file_path: Path) -> str:
        """创建文件版本快照"""
        novel_path = self.novel_repo_path / novel_id
        versions_path = novel_path / ".versions"
        
        # 确保版本目录存在
        versions_path.mkdir(exist_ok=True)
        
        # 生成版本ID
        version_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        
        # 生成快照文件名
        original_name = file_path.stem
        extension = file_path.suffix
        snapshot_name = f"{original_name}_{timestamp}_{version_id[:8]}{extension}"
        snapshot_path = versions_path / snapshot_name
        
        try:
            # 复制文件到版本目录
            shutil.copy2(file_path, snapshot_path)
            
            # 记录版本信息
            version_info = {
                "version_id": version_id,
                "timestamp": datetime.utcnow().isoformat(),
                "original_file": str(file_path.relative_to(novel_path)),
                "snapshot_file": snapshot_name,
                "file_hash": self.get_file_hash(file_path)
            }
            
            version_info_path = versions_path / f"{version_id}.json"
            with open(version_info_path, 'w', encoding='utf-8') as f:
                json.dump(version_info, f, ensure_ascii=False, indent=2)
            
            return version_id
        except Exception:
            return ""

    def list_versions(self, novel_id: str) -> List[dict]:
        """列出指定小说的版本快照信息。"""
        novel_path = self.novel_repo_path / novel_id
        versions_path = novel_path / ".versions"
        if not versions_path.exists():
            return []
        versions: List[dict] = []
        for meta_file in versions_path.glob("*.json"):
            try:
                with open(meta_file, 'r', encoding='utf-8') as f:
                    info = json.load(f)
                # 兼容性字段
                info["meta_file"] = meta_file.name
                versions.append(info)
            except Exception:
                continue
        # 按时间倒序
        return sorted(versions, key=lambda x: x.get("timestamp", ""), reverse=True)

    def restore_version(self, novel_id: str, version_id: str) -> bool:
        """将指定版本快照恢复到其原始文件路径。"""
        novel_path = self.novel_repo_path / novel_id
        versions_path = novel_path / ".versions"
        if not versions_path.exists():
            return False
        # 读取元信息
        meta_path = versions_path / f"{version_id}.json"
        if not meta_path.exists():
            return False
        try:
            with open(meta_path, 'r', encoding='utf-8') as f:
                info = json.load(f)
            original_rel = info.get("original_file")
            snapshot_name = info.get("snapshot_file")
            if not original_rel or not snapshot_name:
                return False
            src_snapshot = versions_path / snapshot_name
            dest_file = novel_path / original_rel
            if not src_snapshot.exists():
                return False
            dest_file.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_snapshot, dest_file)
            # 更新 novel_config 的更新时间
            cfg = self.get_novel_config(novel_id)
            if cfg:
                cfg["updated_at"] = datetime.utcnow().isoformat()
                self.update_novel_config(novel_id, cfg)
            return True
        except Exception:
            return False
    
    def get_file_hash(self, file_path: Path) -> str:
        """获取文件哈希值"""
        try:
            with open(file_path, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()
        except Exception:
            return ""
    
    def write_character(self, novel_id: str, character_data: dict) -> Optional[str]:
        """写入角色文件"""
        novel_path = self.novel_repo_path / novel_id
        if not novel_path.exists():
            return None
        
        character_id = str(uuid.uuid4())
        character_filename = f"character_{character_id[:8]}.json"
        character_path = novel_path / "characters" / character_filename
        
        character_data.update({
            "id": character_id,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        })
        
        try:
            with open(character_path, 'w', encoding='utf-8') as f:
                json.dump(character_data, f, ensure_ascii=False, indent=2)
            return character_id
        except Exception:
            return None
    
    def read_character(self, novel_id: str, character_id: str) -> Optional[dict]:
        """读取角色数据"""
        characters_path = self.novel_repo_path / novel_id / "characters"
        for character_file in characters_path.glob("*.json"):
            try:
                with open(character_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if data.get("id") == character_id:
                        return data
            except Exception:
                continue
        return None
    
    def list_characters(self, novel_id: str) -> List[dict]:
        """列出小说的所有角色"""
        characters_path = self.novel_repo_path / novel_id / "characters"
        if not characters_path.exists():
            return []
        
        characters = []
        for character_file in characters_path.glob("*.json"):
            try:
                with open(character_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    characters.append(data)
            except Exception:
                continue
        
        return sorted(characters, key=lambda x: x.get("created_at", ""))

    def update_character(self, novel_id: str, character_id: str, updated_data: dict) -> bool:
        """更新角色文件（就地覆盖，保留原文件名与id）"""
        characters_path = self.novel_repo_path / novel_id / "characters"
        if not characters_path.exists():
            return False
        for character_file in characters_path.glob("*.json"):
            try:
                with open(character_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                if data.get("id") != character_id:
                    continue
                # 保留id与created_at
                preserved = {
                    "id": data.get("id"),
                    "created_at": data.get("created_at")
                }
                merged = {**data, **updated_data, **preserved}
                merged["updated_at"] = datetime.utcnow().isoformat()
                with open(character_file, 'w', encoding='utf-8') as f:
                    json.dump(merged, f, ensure_ascii=False, indent=2)
                return True
            except Exception:
                continue
        return False
    
    def delete_character(self, novel_id: str, character_id: str) -> bool:
        """删除角色文件"""
        characters_path = self.novel_repo_path / novel_id / "characters"
        if not characters_path.exists():
            return False
        
        for character_file in characters_path.glob("*.json"):
            try:
                with open(character_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                if data.get("id") == character_id:
                    # 使用delete_file方法删除文件
                    return self.delete_file(novel_id, f"characters/{character_file.name}")
            except Exception:
                continue
        return False
    
    def delete_file(self, novel_id: str, relative_path: str) -> bool:
        """删除文件（移动到deleted目录）"""
        file_path = self.novel_repo_path / novel_id / relative_path
        if not file_path.exists():
            return False
        
        # 创建deleted目录
        deleted_path = self.novel_repo_path / novel_id / "deleted"
        deleted_path.mkdir(exist_ok=True)
        
        # 移动文件
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        deleted_filename = f"{timestamp}_{file_path.name}"
        deleted_file_path = deleted_path / deleted_filename
        
        try:
            shutil.move(str(file_path), str(deleted_file_path))
            return True
        except Exception:
            return False

    def delete_novel(self, novel_id: str) -> bool:
        """删除整本小说（移动到仓库 deleted 目录）"""
        src_path = self.novel_repo_path / novel_id
        if not src_path.exists() or not src_path.is_dir():
            return False
        deleted_root = self.novel_repo_path / "deleted"
        deleted_root.mkdir(exist_ok=True)
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        dest_path = deleted_root / f"{novel_id}_{timestamp}"
        try:
            shutil.move(str(src_path), str(dest_path))
            return True
        except Exception:
            return False

# 创建文件服务实例
file_service = FileService() 