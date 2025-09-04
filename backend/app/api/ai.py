from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from app.models import APIResponse, AIExpandRequest, AIPolishRequest, AISummarizeRequest, AIResponse, AICharacterGenerateRequest
from app.auth import get_current_user
from app.services.ai_service import ai_service
import re
from app.services.file_service import file_service
import json
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/inspiration", response_model=APIResponse)
async def generate_inspiration(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """AI生成故事灵感"""
    try:
        # 读取world.json中的提示词
        world_prompts_path = file_service.novel_repo_path / "ai_prompts" / "world.json"
        if not world_prompts_path.exists():
            return APIResponse(
                ok=False,
                error={"code": "404", "msg": "提示词文件不存在"}
            )
        
        with open(world_prompts_path, 'r', encoding='utf-8') as f:
            world_prompts = json.load(f)
        
        # 构建完整的提示词
        prompt = world_prompts.get("random", "")
        
        # 将前端参数替换到提示词占位符中
        full_prompt = prompt.replace('{GENRE}', request.get('genre', ''))
        full_prompt = full_prompt.replace('{LENGTH}', request.get('length', ''))
        full_prompt = full_prompt.replace('{TAGS}', ', '.join(request.get('tags', [])))
        
        # 处理男女主角角色：如果为空则显示"（自动生成）"
        heroine_role = request.get('heroine_role', '')
        hero_role = request.get('hero_role', '')
        
        full_prompt = full_prompt.replace('{HEROINE_ROLE}', heroine_role if heroine_role else '（自动生成）')
        full_prompt = full_prompt.replace('{HERO_ROLE}', hero_role if hero_role else '（自动生成）')
        
        # 调用AI服务生成灵感
        result = await ai_service.expand_text(
            novel_id="inspiration",
            prompt_template="故事灵感生成",
            input_summary=full_prompt,
            style="default",
            max_tokens=1500
        )
        
        return APIResponse(
            ok=True,
            data={"result_text": result}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"AI灵感生成失败: {str(e)}"}
        )

@router.post("/expand", response_model=APIResponse)
async def expand_text(
    request: AIExpandRequest,
    current_user: dict = Depends(get_current_user)
):
    """AI扩写文本"""
    try:
        result = await ai_service.expand_text(
            request.novel_id,
            request.prompt_template,
            request.input_summary,
            request.style,
            request.max_tokens
        )
        
        return APIResponse(
            ok=True,
            data={"result_text": result}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"AI扩写失败: {str(e)}"}
        )

@router.post("/polish", response_model=APIResponse)
async def polish_text(
    request: AIPolishRequest,
    current_user: dict = Depends(get_current_user)
):
    """AI润色文本"""
    try:
        result = await ai_service.polish_text(
            request.text,
            request.preserve_content,
            request.style
        )
        
        return APIResponse(
            ok=True,
            data={"result_text": result}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"AI润色失败: {str(e)}"}
        )

@router.post("/summarize", response_model=APIResponse)
async def summarize_text(
    request: AISummarizeRequest,
    current_user: dict = Depends(get_current_user)
):
    """AI总结文本"""
    try:
        result = await ai_service.summarize_text(
            request.text,
            request.max_sentences
        )
        
        return APIResponse(
            ok=True,
            data={"result_summary": result}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"AI总结失败: {str(e)}"}
        )

@router.post("/chapter-summary/save", response_model=APIResponse)
async def save_chapter_summary(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """保存章节概要到文件"""
    try:
        novel_id = request.get('novel_id')
        chapter_number = request.get('chapter_number')
        summary_content = request.get('summary_content')
        
        if not all([novel_id, chapter_number, summary_content]):
            return APIResponse(
                ok=False,
                error={"code": "400", "msg": "缺少必要参数"}
            )
        
        # 确保项目目录下的summaries目录存在
        novel_path = file_service.novel_repo_path / novel_id
        summaries_dir = novel_path / "summaries"
        summaries_dir.mkdir(exist_ok=True)
        
        # 使用自动编号工具生成文件名
        from app.utils.file_naming import FileNamingUtils
        filename = FileNamingUtils.generate_numbered_filename(
            base_name=f"chapter_{chapter_number}_summary",
            directory=summaries_dir,
            extension='.md',
            custom_number=int(chapter_number)
        )
        file_path = summaries_dir / filename
        
        # 写入概要内容
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(summary_content)
        
        return APIResponse(
            ok=True,
            data={
                "message": "概要已保存",
                "file_path": f"{novel_id}/summaries/{filename}"
            }
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"保存概要失败: {str(e)}"}
        )

@router.get("/chapter-summary/{novel_id}/{chapter_number}", response_model=APIResponse)
async def get_chapter_summary(
    novel_id: str,
    chapter_number: int,
    current_user: dict = Depends(get_current_user)
):
    """获取章节概要"""
    try:
        # 生成文件名
        filename = f"chapter_{chapter_number.zfill(3)}_summary.md"
        novel_path = file_service.novel_repo_path / novel_id
        file_path = novel_path / "summaries" / filename
        
        if not file_path.exists():
            return APIResponse(
                ok=True,
                data={
                    "summary": "",
                    "exists": False,
                    "message": "尚未生成概要"
                }
            )
        
        # 读取概要内容
        with open(file_path, 'r', encoding='utf-8') as f:
            summary_content = f.read()
        
        return APIResponse(
            ok=True,
            data={
                "summary": summary_content,
                "exists": True,
                "file_path": f"{novel_id}/summaries/{filename}"
            }
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"读取概要失败: {str(e)}"}
        )

@router.post("/stream")
async def stream_expand(
    request: AIExpandRequest,
    current_user: dict = Depends(get_current_user)
):
    """AI流式扩写文本"""
    try:
        async def generate():
            async for chunk in ai_service.expand_text_stream(
                request.novel_id,
                request.prompt_template,
                request.input_summary,
                request.style,
                request.max_tokens
            ):
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            }
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"AI流式扩写失败: {str(e)}"}
        ) 

@router.post("/character/generate", response_model=APIResponse)
async def generate_character(
    request: AICharacterGenerateRequest,
    current_user: dict = Depends(get_current_user)
):
    """AI 生成并补全角色设定（依据角色类型与部分种子信息）。"""
    try:
        result = await ai_service.generate_character_profile(
            request.novel_id,
            request.role_type,
            request.seed,
            request.story_info,
            request.prompt_key
        )
        return APIResponse(ok=True, data={"profile": result})
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"AI角色生成失败: {str(e)}"}
        )

@router.post("/outline", response_model=APIResponse)
async def generate_outline(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """AI生成大纲"""
    try:
        novel_id = request.get('novel_id')
        outline_type = request.get('outline_type', 'story_background')  # 默认使用故事背景设定
        if not novel_id:
            return APIResponse(
                ok=False,
                error={"code": "400", "msg": "缺少小说ID"}
            )
        
        # 根据outline_type读取对应的提示词文件
        outline_prompts_path = file_service.novel_repo_path / "ai_prompts" / "outline" / f"{outline_type}.json"
        if not outline_prompts_path.exists():
            return APIResponse(
                ok=False,
                error={"code": "404", "msg": f"提示词文件 {outline_type}.json 不存在"}
            )
        
        with open(outline_prompts_path, 'r', encoding='utf-8') as f:
            outline_prompts = json.load(f)
        
        # 使用targeted提示词模板（定向生成）
        prompt_template = outline_prompts.get("targeted", "")
        if not prompt_template:
            return APIResponse(
                ok=False,
                error={"code": "404", "msg": "targeted提示词模板不存在"}
            )
        
        # 构建完整的提示词，自动填充小说信息
        full_prompt = await _build_outline_prompt(novel_id, prompt_template)
        
        # 如果用户提供了补充提示词，将其添加到完整提示词中
        user_prompt = request.get('user_prompt', '').strip()
        if user_prompt:
            full_prompt += f"\n\n用户补充要求：{user_prompt}"
        
        # 调用AI服务生成大纲
        result = await ai_service.expand_text(
            novel_id=novel_id,
            prompt_template=full_prompt,
            input_summary="请根据提示词生成完整的大纲内容",
            style="default",
            max_tokens=2000
        )
        
        return APIResponse(
            ok=True,
            data={"result_text": result}
        )
    except Exception as e:
        return APIResponse(
            ok=False,
            error={"code": "500", "msg": f"AI大纲生成失败: {str(e)}"}
        )

async def _build_outline_prompt(novel_id: str, prompt_template: str) -> str:
    """构建大纲生成的完整提示词"""
    try:
        # 读取小说配置
        novel_config_file = file_service.novel_repo_path / novel_id / "novel_config.json"
        novel_info = {}
        if novel_config_file.exists():
            with open(novel_config_file, 'r', encoding='utf-8') as f:
                novel_config = json.load(f)
                meta = novel_config.get("meta", {})
                novel_info = {
                    "genre": meta.get("genre", "（自动生成）"),
                    "length": meta.get("target_length", "（自动生成）"),
                    "tags": meta.get("tags", []),
                    "title": meta.get("title", "")
                }
        
        # 读取角色信息
        characters_file = file_service.novel_repo_path / novel_id / "characters" / "characters.json"
        heroine_role = "（自动生成）"
        hero_role = "（自动生成）"
        
        if characters_file.exists():
            with open(characters_file, 'r', encoding='utf-8') as f:
                characters = json.load(f)
                for char in characters:
                    if char.get("role_type") == "女主角":
                        heroine_role = char.get("name", "（自动生成）")
                    elif char.get("role_type") == "男主角":
                        hero_role = char.get("name", "（自动生成）")
        else:
            # 尝试读取单个角色文件
            characters_dir = file_service.novel_repo_path / novel_id / "characters"
            if characters_dir.exists():
                for filename in os.listdir(characters_dir):
                    if filename.endswith('.json'):
                        try:
                            with open(characters_dir / filename, 'r', encoding='utf-8') as f:
                                char = json.load(f)
                                if char.get("role_type") == "女主角":
                                    heroine_role = char.get("name", "（自动生成）")
                                elif char.get("role_type") == "男主角":
                                    hero_role = char.get("name", "（自动生成）")
                        except:
                            continue
        
        # 读取已写章节内容
        chapters_dir = file_service.novel_repo_path / novel_id / "chapters"
        chapter_content = "（自动生成）"
        
        if chapters_dir.exists():
            chapters = []
            for filename in os.listdir(chapters_dir):
                if filename.endswith('.txt'):
                    try:
                        with open(chapters_dir / filename, 'r', encoding='utf-8') as f:
                            content = f.read()
                            chapters.append({
                                "filename": filename,
                                "content": content[:500] + "..." if len(content) > 500 else content
                            })
                    except:
                        continue
            
            if chapters:
                # 取最近3章的内容摘要
                chapters.sort(key=lambda x: x["filename"], reverse=True)
                chapter_content = "\n\n".join([f"{ch['filename']}: {ch['content']}" for ch in chapters[:3]])
        
        # 读取已生成大纲内容（outlines 目录下 .md/.txt）
        outlines_dir = file_service.novel_repo_path / novel_id / "outlines"
        outline_content = "（自动生成）"
        if outlines_dir.exists():
            try:
                files = [p for p in outlines_dir.iterdir() if p.is_file() and p.suffix.lower() in ('.md', '.txt')]
                # 按修改时间倒序，取最近的 3 个
                files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
                snippets = []
                for p in files[:3]:
                    try:
                        with open(p, 'r', encoding='utf-8') as f:
                            content = f.read()
                            # 每个文件截取前 1200 字符，避免提示过长
                            snippet = content[:1200]
                            snippets.append(f"### {p.stem}\n{snippet}")
                    except Exception:
                        continue
                if snippets:
                    outline_content = "\n\n".join(snippets)
            except Exception:
                pass

        # 读取章节概要内容
        summaries_dir = file_service.novel_repo_path.parent / "summaries"
        chapter_summary = "（自动生成）"
        all_chapter_summaries = "（自动生成）"
        if summaries_dir.exists():
            try:
                summary_files = [p for p in summaries_dir.iterdir() if p.is_file() and p.name.startswith('chapter_') and p.name.endswith('_summary.md')]
                if summary_files:
                    # 按章节编号排序
                    summary_files.sort(key=lambda p: int(p.stem.split('_')[1]))
                    snippets = []
                    all_summaries = []
                    for p in summary_files:
                        try:
                            with open(p, 'r', encoding='utf-8') as f:
                                content = f.read()
                                chapter_num = p.stem.split('_')[1]
                                # 每个概要截取前 800 字符，避免提示过长
                                snippet = content[:800]
                                snippets.append(f"### 第{chapter_num}章概要\n{snippet}")
                                # 为全部章节概要添加更简洁的格式
                                all_summaries.append(f"第{chapter_num}章：{content[:500]}")
                        except Exception:
                            continue
                    if snippets:
                        chapter_summary = "\n\n".join(snippets)
                    if all_summaries:
                        all_chapter_summaries = "\n\n".join(all_summaries)
            except Exception:
                pass

        # 替换提示词模板中的占位符（大小写不敏感支持）
        full_prompt = prompt_template.replace('{GENRE}', novel_info.get("genre", "（自动生成）"))
        full_prompt = full_prompt.replace('{LENGTH}', novel_info.get("length", "（自动生成）"))
        full_prompt = full_prompt.replace('{TAGS}', ', '.join(novel_info.get("tags", [])) if novel_info.get("tags") else "（自动生成）")
        full_prompt = full_prompt.replace('{HEROINE_ROLE}', heroine_role)
        full_prompt = full_prompt.replace('{HERO_ROLE}', hero_role)
        # 章节内容、已生成大纲内容与章节概要
        full_prompt = re.sub(r'\{[Cc]hapter content\}', chapter_content, full_prompt)
        full_prompt = re.sub(r'\{[Oo]utline content\}', outline_content, full_prompt)
        full_prompt = re.sub(r'\{[Cc]hapter summary\}', chapter_summary, full_prompt)
        full_prompt = re.sub(r'\{[Aa]ll chapter summaries\}', all_chapter_summaries, full_prompt)
        
        return full_prompt
        
    except Exception as e:
        logger.error(f"构建大纲提示词失败: {e}")
        return prompt_template