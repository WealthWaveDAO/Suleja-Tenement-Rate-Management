/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface MarkdownRendererProps {
  markdown: string;
}

export default function MarkdownRenderer({ markdown }: MarkdownRendererProps) {
  if (!markdown) return null;

  // Split content by lines
  const lines = markdown.split('\n');

  return (
    <div className="space-y-2.5 font-sans text-[11.5px] sm:text-xs text-gray-700 leading-relaxed select-text">
      {lines.map((line, index) => {
        const trimmed = line.trim();

        // h5/h4/h3/h2 headers
        if (trimmed.startsWith('#####')) {
          return (
            <h6 key={index} className="font-display font-black text-[10px] text-slate-500 mt-3 mb-1 uppercase tracking-wider">
              {parseInlineMarkdown(trimmed.replace(/^#####\s*/, ''))}
            </h6>
          );
        }
        if (trimmed.startsWith('####')) {
          return (
            <h5 key={index} className="font-display font-bold text-xs text-[#0A1F44] mt-3.5 mb-1.5 uppercase tracking-wide">
              {parseInlineMarkdown(trimmed.replace(/^####\s*/, ''))}
            </h5>
          );
        }
        if (trimmed.startsWith('###')) {
          return (
            <h4 key={index} className="font-display font-bold text-[13px] text-[#0A1F44] mt-4 mb-2 border-b border-gray-150 pb-1 flex items-center gap-1.5">
              {parseInlineMarkdown(trimmed.replace(/^###\s*/, ''))}
            </h4>
          );
        }
        if (trimmed.startsWith('##')) {
          return (
            <h3 key={index} className="font-display font-bold text-sm text-[#0A1F44] mt-5 mb-2.5">
              {parseInlineMarkdown(trimmed.replace(/^##\s*/, ''))}
            </h3>
          );
        }
        if (trimmed.startsWith('#')) {
          return (
            <h2 key={index} className="font-display font-bold text-base text-[#0A1F44] mt-6 mb-3">
              {parseInlineMarkdown(trimmed.replace(/^#\s*/, ''))}
            </h2>
          );
        }

        // Bullet points
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          const content = trimmed.replace(/^[-*]\s*/, '');
          return (
            <ul key={index} className="list-disc pl-4 space-y-1.5 my-1">
              <li className="text-gray-650 text-[11px] leading-relaxed">
                {parseInlineMarkdown(content)}
              </li>
            </ul>
          );
        }

        // Empty lines
        if (trimmed === '') {
          return <div key={index} className="h-1.5" />;
        }

        // Standard paragraphs
        return (
          <p key={index} className="text-gray-600 my-1 font-sans text-[11px] leading-relaxed">
            {parseInlineMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
}

// Simple inline parser for bold text (**text**)
function parseInlineMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-[#0A1F44]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}
