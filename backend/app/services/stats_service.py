import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from pathlib import Path
from app.services.file_service import file_service

class StatsService:
    def __init__(self):
        self.file_service = file_service

    def get_daily_stats(self, novel_id: str, days: int = 30) -> List[dict]:
        """获取每日写作统计"""
        try:
            stats_path = self.file_service.novel_repo_path / novel_id / "stats"
            if not stats_path.exists():
                return []
            
            stats = []
            for i in range(days):
                date = datetime.now() - timedelta(days=i)
                date_str = date.strftime('%Y-%m-%d')
                daily_file = stats_path / f"{date_str}.json"
                
                if daily_file.exists():
                    try:
                        with open(daily_file, 'r', encoding='utf-8') as f:
                            daily_stats = json.load(f)
                            stats.append(daily_stats)
                    except Exception:
                        continue
                else:
                    # 如果没有当天的统计文件，创建一个空的
                    stats.append({
                        "date": date_str,
                        "word_count": 0,
                        "chapters_updated": 0,
                        "writing_time": 0
                    })
            
            return sorted(stats, key=lambda x: x["date"])
        except Exception:
            return []

    def update_daily_stats(self, novel_id: str, word_count: int, chapters_updated: int = 0, writing_time: int = 0):
        """更新每日写作统计"""
        try:
            stats_path = self.file_service.novel_repo_path / novel_id / "stats"
            stats_path.mkdir(exist_ok=True)
            
            today = datetime.now().strftime('%Y-%m-%d')
            daily_file = stats_path / f"{today}.json"
            
            if daily_file.exists():
                try:
                    with open(daily_file, 'r', encoding='utf-8') as f:
                        daily_stats = json.load(f)
                except Exception:
                    daily_stats = {}
            else:
                daily_stats = {}
            
            # 更新统计
            daily_stats.update({
                "date": today,
                "word_count": daily_stats.get("word_count", 0) + word_count,
                "chapters_updated": daily_stats.get("chapters_updated", 0) + chapters_updated,
                "writing_time": daily_stats.get("writing_time", 0) + writing_time,
                "updated_at": datetime.now().isoformat()
            })
            
            with open(daily_file, 'w', encoding='utf-8') as f:
                json.dump(daily_stats, f, ensure_ascii=False, indent=2)
            
            return True
        except Exception:
            return False

    def get_novel_progress(self, novel_id: str) -> dict:
        """获取小说写作进度"""
        try:
            chapters = self.file_service.list_chapters(novel_id)
            total_words = sum(chapter.get("size", 0) for chapter in chapters)
            
            # 计算总体进度（基于字数目标，默认5万字）
            target_words = 50000
            progress_percentage = min(100, (total_words / target_words) * 100) if target_words > 0 else 0
            
            return {
                "total_chapters": len(chapters),
                "total_words": total_words,
                "target_words": target_words,
                "progress_percentage": round(progress_percentage, 2),
                "chapters_with_content": len([c for c in chapters if c.get("size", 0) > 0])
            }
        except Exception:
            return {
                "total_chapters": 0,
                "total_words": 0,
                "target_words": 50000,
                "progress_percentage": 0,
                "chapters_with_content": 0
            }

    def get_writing_streak(self, novel_id: str) -> dict:
        """获取连续写作天数"""
        try:
            daily_stats = self.get_daily_stats(novel_id, 365)  # 获取一年的数据
            
            streak = 0
            for stat in reversed(daily_stats):  # 从最新开始
                if stat.get("word_count", 0) > 0:
                    streak += 1
                else:
                    break
            
            return {
                "current_streak": streak,
                "longest_streak": max([len([s for s in daily_stats[i:i+30] if s.get("word_count", 0) > 0]) 
                                     for i in range(0, len(daily_stats), 30)], default=0)
            }
        except Exception:
            return {"current_streak": 0, "longest_streak": 0}

    def set_writing_goal(self, novel_id: str, goal_data: dict) -> bool:
        """设置写作目标"""
        try:
            goals_path = self.file_service.novel_repo_path / novel_id / "writing_goals.json"
            goals_path.parent.mkdir(exist_ok=True)
            
            goals = {}
            if goals_path.exists():
                try:
                    with open(goals_path, 'r', encoding='utf-8') as f:
                        goals = json.load(f)
                except Exception:
                    goals = {}
            
            goals.update(goal_data)
            goals["updated_at"] = datetime.now().isoformat()
            
            with open(goals_path, 'w', encoding='utf-8') as f:
                json.dump(goals, f, ensure_ascii=False, indent=2)
            
            return True
        except Exception:
            return False

    def get_writing_goal(self, novel_id: str) -> dict:
        """获取写作目标"""
        try:
            goals_path = self.file_service.novel_repo_path / novel_id / "writing_goals.json"
            if not goals_path.exists():
                return {}
            
            with open(goals_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}

# 创建统计服务实例
stats_service = StatsService()
