import re
from typing import Dict, Tuple, List

class ReformatService:
    """自动排版服务"""

    def __init__(self):
        self.preserve_marker = "<!--preserve-->"
        self._buffer = ""

    def reformat_text(self, text: str, settings: Dict = None) -> Tuple[str, Dict]:
        """
        自动排版文本

        Args:
            text: 原始文本
            settings: 排版设置

        Returns:
            (formatted_text, diff_info)
        """
        if not settings:
            settings = {
                "indent": 2,  # 段落首行缩进空格数
                "preserve_empty_lines": False,
                "smart_spacing": True,
                "ellipsis_standardization": True,
                "line_break_standardization": True,
                "layout_mode": "segment",  # simple / segment
            }

        original_text = text
        formatted_text = text

        # 1. 换行符标准化
        if settings.get("line_break_standardization", True):
            formatted_text = self._standardize_line_breaks(formatted_text)

        # 2. 省略号标准化
        if settings.get("ellipsis_standardization", True):
            formatted_text = self._standardize_ellipsis(formatted_text)

        # 3. 中英文间智能空格
        if settings.get("smart_spacing", True):
            formatted_text = self._add_smart_spacing(formatted_text)

        # 4. 段落布局模式
        layout_mode = (settings.get("layout_mode") or "").lower()
        if layout_mode == "simple":
            formatted_text = self._layout_one_sentence_per_paragraph(formatted_text)
        elif layout_mode == "segment":
            formatted_text = self._layout_insert_blank_between_paragraphs(formatted_text)

        # 5. 段落首行缩进
        if settings.get("indent", 0) > 0:
            formatted_text = self._add_paragraph_indent(formatted_text, settings["indent"])

        # 6. 空行处理
        if not settings.get("preserve_empty_lines", False):
            formatted_text = self._compress_empty_lines(formatted_text)

        # 7. 移除排版标记
        formatted_text = self._remove_formatting_markers(formatted_text)

        # 8. 差异信息
        diff_info = self._calculate_diff(original_text, formatted_text)

        return formatted_text, diff_info

    # ------------------- 基础处理函数 -------------------

    def _standardize_line_breaks(self, text: str) -> str:
        return text.replace('\r\n', '\n').replace('\r', '\n')

    def _standardize_ellipsis(self, text: str) -> str:
        text = re.sub(r'\.{3,}', '……', text)
        text = re.sub(r'…{2,}', '……', text)
        return text

    def _add_smart_spacing(self, text: str) -> str:
        text = re.sub(r'([\u4e00-\u9fff])([a-zA-Z])', r'\1 \2', text)
        text = re.sub(r'([a-zA-Z])([\u4e00-\u9fff])', r'\1 \2', text)
        text = re.sub(r'(\d)([\u4e00-\u9fff])', r'\1 \2', text)
        text = re.sub(r'([\u4e00-\u9fff])(\d)', r'\1 \2', text)
        return text

    def _add_paragraph_indent(self, text: str, indent_spaces: int) -> str:
        indent = ' ' * indent_spaces
        lines = text.split('\n')
        formatted_lines = []
        for i, line in enumerate(lines):
            if i == 0 or (i > 0 and lines[i - 1].strip() == ''):
                if line.strip() and not line.startswith(self.preserve_marker):
                    formatted_lines.append(indent + line)
                else:
                    formatted_lines.append(line)
            else:
                formatted_lines.append(line)
        return '\n'.join(formatted_lines)

    def _compress_empty_lines(self, text: str) -> str:
        lines = text.split('\n')
        compressed_lines = []
        last_empty = False
        for line in lines:
            if line.strip() == '':
                if not last_empty:
                    compressed_lines.append(line)
                    last_empty = True
            else:
                compressed_lines.append(line)
                last_empty = False
        return '\n'.join(compressed_lines)

    def _remove_formatting_markers(self, text: str) -> str:
        return text.replace(self.preserve_marker, '')

    # ------------------- 核心排版逻辑 -------------------

    def _layout_one_sentence_per_paragraph(self, text: str) -> str:
        formatter = BlockFormatter()
        return formatter.format_text(text)

    def _layout_insert_blank_between_paragraphs(self, text: str) -> str:
        """分段排版：先使用BlockFormatter处理引号块，然后在段落间插入空行"""
        # 首先使用BlockFormatter处理引号块和标点符号分段
        formatter = BlockFormatter()
        formatted_text = formatter.format_text(text)
        
        # 然后在段落间插入空行（BlockFormatter已经用\n\n分隔段落）
        return formatted_text

    # ------------------- 差异计算 -------------------

    def _calculate_diff(self, original: str, formatted: str) -> Dict:
        original_lines = original.split('\n')
        formatted_lines = formatted.split('\n')
        changes = {
            "total_lines": len(original_lines),
            "changed_lines": 0,
            "added_spaces": 0,
            "removed_spaces": 0,
            "line_changes": []
        }
        for i, (orig_line, fmt_line) in enumerate(zip(original_lines, formatted_lines)):
            if orig_line != fmt_line:
                changes["changed_lines"] += 1
                orig_spaces = len(orig_line) - len(orig_line.lstrip())
                fmt_spaces = len(fmt_line) - len(fmt_line.lstrip())
                space_diff = fmt_spaces - orig_spaces
                if space_diff > 0:
                    changes["added_spaces"] += space_diff
                else:
                    changes["removed_spaces"] += abs(space_diff)
                changes["line_changes"].append({
                    "line_number": i + 1,
                    "original": orig_line,
                    "formatted": fmt_line,
                    "space_diff": space_diff
                })
        changes["changed"] = changes["changed_lines"] > 0
        return changes


# ------------------- BlockFormatter 核心块识别 -------------------

class BlockFormatter:
    """专门处理引号和方括号块的自动分段"""

    def __init__(self):
        pass

    def format_text(self, text: str) -> str:
        """
        按照产品需求实现自动排版：
        1. 预处理：删除所有空格（包括全角和半角）
        2. 块识别：扫描文本，识别出特殊块："..." 包裹的部分、【...】 包裹的部分
        3. 块长度判断：计算块内的非空白字符数（去掉空格后长度）
        4. 若 > 8：该块单独成段
        5. 若 <= 8：将该块并入上下文，整体由句尾标点（。？！）来决定分段
        6. 普通文本分段：以句尾标点 。？！ 作为分段依据
        """
        # 1. 预处理：删除所有空格（包括全角和半角），移除所有换行符
        text = re.sub(r"[ \u3000\n\r]", "", text)
        
        # 统一引号格式：将英文引号替换为中文引号
        text = text.replace('"', '"').replace('"', '"')

        paragraphs: List[str] = []
        
        # 2. 块识别：找到所有引号对和方括号块
        # 使用更精确的引号匹配，避免匹配不完整的引号对
        pattern = re.compile(r'("[^"]*"|【[^】]*】)')
        blocks = []
        
        for match in pattern.finditer(text):
            block = match.group()
            
            # 正确提取引号内容
            if block.startswith('"') and block.endswith('"'):
                inner = block[1:-1]  # 去掉中文引号
            elif block.startswith('【') and block.endswith('】'):
                inner = block[1:-1]  # 去掉方括号
            else:
                continue  # 跳过不认识的块类型
            
            inner_len = len(re.sub(r"\s", "", inner))  # 计算非空白字符数
            
            # 验证引号对的完整性
            if block.startswith('"') and block.endswith('"'):
                # 检查引号内容是否合理（不能为空，不能只包含标点符号）
                if inner_len == 0 or re.match(r'^[。？！，、；：""''（）【】\s]*$', inner):
                    continue  # 跳过不合理的引号对
            
            blocks.append({
                'start': match.start(),
                'end': match.end(),
                'block': block,
                'inner_len': inner_len,
                'is_long': inner_len > 8
            })
        
        # 3. 按顺序处理文本
        pos = 0
        current_text = ""
        
        for block_info in blocks:
            # 处理块前的文本
            before_text = text[pos:block_info['start']]
            current_text += before_text
            
            # 处理当前块
            if block_info['is_long']:
                # 长块（>8字符）：先处理当前累积的文本，然后独立成段
                if current_text.strip():
                    paragraphs.extend(self._split_ordinary_text_by_punctuation(current_text.strip()))
                    current_text = ""
                # 长块独立成段，不进行标点符号分割
                paragraphs.append(block_info['block'])
            else:
                # 短块（<=8字符）：并入上下文，继续累积
                current_text += block_info['block']
            
            pos = block_info['end']
        
        # 处理最后剩余的文本
        if pos < len(text):
            current_text += text[pos:]
        
        # 处理最后的累积文本（包含所有短块和普通文本）
        if current_text.strip():
            paragraphs.extend(self._split_ordinary_text_by_punctuation(current_text.strip()))

        return "\n\n".join(p for p in paragraphs if p.strip())
    
    def _process_brackets(self, text: str, paragraphs: List[str]) -> str:
        """处理方括号块"""
        pattern = re.compile(r'【[^】]*】')
        pos = 0
        result = ""
        
        for match in pattern.finditer(text):
            start, end = match.span()
            result += text[pos:start]
            
            block = match.group()
            inner = block[1:-1]  # 去掉方括号
            inner_len = len(re.sub(r"\s", "", inner))
            
            if inner_len > 8:
                # 长方括号独立成段
                if result.strip():
                    paragraphs.extend(self._split_by_punctuation(result.strip()))
                    result = ""
                block_clean = block.replace("\n", "").strip()
                paragraphs.append(block_clean)
            else:
                # 短方括号并入上下文
                result += block
            
            pos = end
        
        result += text[pos:]
        return result
    
    def _process_quotes(self, text: str, paragraphs: List[str]) -> str:
        """处理引号块，支持连续引号"""
        # 使用正则表达式匹配所有引号对
        pattern = re.compile(r'"[^"]*"')
        pos = 0
        result = ""
        
        for match in pattern.finditer(text):
            start, end = match.span()
            
            # 处理引号前的文本
            result += text[pos:start]
            
            # 获取引号内容
            quote_content = match.group()
            inner = quote_content[1:-1]  # 去掉引号
            inner_len = len(re.sub(r"\s", "", inner))
            
            # 调试信息
            print(f"调试: 引号内容='{quote_content}', 内部='{inner}', 长度={inner_len}")
            
            if inner_len > 8:
                # 长引号独立成段
                if result.strip():
                    paragraphs.extend(self._split_by_punctuation(result.strip()))
                    result = ""
                quote_clean = quote_content.replace("\n", "").strip()
                paragraphs.append(quote_clean)
            else:
                # 短引号并入上下文
                result += quote_content
            
            pos = end
        
        # 处理剩余文本
        result += text[pos:]
        return result

    def _split_by_punctuation(self, text: str) -> List[str]:
        """
        按标点符号分段，但保护引号内的内容不被分割
        只有在引号外的标点符号才用于分段
        """
        # 使用更智能的方法：先标记引号内容，然后按标点分割
        # 1. 找到所有引号对，用占位符替换
        quote_pattern = re.compile(r'"[^"]*"')
        quotes = []
        temp_text = text
        
        def replace_quote(match):
            quotes.append(match.group())
            return f"__QUOTE_{len(quotes)-1}__"
        
        temp_text = quote_pattern.sub(replace_quote, temp_text)
        
        # 2. 对临时文本按标点分割
        parts = re.split(r"([。？！])", temp_text)
        result = []
        tmp = ""
        
        for part in parts:
            if not part:
                continue
            tmp += part
            if part in "。？！":
                result.append(tmp)
                tmp = ""
        if tmp:
            result.append(tmp)
        
        # 3. 恢复引号内容
        final_result = []
        for part in result:
            for i, quote in enumerate(quotes):
                part = part.replace(f"__QUOTE_{i}__", quote)
            final_result.append(part)
        
        return [p for p in final_result if p.strip()]
    
    def _split_ordinary_text_by_punctuation(self, text: str) -> List[str]:
        """
        专门用于处理普通文本（不包含长引号块）的标点符号分段
        这个方法只处理已经确定不包含长引号块的文本
        但仍然需要保护短引号内的标点符号不被用于分段
        """
        # 使用与_split_by_punctuation相同的逻辑，保护引号内的标点符号
        quote_pattern = re.compile(r'"[^"]*"')
        quotes = []
        temp_text = text
        
        def replace_quote(match):
            quotes.append(match.group())
            return f"__QUOTE_{len(quotes)-1}__"
        
        temp_text = quote_pattern.sub(replace_quote, temp_text)
        
        # 对临时文本按标点分割
        parts = re.split(r"([。？！])", temp_text)
        result = []
        tmp = ""
        
        for part in parts:
            if not part:
                continue
            tmp += part
            if part in "。？！":
                result.append(tmp)
                tmp = ""
        if tmp:
            result.append(tmp)
        
        # 恢复引号内容
        final_result = []
        for part in result:
            for i, quote in enumerate(quotes):
                part = part.replace(f"__QUOTE_{i}__", quote)
            final_result.append(part)
        
        return [p for p in final_result if p.strip()]


# ------------------- 创建服务实例 -------------------

reformat_service = ReformatService()