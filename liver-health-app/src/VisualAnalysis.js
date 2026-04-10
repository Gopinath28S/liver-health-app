import React, { useState, useRef, useEffect } from "react";

const ANALYSIS_TYPES = [
  {
    id: "jaundice",
    label: "Jaundice Detection",
    icon: "👁️",
    description: "Detect yellowing of skin or eyes indicating elevated bilirubin",
    tip: "Look directly at the camera or upload a clear photo of your eyes/skin",
    accent: "#f59e0b",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  {
    id: "facial",
    label: "Facial Analysis",
    icon: "🧑",
    description: "Scan face for pallor, puffiness, or discoloration patterns",
    tip: "Face the camera straight on with even lighting, no filters",
    accent: "#3b82f6",
    bg: "#eff6ff",
    border: "#bfdbfe",
  },
  {
    id: "palm",
    label: "Palm Scan",
    icon: "🖐️",
    description: "Check for palmar erythema — a known liver health indicator",
    tip: "Hold your palm flat towards the camera, 20–30 cm away",
    accent: "#22c55e",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
];

const RISK_CONFIG = {
  None:     { color: "#22c55e", bg: "#dcfce7", border: "#86efac", label: "No Risk Detected" },
  Mild:     { color: "#f59e0b", bg: "#fef3c7", border: "#fde047", label: "Mild Risk" },
  Moderate: { color: "#f97316", bg: "#fff7ed", border: "#fdba74", label: "Moderate Risk" },
  Severe:   { color: "#ef4444", bg: "#fee2e2", border: "#fca5a5", label: "High Risk" },
};

export default function VisualAnalysis() {
  const [activeType, setActiveType]   = useState("jaundice");
  const [previews, setPreviews]       = useState({});
  const [files, setFiles]             = useState({});
  const [results, setResults]         = useState({});
  const [loading, setLoading]         = useState({});
  const [errors, setErrors]           = useState({});

  // Camera state
  const [cameraOpen, setCameraOpen]   = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [capturing, setCapturing]     = useState(false);

  const fileInputRef = useRef(null);
  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const streamRef    = useRef(null);

  const currentType = ANALYSIS_TYPES.find((t) => t.id === activeType);

  // Stop camera on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Stop camera when switching tabs
  useEffect(() => {
    stopCamera();
    setCameraOpen(false);
    setCameraError(null);
  }, [activeType]);

  // Start webcam
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      // Wait for video element to mount, then assign
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in your browser."
          : err.name === "NotFoundError"
          ? "No camera found on this device."
          : "Could not open camera: " + err.message
      );
    }
  };

  // Stop webcam
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  // Capture frame from video
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setCapturing(true);

    const video  = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      const file   = new File([blob], `camera-${activeType}.jpg`, { type: "image/jpeg" });
      const dataURL = canvas.toDataURL("image/jpeg");

      setPreviews((p) => ({ ...p, [activeType]: dataURL }));
      setFiles((f)   => ({ ...f, [activeType]: file }));
      setResults((r) => ({ ...r, [activeType]: null }));
      setErrors((e)  => ({ ...e, [activeType]: null }));

      stopCamera();
      setCapturing(false);
    }, "image/jpeg", 0.92);
  };

  // File upload handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreviews((p) => ({ ...p, [activeType]: ev.target.result }));
    reader.readAsDataURL(file);
    setFiles((f)   => ({ ...f, [activeType]: file }));
    setResults((r) => ({ ...r, [activeType]: null }));
    setErrors((e)  => ({ ...e, [activeType]: null }));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFileChange({ target: { files: [file] } });
    }
  };

  // Send to backend
  const handleAnalyze = async () => {
    const file = files[activeType];
    if (!file) return;
    setLoading((l) => ({ ...l, [activeType]: true }));
    setErrors((e)  => ({ ...e, [activeType]: null }));
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("type", activeType);
      const response = await fetch("https://liver-health-app.onrender.com/analyze-image", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Analysis failed");
      setResults((r) => ({ ...r, [activeType]: data.result }));
    } catch (err) {
      setErrors((e) => ({ ...e, [activeType]: err.message }));
    } finally {
      setLoading((l) => ({ ...l, [activeType]: false }));
    }
  };

  const handleReset = () => {
    stopCamera();
    setResults((r) => ({ ...r, [activeType]: null }));
    setPreviews((p) => ({ ...p, [activeType]: null }));
    setFiles((f)   => ({ ...f, [activeType]: null }));
    setErrors((e)  => ({ ...e, [activeType]: null }));
  };

  const result    = results[activeType];
  const isLoading = loading[activeType];
  const error     = errors[activeType];
  const preview   = previews[activeType];
  const hasFile   = !!files[activeType];
  const riskCfg   = result ? RISK_CONFIG[result.riskLevel] || RISK_CONFIG.None : null;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>🔬 Visual Health Analysis</h2>
        <p style={styles.subtitle}>AI-powered visual screening — use your live camera or upload a photo</p>
      </div>

      {/* Type Selector */}
      <div style={styles.typeGrid}>
        {ANALYSIS_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => setActiveType(type.id)}
            style={{
              ...styles.typeCard,
              border: `2px solid ${activeType === type.id ? type.accent : "#e5e7eb"}`,
              background: activeType === type.id ? type.bg : "white",
              boxShadow: activeType === type.id ? `0 0 0 3px ${type.accent}22` : "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <span style={styles.typeIcon}>{type.icon}</span>
            <span style={{ ...styles.typeLabel, color: activeType === type.id ? type.accent : "#374151" }}>
              {type.label}
            </span>
            {results[type.id] && (
              <span style={{ ...styles.typeBadge, background: RISK_CONFIG[results[type.id].riskLevel]?.bg || "#dcfce7", color: RISK_CONFIG[results[type.id].riskLevel]?.color || "#22c55e" }}>
                ✓ Done
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Panel */}
      <div style={styles.mainPanel}>

        {/* Left: Upload / Camera */}
        <div style={styles.uploadPanel}>
          <div style={styles.uploadHeader}>
            <span style={{ fontSize: "1.25rem" }}>{currentType.icon}</span>
            <div>
              <h3 style={styles.uploadTitle}>{currentType.label}</h3>
              <p style={styles.uploadDesc}>{currentType.description}</p>
            </div>
          </div>

          {/* Tip */}
          <div style={{ ...styles.tipBox, background: currentType.bg, border: `1px solid ${currentType.border}` }}>
            <span style={{ color: currentType.accent, fontWeight: 600 }}>💡 Tip:</span>{" "}
            <span style={{ color: "#374151", fontSize: "0.85rem" }}>{currentType.tip}</span>
          </div>

          {/* CAMERA MODE */}
          {cameraOpen ? (
            <div style={styles.cameraWrapper}>
              <video ref={videoRef} autoPlay playsInline muted style={styles.videoEl} />
              {capturing && <div style={styles.flashOverlay} />}
              <div style={styles.cameraControls}>
                <button onClick={stopCamera} style={styles.camCancelBtn}>✕ Cancel</button>
                <button
                  onClick={capturePhoto}
                  disabled={capturing}
                  style={{ ...styles.captureBtn, background: currentType.accent }}
                >
                  {capturing ? "📸 Capturing..." : "📸 Capture Photo"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Drop zone / preview */}
              <div
                style={{
                  ...styles.dropZone,
                  border: `2px dashed ${preview ? currentType.accent : "#d1d5db"}`,
                  background: preview ? "#f8fafc" : "#fafafa",
                }}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => !preview && fileInputRef.current?.click()}
              >
                {preview ? (
                  <div style={styles.previewWrapper}>
                    <img src={preview} alt="Preview" style={styles.previewImg} />
                    <div style={styles.previewOverlay}>
                      <span style={styles.previewOverlayText}>🔄 Click Upload File to change</span>
                    </div>
                  </div>
                ) : (
                  <div style={styles.dropContent}>
                    <div style={styles.dropIcon}>🖼️</div>
                    <p style={styles.dropText}>Drop image here or <strong>click to browse</strong></p>
                    <p style={styles.dropSub}>JPG, PNG, WEBP up to 10MB</p>
                  </div>
                )}
              </div>

              {/* Camera + Upload buttons */}
              <div style={styles.actionRow}>
                <button
                  onClick={startCamera}
                  style={{ ...styles.cameraBtn, borderColor: currentType.accent, color: currentType.accent }}
                >
                  📷 Live Camera
                </button>
                <button onClick={() => fileInputRef.current?.click()} style={styles.uploadFileBtn}>
                  📁 Upload File
                </button>
              </div>

              {cameraError && <div style={styles.errorBox}>⚠️ {cameraError}</div>}
            </>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Analyze button — only show when not in camera mode */}
          {!cameraOpen && (
            <button
              onClick={handleAnalyze}
              disabled={!hasFile || isLoading}
              style={{
                ...styles.analyzeBtn,
                background: hasFile && !isLoading ? `linear-gradient(135deg, ${currentType.accent}, #3b82f6)` : "#e5e7eb",
                color: hasFile && !isLoading ? "white" : "#9ca3af",
                cursor: hasFile && !isLoading ? "pointer" : "not-allowed",
              }}
            >
              {isLoading ? "🔍 Analyzing..." : `🔍 Analyze ${currentType.label}`}
            </button>
          )}

          {error && <div style={styles.errorBox}>⚠️ {error}</div>}
        </div>

        {/* Right: Results */}
        <div style={styles.resultsPanel}>
          <h3 style={styles.resultsTitle}>📊 Analysis Results</h3>

          {!result && !isLoading && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🔬</div>
              <p style={styles.emptyText}>Use live camera or upload an image, then click Analyze</p>
            </div>
          )}

          {isLoading && (
            <div style={styles.loadingState}>
              <div style={styles.loadingPulse} />
              <p style={{ color: "#6b7280", marginTop: "1rem" }}>AI is analyzing your image...</p>
            </div>
          )}

          {result && !isLoading && (
            <div style={styles.resultContent}>
              <div style={{ ...styles.riskCard, background: riskCfg.bg, border: `1px solid ${riskCfg.border}` }}>
                <div style={styles.riskTop}>
                  <span style={styles.riskEmoji}>
                    {result.riskLevel === "None" ? "✅" : result.riskLevel === "Mild" ? "⚠️" : result.riskLevel === "Moderate" ? "🔶" : "🚨"}
                  </span>
                  <div>
                    <div style={{ ...styles.riskLevel, color: riskCfg.color }}>{riskCfg.label}</div>
                    <div style={styles.riskMeta}>
                      Confidence: <strong style={{ color: riskCfg.color }}>{result.confidence}</strong>
                      &nbsp;|&nbsp; Detected: <strong style={{ color: riskCfg.color }}>{result.detected ? "Yes" : "No"}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {result.findings?.length > 0 && (
                <div style={styles.findingsCard}>
                  <h4 style={styles.findingsTitle}>🔍 Findings</h4>
                  <ul style={styles.findingsList}>
                    {result.findings.map((f, i) => (
                      <li key={i} style={styles.findingItem}>
                        <span style={styles.findingDot} />{f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.recommendation && (
                <div style={styles.recommendCard}>
                  <h4 style={styles.recommendTitle}>💊 Recommendation</h4>
                  <p style={styles.recommendText}>{result.recommendation}</p>
                </div>
              )}

              <div style={styles.disclaimerBox}>
                <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>⚕️ {result.disclaimer}</span>
              </div>

              <button onClick={handleReset} style={styles.resetBtn}>🔄 Analyze Another</button>
            </div>
          )}
        </div>
      </div>

      <div style={styles.bottomDisclaimer}>
        ⚕️ This tool is for <strong>screening purposes only</strong> and does not replace professional medical diagnosis.
        Always consult a qualified healthcare provider for medical advice.
      </div>
    </div>
  );
}

const styles = {
  page:               { display: "flex", flexDirection: "column", gap: "1.5rem" },
  header:             { background: "white", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  title:              { fontSize: "1.375rem", fontWeight: 700, color: "#111827", marginBottom: "0.25rem" },
  subtitle:           { fontSize: "0.9rem", color: "#6b7280", margin: 0 },
  typeGrid:           { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" },
  typeCard:           { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", padding: "1.25rem 1rem", borderRadius: "12px", cursor: "pointer", transition: "all 0.2s" },
  typeIcon:           { fontSize: "1.75rem" },
  typeLabel:          { fontSize: "0.9rem", fontWeight: 600, textAlign: "center" },
  typeBadge:          { fontSize: "0.7rem", fontWeight: 600, padding: "0.2rem 0.5rem", borderRadius: "9999px" },
  mainPanel:          { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" },
  uploadPanel:        { background: "white", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: "1rem" },
  uploadHeader:       { display: "flex", alignItems: "flex-start", gap: "0.75rem" },
  uploadTitle:        { fontSize: "1rem", fontWeight: 700, color: "#111827", margin: 0 },
  uploadDesc:         { fontSize: "0.8rem", color: "#6b7280", margin: "0.2rem 0 0 0" },
  tipBox:             { padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.85rem", lineHeight: 1.5 },
  cameraWrapper:      { position: "relative", borderRadius: "12px", overflow: "hidden", background: "#000", lineHeight: 0 },
  videoEl:            { width: "100%", maxHeight: "260px", objectFit: "cover", display: "block", borderRadius: "12px" },
  flashOverlay:       { position: "absolute", inset: 0, background: "white", opacity: 0.7, borderRadius: "12px", pointerEvents: "none" },
  cameraControls:     { display: "flex", gap: "0.75rem", padding: "0.75rem", background: "rgba(0,0,0,0.55)", position: "absolute", bottom: 0, left: 0, right: 0, borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px" },
  camCancelBtn:       { flex: 1, padding: "0.6rem", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "8px", color: "white", fontWeight: 600, cursor: "pointer", fontSize: "0.875rem" },
  captureBtn:         { flex: 2, padding: "0.6rem", border: "none", borderRadius: "8px", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem" },
  dropZone:           { borderRadius: "12px", minHeight: "180px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s", overflow: "hidden", position: "relative" },
  dropContent:        { textAlign: "center", padding: "2rem" },
  dropIcon:           { fontSize: "2.5rem", marginBottom: "0.75rem" },
  dropText:           { color: "#374151", fontSize: "0.95rem", margin: "0 0 0.25rem 0" },
  dropSub:            { color: "#9ca3af", fontSize: "0.8rem", margin: 0 },
  previewWrapper:     { width: "100%", position: "relative" },
  previewImg:         { width: "100%", maxHeight: "220px", objectFit: "cover", borderRadius: "10px", display: "block" },
  previewOverlay:     { position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.45)", padding: "0.5rem", borderBottomLeftRadius: "10px", borderBottomRightRadius: "10px", textAlign: "center" },
  previewOverlayText: { color: "white", fontSize: "0.8rem" },
  actionRow:          { display: "flex", gap: "0.75rem" },
  cameraBtn:          { flex: 1, padding: "0.65rem", background: "white", border: "2px solid", borderRadius: "8px", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", transition: "all 0.2s" },
  uploadFileBtn:      { flex: 1, padding: "0.65rem", background: "white", border: "2px solid #e5e7eb", borderRadius: "8px", color: "#374151", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" },
  analyzeBtn:         { padding: "0.85rem", borderRadius: "8px", border: "none", fontSize: "0.95rem", fontWeight: 600, transition: "all 0.2s" },
  errorBox:           { background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "0.75rem 1rem", color: "#dc2626", fontSize: "0.875rem" },
  resultsPanel:       { background: "white", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: "1rem" },
  resultsTitle:       { fontSize: "1rem", fontWeight: 700, color: "#111827", margin: 0 },
  emptyState:         { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 1rem", textAlign: "center" },
  emptyIcon:          { fontSize: "3rem", opacity: 0.25, marginBottom: "1rem" },
  emptyText:          { color: "#9ca3af", fontSize: "0.9rem", margin: 0 },
  loadingState:       { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" },
  loadingPulse:       { width: "60px", height: "60px", borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #22c55e)", animation: "pulse 1.2s ease-in-out infinite" },
  resultContent:      { display: "flex", flexDirection: "column", gap: "1rem" },
  riskCard:           { padding: "1rem", borderRadius: "10px" },
  riskTop:            { display: "flex", alignItems: "center", gap: "0.75rem" },
  riskEmoji:          { fontSize: "1.75rem" },
  riskLevel:          { fontSize: "1.1rem", fontWeight: 700 },
  riskMeta:           { fontSize: "0.8rem", color: "#374151", marginTop: "0.2rem" },
  findingsCard:       { background: "#f9fafb", borderRadius: "8px", padding: "1rem", border: "1px solid #e5e7eb" },
  findingsTitle:      { fontSize: "0.9rem", fontWeight: 600, color: "#111827", margin: "0 0 0.75rem 0" },
  findingsList:       { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" },
  findingItem:        { display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.85rem", color: "#374151", lineHeight: 1.5 },
  findingDot:         { width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6", marginTop: "6px", flexShrink: 0 },
  recommendCard:      { background: "#eff6ff", borderRadius: "8px", padding: "1rem", border: "1px solid #bfdbfe" },
  recommendTitle:     { fontSize: "0.9rem", fontWeight: 600, color: "#1d4ed8", margin: "0 0 0.5rem 0" },
  recommendText:      { fontSize: "0.875rem", color: "#374151", margin: 0, lineHeight: 1.6 },
  disclaimerBox:      { background: "#f9fafb", borderRadius: "6px", padding: "0.6rem 0.8rem", border: "1px solid #e5e7eb" },
  resetBtn:           { padding: "0.6rem", background: "white", border: "1px solid #d1d5db", borderRadius: "8px", color: "#374151", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer" },
  bottomDisclaimer:   { background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "1rem 1.25rem", fontSize: "0.85rem", color: "#92400e", textAlign: "center" },
};