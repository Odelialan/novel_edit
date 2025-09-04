import json
from datetime import datetime
from typing import List, Dict, Optional
from pathlib import Path
from app.services.file_service import file_service

class TimelineService:
    def __init__(self):
        self.file_service = file_service

    def create_timeline(self, novel_id: str, timeline_data: dict) -> Optional[str]:
        """创建时间线"""
        try:
            timeline_id = f"timeline_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            timeline_path = self.file_service.novel_repo_path / novel_id / "timelines" / f"{timeline_id}.json"
            timeline_path.parent.mkdir(exist_ok=True)
            
            timeline_data.update({
                "id": timeline_id,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            })
            
            with open(timeline_path, 'w', encoding='utf-8') as f:
                json.dump(timeline_data, f, ensure_ascii=False, indent=2)
            
            return timeline_id
        except Exception:
            return None

    def add_event(self, novel_id: str, timeline_id: str, event_data: dict) -> Optional[str]:
        """添加事件到时间线"""
        try:
            timeline_path = self.file_service.novel_repo_path / novel_id / "timelines" / f"{timeline_id}.json"
            if not timeline_path.exists():
                return None
            
            with open(timeline_path, 'r', encoding='utf-8') as f:
                timeline = json.load(f)
            
            event_id = f"event_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            event_data.update({
                "id": event_id,
                "created_at": datetime.utcnow().isoformat()
            })
            
            if "events" not in timeline:
                timeline["events"] = []
            timeline["events"].append(event_data)
            timeline["updated_at"] = datetime.utcnow().isoformat()
            
            with open(timeline_path, 'w', encoding='utf-8') as f:
                json.dump(timeline, f, ensure_ascii=False, indent=2)
            
            return event_id
        except Exception:
            return None

    def list_timelines(self, novel_id: str) -> List[dict]:
        """列出小说的时间线"""
        try:
            timelines_path = self.file_service.novel_repo_path / novel_id / "timelines"
            if not timelines_path.exists():
                return []
            
            timelines = []
            for timeline_file in timelines_path.glob("*.json"):
                try:
                    with open(timeline_file, 'r', encoding='utf-8') as f:
                        timeline = json.load(f)
                        timelines.append(timeline)
                except Exception:
                    continue
            
            return sorted(timelines, key=lambda x: x.get("created_at", ""), reverse=True)
        except Exception:
            return []

    def get_timeline(self, novel_id: str, timeline_id: str) -> Optional[dict]:
        """获取时间线详情"""
        try:
            timeline_path = self.file_service.novel_repo_path / novel_id / "timelines" / f"{timeline_id}.json"
            if not timeline_path.exists():
                return None
            
            with open(timeline_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return None

    def auto_generate_events(self, novel_id: str, timeline_id: str) -> bool:
        """从章节内容自动生成事件"""
        try:
            timeline = self.get_timeline(novel_id, timeline_id)
            if not timeline:
                return False
            
            chapters = self.file_service.list_chapters(novel_id)
            events = []
            
            for chapter in chapters:
                content = self.file_service.read_chapter(novel_id, chapter["filename"])
                if content:
                    # 简单的事件提取逻辑：从章节标题和内容生成事件
                    order, title = self._parse_chapter_filename(chapter["filename"])
                    event = {
                        "title": f"第{order}章：{title}",
                        "description": content[:200] + "..." if len(content) > 200 else content,
                        "chapter_id": chapter["filename"],
                        "order": order,
                        "type": "chapter_event"
                    }
                    events.append(event)
            
            # 更新时间线
            timeline["events"] = events
            timeline["updated_at"] = datetime.utcnow().isoformat()
            
            timeline_path = self.file_service.novel_repo_path / novel_id / "timelines" / f"{timeline_id}.json"
            with open(timeline_path, 'w', encoding='utf-8') as f:
                json.dump(timeline, f, ensure_ascii=False, indent=2)
            
            return True
        except Exception:
            return False

    def _parse_chapter_filename(self, filename: str):
        """解析章节文件名"""
        name_without_ext = filename.replace('.txt', '')
        parts = name_without_ext.split('_', 1)
        if len(parts) >= 2 and parts[0].isdigit():
            return int(parts[0]), parts[1]
        return 1, name_without_ext

# 创建时间线服务实例
timeline_service = TimelineService()
