import { Converter } from "@/components/converter";

export default function Home() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Feishu2MD</h1>
          <a
            href="https://github.com/Wsine/feishu2md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            GitHub
          </a>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Converter />
      </main>
    </div>
  );
}
