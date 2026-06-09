import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const API_URL = "http://127.0.0.1:8000";

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{
        width: "42px", height: "42px", borderRadius: "10px",
        background: "linear-gradient(135deg, #2563EB, #E07B39)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: "900", fontSize: "22px", color: "white",
        fontFamily: "Georgia, serif", letterSpacing: "-1px"
      }}>Q</div>
      <div>
        <div style={{ fontWeight: "800", fontSize: "20px", color: "white", letterSpacing: "-0.5px" }}>
          Compli<span style={{ color: "#E07B39" }}>Q</span>
        </div>
        <div style={{ fontSize: "11px", color: "#64748B", letterSpacing: "1.5px", textTransform: "uppercase" }}>
          Compliance, Simplified.
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_URL}/upload`, { method: "POST", body: formData });
      const data = await res.json();
      setUploaded(true);
      setUploadedFileName(data.filename);
      setMessages([{
        role: "system",
        text: `Document ingested — **${data.filename}** (${data.chunks_created} knowledge chunks indexed). Ask me anything about this document.`
      }]);
    } catch {
      setMessages([{ role: "system", text: "Upload failed. Make sure your backend is running." }]);
    }
    setUploading(false);
  };

  const handleAsk = async () => {
    if (!question.trim() || !uploaded) return;
    const userMessage = { role: "user", text: question };
    setMessages(prev => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: "assistant", text: data.answer, sources: data.sources
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant", text: "Something went wrong. Please try again."
      }]);
    }
    setLoading(false);
  };

  const handleClear = () => {
    setMessages([]);
    setUploaded(false);
    setFile(null);
    setUploadedFileName("");
  };

  return (
    <div style={{
      display: "flex", height: "100vh", width: "100vw",
      background: "linear-gradient(135deg, #0A1628 0%, #1C0E06 50%, #0A1628 100%)", fontFamily: "'Inter', system-ui, sans-serif",
      overflow: "hidden"
    }}>

      {/* ── LEFT SIDEBAR ── */}
      <div style={{
        width: "300px", minWidth: "300px",
        background: "linear-gradient(180deg, #0F1F38 0%, #130d0a 100%)",
        borderRight: "1px solid #1E2D45",
        display: "flex", flexDirection: "column",
        padding: "28px 24px", gap: "32px"
      }}>
        <Logo />

        {/* Upload Section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontSize: "11px", color: "#64748B", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: "600" }}>
            Document
          </div>

          <label style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: "8px",
            border: `2px dashed ${file ? "#2563EB" : "#1E2D45"}`,
            borderRadius: "12px", padding: "24px 16px",
            cursor: "pointer", transition: "all 0.2s",
            background: file ? "rgba(37,99,235,0.05)" : "transparent"
          }}>
            <div style={{ fontSize: "28px" }}>📄</div>
            <div style={{ fontSize: "13px", color: file ? "#93C5FD" : "#64748B", textAlign: "center" }}>
              {file ? file.name : "Click to select PDF"}
            </div>
            <input type="file" accept=".pdf" style={{ display: "none" }}
              onChange={e => setFile(e.target.files[0])} />
          </label>

          <button onClick={handleUpload} disabled={!file || uploading}
            style={{
              background: uploading ? "#1E2D45" : "linear-gradient(135deg, #2563EB, #1D4ED8)",
              color: "white", border: "none", borderRadius: "10px",
              padding: "12px", fontSize: "14px", fontWeight: "600",
              cursor: file && !uploading ? "pointer" : "not-allowed",
              opacity: !file || uploading ? 0.5 : 1, transition: "all 0.2s"
            }}>
            {uploading ? "Processing..." : "Analyze Document"}
          </button>

          {uploaded && (
            <div style={{
              background: "rgba(224,123,57,0.1)", border: "1px solid rgba(224,123,57,0.3)",
              borderRadius: "8px", padding: "10px 12px",
              fontSize: "12px", color: "#E07B39", display: "flex", gap: "6px", alignItems: "center"
            }}>
              ✓ {uploadedFileName} ready
            </div>
          )}
        </div>

        {/* Stats */}
        {uploaded && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "11px", color: "#64748B", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: "600" }}>
              Session
            </div>
            <div style={{
              background: "#1E2D45", borderRadius: "10px", padding: "14px",
              display: "flex", flexDirection: "column", gap: "8px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "#64748B" }}>Messages</span>
                <span style={{ color: "white", fontWeight: "600" }}>{messages.filter(m => m.role !== "system").length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "#64748B" }}>Model</span>
                <span style={{ color: "#E07B39", fontWeight: "600" }}>Claude</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "#64748B" }}>Search</span>
                <span style={{ color: "#93C5FD", fontWeight: "600" }}>FAISS RAG</span>
              </div>
            </div>
          </div>
        )}

        {/* Clear button */}
        {uploaded && (
          <button onClick={handleClear} style={{
            marginTop: "auto", background: "transparent",
            border: "1px solid #1E2D45", color: "#64748B",
            borderRadius: "10px", padding: "10px",
            fontSize: "13px", cursor: "pointer",
            transition: "all 0.2s"
          }}>
            ↺ New Session
          </button>
        )}

        {/* Built with */}
        <div style={{ marginTop: "auto", fontSize: "11px", color: "#1E2D45", textAlign: "center" }}>
          Powered by Claude · FAISS · LangChain
        </div>
      </div>

      {/* ── RIGHT CHAT PANEL ── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", overflow: "hidden"
      }}>

        {/* Header */}
        <div style={{
          padding: "20px 32px", borderBottom: "1px solid #1E2D45",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "white" }}>
              {uploaded ? `Querying: ${uploadedFileName}` : "No document loaded"}
            </div>
            <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
              {uploaded ? "Ask anything about your compliance document" : "Upload a PDF to get started"}
            </div>
          </div>
          <div style={{
            background: uploaded ? "rgba(37,99,235,0.15)" : "rgba(100,116,139,0.15)",
            border: `1px solid ${uploaded ? "rgba(37,99,235,0.3)" : "rgba(100,116,139,0.3)"}`,
            borderRadius: "20px", padding: "6px 14px",
            fontSize: "12px", color: uploaded ? "#93C5FD" : "#64748B",
            fontWeight: "600"
          }}>
            {uploaded ? "● Live" : "○ Idle"}
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "24px 32px",
          display: "flex", flexDirection: "column", gap: "20px",
          background: "radial-gradient(ellipse at top right, rgba(224,123,57,0.25) 0%, rgba(224,123,57,0.08) 40%, transparent 70%)",
        }}>
          {messages.length === 0 && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", gap: "16px"
            }}>
              <div style={{ fontSize: "48px" }}>⚖️</div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "white" }}>
                Welcome to CompliQ
              </div>
              <div style={{ fontSize: "14px", color: "#64748B", textAlign: "center", maxWidth: "400px" }}>
                Upload a compliance document and instantly query it with AI. No more searching through hundreds of pages.
              </div>
              <div style={{ display: "flex", gap: "12px", marginTop: "8px", flexWrap: "wrap", justifyContent: "center" }}>
                {["What is the vacation policy?", "What are the conduct rules?", "Explain the benefits"].map(q => (
                  <button key={q} onClick={() => uploaded && setQuestion(q)}
                    style={{
                      background: "#1E2D45", border: "1px solid #2D3F5C",
                      borderRadius: "20px", padding: "8px 16px",
                      fontSize: "12px", color: "#93C5FD", cursor: uploaded ? "pointer" : "default"
                    }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start"
            }}>
              {msg.role !== "user" && (
                <div style={{
                  width: "32px", height: "32px", borderRadius: "8px",
                  background: "linear-gradient(135deg, #2563EB, #E07B39)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "14px", fontWeight: "900", color: "white",
                  fontFamily: "Georgia, serif", marginRight: "10px", flexShrink: 0
                }}>Q</div>
              )}

              <div style={{
                maxWidth: "70%",
                background: msg.role === "user"
                  ? "linear-gradient(135deg, #2563EB, #1D4ED8)"
                  : msg.role === "system"
                  ? "rgba(224,123,57,0.1)"
                  : "#1E2D45",
                border: msg.role === "system" ? "1px solid rgba(224,123,57,0.25)" : "none",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                padding: "14px 18px",
                fontSize: "14px", lineHeight: "1.6",
                color: msg.role === "user" ? "white" : msg.role === "system" ? "#E07B39" : "#CBD5E1"
              }}>
                {msg.role === "assistant" ? (
                  <div style={{ color: "#CBD5E1" }}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ) : msg.text}
                {msg.sources && (
                  <div style={{
                    marginTop: "8px", paddingTop: "8px",
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    fontSize: "11px", color: "#64748B"
                  }}>
                    📌 {msg.sources} source chunks retrieved
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "8px",
                background: "linear-gradient(135deg, #2563EB, #E07B39)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "14px", fontWeight: "900", color: "white",
                fontFamily: "Georgia, serif"
              }}>Q</div>
              <div style={{
                background: "#1E2D45", borderRadius: "18px",
                padding: "14px 18px", fontSize: "14px", color: "#64748B"
              }}>
                Analyzing document<span style={{ animation: "pulse 1s infinite" }}>...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "20px 32px", borderTop: "1px solid #1E2D45",
          display: "flex", gap: "12px", alignItems: "center"
        }}>
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAsk()}
            placeholder={uploaded ? "Ask about your compliance document..." : "Upload a document to begin..."}
            disabled={!uploaded}
            style={{
              flex: 1, background: "#1E2D45", border: "1px solid #2D3F5C",
              borderRadius: "12px", padding: "14px 18px",
              fontSize: "14px", color: "white", outline: "none",
              opacity: uploaded ? 1 : 0.5
            }}
          />
          <button onClick={handleAsk} disabled={!uploaded || !question.trim() || loading}
            style={{
              background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
              border: "none", borderRadius: "12px",
              padding: "14px 24px", fontSize: "14px",
              fontWeight: "600", color: "white",
              cursor: uploaded && question.trim() && !loading ? "pointer" : "not-allowed",
              opacity: !uploaded || !question.trim() || loading ? 0.5 : 1,
              whiteSpace: "nowrap"
            }}>
            Ask CompliQ →
          </button>
        </div>
      </div>
    </div>
  );
}