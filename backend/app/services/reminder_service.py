import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from pathlib import Path
from app.services.file_service import file_service
from app.services.stats_service import stats_service

class ReminderService:
    def __init__(self):
        self.file_service = file_service
        self.stats_service = stats_service

    def get_reminder_settings(self, novel_id: str) -> dict:
        """获取提醒设置"""
        try:
            settings_path = self.file_service.novel_repo_path / novel_id / "reminder_settings.json"
            if not settings_path.exists():
                # 返回默认设置
                return self._get_default_settings()
            
            with open(settings_path, 'r', encoding='utf-8') as f:
                settings = json.load(f)
                # 合并默认设置
                default_settings = self._get_default_settings()
                return {**default_settings, **settings}
        except Exception:
            return self._get_default_settings()

    def update_reminder_settings(self, novel_id: str, settings: dict) -> bool:
        """更新提醒设置"""
        try:
            settings_path = self.file_service.novel_repo_path / novel_id / "reminder_settings.json"
            settings_path.parent.mkdir(exist_ok=True)
            
            # 读取现有设置
            existing_settings = {}
            if settings_path.exists():
                try:
                    with open(settings_path, 'r', encoding='utf-8') as f:
                        existing_settings = json.load(f)
                except Exception:
                    existing_settings = {}
            
            # 合并设置
            updated_settings = {**existing_settings, **settings}
            updated_settings["updated_at"] = datetime.now().isoformat()
            
            # 保存设置
            with open(settings_path, 'w', encoding='utf-8') as f:
                json.dump(updated_settings, f, ensure_ascii=False, indent=2)
            
            return True
        except Exception:
            return False

    def check_reminders(self, novel_id: str) -> List[dict]:
        """检查当前提醒"""
        try:
            settings = self.get_reminder_settings(novel_id)
            reminders = []
            
            # 获取当前统计数据
            daily_stats = self.stats_service.get_daily_stats(novel_id, 1)
            current_stats = daily_stats[0] if daily_stats else {"word_count": 0, "chapters_updated": 0}
            
            # 获取写作目标
            goals = self.stats_service.get_writing_goal(novel_id)
            
            # 获取当前时间
            now = datetime.now()
            
            # 检查日目标提醒
            if settings.get("daily_word_reminder", True):
                daily_goal = goals.get("daily_words", 0)
                if daily_goal > 0:
                    current_words = current_stats.get("word_count", 0)
                    progress = (current_words / daily_goal) * 100
                    
                    if progress < 50:
                        reminders.append({
                            "type": "daily_progress",
                            "level": "warning",
                            "message": f"今日进度: {progress:.1f}%，距离日目标还有 {daily_goal - current_words} 字",
                            "icon": "📊"
                        })
                    elif progress < 80:
                        reminders.append({
                            "type": "daily_progress",
                            "level": "info",
                            "message": f"今日进度: {progress:.1f}%，继续加油！",
                            "icon": "💪"
                        })
                    elif progress >= 100:
                        reminders.append({
                            "type": "daily_complete",
                            "level": "success",
                            "message": "🎉 恭喜完成今日目标！",
                            "icon": "🎉"
                        })
            
            # 检查时间提醒
            if settings.get("time_reminder", True):
                reminder_time = settings.get("reminder_time", "20:00")
                reminder_hour, reminder_minute = map(int, reminder_time.split(":"))
                reminder_datetime = now.replace(hour=reminder_hour, minute=reminder_minute, second=0, microsecond=0)
                
                # 如果今天的提醒时间还没到，检查昨天的
                if now > reminder_datetime:
                    reminder_datetime = reminder_datetime + timedelta(days=1)
                
                time_diff = (reminder_datetime - now).total_seconds() / 60
                
                if 0 <= time_diff < 60:  # 1小时内
                    reminders.append({
                        "type": "time_reminder",
                        "level": "warning",
                        "message": "⏰ 现在是写作时间，开始今天的创作吧！",
                        "icon": "⏰"
                    })
            
            # 检查周目标提醒
            if settings.get("weekly_goal_reminder", True):
                weekly_goal = goals.get("weekly_words", 0)
                if weekly_goal > 0:
                    # 获取本周统计数据
                    week_start = now - timedelta(days=now.weekday())
                    week_stats = self._get_week_stats(novel_id, week_start)
                    week_progress = (week_stats["total_words"] / weekly_goal) * 100
                    
                    if week_progress < 50:
                        reminders.append({
                            "type": "weekly_progress",
                            "level": "warning",
                            "message": f"本周进度: {week_progress:.1f}%，距离周目标还有 {weekly_goal - week_stats['total_words']} 字",
                            "icon": "📅"
                        })
            
            # 检查月目标提醒
            if settings.get("monthly_goal_reminder", True):
                monthly_goal = goals.get("monthly_words", 0)
                if monthly_goal > 0:
                    # 获取本月统计数据
                    month_start = now.replace(day=1)
                    month_stats = self._get_month_stats(novel_id, month_start)
                    month_progress = (month_stats["total_words"] / monthly_goal) * 100
                    
                    if month_progress < 50:
                        reminders.append({
                            "type": "monthly_progress",
                            "level": "warning",
                            "message": f"本月进度: {month_progress:.1f}%，距离月目标还有 {monthly_goal - month_stats['total_words']} 字",
                            "icon": "📅"
                        })
            
            return reminders
        except Exception:
            return []

    def _get_default_settings(self) -> dict:
        """获取默认提醒设置"""
        return {
            "daily_word_reminder": True,
            "daily_word_threshold": 1000,
            "time_reminder": True,
            "reminder_time": "20:00",
            "weekly_goal_reminder": True,
            "monthly_goal_reminder": True,
            "sound_enabled": True,
            "notification_enabled": True
        }

    def _get_week_stats(self, novel_id: str, week_start: datetime) -> dict:
        """获取本周统计数据"""
        try:
            week_end = week_start + timedelta(days=6)
            daily_stats = self.stats_service.get_daily_stats(novel_id, 7)
            
            week_stats = {
                "total_words": 0,
                "total_chapters": 0,
                "writing_days": 0
            }
            
            for stat in daily_stats:
                stat_date = datetime.strptime(stat["date"], "%Y-%m-%d")
                if week_start <= stat_date <= week_end:
                    week_stats["total_words"] += stat.get("word_count", 0)
                    week_stats["total_chapters"] += stat.get("chapters_updated", 0)
                    if stat.get("word_count", 0) > 0:
                        week_stats["writing_days"] += 1
            
            return week_stats
        except Exception:
            return {"total_words": 0, "total_chapters": 0, "writing_days": 0}

    def _get_month_stats(self, novel_id: str, month_start: datetime) -> dict:
        """获取本月统计数据"""
        try:
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1)
            
            daily_stats = self.stats_service.get_daily_stats(novel_id, 31)
            
            month_stats = {
                "total_words": 0,
                "total_chapters": 0,
                "writing_days": 0
            }
            
            for stat in daily_stats:
                stat_date = datetime.strptime(stat["date"], "%Y-%m-%d")
                if month_start <= stat_date < month_end:
                    month_stats["total_words"] += stat.get("word_count", 0)
                    month_stats["total_chapters"] += stat.get("chapters_updated", 0)
                    if stat.get("word_count", 0) > 0:
                        month_stats["writing_days"] += 1
            
            return month_stats
        except Exception:
            return {"total_words": 0, "total_chapters": 0, "writing_days": 0}

# 创建提醒服务实例
reminder_service = ReminderService()
