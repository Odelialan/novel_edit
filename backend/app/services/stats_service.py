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
            
            # 计算当前连续写作天数
            current_streak = 0
            for stat in reversed(daily_stats):  # 从最新开始
                if stat.get("word_count", 0) > 0:
                    current_streak += 1
                else:
                    break
            
            # 计算最长连续写作天数
            longest_streak = 0
            temp_streak = 0
            for stat in daily_stats:
                if stat.get("word_count", 0) > 0:
                    temp_streak += 1
                    longest_streak = max(longest_streak, temp_streak)
                else:
                    temp_streak = 0
            
            return {
                "current_streak": current_streak,
                "longest_streak": longest_streak
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

    def get_weekly_stats(self, novel_id: str, weeks: int = 12) -> List[dict]:
        """获取每周写作统计"""
        try:
            daily_stats = self.get_daily_stats(novel_id, weeks * 7)
            weekly_stats = []
            
            # 按周分组统计
            for i in range(0, len(daily_stats), 7):
                week_data = daily_stats[i:i+7]
                if not week_data:
                    continue
                    
                week_start = datetime.strptime(week_data[0]["date"], "%Y-%m-%d")
                week_end = week_start + timedelta(days=6)
                
                total_words = sum(stat.get("word_count", 0) for stat in week_data)
                total_chapters = sum(stat.get("chapters_updated", 0) for stat in week_data)
                writing_days = len([stat for stat in week_data if stat.get("word_count", 0) > 0])
                
                weekly_stats.append({
                    "week_start": week_start.strftime("%Y-%m-%d"),
                    "week_end": week_end.strftime("%Y-%m-%d"),
                    "week_label": f"{week_start.strftime('%m/%d')}-{week_end.strftime('%m/%d')}",
                    "total_words": total_words,
                    "total_chapters": total_chapters,
                    "writing_days": writing_days,
                    "average_words_per_day": round(total_words / max(writing_days, 1))
                })
            
            return weekly_stats
        except Exception:
            return []

    def get_monthly_stats(self, novel_id: str, months: int = 12) -> List[dict]:
        """获取每月写作统计"""
        try:
            daily_stats = self.get_daily_stats(novel_id, months * 31)
            monthly_stats = []
            
            # 按月份分组统计
            current_month = None
            month_data = []
            
            for stat in daily_stats:
                stat_date = datetime.strptime(stat["date"], "%Y-%m-%d")
                month_key = stat_date.strftime("%Y-%m")
                
                if current_month != month_key:
                    if current_month and month_data:
                        # 处理上一个月的统计
                        total_words = sum(s.get("word_count", 0) for s in month_data)
                        total_chapters = sum(s.get("chapters_updated", 0) for s in month_data)
                        writing_days = len([s for s in month_data if s.get("word_count", 0) > 0])
                        
                        monthly_stats.append({
                            "month": current_month,
                            "month_label": datetime.strptime(current_month, "%Y-%m").strftime("%Y年%m月"),
                            "total_words": total_words,
                            "total_chapters": total_chapters,
                            "writing_days": writing_days,
                            "total_days": len(month_data),
                            "average_words_per_day": round(total_words / max(writing_days, 1))
                        })
                    
                    current_month = month_key
                    month_data = []
                
                month_data.append(stat)
            
            # 处理最后一个月
            if current_month and month_data:
                total_words = sum(s.get("word_count", 0) for s in month_data)
                total_chapters = sum(s.get("chapters_updated", 0) for s in month_data)
                writing_days = len([s for s in month_data if s.get("word_count", 0) > 0])
                
                monthly_stats.append({
                    "month": current_month,
                    "month_label": datetime.strptime(current_month, "%Y-%m").strftime("%Y年%m月"),
                    "total_words": total_words,
                    "total_chapters": total_chapters,
                    "writing_days": writing_days,
                    "total_days": len(month_data),
                    "average_words_per_day": round(total_words / max(writing_days, 1))
                })
            
            return monthly_stats
        except Exception:
            return []

    def get_yearly_stats(self, novel_id: str, years: int = 3) -> List[dict]:
        """获取每年写作统计"""
        try:
            daily_stats = self.get_daily_stats(novel_id, years * 365)
            yearly_stats = []
            
            # 按年份分组统计
            current_year = None
            year_data = []
            
            for stat in daily_stats:
                stat_date = datetime.strptime(stat["date"], "%Y-%m-%d")
                year_key = stat_date.strftime("%Y")
                
                if current_year != year_key:
                    if current_year and year_data:
                        # 处理上一年的统计
                        total_words = sum(s.get("word_count", 0) for s in year_data)
                        total_chapters = sum(s.get("chapters_updated", 0) for s in year_data)
                        writing_days = len([s for s in year_data if s.get("word_count", 0) > 0])
                        
                        yearly_stats.append({
                            "year": current_year,
                            "year_label": f"{current_year}年",
                            "total_words": total_words,
                            "total_chapters": total_chapters,
                            "writing_days": writing_days,
                            "total_days": len(year_data),
                            "average_words_per_day": round(total_words / max(writing_days, 1))
                        })
                    
                    current_year = year_key
                    year_data = []
                
                year_data.append(stat)
            
            # 处理最后一年
            if current_year and year_data:
                total_words = sum(s.get("word_count", 0) for s in year_data)
                total_chapters = sum(s.get("chapters_updated", 0) for s in year_data)
                writing_days = len([s for s in year_data if s.get("word_count", 0) > 0])
                
                yearly_stats.append({
                    "year": current_year,
                    "year_label": f"{current_year}年",
                    "total_words": total_words,
                    "total_chapters": total_chapters,
                    "writing_days": writing_days,
                    "total_days": len(year_data),
                    "average_words_per_day": round(total_words / max(writing_days, 1))
                })
            
            return yearly_stats
        except Exception:
            return []

    def get_comprehensive_stats(self, novel_id: str) -> dict:
        """获取综合统计数据"""
        try:
            daily_stats = self.get_daily_stats(novel_id, 365)
            weekly_stats = self.get_weekly_stats(novel_id, 12)
            monthly_stats = self.get_monthly_stats(novel_id, 12)
            yearly_stats = self.get_yearly_stats(novel_id, 3)
            streak = self.get_writing_streak(novel_id)
            
            # 计算总体统计
            total_words = sum(stat.get("word_count", 0) for stat in daily_stats)
            total_chapters = sum(stat.get("chapters_updated", 0) for stat in daily_stats)
            writing_days = len([stat for stat in daily_stats if stat.get("word_count", 0) > 0])
            
            return {
                "daily_stats": daily_stats,
                "weekly_stats": weekly_stats,
                "monthly_stats": monthly_stats,
                "yearly_stats": yearly_stats,
                "streak": streak,
                "summary": {
                    "total_words": total_words,
                    "total_chapters": total_chapters,
                    "writing_days": writing_days,
                    "average_words_per_day": round(total_words / max(writing_days, 1)),
                    "current_streak": streak.get("current_streak", 0),
                    "longest_streak": streak.get("longest_streak", 0)
                }
            }
        except Exception:
            return {
                "daily_stats": [],
                "weekly_stats": [],
                "monthly_stats": [],
                "yearly_stats": [],
                "streak": {"current_streak": 0, "longest_streak": 0},
                "summary": {
                    "total_words": 0,
                    "total_chapters": 0,
                    "writing_days": 0,
                    "average_words_per_day": 0,
                    "current_streak": 0,
                    "longest_streak": 0
                }
            }

# 创建统计服务实例
stats_service = StatsService()
