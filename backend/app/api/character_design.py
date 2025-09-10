from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import json
import os

router = APIRouter()

class CharacterDesignRequest(BaseModel):
    novel_type: str
    outline: str
    plot: str
    character_design: str
    heroine_profile: Optional[str] = None
    hero_profile: Optional[str] = None

class CharacterDesignResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

class NovelInfoResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

@router.get("/novel-info/{novel_id}", response_model=NovelInfoResponse)
async def get_novel_info(novel_id: str):
    """
    获取小说信息，用于自动填充角色设计参数
    """
    try:
        # 读取小说配置文件
        novel_config_file = f"novel_repo/{novel_id}/novel_config.json"
        if not os.path.exists(novel_config_file):
            raise HTTPException(status_code=404, detail="小说配置文件不存在")
        
        with open(novel_config_file, 'r', encoding='utf-8') as f:
            novel_config = json.load(f)
        
        # 读取小说大纲
        outline_file = f"novel_repo/{novel_id}/outlines/main_outline.md"
        outline_content = ""
        if os.path.exists(outline_file):
            with open(outline_file, 'r', encoding='utf-8') as f:
                outline_content = f.read()
        
        # 读取角色信息
        characters_file = f"novel_repo/{novel_id}/characters/characters.json"
        characters = []
        if os.path.exists(characters_file):
            with open(characters_file, 'r', encoding='utf-8') as f:
                characters = json.load(f)
        
        # 提取女主角信息
        heroine_profile = ""
        for char in characters:
            if char.get("role_type") == "女主角" or char.get("gender") == "女":
                heroine_profile = f"姓名：{char.get('name', '')}\n"
                if char.get('appearance'):
                    heroine_profile += f"外貌：{char.get('appearance')}\n"
                if char.get('personality'):
                    heroine_profile += f"性格：{char.get('personality')}\n"
                if char.get('profile'):
                    heroine_profile += f"详细设定：{json.dumps(char.get('profile'), ensure_ascii=False)}\n"
                break
        
        return NovelInfoResponse(
            success=True,
            message="获取小说信息成功",
            data={
                "novel_type": novel_config.get("genre", "未知类型"),
                "outline": outline_content,
                "characters": characters,
                "heroine_profile": heroine_profile,
                "novel_config": novel_config
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取小说信息失败: {str(e)}")

@router.post("/design-hero", response_model=CharacterDesignResponse)
async def design_hero_character(request: CharacterDesignRequest):
    """
    设计男主角角色
    """
    try:
        # 使用Python模块读取提示词
        import sys
        from app.services.file_service import file_service
        
        novel_repo_path = str(file_service.novel_repo_path)
        if novel_repo_path not in sys.path:
            sys.path.insert(0, novel_repo_path)
        
        from ai_prompts.prompts import get_character_prompt
        prompt = get_character_prompt("男主角")
        
        # 使用format方法替换占位符
        try:
            formatted_prompt = prompt.format(
                novel_type=request.novel_type,
                outline=request.outline,
                plot=request.plot,
                character_design=request.character_design,
                heroine_profile=request.heroine_profile or ""
            )
        except KeyError as e:
            # 如果占位符不存在，使用replace方法
            formatted_prompt = prompt.replace("{NOVEL_TYPE}", request.novel_type)
            formatted_prompt = formatted_prompt.replace("{OUTLINE_CONTENT}", request.outline)
            formatted_prompt = formatted_prompt.replace("{PLOT_POINTS}", request.plot)
            formatted_prompt = formatted_prompt.replace("{CHARACTER_DESIGN}", request.character_design)
            formatted_prompt = formatted_prompt.replace("{HEROINE_ROLE}", request.heroine_profile or "")
        
        # 返回处理后的提示词
        return CharacterDesignResponse(
            success=True,
            message="男主角角色设计提示词生成成功",
            data={
                "prompt": formatted_prompt,
                "style": "",
                "schema_hint": "",
                "parameters": {}
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成男主角提示词失败: {str(e)}")

@router.post("/design-heroine", response_model=CharacterDesignResponse)
async def design_heroine_character(request: CharacterDesignRequest):
    """
    设计女主角角色
    """
    try:
        # 使用Python模块读取提示词
        import sys
        from app.services.file_service import file_service
        
        novel_repo_path = str(file_service.novel_repo_path)
        if novel_repo_path not in sys.path:
            sys.path.insert(0, novel_repo_path)
        
        from ai_prompts.prompts import get_character_prompt
        prompt = get_character_prompt("女主角")
        
        # 使用format方法替换占位符
        try:
            formatted_prompt = prompt.format(
                novel_type=request.novel_type,
                outline=request.outline,
                plot=request.plot,
                character_design=request.character_design,
                hero_profile=request.hero_profile or ""
            )
        except KeyError as e:
            # 如果占位符不存在，使用replace方法
            formatted_prompt = prompt.replace("{NOVEL_TYPE}", request.novel_type)
            formatted_prompt = formatted_prompt.replace("{OUTLINE_CONTENT}", request.outline)
            formatted_prompt = formatted_prompt.replace("{PLOT_POINTS}", request.plot)
            formatted_prompt = formatted_prompt.replace("{CHARACTER_DESIGN}", request.character_design)
            formatted_prompt = formatted_prompt.replace("{HERO_ROLE}", request.hero_profile or "")
        
        # 返回处理后的提示词
        return CharacterDesignResponse(
            success=True,
            message="女主角角色设计提示词生成成功",
            data={
                "prompt": formatted_prompt,
                "style": "",
                "schema_hint": "",
                "parameters": {}
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成女主角提示词失败: {str(e)}")

@router.get("/templates", response_model=CharacterDesignResponse)
async def get_character_templates():
    """
    获取角色设计模板信息
    """
    try:
        templates = {}
        
        # 使用Python模块读取提示词
        import sys
        from app.services.file_service import file_service
        
        novel_repo_path = str(file_service.novel_repo_path)
        if novel_repo_path not in sys.path:
            sys.path.insert(0, novel_repo_path)
        
        from ai_prompts.prompts import get_character_prompt
        
        # 读取男主角模板
        try:
            hero_prompt = get_character_prompt("男主角")
            templates["hero"] = {
                "parameters": {},
                "style": "",
                "schema_hint": hero_prompt
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"获取男主角模板失败: {str(e)}")
        
        # 读取女主角模板
        try:
            heroine_prompt = get_character_prompt("女主角")
            templates["heroine"] = {
                "parameters": {},
                "style": "",
                "schema_hint": heroine_prompt
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"获取女主角模板失败: {str(e)}")
        
        return CharacterDesignResponse(
            success=True,
            message="获取角色设计模板成功",
            data=templates
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取模板信息失败: {str(e)}")
