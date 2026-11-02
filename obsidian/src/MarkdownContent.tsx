import { useEffect, useRef } from 'react';
import { Component, MarkdownRenderer, type App } from 'obsidian';

export function MarkdownContent({ app, text, sourcePath = '' }: { app: App; text: string; sourcePath?: string }) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = element.current;
    if (!target) return;
    const component = new Component(); component.load();
    target.replaceChildren();
    void MarkdownRenderer.render(app, text, target, sourcePath, component).catch(() => { target.textContent = text; });
    return () => component.unload();
  }, [app, text, sourcePath]);
  return <div className="atlas-markdown-content markdown-rendered" ref={element} />;
}
