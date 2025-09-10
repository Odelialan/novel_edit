# 统一提示词管理文件
# 将所有提示词模块统一导入和管理

from .expand import EXPAND_PROMPTS
from .inspiration import INSPIRATION_PROMPTS
from .polish import POLISH_PROMPTS
from .summary import SUMMARY_PROMPTS
from .styles import STYLES_PROMPTS
from .world import WORLD_PROMPTS
from .character import CHARACTER_PROMPTS
from .outline import OUTLINE_PROMPTS

# 统一提示词字典
ALL_PROMPTS = {
    "expand": EXPAND_PROMPTS,
    "inspiration": INSPIRATION_PROMPTS,
    "polish": POLISH_PROMPTS,
    "summary": SUMMARY_PROMPTS,
    "full_summary": {"full_novel": SUMMARY_PROMPTS["full_novel"]},  # 全文概要提示词
    "styles": STYLES_PROMPTS,
    "world": WORLD_PROMPTS,
    "character": CHARACTER_PROMPTS,
    "outline": OUTLINE_PROMPTS,
}

def get_prompt(category: str, prompt_type: str = None) -> str:
    """
    获取指定分类和类型的提示词
    
    Args:
        category: 提示词分类 (expand, inspiration, polish, summary, styles, world, character, outline)
        prompt_type: 提示词类型，如果为None则返回整个分类的字典
    
    Returns:
        提示词字符串或字典
    """
    if category not in ALL_PROMPTS:
        raise ValueError(f"Unknown category: {category}")
    
    prompts = ALL_PROMPTS[category]
    
    if prompt_type is None:
        return prompts
    
    if prompt_type not in prompts:
        raise ValueError(f"Unknown prompt_type '{prompt_type}' in category '{category}'")
    
    return prompts[prompt_type]

def list_categories() -> list:
    """列出所有可用的提示词分类"""
    return list(ALL_PROMPTS.keys())

def list_prompt_types(category: str) -> list:
    """列出指定分类下的所有提示词类型"""
    if category not in ALL_PROMPTS:
        raise ValueError(f"Unknown category: {category}")
    
    return list(ALL_PROMPTS[category].keys())

def format_prompt(prompt: str, **kwargs) -> str:
    """
    格式化提示词，替换占位符
    
    Args:
        prompt: 原始提示词字符串
        **kwargs: 用于替换占位符的键值对
    
    Returns:
        格式化后的提示词字符串
    """
    try:
        return prompt.format(**kwargs)
    except KeyError as e:
        raise ValueError(f"Missing required parameter: {e}")

# 便捷函数
def get_expand_prompt(prompt_type: str = "sentence") -> str:
    """获取扩写提示词"""
    return get_prompt("expand", prompt_type)

def get_inspiration_prompt(prompt_type: str = "main_story") -> str:
    """获取灵感提示词"""
    return get_prompt("inspiration", prompt_type)

def get_polish_prompt(prompt_type: str = "sentence") -> str:
    """获取润色提示词"""
    return get_prompt("polish", prompt_type)

def get_summary_prompt(prompt_type: str = "chapter") -> str:
    """获取摘要提示词"""
    return get_prompt("summary", prompt_type)

def get_styles_prompt(prompt_type: str = "current") -> str:
    """获取风格提示词"""
    return get_prompt("styles", prompt_type)

def get_world_prompt(prompt_type: str = "random") -> str:
    """获取世界观提示词"""
    return get_prompt("world", prompt_type)

def get_character_prompt(prompt_type: str = "男主角") -> str:
    """获取角色提示词"""
    return get_prompt("character", prompt_type)

def get_outline_prompt(prompt_type: str = "main_plot") -> str:
    """获取大纲提示词"""
    try:
        outline_prompts = get_prompt("outline")
        if prompt_type in outline_prompts:
            # 如果存在该类型，返回其random子项
            if isinstance(outline_prompts[prompt_type], dict) and "random" in outline_prompts[prompt_type]:
                return outline_prompts[prompt_type]["random"]
            elif isinstance(outline_prompts[prompt_type], str):
                return outline_prompts[prompt_type]
        # 默认返回main_plot的random
        if "main_plot" in outline_prompts and "random" in outline_prompts["main_plot"]:
            return outline_prompts["main_plot"]["random"]
        return "请根据用户提供的信息生成相应的大纲内容。"
    except Exception as e:
        return "请根据用户提供的信息生成相应的大纲内容。"
