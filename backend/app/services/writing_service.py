import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from pathlib import Path
from app.services.file_service import file_service
from app.services.stats_service import stats_service

class WritingService:
    def __init__(self):
        self.file_service = file_service
        self.stats_service = stats_service

    def get_global_writing_stats(self) -> dict:
        """获取全局写作统计"""
        try:
            # 获取所有小说
            novels = self.file_service.list_novels()
            total_words = 0
            total_chapters = 0
            total_writing_days = 0
            current_streak = 0
            longest_streak = 0
            
            # 统计所有小说的数据
            for novel in novels:
                novel_id = novel.get('id', novel.get('slug', ''))
                if novel_id:
                    # 获取小说统计
                    novel_stats = self.stats_service.get_novel_progress(novel_id)
                    total_words += novel_stats.get('total_words', 0)
                    total_chapters += novel_stats.get('total_chapters', 0)
                    
                    # 获取连续写作天数
                    streak = self.stats_service.get_writing_streak(novel_id)
                    current_streak = max(current_streak, streak.get('current_streak', 0))
                    longest_streak = max(longest_streak, streak.get('longest_streak', 0))
                    
                    # 获取写作天数
                    daily_stats = self.stats_service.get_daily_stats(novel_id, 365)
                    writing_days = len([s for s in daily_stats if s.get('word_count', 0) > 0])
                    total_writing_days = max(total_writing_days, writing_days)
            
            # 计算总体进度（基于总字数目标，默认20万字）
            target_words = 200000
            progress_percentage = min(100, (total_words / target_words) * 100) if target_words > 0 else 0
            
            # 计算平均每日字数
            average_words_per_day = total_words / max(total_writing_days, 1)
            
            return {
                "total_novels": len(novels),
                "total_words": total_words,
                "total_chapters": total_chapters,
                "total_writing_days": total_writing_days,
                "current_streak": current_streak,
                "longest_streak": longest_streak,
                "average_words_per_day": round(average_words_per_day, 2),
                "target_words": target_words,
                "progress_percentage": round(progress_percentage, 2)
            }
        except Exception:
            return {
                "total_novels": 0,
                "total_words": 0,
                "total_chapters": 0,
                "total_writing_days": 0,
                "current_streak": 0,
                "longest_streak": 0,
                "average_words_per_day": 0,
                "target_words": 200000,
                "progress_percentage": 0
            }

    def get_global_writing_goals(self) -> dict:
        """获取全局写作目标"""
        try:
            goals_path = self.file_service.novel_repo_path / "global_writing_goals.json"
            if not goals_path.exists():
                return {}
            
            with open(goals_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}

    def update_global_writing_goals(self, goals: dict) -> bool:
        """更新全局写作目标"""
        try:
            goals_path = self.file_service.novel_repo_path / "global_writing_goals.json"
            goals_path.parent.mkdir(exist_ok=True)
            
            # 读取现有目标
            existing_goals = {}
            if goals_path.exists():
                try:
                    with open(goals_path, 'r', encoding='utf-8') as f:
                        existing_goals = json.load(f)
                except Exception:
                    existing_goals = {}
            
            # 合并目标
            updated_goals = {**existing_goals, **goals}
            updated_goals["updated_at"] = datetime.now().isoformat()
            
            # 保存目标
            with open(goals_path, 'w', encoding='utf-8') as f:
                json.dump(updated_goals, f, ensure_ascii=False, indent=2)
            
            return True
        except Exception:
            return False

    def get_global_daily_stats(self, days: int = 30) -> List[dict]:
        """获取全局每日写作统计"""
        try:
            # 获取所有小说
            novels = self.file_service.list_novels()
            all_daily_stats = {}
            
            # 合并所有小说的每日统计
            for novel in novels:
                novel_id = novel.get('id', novel.get('slug', ''))
                if novel_id:
                    daily_stats = self.stats_service.get_daily_stats(novel_id, days)
                    for stat in daily_stats:
                        date = stat.get('date')
                        if date not in all_daily_stats:
                            all_daily_stats[date] = {
                                "date": date,
                                "word_count": 0,
                                "chapters_updated": 0,
                                "novels_updated": 0
                            }
                        
                        all_daily_stats[date]["word_count"] += stat.get('word_count', 0)
                        all_daily_stats[date]["chapters_updated"] += stat.get('chapters_updated', 0)
                        if stat.get('word_count', 0) > 0:
                            all_daily_stats[date]["novels_updated"] += 1
            
            # 转换为列表并排序
            stats_list = list(all_daily_stats.values())
            stats_list.sort(key=lambda x: x["date"])
            
            return stats_list
        except Exception:
            return []

    def get_global_novels_progress(self) -> List[dict]:
        """获取所有小说的进度概览"""
        try:
            novels = self.file_service.list_novels()
            novels_progress = []
            
            for novel in novels:
                novel_id = novel.get('id', novel.get('slug', ''))
                if novel_id:
                    # 获取小说统计
                    novel_stats = self.stats_service.get_novel_progress(novel_id)
                    
                    # 计算进度百分比（基于默认5万字目标）
                    target_words = 50000
                    progress_percentage = min(100, (novel_stats.get('total_words', 0) / target_words) * 100) if target_words > 0 else 0
                    
                    novels_progress.append({
                        "id": novel_id,
                        "title": novel.get('title', novel.get('slug', '')),
                        "word_count": novel_stats.get('total_words', 0),
                        "chapters_count": novel_stats.get('total_chapters', 0),
                        "last_updated": novel.get('updated_at', ''),
                        "progress_percentage": round(progress_percentage, 2)
                    })
            
            # 按字数排序
            novels_progress.sort(key=lambda x: x["word_count"], reverse=True)
            
            return novels_progress
        except Exception:
            return []

    def get_novel_calendar_stats(self, novel_id: str, days: int = 30) -> List[dict]:
        """获取小说的写作日历统计"""
        try:
            # 获取小说的每日统计
            daily_stats = self.stats_service.get_daily_stats(novel_id, days)
            
            # 转换为日历格式
            calendar_stats = []
            for i in range(days):
                date = datetime.now() - timedelta(days=i)
                date_str = date.strftime('%Y-%m-%d')
                
                # 查找当天的统计
                day_stat = next((stat for stat in daily_stats if stat.get('date') == date_str), None)
                
                if day_stat:
                    calendar_stats.append({
                        "date": date_str,
                        "word_count": day_stat.get('word_count', 0),
                        "chapters_updated": day_stat.get('chapters_updated', 0),
                        "writing_time": day_stat.get('writing_time', 0)
                    })
                else:
                    # 如果没有当天的统计，创建空记录
                    calendar_stats.append({
                        "date": date_str,
                        "word_count": 0,
                        "chapters_updated": 0,
                        "writing_time": 0
                    })
            
            # 按日期排序
            calendar_stats.sort(key=lambda x: x['date'])
            
            return calendar_stats
        except Exception:
            return []

# 创建写作服务实例
writing_service = WritingService()
