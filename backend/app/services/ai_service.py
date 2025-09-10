import asyncio
import httpx
from typing import Optional, AsyncGenerator
import json
import logging
import os

from app.config import settings
from app.services.file_service import file_service

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.provider = settings.AI_PROVIDER
        self.openai_api_key = settings.OPENAI_API_KEY
        self.openai_base_url = settings.OPENAI_BASE_URL or "https://api.openai.com/v1"
        # Gemini 配置
        self.gemini_api_key = settings.GEMINI_API_KEY
        self.gemini_base_url = settings.GEMINI_BASE_URL or "https://generativelanguage.googleapis.com"
    
    async def expand_text(self, novel_id: str, prompt_template: str, 
                         input_summary: str, style: str = "default", 
                         max_tokens: int = 1000) -> str:
        """扩写文本（增强版，包含完整上下文）"""
        
        # 如果没有提供提示词模板，从文件加载默认提示词
        if not prompt_template or prompt_template.strip() == "":
            prompt_template = await self._load_expand_prompt(style)
        
        # 自动替换提示词中的占位符
        additional_context = {
            "INPUT_SUMMARY": input_summary,
            "STYLE": style,
            "MAX_TOKENS": str(max_tokens)
        }
        
        # 如果是灵感生成，跳过占位符替换
        if novel_id != "inspiration":
            prompt_template = await self._auto_replace_placeholders(prompt_template, novel_id, additional_context)
        
        # 如果是灵感生成，使用简化的上下文
        if novel_id == "inspiration":
            enhanced_context = {
                "input_summary": input_summary,
                "style": style,
                "novel_info": {},
                "character_info": {},
                "world_info": {},
                "writing_context": {}
            }
        else:
            # 构建增强的上下文信息
            enhanced_context = await self._build_enhanced_context(novel_id, input_summary, style)
        
        # 构建完整的提示词
        full_prompt = self._build_full_prompt(prompt_template, enhanced_context, style)
        
        if self.provider == "openai":
            return await self._openai_expand_enhanced(full_prompt, enhanced_context, style, max_tokens)
        elif self.provider == "gemini":
            return await self._gemini_expand_enhanced(full_prompt, enhanced_context, style, max_tokens)
        else:
            return "请配置有效的AI提供者（openai或gemini）"
    
    async def polish_text(self, text: str, preserve_content: bool = True, 
                         style: str = "default", novel_id: str = None) -> str:
        """润色文本"""
        
        # 加载润色提示词
        prompt_template = await self._load_polish_prompt(style)
        
        # 如果有novel_id，进行占位符替换
        if novel_id:
            additional_context = {
                "ORIGINAL_TEXT": text,
                "STYLE": style
            }
            prompt_template = await self._auto_replace_placeholders(prompt_template, novel_id, additional_context)
        else:
            # 简单替换
            prompt_template = prompt_template.replace("{ORIGINAL_TEXT}", text)
            prompt_template = prompt_template.replace("{STYLE}", style)
        
        if self.provider == "openai":
            return await self._openai_polish_enhanced(text, prompt_template, preserve_content, style)
        elif self.provider == "gemini":
            return await self._gemini_polish_enhanced(text, prompt_template, preserve_content, style)
        else:
            return "请配置有效的AI提供者（openai或gemini）"
    
    async def summarize_text(self, text: str, max_sentences: int = 3, summary_type: str = "chapter", novel_id: str = None, chapter_number: int = None) -> str:
        """总结文本"""
        
        # 加载摘要提示词
        prompt_template = await self._load_summary_prompt(summary_type)
        
        # 如果有novel_id，进行占位符替换
        if novel_id and summary_type == "chapter":
            # 直接替换通用占位符
            prompt_template = prompt_template.replace("{CHAPTER_CONTENT_XXX}", text)
            prompt_template = prompt_template.replace("{MAX_SENTENCES}", str(max_sentences))
            
            # 然后进行其他占位符替换
            additional_context = {
                "MAX_SENTENCES": str(max_sentences)
            }
            prompt_template = await self._auto_replace_placeholders(prompt_template, novel_id, additional_context)
        elif novel_id and summary_type == "full_novel":
            additional_context = {
                "MAX_SENTENCES": str(max_sentences)
            }
            prompt_template = await self._auto_replace_placeholders(prompt_template, novel_id, additional_context)
        else:
            # 简单替换
            prompt_template = prompt_template.replace("{TEXT}", text)
            prompt_template = prompt_template.replace("{MAX_SENTENCES}", str(max_sentences))
        
        if self.provider == "openai":
            return await self._openai_summarize_enhanced(text, prompt_template, max_sentences)
        elif self.provider == "gemini":
            return await self._gemini_summarize_enhanced(text, prompt_template, max_sentences)
        else:
            return "请配置有效的AI提供者（openai或gemini）"
    
    async def generate_character_profile(
        self,
        novel_id: str,
        role_type: str | None,
        seed: dict,
        story_info: str | None,
        prompt_key: str | None
    ) -> dict:
        """根据提示词与部分已知字段，让AI补全标准化角色设定结构。"""
        # 使用新的提示词加载方法
        role_key = role_type or seed.get("role_type") or "配角"
        try:
            selected_prompt = await self._load_character_prompt(role_key)
            selected_style = await self._load_styles_prompt()
            
            # 处理男主角提示词中的HEROINE_ROLE占位符
            if role_key == "男主角" and "{HEROINE_ROLE}" in selected_prompt:
                # 获取女主角信息
                heroine_info = ""
                try:
                    # 这里可以从数据库或缓存中获取女主角信息
                    # 暂时使用story_info中的信息
                    if story_info and "女主角" in story_info:
                        heroine_info = story_info
                    else:
                        heroine_info = "暂无女主角设定信息"
                except Exception as e:
                    logger.warning(f"获取女主角信息失败: {str(e)}")
                    heroine_info = "暂无女主角设定信息"
                
                # 替换占位符
                selected_prompt = selected_prompt.replace("{HEROINE_ROLE}", heroine_info)
                logger.info(f"已替换男主角提示词中的HEROINE_ROLE占位符")
                
        except Exception as e:
            logger.error(f"加载角色提示词失败: {str(e)}")
            selected_prompt = "请补全角色设定，输出 appearance/personality/profile 等字段。"
            selected_style = "自然简洁、逻辑自洽。"
        
        # 自动检测并替换提示词中的所有占位符
        additional_context = {}
        if story_info and story_info.strip():
            additional_context["STORY_INFO"] = story_info.strip()
        
        selected_prompt = await self._auto_replace_placeholders(selected_prompt, novel_id, additional_context)

        if self.provider == "gemini":
            return await self._gemini_generate_character(role_key, selected_prompt, selected_style, seed, story_info)
        elif self.provider == "openai":
            return await self._openai_generate_character(role_key, selected_prompt, selected_style, seed, story_info)
        return {
            "role_type": role_type or seed.get("role_type") or "配角",
            "name": seed.get("name") or "未命名角色",
            "gender": seed.get("gender") or None,
            "age": seed.get("age") or None,
            "appearance": seed.get("appearance") or "特征鲜明。",
            "personality": seed.get("personality") or "性格立体。",
            "profile": seed.get("profile") or {},
            "_prompt_used": {"role": role_key, "prompt": selected_prompt, "style": selected_style, "story_info": story_info or ""}
        }
    
    async def _get_novel_info(self, novel_id: str) -> dict:
        """获取小说信息"""
        try:
            novel_path = file_service.novel_repo_path / novel_id / "novel_config.json"
            if novel_path.exists():
                import json
                with open(novel_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    meta = config.get("meta", {})
                    return {
                        "NOVEL_TYPE": meta.get("novel_type", meta.get("genre", "")),
                        "GENRE": meta.get("genre", ""),
                        "LENGTH": meta.get("length", meta.get("target_length", "")),
                        "TAGS": ", ".join(meta.get("tags", [])),
                        "CHAPTER_CONTENT": "",  # 这里可以读取章节内容
                        "CHARACTER_DESIGN": "",  # 这里可以读取已有角色设计
                        "OUTLINE_CONTENT": "",  # 这里可以读取大纲内容
                        "HEROINE_ROLE": "",  # 这里可以读取女主身份
                        "HERO_ROLE": "",  # 这里可以读取男主身份
                        "OTHER_CHARACTERS": "",  # 这里可以读取其他角色
                        # 新增占位符支持
                        "PLOT_POINTS": meta.get("plot_points", ""),
                        "THEME": meta.get("theme", ""),
                        "WORLD_SETTING": meta.get("world_setting", ""),
                        "TIME_PERIOD": meta.get("time_period", ""),
                        "LOCATION": meta.get("location", ""),
                        "SOCIAL_CONTEXT": meta.get("social_context", ""),
                        "EMOTIONAL_TONE": meta.get("emotional_tone", ""),
                        "WRITING_STYLE": meta.get("writing_style", ""),
                        "TARGET_AUDIENCE": meta.get("target_audience", ""),
                        "READER_EXPECTATION": meta.get("reader_expectation", ""),
                        "POV": meta.get("pov", ""),
                        "PACING": meta.get("pacing", ""),
                        "CONFLICT_TYPE": meta.get("conflict_type", ""),
                        "RESOLUTION_STYLE": meta.get("resolution_style", "")
                    }
        except Exception as e:
            logger.warning(f"获取小说信息失败: {e}")
        
        return {
            "NOVEL_TYPE": "",
            "GENRE": "",
            "LENGTH": "",
            "TAGS": "",
            "CHAPTER_CONTENT": "",
            "CHARACTER_DESIGN": "",
            "OUTLINE_CONTENT": "",
            "HEROINE_ROLE": "",
            "HERO_ROLE": "",
            "OTHER_CHARACTERS": "",
            # 新增占位符默认值
            "PLOT_POINTS": "",
            "THEME": "",
            "WORLD_SETTING": "",
            "TIME_PERIOD": "",
            "LOCATION": "",
            "SOCIAL_CONTEXT": "",
            "EMOTIONAL_TONE": "",
            "WRITING_STYLE": "",
            "TARGET_AUDIENCE": "",
            "READER_EXPECTATION": "",
            "POV": "",
            "PACING": "",
            "CONFLICT_TYPE": "",
            "RESOLUTION_STYLE": ""
        }
    
    def _replace_prompt_placeholders(self, prompt: str, novel_info: dict, story_info: str | None) -> str:
        """替换提示词中的占位符"""
        # 替换标准占位符
        for key, value in novel_info.items():
            prompt = prompt.replace(f"{{{key}}}", str(value))
        
        # 如果提供了额外的story_info，将其添加到提示词中
        if story_info and story_info.strip():
            prompt += f"\n\n额外故事信息：{story_info.strip()}"
        
        return prompt
    
    async def _auto_replace_placeholders(self, prompt: str, novel_id: str, additional_context: dict = None) -> str:
        """自动检测并替换提示词中的所有占位符"""
        import re
        
        # 检测提示词中的所有占位符 {PLACEHOLDER_NAME}，包括带数字的格式
        placeholder_pattern = r'\{([A-Z_0-9]+)\}'
        placeholders = re.findall(placeholder_pattern, prompt)
        
        if not placeholders:
            return prompt
        
        logger.info(f"检测到占位符: {placeholders}")
        
        # 获取小说基础信息
        novel_info = await self._get_novel_info(novel_id)
        
        # 获取扩展信息（章节内容、大纲等）
        extended_info = await self._get_extended_novel_info(novel_id)
        
        # 合并所有信息
        all_info = {**novel_info, **extended_info}
        
        # 添加额外上下文
        if additional_context:
            all_info.update(additional_context)
        
        # 替换所有检测到的占位符
        for placeholder in placeholders:
            if placeholder in all_info:
                value = str(all_info[placeholder])
                prompt = prompt.replace(f"{{{placeholder}}}", value)
                logger.debug(f"替换占位符 {{{placeholder}}} -> {value[:100]}...")
            else:
                # 检查是否是单个章节概要占位符格式 (CHAPTER_SUMMARY_XXX)
                if placeholder.startswith("CHAPTER_SUMMARY_"):
                    chapter_num = placeholder.replace("CHAPTER_SUMMARY_", "")
                    if chapter_num.isdigit():
                        # 尝试读取指定章节的概要
                        novel_path = file_service.novel_repo_path / novel_id
                        summaries_dir = novel_path / "summaries"
                        summary_file = summaries_dir / f"chapter_{chapter_num}_summary.md"
                        if summary_file.exists():
                            try:
                                with open(summary_file, 'r', encoding='utf-8') as f:
                                    content = f.read().strip()
                                    prompt = prompt.replace(f"{{{placeholder}}}", content)
                                    logger.debug(f"替换单个章节概要占位符 {{{placeholder}}} -> {content[:100]}...")
                                    continue
                            except Exception as e:
                                logger.warning(f"读取单个章节概要失败 {summary_file}: {e}")
                
                # 检查是否是单个章节内容占位符格式 (CHAPTER_CONTENT_XXX)
                if placeholder.startswith("CHAPTER_CONTENT_"):
                    chapter_num = placeholder.replace("CHAPTER_CONTENT_", "")
                    if chapter_num.isdigit():
                        # 尝试读取指定章节的内容
                        novel_path = file_service.novel_repo_path / novel_id
                        chapters_dir = novel_path / "chapters"
                        if chapters_dir.exists():
                            # 尝试不同的文件名格式
                            possible_files = []
                            
                            # 新格式：001_文件名.txt
                            new_format_files = list(chapters_dir.glob(f"{chapter_num.zfill(3)}_*.txt"))
                            possible_files.extend(new_format_files)
                            
                            # 旧格式
                            old_format_files = [
                                chapters_dir / f"chapter_{chapter_num}.txt",
                                chapters_dir / f"{chapter_num}.txt",
                                chapters_dir / f"chapter_{chapter_num.zfill(3)}.txt",
                                chapters_dir / f"{chapter_num.zfill(3)}.txt"
                            ]
                            possible_files.extend([f for f in old_format_files if f.exists()])
                            
                            for chapter_file in possible_files:
                                try:
                                    with open(chapter_file, 'r', encoding='utf-8') as f:
                                        content = f.read().strip()
                                        prompt = prompt.replace(f"{{{placeholder}}}", content)
                                        logger.debug(f"替换单个章节内容占位符 {{{placeholder}}} -> {content[:100]}...")
                                        break
                                except Exception as e:
                                    logger.warning(f"读取单个章节内容失败 {chapter_file}: {e}")
                
                # 检查是否是单个大纲文件占位符格式 (OUTLINE_CONTENT_XXX)
                if placeholder.startswith("OUTLINE_CONTENT_"):
                    outline_num = placeholder.replace("OUTLINE_CONTENT_", "")
                    if outline_num.isdigit():
                        # 尝试读取指定大纲文件的内容
                        novel_path = file_service.novel_repo_path / novel_id
                        outlines_dir = novel_path / "outlines"
                        if outlines_dir.exists():
                            # 尝试不同的文件名格式
                            possible_files = []
                            
                            # 新格式：001_文件名.md
                            new_format_files = list(outlines_dir.glob(f"{outline_num.zfill(3)}_*.md"))
                            possible_files.extend(new_format_files)
                            
                            # 旧格式
                            old_format_files = [
                                outlines_dir / f"outline_{outline_num}.md",
                                outlines_dir / f"{outline_num}.md",
                                outlines_dir / f"outline_{outline_num.zfill(3)}.md",
                                outlines_dir / f"{outline_num.zfill(3)}.md"
                            ]
                            possible_files.extend([f for f in old_format_files if f.exists()])
                            
                            for outline_file in possible_files:
                                try:
                                    with open(outline_file, 'r', encoding='utf-8') as f:
                                        content = f.read().strip()
                                        prompt = prompt.replace(f"{{{placeholder}}}", content)
                                        logger.debug(f"替换单个大纲文件占位符 {{{placeholder}}} -> {content[:100]}...")
                                        break
                                except Exception as e:
                                    logger.warning(f"读取单个大纲文件失败 {outline_file}: {e}")
                
                logger.warning(f"未找到占位符 {{{placeholder}}} 对应的数据")
                # 可以选择保留占位符或替换为空字符串
                prompt = prompt.replace(f"{{{placeholder}}}", f"[未找到数据: {placeholder}]")
        
        return prompt
    
    async def _get_extended_novel_info(self, novel_id: str) -> dict:
        """获取扩展的小说信息（章节内容、大纲等）"""
        extended_info = {}
        
        try:
            novel_path = file_service.novel_repo_path / novel_id
            
            # 读取章节内容
            chapters_dir = novel_path / "chapters"
            if chapters_dir.exists():
                chapter_files = list(chapters_dir.glob("*.txt"))
                if chapter_files:
                    # 按文件名排序
                    chapter_files.sort(key=lambda x: x.name)
                    
                    # 全部章节内容
                    all_chapter_content = ""
                    for chapter_file in chapter_files:
                        try:
                            with open(chapter_file, 'r', encoding='utf-8') as f:
                                content = f.read().strip()
                                if content:
                                    all_chapter_content += f"\n\n=== {chapter_file.stem} ===\n{content}"
                        except Exception as e:
                            logger.warning(f"读取章节文件失败 {chapter_file}: {e}")
                    
                    if all_chapter_content:
                        extended_info["CHAPTER_CONTENT"] = all_chapter_content.strip()
                    
                    # 单个章节内容（支持 CHAPTER_CONTENT_001 格式）
                    for chapter_file in chapter_files:
                        try:
                            with open(chapter_file, 'r', encoding='utf-8') as f:
                                content = f.read().strip()
                                if content:
                                    # 尝试从文件名中提取章节编号
                                    file_stem = chapter_file.stem
                                    # 支持多种格式：
                                    # 1. 001_文件名.txt (新格式)
                                    # 2. chapter_001.txt (旧格式)
                                    # 3. 001.txt (简单格式)
                                    if file_stem.startswith(('0', '1', '2', '3', '4', '5', '6', '7', '8', '9')):
                                        # 新格式：001_文件名 或 简单格式：001
                                        chapter_num = file_stem.split('_')[0]
                                    elif 'chapter_' in file_stem:
                                        # 旧格式：chapter_001
                                        chapter_num = file_stem.split('chapter_')[1]
                                    else:
                                        # 其他格式，使用文件名
                                        chapter_num = file_stem
                                    
                                    # 生成单个章节内容占位符
                                    placeholder_key = f"CHAPTER_CONTENT_{chapter_num.zfill(3)}"
                                    extended_info[placeholder_key] = content
                        except Exception as e:
                            logger.warning(f"读取章节文件失败 {chapter_file}: {e}")
            
            # 读取大纲内容
            outlines_dir = novel_path / "outlines"
            if outlines_dir.exists():
                outline_files = list(outlines_dir.glob("*.md"))
                if outline_files:
                    # 按文件名排序
                    outline_files.sort(key=lambda x: x.name)
                    
                    # 全部大纲内容
                    all_outline_content = ""
                    for outline_file in outline_files:
                        try:
                            with open(outline_file, 'r', encoding='utf-8') as f:
                                content = f.read().strip()
                                if content:
                                    all_outline_content += f"\n\n=== {outline_file.stem} ===\n{content}"
                        except Exception as e:
                            logger.warning(f"读取大纲文件失败 {outline_file}: {e}")
                    
                    if all_outline_content:
                        extended_info["OUTLINE_CONTENT"] = all_outline_content.strip()
                    
                    # 单个大纲文件（支持 OUTLINE_CONTENT_001 格式）
                    for outline_file in outline_files:
                        try:
                            with open(outline_file, 'r', encoding='utf-8') as f:
                                content = f.read().strip()
                                if content:
                                    # 尝试从文件名中提取大纲编号
                                    file_stem = outline_file.stem
                                    # 支持多种格式：
                                    # 1. 001_文件名.md (新格式)
                                    # 2. outline_001.md (旧格式)
                                    # 3. 001.md (简单格式)
                                    if file_stem.startswith(('0', '1', '2', '3', '4', '5', '6', '7', '8', '9')):
                                        # 新格式：001_文件名 或 简单格式：001
                                        outline_num = file_stem.split('_')[0]
                                    elif 'outline_' in file_stem:
                                        # 旧格式：outline_001
                                        outline_num = file_stem.split('outline_')[1]
                                    else:
                                        # 其他格式，使用文件名
                                        outline_num = file_stem
                                    
                                    # 生成单个大纲文件占位符
                                    placeholder_key = f"OUTLINE_CONTENT_{outline_num.zfill(3)}"
                                    extended_info[placeholder_key] = content
                        except Exception as e:
                            logger.warning(f"读取大纲文件失败 {outline_file}: {e}")
            
            # 读取角色设计
            characters_dir = novel_path / "characters"
            if characters_dir.exists():
                character_files = list(characters_dir.glob("*.json"))
                if character_files:
                    character_info = ""
                    for char_file in character_files:
                        try:
                            import json
                            with open(char_file, 'r', encoding='utf-8') as f:
                                char_data = json.load(f)
                                name = char_data.get("name", "未知角色")
                                role_type = char_data.get("role_type", "未知类型")
                                character_info += f"\n{name} ({role_type})"
                        except Exception as e:
                            logger.warning(f"读取角色文件失败 {char_file}: {e}")
                    
                    if character_info:
                        extended_info["CHARACTER_DESIGN"] = character_info.strip()
            
            # 读取章节概要
            summaries_dir = novel_path / "summaries"
            if summaries_dir.exists():
                summary_files = list(summaries_dir.glob("*_chapter_*_summary.md"))
                if summary_files:
                    # 按章节编号排序
                    summary_files.sort(key=lambda x: int(x.stem.split('_')[0]))
                    
                    # 全部章节概要
                    all_chapter_summaries = ""
                    for summary_file in summary_files:
                        try:
                            with open(summary_file, 'r', encoding='utf-8') as f:
                                content = f.read().strip()
                                if content:
                                    chapter_num = summary_file.stem.split('_')[0]
                                    all_chapter_summaries += f"\n\n=== 第{chapter_num}章概要 ===\n{content}"
                        except Exception as e:
                            logger.warning(f"读取概要文件失败 {summary_file}: {e}")
                    
                    if all_chapter_summaries:
                        extended_info["CHAPTER_SUMMARY"] = all_chapter_summaries.strip()
                    
                    # 单个章节概要（支持 CHAPTER_SUMMARY_001 格式）
                    for summary_file in summary_files:
                        try:
                            with open(summary_file, 'r', encoding='utf-8') as f:
                                content = f.read().strip()
                                if content:
                                    chapter_num = summary_file.stem.split('_')[0]
                                    # 生成单个章节概要占位符
                                    placeholder_key = f"CHAPTER_SUMMARY_{chapter_num.zfill(3)}"
                                    extended_info[placeholder_key] = content
                        except Exception as e:
                            logger.warning(f"读取概要文件失败 {summary_file}: {e}")
            
        except Exception as e:
            logger.warning(f"获取扩展小说信息失败: {e}")
        
        return extended_info
    
    async def expand_text_stream(self, novel_id: str, prompt_template: str, 
                               input_summary: str, style: str = "default", 
                               max_tokens: int = 1000) -> AsyncGenerator[str, None]:
        """流式扩写文本"""
        # 自动替换提示词中的占位符
        additional_context = {
            "INPUT_SUMMARY": input_summary,
            "ORIGINAL_TEXT": input_summary,
            "ORIGINAL_PARAGRAPH": input_summary,
            "STYLE": style,
            "OTHER_INPUT": "",
            "MAX_TOKENS": str(max_tokens)
        }
            
        # 如果是灵感生成，跳过占位符替换
        if novel_id != "inspiration":
            prompt_template = await self._auto_replace_placeholders(prompt_template, novel_id, additional_context)
        
        if self.provider == "openai":
            async for chunk in self._openai_expand_stream(prompt_template, input_summary, style, max_tokens):
                yield chunk
        elif self.provider == "gemini":
            async for chunk in self._gemini_expand_stream(prompt_template, input_summary, style, max_tokens):
                yield chunk
        else:
            yield "请配置有效的AI提供者（openai或gemini）"
    
    
    # OpenAI 实现
    async def _openai_expand(self, prompt_template: str, input_summary: str, 
                           style: str, max_tokens: int) -> str:
        if not self.openai_api_key:
            return "请配置OpenAI API Key"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.openai_base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-3.5-turbo",
                        "messages": [
                            {
                                "role": "user", 
                                "content": prompt_template
                            }
                        ],
                        "max_tokens": max_tokens,
                        "temperature": 0.8
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return result["choices"][0]["message"]["content"]
                else:
                    return f"API调用失败: {response.status_code}"
                    
        except Exception as e:
            logger.error(f"OpenAI API调用错误: {str(e)}")
            return f"AI服务暂时不可用: {str(e)}"
    
    async def _openai_polish(self, text: str, preserve_content: bool, style: str) -> str:
        if not self.openai_api_key:
            return "请配置OpenAI API Key"
        
        # 加载润色提示词
        prompt_template = await self._load_polish_prompt(style)
        full_prompt = prompt_template.replace("{ORIGINAL_TEXT}", text)
        full_prompt = full_prompt.replace("{STYLE}", style)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.openai_base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-3.5-turbo",
                        "messages": [
                            {
                                "role": "user",
                                "content": full_prompt
                            }
                        ],
                        "max_tokens": len(text) + 500,
                        "temperature": 0.3
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return result["choices"][0]["message"]["content"]
                else:
                    return f"API调用失败: {response.status_code}"
                    
        except Exception as e:
            logger.error(f"OpenAI API调用错误: {str(e)}")
            return f"AI服务暂时不可用: {str(e)}"
    
    async def _openai_summarize(self, text: str, max_sentences: int) -> str:
        if not self.openai_api_key:
            return "请配置OpenAI API Key"
        
        # 加载摘要提示词
        prompt_template = await self._load_summary_prompt("chapter")
        full_prompt = prompt_template.replace("{TEXT}", text)
        full_prompt = full_prompt.replace("{MAX_SENTENCES}", str(max_sentences))
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.openai_base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-3.5-turbo",
                        "messages": [
                            {
                                "role": "user",
                                "content": full_prompt
                            }
                        ],
                        "max_tokens": max_sentences * 50,
                        "temperature": 0.3
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return result["choices"][0]["message"]["content"]
                else:
                    return f"API调用失败: {response.status_code}"
                    
        except Exception as e:
            logger.error(f"OpenAI API调用错误: {str(e)}")
            return f"AI服务暂时不可用: {str(e)}"
    
    async def _openai_expand_stream(self, prompt_template: str, input_summary: str, 
                                  style: str, max_tokens: int) -> AsyncGenerator[str, None]:
        if not self.openai_api_key:
            yield "请配置OpenAI API Key"
            return
        
        try:
            async with httpx.AsyncClient() as client:
                async with client.stream(
                    "POST",
                    f"{self.openai_base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-3.5-turbo",
                        "messages": [
                            {
                                "role": "user",
                                "content": prompt_template
                            }
                        ],
                        "max_tokens": max_tokens,
                        "temperature": 0.8,
                        "stream": True
                    },
                    timeout=60.0
                ) as response:
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            try:
                                data = line[6:]  # 移除 "data: " 前缀
                                if data == "[DONE]":
                                    break
                                chunk = json.loads(data)
                                if "choices" in chunk and len(chunk["choices"]) > 0:
                                    delta = chunk["choices"][0].get("delta", {})
                                    if "content" in delta:
                                        yield delta["content"]
                            except json.JSONDecodeError:
                                continue
                                
        except Exception as e:
            logger.error(f"OpenAI Stream API调用错误: {str(e)}")
            yield f"AI服务暂时不可用: {str(e)}"

    # Gemini 实现
    async def _gemini_generate(self, prompt: str, max_tokens: int) -> Optional[str]:
        if not self.gemini_api_key:
            return "请配置Gemini API Key"
        try:
            url = f"{self.gemini_base_url}/v1beta/models/gemini-2.0-flash:generateContent"
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    headers={
                        "Content-Type": "application/json",
                        "X-goog-api-key": self.gemini_api_key,
                    },
                    json={
                        "contents": [
                            {
                                "parts": [
                                    {"text": prompt}
                                ]
                            }
                        ],
                        "generationConfig": {
                            "maxOutputTokens": max_tokens
                        }
                    },
                    timeout=30.0
                )

                if response.status_code != 200:
                    return f"API调用失败: {response.status_code}"

                data = response.json()
                # 解析 Gemini 返回文本
                try:
                    candidates = data.get("candidates", [])
                    if not candidates:
                        return ""
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        return parts[0]["text"]
                    # 退化处理：可能在其它字段
                    return data.get("output", "")
                except Exception:
                    return ""
        except Exception as e:
            logger.error(f"Gemini API调用错误: {str(e)}")
            return f"AI服务暂时不可用: {str(e)}"

    async def _gemini_expand(self, prompt_template: str, input_summary: str, style: str, max_tokens: int) -> str:
        result = await self._gemini_generate(prompt_template, max_tokens)
        return result or ""

    async def _gemini_polish(self, text: str, preserve_content: bool, style: str) -> str:
        # 加载润色提示词
        prompt_template = await self._load_polish_prompt(style)
        full_prompt = prompt_template.replace("{ORIGINAL_TEXT}", text)
        full_prompt = full_prompt.replace("{STYLE}", style)
        
        result = await self._gemini_generate(full_prompt, max_tokens=len(text) + 500)
        return result or ""

    async def _gemini_summarize(self, text: str, max_sentences: int) -> str:
        # 加载摘要提示词
        prompt_template = await self._load_summary_prompt("chapter")
        full_prompt = prompt_template.replace("{TEXT}", text)
        full_prompt = full_prompt.replace("{MAX_SENTENCES}", str(max_sentences))
        
        result = await self._gemini_generate(full_prompt, max_tokens=max_sentences * 60)
        return result or ""

    async def _gemini_expand_stream(self, prompt_template: str, input_summary: str, style: str, max_tokens: int) -> AsyncGenerator[str, None]:
        # 优先使用 Gemini 真流式接口；若失败则回退为非流式
        if not self.gemini_api_key:
            yield "请配置Gemini API Key"
            return
        try:
            url = f"{self.gemini_base_url}/v1beta/models/gemini-2.0-flash:streamGenerateContent"
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {
                                "text": prompt_template
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "maxOutputTokens": max_tokens
                }
            }

            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    url,
                    headers={
                        "Content-Type": "application/json",
                        "X-goog-api-key": self.gemini_api_key,
                    },
                    json=payload,
                ) as response:
                    if response.status_code != 200:
                        # 回退为非流式
                        full = await self._gemini_expand(prompt_template, input_summary, style, max_tokens)
                        yield full
                        return

                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        # 有的实现会输出以 "data: {json}" 形式，也可能是纯 JSON 行
                        if line.startswith("data: "):
                            line = line[6:]
                        try:
                            data = json.loads(line)
                        except json.JSONDecodeError:
                            # 可能是拆分的行或心跳，跳过
                            continue

                        # 解析每个 chunk 的文本
                        try:
                            candidates = data.get("candidates") or []
                            if not candidates:
                                continue
                            content = candidates[0].get("content") or {}
                            parts = content.get("parts") or []
                            if not parts:
                                continue
                            text_piece = parts[0].get("text")
                            if text_piece:
                                yield text_piece
                        except Exception:
                            continue
        except Exception:
            # 出错则回退为非流式
            full = await self._gemini_expand(prompt_template, input_summary, style, max_tokens)
            yield full

    async def _build_enhanced_context(self, novel_id: str, input_summary: str, style: str) -> dict:
        """构建增强的上下文信息"""
        context = {
            "input_summary": input_summary,
            "style": style,
            "novel_info": {},
            "character_info": {},
            "world_info": {},
            "writing_context": {}
        }
        
        try:
            # 读取小说配置
            novel_config_file = f"novel_repo/{novel_id}/novel_config.json"
            if os.path.exists(novel_config_file):
                with open(novel_config_file, 'r', encoding='utf-8') as f:
                    novel_config = json.load(f)
                
                meta = novel_config.get("meta", {})
                context["novel_info"] = {
                    "title": meta.get("title", ""),
                    "genre": meta.get("genre", ""),
                    "description": meta.get("description", ""),
                    "tags": meta.get("tags", []),
                    "target_length": meta.get("target_length", ""),
                    "writing_style": meta.get("writing_style", "")
                }
        except Exception as e:
            logger.warning(f"读取小说配置失败: {e}")
        
        try:
            # 读取角色信息
            characters_file = f"novel_repo/{novel_id}/characters/characters.json"
            if os.path.exists(characters_file):
                with open(characters_file, 'r', encoding='utf-8') as f:
                    characters = json.load(f)
                
                # 提取主要角色信息
                main_characters = []
                for char in characters[:5]:  # 限制数量避免提示词过长
                    char_info = {
                        "name": char.get("name", ""),
                        "role_type": char.get("role_type", ""),
                        "personality": char.get("personality", ""),
                        "profile": char.get("profile", {})
                    }
                    main_characters.append(char_info)
                
                context["character_info"] = {
                    "main_characters": main_characters,
                    "total_count": len(characters)
                }
        except Exception as e:
            logger.warning(f"读取角色信息失败: {e}")
        
        try:
            # 读取世界观信息
            worldbuilding_dir = f"novel_repo/{novel_id}/worldbuilding"
            if os.path.exists(worldbuilding_dir):
                world_info = {}
                
                # 读取各种设定文件
                for filename in os.listdir(worldbuilding_dir):
                    if filename.endswith('.json'):
                        try:
                            with open(os.path.join(worldbuilding_dir, filename), 'r', encoding='utf-8') as f:
                                data = json.load(f)
                                world_info[filename.replace('.json', '')] = data
                        except:
                            continue
                
                context["world_info"] = world_info
        except Exception as e:
            logger.warning(f"读取世界观信息失败: {e}")
        
        try:
            # 读取写作上下文（最近编辑的章节等）
            chapters_dir = f"novel_repo/{novel_id}/chapters"
            if os.path.exists(chapters_dir):
                chapters = []
                for filename in os.listdir(chapters_dir):
                    if filename.endswith('.txt'):
                        try:
                            with open(os.path.join(chapters_dir, filename), 'r', encoding='utf-8') as f:
                                content = f.read()
                                chapters.append({
                                    "filename": filename,
                                    "length": len(content),
                                    "preview": content[:200] + "..." if len(content) > 200 else content
                                })
                        except:
                            continue
                
                # 按修改时间排序，取最近3章
                chapters.sort(key=lambda x: x["filename"], reverse=True)
                context["writing_context"] = {
                    "recent_chapters": chapters[:3],
                    "total_chapters": len(chapters)
                }
        except Exception as e:
            logger.warning(f"读取写作上下文失败: {e}")
        
        return context

    def _build_full_prompt(self, prompt_template: str, context: dict, style: str) -> str:
        """构建完整的提示词"""
        full_prompt = f"{prompt_template}\n\n"
        
        # 添加小说信息
        if context["novel_info"]:
            novel = context["novel_info"]
            full_prompt += f"小说信息：\n"
            if novel["title"]:
                full_prompt += f"标题：{novel['title']}\n"
            if novel["genre"]:
                full_prompt += f"类型：{novel['genre']}\n"
            if novel["description"]:
                full_prompt += f"简介：{novel['description']}\n"
            if novel["tags"]:
                full_prompt += f"标签：{', '.join(novel['tags'])}\n"
            if novel["target_length"]:
                full_prompt += f"目标篇幅：{novel['target_length']}\n"
            if novel["writing_style"]:
                full_prompt += f"写作风格：{novel['writing_style']}\n"
            full_prompt += "\n"
        
        # 添加角色信息
        if context["character_info"] and context["character_info"].get("main_characters"):
            full_prompt += f"主要角色信息：\n"
            for char in context["character_info"]["main_characters"]:
                full_prompt += f"- {char['name']}（{char['role_type']}）：{char['personality']}\n"
            full_prompt += "\n"
        
        # 添加世界观信息
        if context["world_info"]:
            full_prompt += f"世界观设定：\n"
            for key, value in context["world_info"].items():
                if isinstance(value, dict) and value:
                    full_prompt += f"- {key}：{str(value)[:100]}...\n"
            full_prompt += "\n"
        
        # 添加写作上下文
        if context["writing_context"] and context["writing_context"].get("recent_chapters"):
            full_prompt += f"写作上下文：\n"
            full_prompt += f"当前共有{context['writing_context']['total_chapters']}章，最近编辑的章节：\n"
            for chapter in context["writing_context"]["recent_chapters"]:
                full_prompt += f"- {chapter['filename']}：{chapter['preview']}\n"
            full_prompt += "\n"
        
        # 添加待扩写内容
        full_prompt += f"待扩写内容：\n{context['input_summary']}\n\n"
        
        # 添加风格要求
        full_prompt += f"风格要求：{style}\n"
        full_prompt += "请根据以上信息进行扩写，保持与小说整体风格和设定的一致性。"
        
        return full_prompt

    async def _openai_expand_enhanced(self, full_prompt: str, context: dict, style: str, max_tokens: int) -> str:
        """使用OpenAI进行增强扩写"""
        if not self.openai_api_key:
            return "请配置OpenAI API Key"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.openai_base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-3.5-turbo",
                        "messages": [
                            {
                                "role": "user",
                                "content": full_prompt
                            }
                        ],
                        "max_tokens": max_tokens,
                        "temperature": 0.8
                    },
                    timeout=60.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return result["choices"][0]["message"]["content"]
                else:
                    return f"API调用失败: {response.status_code}"
                    
        except Exception as e:
            logger.error(f"OpenAI增强扩写错误: {str(e)}")
            return f"AI服务暂时不可用: {str(e)}"

    async def _gemini_expand_enhanced(self, full_prompt: str, context: dict, style: str, max_tokens: int) -> str:
        """使用Gemini进行增强扩写"""
        if not self.gemini_api_key:
            return "请配置Gemini API Key"
        
        try:
            result = await self._gemini_generate(full_prompt, max_tokens)
            return result or "Gemini生成失败"
        except Exception as e:
            logger.error(f"Gemini增强扩写错误: {str(e)}")
            return f"AI服务暂时不可用: {str(e)}"

    def _get_role_specific_mock_data(self, role_key: str, seed: dict) -> dict:
        """根据角色类型生成更丰富的mock数据"""
        if role_key == "女主角":
            return {
                "name": seed.get("name") or "林婉儿",
                "gender": seed.get("gender") or "女",
                "age": seed.get("age") or 20,
                "appearance": seed.get("appearance") or "身材高挑，五官精致，气质清冷，长发及腰，眼眸深邃，仿佛能看透人心。",
                "personality": seed.get("personality") or "外柔内刚，目标感强，冷静理智，善于分析，但有时过于理性，缺乏情感表达。",
                "profile": {
                    "身份职业": (seed.get("profile") or {}).get("身份职业") or "修仙门派弟子",
                    "家庭关系": (seed.get("profile") or {}).get("家庭关系") or "父母双亡，与师门长辈关系疏远。",
                    "早年经历": (seed.get("profile") or {}).get("早年经历") or "自幼被师门收养，天赋异禀，修炼速度惊人。",
                    "观念信仰": (seed.get("profile") or {}).get("观念信仰") or "坚信修仙大道，追求长生不老。",
                    "优点": (seed.get("profile") or {}).get("优点") or "悟性极高，修炼速度快，心性坚韧。",
                    "缺点": (seed.get("profile") or {}).get("缺点") or "情感表达匮乏，缺乏与人沟通的能力。",
                    "成就": (seed.get("profile") or {}).get("成就") or "年纪轻轻便突破金丹，成为门派重点培养对象。",
                    "社会阶层": (seed.get("profile") or {}).get("社会阶层") or "修仙界底层，但天赋异禀，未来可期。",
                    "习惯嗜好": (seed.get("profile") or {}).get("习惯嗜好") or "喜欢独自修炼，对世间万物漠不关心。",
                }
            }
        elif role_key == "男主角":
            return {
                "name": seed.get("name") or "楚云飞",
                "gender": self._normalize_gender(seed.get("gender")) or "male",
                "age": seed.get("age") or 22,
                "appearance": seed.get("appearance") or "身材魁梧，剑眉星目，气质不凡，身着一袭青衫，手持一柄长剑。",
                "personality": seed.get("personality") or "豪放不羁，重情重义，行事果断，但有时过于冲动，缺乏深思熟虑。",
                "profile": {
                    "身份职业": (seed.get("profile") or {}).get("身份职业") or "江湖散修",
                    "家庭关系": (seed.get("profile") or {}).get("家庭关系") or "父母双亡，与师门长辈关系疏远。",
                    "早年经历": (seed.get("profile") or {}).get("早年经历") or "自幼习武，天赋异禀，剑法超群。",
                    "观念信仰": (seed.get("profile") or {}).get("观念信仰") or "坚信武道，追求力量。",
                    "优点": (seed.get("profile") or {}).get("优点") or "剑法超群，身手敏捷，重情重义。",
                    "缺点": (seed.get("profile") or {}).get("缺点") or "过于冲动，缺乏深思熟虑。",
                    "成就": (seed.get("profile") or {}).get("成就") or "年纪轻轻便名震江湖，成为一代剑神。",
                    "社会阶层": (seed.get("profile") or {}).get("社会阶层") or "江湖底层，但剑法超群，未来可期。",
                    "习惯嗜好": (seed.get("profile") or {}).get("习惯嗜好") or "喜欢饮酒，对剑道痴迷。",
                }
            }
        elif role_key == "配角":
            return {
                "name": seed.get("name") or "张三",
                "gender": self._normalize_gender(seed.get("gender")) or "male",
                "age": seed.get("age") or 25,
                "appearance": seed.get("appearance") or "身材中等，相貌普通，气质温和，略显木讷。",
                "personality": seed.get("personality") or "性格随和，乐于助人，但有时过于优柔寡断。",
                "profile": {
                    "身份职业": (seed.get("profile") or {}).get("身份职业") or "商人",
                    "家庭关系": (seed.get("profile") or {}).get("家庭关系") or "父母健在，兄弟姐妹和睦。",
                    "早年经历": (seed.get("profile") or {}).get("早年经历") or "自幼经商，精明能干。",
                    "观念信仰": (seed.get("profile") or {}).get("观念信仰") or "信奉金钱至上，但也有自己的原则。",
                    "优点": (seed.get("profile") or {}).get("优点") or "精明能干，善于交际。",
                    "缺点": (seed.get("profile") or {}).get("缺点") or "过于优柔寡断，缺乏决断力。",
                    "成就": (seed.get("profile") or {}).get("成就") or "年纪轻轻便成为一方富商。",
                    "社会阶层": (seed.get("profile") or {}).get("社会阶层") or "商人阶层，但精明能干，未来可期。",
                    "习惯嗜好": (seed.get("profile") or {}).get("习惯嗜好") or "喜欢收藏古玩，对历史感兴趣。",
                }
            }
        elif role_key == "女二":
            return {
                "name": seed.get("name") or "苏若雪",
                "gender": seed.get("gender") or "女",
                "age": seed.get("age") or 19,
                "appearance": seed.get("appearance") or "容貌清丽，身材娇小，气质温柔，眉眼间带着一丝忧郁。",
                "personality": seed.get("personality") or "温柔善良，但内心敏感脆弱，容易受到伤害，对感情专一。",
                "profile": {
                    "身份职业": (seed.get("profile") or {}).get("身份职业") or "大家闺秀",
                    "家庭关系": (seed.get("profile") or {}).get("家庭关系") or "父亲是朝廷重臣，母亲温柔贤惠。",
                    "早年经历": (seed.get("profile") or {}).get("早年经历") or "自幼受到良好教育，琴棋书画样样精通。",
                    "观念信仰": (seed.get("profile") or {}).get("观念信仰") or "相信真爱，向往自由的感情。",
                    "优点": (seed.get("profile") or {}).get("优点") or "温柔善良，才华横溢，对感情专一。",
                    "缺点": (seed.get("profile") or {}).get("缺点") or "过于敏感，容易受到伤害。",
                    "成就": (seed.get("profile") or {}).get("成就") or "才女之名远播，深受文人墨客推崇。",
                    "社会阶层": (seed.get("profile") or {}).get("社会阶层") or "官宦之家，地位显赫。",
                    "习惯嗜好": (seed.get("profile") or {}).get("习惯嗜好") or "喜欢诗词歌赋，擅长古琴。",
                }
            }
        elif role_key == "男二":
            return {
                "name": seed.get("name") or "萧逸风",
                "gender": self._normalize_gender(seed.get("gender")) or "male",
                "age": seed.get("age") or 24,
                "appearance": seed.get("appearance") or "风度翩翩，相貌俊美，举止优雅，总是面带微笑。",
                "personality": seed.get("personality") or "温和儒雅，善解人意，但有时过于完美，缺乏真实感。",
                "profile": {
                    "身份职业": (seed.get("profile") or {}).get("身份职业") or "世家公子",
                    "家庭关系": (seed.get("profile") or {}).get("家庭关系") or "出身名门望族，家风严谨。",
                    "早年经历": (seed.get("profile") or {}).get("早年经历") or "自幼接受精英教育，文武双全。",
                    "观念信仰": (seed.get("profile") or {}).get("观念信仰") or "崇尚君子之道，追求完美。",
                    "优点": (seed.get("profile") or {}).get("优点") or "温和儒雅，文武双全，品德高尚。",
                    "缺点": (seed.get("profile") or {}).get("缺点") or "过于完美，有时显得不够真实。",
                    "成就": (seed.get("profile") or {}).get("成就") or "年纪轻轻便在朝堂崭露头角。",
                    "社会阶层": (seed.get("profile") or {}).get("社会阶层") or "世家大族，地位尊贵。",
                    "习惯嗜好": (seed.get("profile") or {}).get("习惯嗜好") or "喜欢读书写字，精通棋艺。",
                }
            }
        else:
            return {
                "name": seed.get("name") or "未命名角色",
                "gender": seed.get("gender") or None,
                "age": seed.get("age") or None,
                "appearance": seed.get("appearance") or "特征鲜明。",
                "personality": seed.get("personality") or "性格立体。",
                "profile": {
                    "身份职业": "——",
                    "家庭关系": "——",
                    "早年经历": "——",
                    "观念信仰": "——",
                    "优点": "——",
                    "缺点": "——",
                    "成就": "——",
                    "社会阶层": "——",
                    "习惯嗜好": "——",
                }
            }

    async def _gemini_generate_character(self, role_key: str, prompt: str, style: str, seed: dict, story_info: str) -> dict:
        """使用Gemini API生成角色设定"""
        if not self.gemini_api_key:
            return {
                "error": "Gemini API密钥未配置",
                "role_type": role_key,
                "name": "配置错误",
                "gender": None,
                "age": None,
                "appearance": "API密钥未配置",
                "personality": "API密钥未配置",
                "profile": {},
                "_prompt_used": {"role": role_key, "prompt": prompt, "style": style, "story_info": story_info or ""}
            }
        
        try:
            # 直接使用character.py中的提示词
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.gemini_base_url}/v1beta/models/gemini-2.0-flash:generateContent",
                    headers={
                        "Content-Type": "application/json",
                        "X-goog-api-key": self.gemini_api_key
                    },
                    json={
                        "contents": [
                            {
                                "parts": [
                                    {"text": prompt}
                                ]
                            }
                        ],
                        "generationConfig": {
                            "temperature": 0.8,
                            "maxOutputTokens": 4096
                        }
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    generated_text = result["candidates"][0]["content"]["parts"][0]["text"]
                    
                    # 尝试解析JSON
                    try:
                        logger.info(f"Gemini生成文本 (角色: {role_key}): {generated_text[:500]}...")
                        
                        # 提取JSON部分 - 支持```json标记
                        json_start = generated_text.find('{')
                        if json_start == -1:
                            # 尝试查找```json标记
                            json_marker = generated_text.find('```json')
                            if json_marker != -1:
                                json_start = generated_text.find('{', json_marker)
                        
                        json_end = generated_text.rfind('}') + 1
                        if json_start >= 0 and json_end > json_start:
                            json_text = generated_text[json_start:json_end]
                            logger.info(f"提取的JSON文本: {json_text}")
                            ai_data = json.loads(json_text)
                            
                            # 确保数据格式正确
                            return {
                                "role_type": role_key,  # 确保角色类型正确传递
                                "name": ai_data.get("name") or seed.get("name") or "AI生成角色",
                                "gender": self._normalize_gender(ai_data.get("gender") or seed.get("gender")),
                                "age": ai_data.get("age") or seed.get("age"),
                                "appearance": ai_data.get("appearance") or seed.get("appearance") or "AI生成外貌",
                                "personality": ai_data.get("personality") or seed.get("personality") or "AI生成性格",
                                "profile": ai_data.get("profile") or seed.get("profile") or {},
                                "_prompt_used": {"role": role_key, "prompt": prompt, "style": style, "story_info": story_info or ""}
                            }
                    except json.JSONDecodeError as e:
                        logger.warning(f"Gemini返回的文本无法解析为JSON (角色: {role_key}): {e}")
                        logger.warning(f"原始文本: {generated_text}")
                        logger.warning(f"提取的JSON文本: {json_text if 'json_text' in locals() else 'N/A'}")
                        
                else:
                    logger.error(f"Gemini API调用失败: {response.status_code} {response.text}")
                    
        except Exception as e:
            logger.error(f"Gemini角色生成失败: {str(e)}")
        
        # 如果AI生成失败，返回失败信息
        return {
            "error": "AI角色生成失败",
            "role_type": role_key,
            "name": "生成失败",
            "gender": None,
            "age": None,
            "appearance": "生成失败",
            "personality": "生成失败",
            "profile": {},
            "_prompt_used": {"role": role_key, "prompt": prompt, "style": style, "story_info": story_info or ""}
        }

    async def _openai_generate_character(self, role_key: str, prompt: str, style: str, seed: dict, story_info: str) -> dict:
        """使用OpenAI API生成角色设定"""
        if not self.openai_api_key:
            return {
                "error": "OpenAI API密钥未配置",
                "role_type": role_key,
                "name": "配置错误",
                "gender": None,
                "age": None,
                "appearance": "API密钥未配置",
                "personality": "API密钥未配置",
                "profile": {},
                "_prompt_used": {"role": role_key, "prompt": prompt, "style": style, "story_info": story_info or ""}
            }
        
        try:
            # 直接使用character.py中的提示词
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.openai_base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-3.5-turbo",
                        "messages": [
                            {"role": "user", "content": prompt}
                        ],
                        "max_tokens": 2048,
                        "temperature": 0.8
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    generated_text = result["choices"][0]["message"]["content"]
                    
                    # 尝试解析JSON
                    try:
                        # 提取JSON部分 - 支持```json标记
                        json_start = generated_text.find('{')
                        if json_start == -1:
                            # 尝试查找```json标记
                            json_marker = generated_text.find('```json')
                            if json_marker != -1:
                                json_start = generated_text.find('{', json_marker)
                        
                        json_end = generated_text.rfind('}') + 1
                        if json_start >= 0 and json_end > json_start:
                            json_text = generated_text[json_start:json_end]
                            ai_data = json.loads(json_text)
                            
                            # 确保数据格式正确
                            return {
                                "role_type": role_key,  # 确保角色类型正确传递
                                "name": ai_data.get("name") or seed.get("name") or "AI生成角色",
                                "gender": self._normalize_gender(ai_data.get("gender") or seed.get("gender")),
                                "age": ai_data.get("age") or seed.get("age"),
                                "appearance": ai_data.get("appearance") or seed.get("appearance") or "AI生成外貌",
                                "personality": ai_data.get("personality") or seed.get("personality") or "AI生成性格",
                                "profile": ai_data.get("profile") or seed.get("profile") or {},
                                "_prompt_used": {"role": role_key, "prompt": prompt, "style": style, "story_info": story_info or ""}
                            }
                    except json.JSONDecodeError:
                        logger.warning(f"OpenAI返回的文本无法解析为JSON: {generated_text}")
                        
                else:
                    logger.error(f"OpenAI API调用失败: {response.status_code} {response.text}")
                    
        except Exception as e:
            logger.error(f"OpenAI角色生成失败: {str(e)}")
        
        # 如果AI生成失败，返回失败信息
        return {
            "error": "AI角色生成失败",
            "role_type": role_key,
            "name": "生成失败",
            "gender": None,
            "age": None,
            "appearance": "生成失败",
            "personality": "生成失败",
            "profile": {},
            "_prompt_used": {"role": role_key, "prompt": prompt, "style": style, "story_info": story_info or ""}
        }

    async def _load_expand_prompt(self, style: str = "default") -> str:
        """加载扩写提示词"""
        try:
            import sys
            novel_repo_path = str(file_service.novel_repo_path)
            if novel_repo_path not in sys.path:
                sys.path.insert(0, novel_repo_path)
            
            from ai_prompts.prompts import get_expand_prompt
            
            # 根据风格选择提示词，默认为sentence
            prompt_type = "sentence" if style == "default" else "sentence"
            return get_expand_prompt(prompt_type)
        except Exception as e:
            logger.error(f"加载扩写提示词失败: {str(e)}")
            raise Exception(f"加载扩写提示词失败: {str(e)}")
    
    async def _load_polish_prompt(self, style: str = "default") -> str:
        """加载润色提示词"""
        try:
            import sys
            novel_repo_path = str(file_service.novel_repo_path)
            if novel_repo_path not in sys.path:
                sys.path.insert(0, novel_repo_path)
            
            from ai_prompts.prompts import get_polish_prompt
            
            # 根据风格选择提示词，默认为sentence
            prompt_type = "sentence" if style == "default" else "sentence"
            return get_polish_prompt(prompt_type)
        except Exception as e:
            logger.error(f"加载润色提示词失败: {str(e)}")
            raise Exception(f"加载润色提示词失败: {str(e)}")
    
    async def _load_summary_prompt(self, summary_type: str = "chapter") -> str:
        """加载摘要提示词"""
        try:
            import sys
            novel_repo_path = str(file_service.novel_repo_path)
            if novel_repo_path not in sys.path:
                sys.path.insert(0, novel_repo_path)
            
            from ai_prompts.prompts import get_summary_prompt
            return get_summary_prompt(summary_type)
        except Exception as e:
            logger.error(f"加载摘要提示词失败: {str(e)}")
            raise Exception(f"加载摘要提示词失败: {str(e)}")
    
    async def _load_world_prompt(self, prompt_type: str = "random") -> str:
        """加载世界观提示词"""
        try:
            import sys
            novel_repo_path = str(file_service.novel_repo_path)
            if novel_repo_path not in sys.path:
                sys.path.insert(0, novel_repo_path)
            
            from ai_prompts.prompts import get_world_prompt
            return get_world_prompt(prompt_type)
        except Exception as e:
            logger.error(f"加载世界观提示词失败: {str(e)}")
            raise Exception(f"加载世界观提示词失败: {str(e)}")
    
    async def _load_inspiration_prompt(self, prompt_type: str = "main_story") -> str:
        """加载灵感提示词"""
        try:
            import sys
            novel_repo_path = str(file_service.novel_repo_path)
            if novel_repo_path not in sys.path:
                sys.path.insert(0, novel_repo_path)
            
            from ai_prompts.prompts import get_inspiration_prompt
            return get_inspiration_prompt(prompt_type)
        except Exception as e:
            logger.error(f"加载灵感提示词失败: {str(e)}")
            raise Exception(f"加载灵感提示词失败: {str(e)}")
    
    def _normalize_gender(self, gender: str | None) -> str | None:
        """标准化性别字段，将中文转换为英文"""
        if not gender:
            return None
        gender_lower = gender.lower().strip()
        if gender_lower in ['男', 'male', 'm']:
            return 'male'
        elif gender_lower in ['女', 'female', 'f']:
            return 'female'
        return gender

    async def _load_character_prompt(self, character_type: str) -> str:
        """加载角色提示词"""
        try:
            import sys
            novel_repo_path = str(file_service.novel_repo_path)
            if novel_repo_path not in sys.path:
                sys.path.insert(0, novel_repo_path)
            
            from ai_prompts.prompts import get_character_prompt
            return get_character_prompt(character_type)
        except Exception as e:
            logger.error(f"加载角色提示词失败: {str(e)}")
            raise Exception(f"加载角色提示词失败: {str(e)}")
    
    async def _load_outline_prompt(self, outline_type: str) -> str:
        """加载大纲提示词"""
        try:
            import sys
            novel_repo_path = str(file_service.novel_repo_path)
            if novel_repo_path not in sys.path:
                sys.path.insert(0, novel_repo_path)
            
            from ai_prompts.prompts import get_outline_prompt
            return get_outline_prompt(outline_type)
        except Exception as e:
            logger.error(f"加载大纲提示词失败: {str(e)}")
            raise Exception(f"加载大纲提示词失败: {str(e)}")
    
    async def _load_styles_prompt(self) -> str:
        """加载风格提示词"""
        try:
            import sys
            novel_repo_path = str(file_service.novel_repo_path)
            if novel_repo_path not in sys.path:
                sys.path.insert(0, novel_repo_path)
            
            from ai_prompts.prompts import get_styles_prompt
            return get_styles_prompt("current")
        except Exception as e:
            logger.error(f"加载风格提示词失败: {str(e)}")
            raise Exception(f"加载风格提示词失败: {str(e)}")
    
    async def _openai_polish_enhanced(self, text: str, prompt_template: str, preserve_content: bool, style: str) -> str:
        """使用OpenAI进行增强版润色"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.openai_base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-3.5-turbo",
                        "messages": [
                            {"role": "user", "content": prompt_template}
                        ],
                        "max_tokens": len(text) + 500,
                        "temperature": 0.7
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return result["choices"][0]["message"]["content"]
                else:
                    logger.error(f"OpenAI润色API调用失败: {response.status_code} {response.text}")
                    return text
        except Exception as e:
            logger.error(f"OpenAI润色失败: {str(e)}")
            return text
    
    async def _gemini_polish_enhanced(self, text: str, prompt_template: str, preserve_content: bool, style: str) -> str:
        """使用Gemini进行增强版润色"""
        try:
            result = await self._gemini_generate(prompt_template, len(text) + 500)
            return result or text
        except Exception as e:
            logger.error(f"Gemini润色失败: {str(e)}")
            return text
    
    async def _openai_summarize_enhanced(self, text: str, prompt_template: str, max_sentences: int) -> str:
        """使用OpenAI进行增强版摘要"""
        try:
            # 替换提示词中的占位符
            full_prompt = prompt_template.replace("{TEXT}", text)
            full_prompt = full_prompt.replace("{MAX_SENTENCES}", str(max_sentences))
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.openai_base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-3.5-turbo",
                        "messages": [
                            {"role": "user", "content": full_prompt}
                        ],
                        "max_tokens": max_sentences * 60,
                        "temperature": 0.3
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return result["choices"][0]["message"]["content"]
                else:
                    logger.error(f"OpenAI摘要API调用失败: {response.status_code} {response.text}")
                    return text[:200] + "..."
        except Exception as e:
            logger.error(f"OpenAI摘要失败: {str(e)}")
            return text[:200] + "..."
    
    async def _gemini_summarize_enhanced(self, text: str, prompt_template: str, max_sentences: int) -> str:
        """使用Gemini进行增强版摘要"""
        try:
            # 替换提示词中的占位符
            full_prompt = prompt_template.replace("{TEXT}", text)
            full_prompt = full_prompt.replace("{MAX_SENTENCES}", str(max_sentences))
            
            result = await self._gemini_generate(full_prompt, max_sentences * 60)
            return result or text[:200] + "..."
        except Exception as e:
            logger.error(f"Gemini摘要失败: {str(e)}")
            return text[:200] + "..."

# 创建AI服务实例
ai_service = AIService() 