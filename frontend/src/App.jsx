import { useState } from "react";

const API_URL = "http://127.0.0.1:8000";

export default function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Handle PDF upload
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setUploaded(true);
      setMessages([
        {
          role: "system",
          text: `✅ "${data.filename}" uploaded successfully! ${data.chunks_created} chunks created. You can now ask questions!`,
        },
      ]);
    } catch (err) {
      setMessages([{ role: "system", text: "❌ Upload failed. Make sure your backend is running." }]);
    }
    setUploading(false);
  };

  // Handle question
  const handleAsk = async () => {
    if (!question.trim() || !uploaded) return;

    const userMessage = { role: "user", text: question };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.answer, sources: data.sources },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "❌ Something went wrong. Please try again." },
      ]);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      {/* Header */}
      <div className="w-full max-w-3xl mb-8">
        <h1 className="text-3xl font-bold text-gray-800">🏢 Compliance Assistant</h1>
        <p className="text-gray-500 mt-1">Upload a company policy document and ask any question.</p>
      </div>

      {/* Upload Section */}
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">📄 Upload Policy Document</h2>
        <div className="flex gap-3 items-center">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files[0])}
            className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>

      {/* Chat Section */}
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow flex flex-col" style={{ height: "500px" }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <p className="text-gray-400 text-center mt-20">Upload a PDF to get started!</p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-2xl px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : msg.role === "system"
                    ? "bg-green-50 text-green-800 border border-green-200 w-full"
                    : "bg-gray-100 text-gray-800 rounded-bl-none"
                }`}
              >
                {msg.text}
                {msg.sources && (
                  <p className="text-xs text-gray-400 mt-2">📌 Based on {msg.sources} source chunks</p>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-500 px-4 py-3 rounded-2xl text-sm animate-pulse">
                Thinking...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t p-4 flex gap-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            placeholder={uploaded ? "Ask a question about your document..." : "Upload a PDF first..."}
            disabled={!uploaded}
            className="flex-1 border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <button
            onClick={handleAsk}
            disabled={!uploaded || !question.trim() || loading}
            className="bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}