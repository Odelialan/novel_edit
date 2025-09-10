from fastapi import APIRouter, HTTPException, Depends
from app.auth import get_current_user
from app.services.ai_service import ai_service
from app.models import APIResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/prompts")
async def get_prompts(
    scope: str = "global",
    novel_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    """获取提示词模板"""
    try:
        prompts = {}
        
        if scope == "global":
            # 加载全局提示词
            try:
                expand_prompt = await ai_service._load_expand_prompt("default")
                polish_prompt = await ai_service._load_polish_prompt("default")
                summary_prompt = await ai_service._load_summary_prompt("chapter")
                full_summary_prompt = await ai_service._load_summary_prompt("full_novel")
                styles_prompt = await ai_service._load_styles_prompt()
                world_prompt = await ai_service._load_world_prompt("random")
                inspiration_prompt = await ai_service._load_inspiration_prompt("main_story")
                
                # 加载角色提示词
                character_prompts = {}
                try:
                    character_prompts["男主角"] = await ai_service._load_character_prompt("男主角")
                    character_prompts["女主角"] = await ai_service._load_character_prompt("女主角")
                    character_prompts["男二"] = await ai_service._load_character_prompt("男二")
                    character_prompts["女二"] = await ai_service._load_character_prompt("女二")
                    character_prompts["配角"] = await ai_service._load_character_prompt("配角")
                    character_prompts["反派"] = await ai_service._load_character_prompt("反派")
                except Exception as e:
                    logger.warning(f"加载角色提示词失败: {str(e)}")
                
                # 加载大纲提示词 - 直接加载原始结构并转换为扁平结构
                outline_prompts = {}
                try:
                    import sys
                    from app.services.file_service import file_service
                    novel_repo_path = str(file_service.novel_repo_path)
                    if novel_repo_path not in sys.path:
                        sys.path.insert(0, novel_repo_path)
                    from ai_prompts.outline import OUTLINE_PROMPTS
                    
                    # 将嵌套结构转换为扁平结构
                    for prompt_type, prompt_data in OUTLINE_PROMPTS.items():
                        if isinstance(prompt_data, dict) and "random" in prompt_data:
                            outline_prompts[prompt_type] = prompt_data["random"]
                        elif isinstance(prompt_data, str):
                            outline_prompts[prompt_type] = prompt_data
                except Exception as e:
                    logger.warning(f"加载大纲提示词失败: {str(e)}")
                
                prompts = {
                    "expand": {
                        "sentence": expand_prompt,
                        "paragraph": expand_prompt 
                    },
                    "polish": {
                        "sentence": polish_prompt,
                        "paragraph": polish_prompt  
                    },
                    "summary": {
                        "chapter": summary_prompt
                    },
                    "full_summary": {
                        "full_novel": full_summary_prompt
                    },
                    "styles": {
                        "current": styles_prompt
                    },
                    "world": {
                        "random": world_prompt
                    },
                    "inspiration": {
                        "main_story": inspiration_prompt
                    },
                    "character": character_prompts,
                    "outline": outline_prompts
                }
            except Exception as e:
                logger.error(f"加载全局提示词失败: {str(e)}")
                raise HTTPException(status_code=500, detail=f"加载全局提示词失败: {str(e)}")
        
        elif scope == "novel" and novel_id:
            # 小说级提示词（暂时使用全局提示词）
            try:
                expand_prompt = await ai_service._load_expand_prompt("default")
                polish_prompt = await ai_service._load_polish_prompt("default")
                summary_prompt = await ai_service._load_summary_prompt("chapter")
                full_summary_prompt = await ai_service._load_summary_prompt("full_novel")
                styles_prompt = await ai_service._load_styles_prompt()
                world_prompt = await ai_service._load_world_prompt("random")
                inspiration_prompt = await ai_service._load_inspiration_prompt("main_story")
                
                # 加载角色提示词
                character_prompts = {}
                try:
                    character_prompts["男主角"] = await ai_service._load_character_prompt("男主角")
                    character_prompts["女主角"] = await ai_service._load_character_prompt("女主角")
                    character_prompts["男二"] = await ai_service._load_character_prompt("男二")
                    character_prompts["女二"] = await ai_service._load_character_prompt("女二")
                    character_prompts["配角"] = await ai_service._load_character_prompt("配角")
                    character_prompts["反派"] = await ai_service._load_character_prompt("反派")
                except Exception as e:
                    logger.warning(f"加载角色提示词失败: {str(e)}")
                
                # 加载大纲提示词 - 直接加载原始结构并转换为扁平结构
                outline_prompts = {}
                try:
                    import sys
                    from app.services.file_service import file_service
                    novel_repo_path = str(file_service.novel_repo_path)
                    if novel_repo_path not in sys.path:
                        sys.path.insert(0, novel_repo_path)
                    from ai_prompts.outline import OUTLINE_PROMPTS
                    
                    # 将嵌套结构转换为扁平结构
                    for prompt_type, prompt_data in OUTLINE_PROMPTS.items():
                        if isinstance(prompt_data, dict) and "random" in prompt_data:
                            outline_prompts[prompt_type] = prompt_data["random"]
                        elif isinstance(prompt_data, str):
                            outline_prompts[prompt_type] = prompt_data
                except Exception as e:
                    logger.warning(f"加载大纲提示词失败: {str(e)}")
                
                prompts = {
                    "expand": {
                        "sentence": expand_prompt,
                        "paragraph": expand_prompt
                    },
                    "polish": {
                        "sentence": polish_prompt,
                        "paragraph": polish_prompt
                    },
                    "summary": {
                        "chapter": summary_prompt
                    },
                    "full_summary": {
                        "full_novel": full_summary_prompt
                    },
                    "styles": {
                        "current": styles_prompt
                    },
                    "world": {
                        "random": world_prompt
                    },
                    "inspiration": {
                        "main_story": inspiration_prompt
                    },
                    "character": character_prompts,
                    "outline": outline_prompts
                }
            except Exception as e:
                logger.error(f"加载小说提示词失败: {str(e)}")
                raise HTTPException(status_code=500, detail=f"加载小说提示词失败: {str(e)}")
        
        return APIResponse(
            ok=True,
            data={"prompts": prompts}
        )
        
    except Exception as e:
        logger.error(f"获取提示词失败: {str(e)}")
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"获取提示词失败: {str(e)}"}
        )