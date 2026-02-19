import { notFound } from "next/navigation";
import { getDocument } from "@/lib/store";
import { ShareView } from "./share-view";

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getDocument(id);

  if (!doc) {
    notFound();
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-gray-800">
            Feishu2MD
          </a>
          <span className="text-xs text-gray-400">
            {new Date(doc.createdAt).toLocaleDateString("zh-CN")} 分享
          </span>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <ShareView
          id={doc.id}
          title={doc.title}
          markdown={doc.markdown}
        />
      </main>
    </div>
  );
}
