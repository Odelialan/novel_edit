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
    """按照需求实现块识别与分段"""

    # 匹配：智能引号"…"，智能单引号'…'，方括号【…】
    _BLOCK_RE = re.compile(r'(?:' + chr(0x201C) + r'[^' + chr(0x201D) + r']*' + chr(0x201D) + r'|' + chr(0x2018) + r'[^' + chr(0x2019) + r']*' + chr(0x2019) + r'|【[^】]*】)')

    def __init__(self):
        pass

    def format_text(self, text: str) -> str:
        # 1. 预处理：删除所有空格（半角 + 全角）与多余换行
        text = re.sub(r'[ \t\u3000\r\n]+', '', text)

        # 2. 扫描，构建 segment 列表：
        #    每个 segment = ("ordinary", str) 或 ("long_block", str)
        segments = []
        pos = 0
        current_chunk = []  # 用 list 累积普通文本和短块（字符串片段）

        for m in self._BLOCK_RE.finditer(text):
            s, e = m.span()
            block = m.group()

            # 普通文本片段（块之前的文字）
            if s > pos:
                current_chunk.append(text[pos:s])

            # 计算 block 内非空白字符数（虽然我们已删除空格，还是稳妥处理）
            inner = block[1:-1]
            inner_len = len(re.sub(r'\s', '', inner))

            if inner_len > 8:
                # 长块：先把当前累积的普通块作为一个 segment（如果有）
                if current_chunk:
                    segments.append(("ordinary", ''.join(current_chunk)))
                    current_chunk = []
                # 长块单独成段
                segments.append(("long_block", block))
            else:
                # 短块：并入当前普通文本累积
                current_chunk.append(block)

            pos = e

        # 末尾剩余文本
        if pos < len(text):
            current_chunk.append(text[pos:])

        if current_chunk:
            segments.append(("ordinary", ''.join(current_chunk)))

        # 3. 对 segments 进行最终拆句：
        paragraphs: List[str] = []
        for typ, content in segments:
            if typ == "long_block":
                # 长块直接作为段落（去掉多余换行/空格）
                paragraphs.append(content)
            else:
                # ordinary：按句尾标点分句（但要保护块内部不被拆）
                paragraphs.extend(self._split_ordinary_by_punct(content))

        # 去掉空白段并返回（段间以空行分隔）
        paragraphs = [p for p in paragraphs if p.strip()]
        return "\n\n".join(paragraphs)

    def _split_ordinary_by_punct(self, text: str) -> List[str]:
        """
        对于普通文本（包含短块），按句尾标点分段。
        关键：先把所有块（引号、方括号）用占位符替换以保护内部标点，
        分割后再恢复块内容。
        """
        blocks = []
        def _repl(m):
            blocks.append(m.group())
            return f"__BLK_{len(blocks)-1}__"

        temp = self._BLOCK_RE.sub(_repl, text)

        # 用标点分割，保留标点
        parts = re.split(r'([。？！])', temp)
        sentences = []
        buf = ""
        for part in parts:
            if not part:
                continue
            buf += part
            if part in "。？！":
                sentences.append(buf)
                buf = ""
        if buf:
            sentences.append(buf)

        # 恢复占位符
        restored = []
        for s in sentences:
            for i, blk in enumerate(blocks):
                s = s.replace(f"__BLK_{i}__", blk)
            restored.append(s)
        return restored


# ------------------- 创建服务实例 -------------------

reformat_service = ReformatService()
