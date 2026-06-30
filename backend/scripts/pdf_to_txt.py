#!/usr/bin/env python3
"""
Convert all PDFs in backend/docs/ to clean .txt files (same folder).
Run once before ingestion.

Usage:
    python -m backend.scripts.pdf_to_txt
    python -m backend.scripts.pdf_to_txt --docs-dir backend/docs
"""
import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from pypdf import PdfReader

_RE_HYPHEN   = re.compile(r'(\w)-\n(\w)')
_RE_LONE_NUM = re.compile(r'^\s*\d{1,4}\s*$', re.MULTILINE)
_RE_MULTI_SP = re.compile(r'[ \t]{2,}')
_RE_MULTI_NL = re.compile(r'\n{3,}')


def pdf_to_text(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    pages = []
    for i, page in enumerate(reader.pages, start=1):
        raw = page.extract_text() or ''
        raw = _RE_HYPHEN.sub(r'\1\2', raw)
        raw = _RE_LONE_NUM.sub('', raw)
        raw = _RE_MULTI_SP.sub(' ', raw)
        raw = _RE_MULTI_NL.sub('\n\n', raw)
        raw = raw.strip()
        if len(raw) > 40:
            pages.append(f'--- Page {i} ---\n{raw}')
    return '\n\n'.join(pages)


def convert(docs_dir: Path) -> None:
    pdfs = sorted(docs_dir.glob('*.pdf'))
    if not pdfs:
        print(f'No PDFs found in {docs_dir}')
        sys.exit(1)

    for pdf_path in pdfs:
        txt_path = pdf_path.with_suffix('.txt')
        print(f'Converting: {pdf_path.name} ...', end=' ', flush=True)
        text = pdf_to_text(pdf_path)
        txt_path.write_text(text, encoding='utf-8')
        kb = txt_path.stat().st_size // 1024
        lines = text.count('\n')
        print(f'done  ({kb} KB, {lines} lines)  -> {txt_path.name}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Convert PDFs to TXT for RAG ingestion')
    parser.add_argument('--docs-dir', default='backend/docs')
    args = parser.parse_args()
    convert(Path(args.docs_dir))
