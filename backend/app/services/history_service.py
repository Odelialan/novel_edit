import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict

from app.services.file_service import file_service


class HistoryService:
    """历史背景管理服务（文件系统存储）

    存储结构：novel_repo/<novel_id>/worldbuilding/history/<history_id>.json
    """

    def __init__(self) -> None:
        self.file_service = file_service

    def _history_dir(self, novel_id: str) -> Path:
        return self.file_service.novel_repo_path / novel_id / "worldbuilding" / "history"

    def list_histories(self, novel_id: str) -> List[Dict]:
        try:
            dir_path = self._history_dir(novel_id)
            if not dir_path.exists():
                return []
            items: List[Dict] = []
            for fp in dir_path.glob("*.json"):
                try:
                    with open(fp, "r", encoding="utf-8") as f:
                        items.append(json.load(f))
                except Exception:
                    continue
            items.sort(key=lambda x: x.get("updated_at", x.get("created_at", "")), reverse=True)
            return items
        except Exception:
            return []

    def get_history(self, novel_id: str, history_id: str) -> Optional[Dict]:
        try:
            fp = self._history_dir(novel_id) / f"{history_id}.json"
            if not fp.exists():
                return None
            with open(fp, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None

    def create_history(self, novel_id: str, payload: Dict) -> Optional[str]:
        try:
            dir_path = self._history_dir(novel_id)
            dir_path.mkdir(parents=True, exist_ok=True)
            history_id = payload.get("id") or f"history_{datetime.utcnow().strftime('%Y%m%d_%H%M%S%f')}"
            now = datetime.utcnow().isoformat()
            data = {
                "id": history_id,
                "title": payload.get("title", ""),
                "period": payload.get("period", ""),  # 时代/朝代
                "date": payload.get("date", ""),      # 发生日期或范围
                "description": payload.get("description", ""),
                "related_characters": payload.get("related_characters", []),
                "related_locations": payload.get("related_locations", []),
                "tags": payload.get("tags", []),
                "created_at": now,
                "updated_at": now,
            }
            with open(dir_path / f"{history_id}.json", "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return history_id
        except Exception:
            return None

    def update_history(self, novel_id: str, history_id: str, payload: Dict) -> bool:
        try:
            fp = self._history_dir(novel_id) / f"{history_id}.json"
            if not fp.exists():
                return False
            with open(fp, "r", encoding="utf-8") as f:
                data = json.load(f)
            data.update({
                "title": payload.get("title", data.get("title", "")),
                "period": payload.get("period", data.get("period", "")),
                "date": payload.get("date", data.get("date", "")),
                "description": payload.get("description", data.get("description", "")),
                "related_characters": payload.get("related_characters", data.get("related_characters", [])),
                "related_locations": payload.get("related_locations", data.get("related_locations", [])),
                "tags": payload.get("tags", data.get("tags", [])),
                "updated_at": datetime.utcnow().isoformat(),
            })
            with open(fp, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True
        except Exception:
            return False

    def delete_history(self, novel_id: str, history_id: str) -> bool:
        try:
            fp = self._history_dir(novel_id) / f"{history_id}.json"
            if not fp.exists():
                return False
            fp.unlink(missing_ok=True)
            return True
        except Exception:
            return False


history_service = HistoryService()


