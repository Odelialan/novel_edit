#!/usr/bin/env python3
"""
文件命名工具模块
提供自动编号前缀功能，确保新创建的文件都有统一的编号格式
"""
import re
from pathlib import Path
from typing import Optional, List, Tuple


class FileNamingUtils:
    """文件命名工具类"""
    
    @staticmethod
    def get_next_number(directory: Path, file_extension: str = None) -> int:
        """
        获取目录中下一个可用的编号
        
        Args:
            directory: 目标目录
            file_extension: 文件扩展名过滤（如 '.md', '.txt'）
            
        Returns:
            下一个可用的编号（从1开始）
        """
        if not directory.exists():
            return 1
        
        # 获取所有文件
        if file_extension:
            files = list(directory.glob(f"*{file_extension}"))
        else:
            files = list(directory.glob("*"))
        
        # 提取所有已使用的编号
        used_numbers = set()
        for file_path in files:
            number = FileNamingUtils.extract_number_from_filename(file_path.name)
            if number is not None:
                used_numbers.add(number)
        
        # 找到下一个可用的编号
        next_number = 1
        while next_number in used_numbers:
            next_number += 1
        
        return next_number
    
    @staticmethod
    def extract_number_from_filename(filename: str) -> Optional[int]:
        """
        从文件名中提取编号
        
        Args:
            filename: 文件名
            
        Returns:
            提取的编号，如果没有找到则返回None
        """
        # 匹配格式：001_文件名.扩展名 或 001.扩展名
        match = re.match(r'^(\d{3})_', filename)
        if match:
            return int(match.group(1))
        
        # 匹配格式：001.扩展名
        match = re.match(r'^(\d{3})\.', filename)
        if match:
            return int(match.group(1))
        
        return None
    
    @staticmethod
    def generate_numbered_filename(
        base_name: str, 
        directory: Path, 
        extension: str = None,
        custom_number: int = None
    ) -> str:
        """
        生成带编号的文件名
        
        Args:
            base_name: 基础文件名（不包含扩展名）
            directory: 目标目录
            extension: 文件扩展名（如 '.md', '.txt'）
            custom_number: 自定义编号，如果不提供则自动获取下一个编号
            
        Returns:
            生成的文件名
        """
        # 清理基础文件名
        clean_base_name = FileNamingUtils._clean_filename(base_name)
        
        # 获取编号
        if custom_number is not None:
            number = custom_number
        else:
            number = FileNamingUtils.get_next_number(directory, extension)
        
        # 生成文件名
        if extension:
            if not extension.startswith('.'):
                extension = f'.{extension}'
            filename = f"{number:03d}_{clean_base_name}{extension}"
        else:
            filename = f"{number:03d}_{clean_base_name}"
        
        return filename
    
    @staticmethod
    def _clean_filename(filename: str) -> str:
        """
        清理文件名，移除或替换不安全的字符
        
        Args:
            filename: 原始文件名
            
        Returns:
            清理后的文件名
        """
        # 替换不安全的字符
        unsafe_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
        clean_name = filename
        for char in unsafe_chars:
            clean_name = clean_name.replace(char, '_')
        
        # 移除多余的空格和点
        clean_name = clean_name.strip(' .')
        
        # 如果文件名为空，使用默认名称
        if not clean_name:
            clean_name = "untitled"
        
        return clean_name
    
    @staticmethod
    def get_existing_files_info(directory: Path, file_extension: str = None) -> List[Tuple[int, str, Path]]:
        """
        获取目录中已存在的文件信息
        
        Args:
            directory: 目标目录
            file_extension: 文件扩展名过滤
            
        Returns:
            文件信息列表，每个元素为 (编号, 文件名, 文件路径)
        """
        if not directory.exists():
            return []
        
        # 获取所有文件
        if file_extension:
            files = list(directory.glob(f"*{file_extension}"))
        else:
            files = list(directory.glob("*"))
        
        file_info = []
        for file_path in files:
            if file_path.is_file():
                number = FileNamingUtils.extract_number_from_filename(file_path.name)
                if number is not None:
                    file_info.append((number, file_path.name, file_path))
        
        # 按编号排序
        file_info.sort(key=lambda x: x[0])
        
        return file_info
    
    @staticmethod
    def renumber_files(directory: Path, file_extension: str = None, dry_run: bool = True) -> List[Tuple[str, str]]:
        """
        重新编号目录中的文件，确保编号连续
        
        Args:
            directory: 目标目录
            file_extension: 文件扩展名过滤
            dry_run: 是否为试运行（不实际重命名）
            
        Returns:
            重命名操作列表，每个元素为 (原文件名, 新文件名)
        """
        if not directory.exists():
            return []
        
        # 获取现有文件信息
        file_info = FileNamingUtils.get_existing_files_info(directory, file_extension)
        
        rename_operations = []
        
        for i, (old_number, old_filename, file_path) in enumerate(file_info, 1):
            # 生成新的编号
            new_number = i
            
            # 如果编号没有变化，跳过
            if old_number == new_number:
                continue
            
            # 生成新文件名
            # 提取原文件名中编号后的部分
            if old_filename.startswith(f"{old_number:03d}_"):
                base_name = old_filename[4:]  # 移除 "001_" 前缀
            else:
                base_name = old_filename
            
            new_filename = f"{new_number:03d}_{base_name}"
            
            rename_operations.append((old_filename, new_filename))
            
            if not dry_run:
                try:
                    new_path = file_path.parent / new_filename
                    file_path.rename(new_path)
                except Exception as e:
                    print(f"重命名失败 {old_filename} -> {new_filename}: {e}")
        
        return rename_operations


# 便捷函数
def get_next_file_number(directory: Path, extension: str = None) -> int:
    """获取下一个文件编号"""
    return FileNamingUtils.get_next_number(directory, extension)


def generate_numbered_filename(base_name: str, directory: Path, extension: str = None) -> str:
    """生成带编号的文件名"""
    return FileNamingUtils.generate_numbered_filename(base_name, directory, extension)


def extract_file_number(filename: str) -> Optional[int]:
    """从文件名中提取编号"""
    return FileNamingUtils.extract_number_from_filename(filename)
