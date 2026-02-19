"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";

export function ShareView({
  id,
  title,
  markdown,
}: {
  id: string;
  title: string;
  markdown: string;
}) {
  const [activeTab, setActiveTab] = useState<"preview" | "raw">("preview");
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }, []);

  const copyMarkdown = useCallback(() => {
    navigator.clipboard.writeText(markdown).then(
      () => showToast("Markdown 已复制到剪贴板"),
      () => showToast("复制失败")
    );
  }, [markdown, showToast]);

  const copyRawLink = useCallback(() => {
    const rawUrl = `${window.location.origin}/s/${id}/raw`;
    navigator.clipboard.writeText(rawUrl).then(
      () => showToast("Raw 链接已复制"),
      () => showToast("复制失败")
    );
  }, [id, showToast]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <div className="flex gap-2">
          <button
            onClick={copyMarkdown}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            复制
          </button>
          <button
            onClick={copyRawLink}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            复制 Raw 链接
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-0">
        <button
          onClick={() => setActiveTab("preview")}
          className={`px-4 py-2 text-sm ${
            activeTab === "preview" ? "tab-active" : "tab-inactive"
          }`}
        >
          预览
        </button>
        <button
          onClick={() => setActiveTab("raw")}
          className={`px-4 py-2 text-sm ${
            activeTab === "raw" ? "tab-active" : "tab-inactive"
          }`}
        >
          Markdown 源码
        </button>
      </div>

      {activeTab === "preview" && (
        <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-200 p-6">
          <div className="preview-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {activeTab === "raw" && (
        <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-200">
          <pre className="p-6 text-sm font-mono text-gray-800 whitespace-pre-wrap break-words overflow-x-auto">
            {markdown}
          </pre>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg toast">
          {toast}
        </div>
      )}
    </div>
  );
}
