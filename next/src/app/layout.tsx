import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Feishu2MD - 飞书文档转 Markdown",
  description: "将飞书文档转换为 Markdown 格式",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
