"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";

export function Converter() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"preview" | "raw">("preview");
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }, []);

  const convert = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("请输入飞书文档链接");
      return;
    }

    setLoading(true);
    setError("");
    setTitle("");
    setMarkdown("");

    try {
      const resp = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await resp.json();

      if (!resp.ok) {
        setError(data.error || "转换失败，请检查链接和服务配置");
        return;
      }

      setTitle(data.title || "Untitled");
      setMarkdown(data.markdown);
      setActiveTab("preview");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError("网络错误：" + message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  const copyMarkdown = useCallback(() => {
    navigator.clipboard.writeText(markdown).then(
      () => showToast("Markdown 已复制到剪贴板"),
      () => {
        // Fallback
        const ta = document.createElement("textarea");
        ta.value = markdown;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        showToast("Markdown 已复制到剪贴板");
      }
    );
  }, [markdown, showToast]);

  const downloadMarkdown = useCallback(() => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = (title || "document") + ".md";
    a.click();
    URL.revokeObjectURL(blobUrl);
  }, [markdown, title]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") convert();
    },
    [convert]
  );

  return (
    <>
      {/* Input Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          飞书文档链接
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://xxx.feishu.cn/docx/xxxxxx"
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
          <button
            onClick={convert}
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium text-sm whitespace-nowrap transition-colors disabled:opacity-50"
          >
            转换
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          支持 docx 和 wiki 类型的飞书文档链接
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-500 mt-3 text-sm">正在转换文档，请稍候...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Result Section */}
      {markdown && (
        <div>
          {/* Title & Actions */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
            <div className="flex gap-2">
              <button
                onClick={copyMarkdown}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="复制 Markdown"
              >
                复制
              </button>
              <button
                onClick={downloadMarkdown}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="下载 .md 文件"
              >
                下载
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-0">
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-4 py-2 text-sm ${
                activeTab === "preview"
                  ? "tab-active"
                  : "tab-inactive"
              }`}
            >
              预览
            </button>
            <button
              onClick={() => setActiveTab("raw")}
              className={`px-4 py-2 text-sm ${
                activeTab === "raw"
                  ? "tab-active"
                  : "tab-inactive"
              }`}
            >
              Markdown 源码
            </button>
          </div>

          {/* Preview Panel */}
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

          {/* Raw Panel */}
          {activeTab === "raw" && (
            <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-200">
              <pre className="p-6 text-sm font-mono text-gray-800 whitespace-pre-wrap break-words overflow-x-auto">
                {markdown}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg toast">
          {toast}
        </div>
      )}
    </>
  );
}
