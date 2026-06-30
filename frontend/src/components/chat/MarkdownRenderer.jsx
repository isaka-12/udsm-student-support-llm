import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../../utils/cn';

const components = {
  p:          ({ children }) => <p className="mb-2.5 last:mb-0 leading-relaxed text-[15px]">{children}</p>,
  strong:     ({ children }) => <strong className="font-semibold">{children}</strong>,
  em:         ({ children }) => <em className="italic">{children}</em>,
  ul:         ({ children }) => <ul className="list-disc list-outside pl-5 mb-2.5 space-y-1.5 text-[15px]">{children}</ul>,
  ol:         ({ children }) => <ol className="list-decimal list-outside pl-5 mb-2.5 space-y-1.5 text-[15px]">{children}</ol>,
  li:         ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1:         ({ children }) => <h1 className="text-lg font-bold mb-2 mt-4 text-zinc-900 dark:text-zinc-50">{children}</h1>,
  h2:         ({ children }) => <h2 className="text-base font-bold mb-1.5 mt-3 text-zinc-800 dark:text-zinc-100">{children}</h2>,
  h3:         ({ children }) => <h3 className="text-[15px] font-semibold mb-1 mt-2.5 text-zinc-700 dark:text-zinc-200">{children}</h3>,
  hr:         ()             => <hr className="border-gray-200 dark:border-zinc-700 my-2" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-gray-300 dark:border-zinc-600 pl-3 italic text-zinc-500 dark:text-zinc-400 mb-2">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-blue-500 dark:text-blue-400 underline underline-offset-2 hover:text-blue-600 dark:hover:text-blue-300 break-all">
      {children}
    </a>
  ),
  pre: ({ children }) => (
    <pre className="bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 overflow-x-auto text-xs font-mono mb-2 mt-1">
      {children}
    </pre>
  ),
  code: ({ children, className }) => (
    <code className={cn('font-mono text-xs', className ? '' : 'bg-gray-100 dark:bg-zinc-700 rounded px-1 py-0.5 text-zinc-800 dark:text-zinc-200')}>
      {children}
    </code>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-2">
      <table className="text-xs border-collapse w-full">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-gray-300 dark:border-zinc-600 px-2 py-1 bg-gray-100 dark:bg-zinc-800 font-semibold text-left">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-gray-300 dark:border-zinc-600 px-2 py-1">{children}</td>
  ),
};

export default function MarkdownRenderer({ content }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
