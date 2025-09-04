import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict

from app.services.file_service import file_service


class PowerService:
    """力量体系管理服务：基于文件系统的轻量实现

    存储结构：
    novel_repo/<novel_id>/worldbuilding/power_system/<power_id>.json
    """

    def __init__(self) -> None:
        self.file_service = file_service

    def _powers_dir(self, novel_id: str) -> Path:
        return self.file_service.novel_repo_path / novel_id / "worldbuilding" / "power_system"

    def list_powers(self, novel_id: str) -> List[Dict]:
        try:
            powers_dir = self._powers_dir(novel_id)
            if not powers_dir.exists():
                return []
            results: List[Dict] = []
            for fp in powers_dir.glob("*.json"):
                try:
                    with open(fp, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        results.append(data)
                except Exception:
                    continue
            results.sort(key=lambda x: x.get("updated_at", x.get("created_at", "")), reverse=True)
            return results
        except Exception:
            return []

    def get_power(self, novel_id: str, power_id: str) -> Optional[Dict]:
        try:
            fp = self._powers_dir(novel_id) / f"{power_id}.json"
            if not fp.exists():
                return None
            with open(fp, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None

    def create_power(self, novel_id: str, payload: Dict) -> Optional[str]:
        try:
            self._ensure_novel_exists(novel_id)
            powers_dir = self._powers_dir(novel_id)
            powers_dir.mkdir(parents=True, exist_ok=True)

            power_id = payload.get("id") or f"power_{datetime.utcnow().strftime('%Y%m%d_%H%M%S%f')}"
            now = datetime.utcnow().isoformat()
            data = {
                "id": power_id,
                "name": payload.get("name", ""),
                "category": payload.get("category", ""),
                "level": payload.get("level", ""),
                "description": payload.get("description", ""),
                "rules": payload.get("rules", ""),
                "examples": payload.get("examples", ""),
                "tags": payload.get("tags", []),
                "created_at": now,
                "updated_at": now,
            }
            with open(powers_dir / f"{power_id}.json", "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return power_id
        except Exception:
            return None

    def update_power(self, novel_id: str, power_id: str, payload: Dict) -> bool:
        try:
            fp = self._powers_dir(novel_id) / f"{power_id}.json"
            if not fp.exists():
                return False
            with open(fp, "r", encoding="utf-8") as f:
                data = json.load(f)
            data.update({
                "name": payload.get("name", data.get("name", "")),
                "category": payload.get("category", data.get("category", "")),
                "level": payload.get("level", data.get("level", "")),
                "description": payload.get("description", data.get("description", "")),
                "rules": payload.get("rules", data.get("rules", "")),
                "examples": payload.get("examples", data.get("examples", "")),
                "tags": payload.get("tags", data.get("tags", [])),
                "updated_at": datetime.utcnow().isoformat(),
            })
            with open(fp, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True
        except Exception:
            return False

    def delete_power(self, novel_id: str, power_id: str) -> bool:
        try:
            fp = self._powers_dir(novel_id) / f"{power_id}.json"
            if not fp.exists():
                return False
            fp.unlink(missing_ok=True)
            return True
        except Exception:
            return False

    def _ensure_novel_exists(self, novel_id: str) -> None:
        # 如果小说不存在，让 file_service 的逻辑来判断抛错，当前方法不抛异常
            _ = self.file_service.get_novel_config(novel_id)


power_service = PowerService()


