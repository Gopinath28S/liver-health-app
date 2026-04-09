import UserProfiles from './UserProfiles';
import HealthCharts from './HealthCharts';
import React, { useState, useEffect } from 'react';
import { Activity, MessageSquare, Camera, TrendingUp, AlertCircle, CheckCircle, Heart, Brain, Eye, Send } from 'lucide-react';
import jsPDF from "jspdf";
import './App.css';
import VisualAnalysis from './VisualAnalysis';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [symptoms, setSymptoms] = useState({
    fatigue: 0,
    abdominalPain: 0,
    nausea: 0,
    appetiteLoss: 0,
    darkUrine: 0,
    paleStool: 0,
    itching: 0,
    yellowSkin: 0
  });
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: "Hello! I'm your AI Liver Health Assistant. I can help you understand liver health, analyze symptoms, and provide guidance. How can I help you today?" }
  ]);
  const [userInput, setUserInput] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // ── Multi-profile state ────────────────────────────────────────────────────
  const DEFAULT_PROFILE = {
    id: "default",
    name: "Self",
    age: "—",
    gender: "—",
    color: "#3b82f6",
    createdAt: new Date().toLocaleDateString()
  };

  const [profiles, setProfiles] = useState(
    () => JSON.parse(localStorage.getItem("profiles")) || [DEFAULT_PROFILE]
  );
  const [currentProfile, setCurrentProfile] = useState(
    () => JSON.parse(localStorage.getItem("currentProfile")) || DEFAULT_PROFILE
  );
  const [healthHistory, setHealthHistory] = useState(
    () => JSON.parse(localStorage.getItem(`healthHistory_${(JSON.parse(localStorage.getItem("currentProfile")) || DEFAULT_PROFILE).id}`)) || []
  );

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(`healthHistory_${currentProfile.id}`)) || [];
    setHealthHistory(saved);
  }, [currentProfile]);
  // ──────────────────────────────────────────────────────────────────────────

  const symptomLabels = {
    fatigue: 'Persistent Fatigue/Weakness',
    abdominalPain: 'Abdominal Pain (Upper Right)',
    nausea: 'Nausea/Vomiting',
    appetiteLoss: 'Loss of Appetite/Weight Loss',
    darkUrine: 'Dark Colored Urine',
    paleStool: 'Pale/Clay Colored Stool',
    itching: 'Persistent Skin Itching',
    yellowSkin: 'Yellow Skin/Eyes (Jaundice)'
  };

  const handleSymptomChange = (symptom, value) => {
    setSymptoms(prev => ({ ...prev, [symptom]: parseInt(value) }));
  };

  const calculateRiskScore = () => {
    const weights = {
      fatigue: 1.2,
      abdominalPain: 2.5,
      nausea: 1.5,
      appetiteLoss: 1.8,
      darkUrine: 3.0,
      paleStool: 2.8,
      itching: 2.2,
      yellowSkin: 3.5
    };
    let totalScore = 0;
    Object.keys(symptoms).forEach(symptom => {
      totalScore += symptoms[symptom] * weights[symptom];
    });
    return Math.min(Math.round(totalScore), 100);
  };

  const callClaudeAPI = async (promptText) => {
    try {
      const response = await fetch("http://172.20.10.2:3001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: promptText })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.reply || `Server responded with status ${response.status}`);
      if (!data.reply) throw new Error("No reply from AI");
      return data.reply;
    } catch (error) {
      throw new Error(`Failed to get AI response: ${error.message}`);
    }
  };

  const callPredictionAPI = async () => {
    const response = await fetch("http://172.20.10.2:3001/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Age: 40, Gender: 1, Total_Bilirubin: 0.9, Direct_Bilirubin: 0.3,
        Alkaline_Phosphotase: 200, SGPT_ALT: 30, SGOT_AST: 40,
        Total_Proteins: 6.5, Albumin: 3.4, Albumin_Globulin_Ratio: 1.1, Platelets: 250
      })
    });
    const data = await response.json();
    return data.prediction;
  };

  const analyzeSymptoms = async () => {
    setIsAnalyzing(true);
    const riskScore = calculateRiskScore();
    const mlPrediction = await callPredictionAPI();
    const activeSymptoms = Object.entries(symptoms)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => `${symptomLabels[key]} (Severity: ${value}/5)`);
    const symptomText = activeSymptoms.length > 0 ? activeSymptoms.join(', ') : 'No significant symptoms reported';

    try {
      const aiAnalysis = await callClaudeAPI(
        `You are a medical AI assistant specializing in liver health. Analyze these symptoms and provide a professional assessment.
ML Prediction Result: ${mlPrediction}
Reported Symptoms: ${symptomText}
Calculated Risk Score: ${riskScore}/100

Please provide:
1. Risk Level
2. Possible Conditions
3. Recommended Actions
4. Lifestyle Modifications
5. When to seek care`
      );

      let riskLevel = "Low Risk";
      if (mlPrediction === "1" || riskScore > 70) riskLevel = "High Risk";
      else if (riskScore >= 40) riskLevel = "Moderate Risk";

      setAnalysisResult({
        riskScore,
        level: riskLevel,
        activeSymptoms: activeSymptoms.length,
        aiAnalysis,
        timestamp: new Date().toLocaleString()
      });

      const newRecord = {
        date: new Date().toISOString().split('T')[0],
        riskScore,
        status: riskLevel
      };

      const existing = JSON.parse(localStorage.getItem(`healthHistory_${currentProfile.id}`)) || [];
      const updatedHistory = [newRecord, ...existing].slice(0, 5);
      localStorage.setItem(`healthHistory_${currentProfile.id}`, JSON.stringify(updatedHistory));
      setHealthHistory(updatedHistory);

    } catch (error) {
      console.error('Analysis error:', error);
      alert('Error analyzing symptoms:\n\n' + error.message);
    }
    setIsAnalyzing(false);
  };

  const sendChatMessage = async () => {
    if (!userInput.trim()) return;
    const newUserMessage = { role: 'user', content: userInput };
    setChatMessages(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsChatLoading(true);
    try {
      const aiResponse = await callClaudeAPI(userInput);
      setChatMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}\n\nPlease check that your backend server is running on port 3001.`
      }]);
    }
    setIsChatLoading(false);
  };

  const downloadReport = () => {
    if (!analysisResult) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("AI Liver Health Report", 20, 20);
    doc.setFontSize(12);
    doc.text(`Risk Level: ${analysisResult.level}`, 20, 40);
    doc.text(`Risk Score: ${analysisResult.riskScore}/100`, 20, 50);
    doc.text(`Date: ${analysisResult.timestamp}`, 20, 60);
    doc.text("AI Doctor Analysis:", 20, 80);
    const splitText = doc.splitTextToSize(analysisResult.aiAnalysis, 170);
    doc.text(splitText, 20, 90);
    doc.save("liver-health-report.pdf");
  };

  // ── Profile handler functions ──────────────────────────────────────────────
  const handleAddProfile = (profile) => {
    const updated = [...profiles, profile];
    setProfiles(updated);
    localStorage.setItem("profiles", JSON.stringify(updated));
  };

  const handleSwitchProfile = (profile) => {
    setCurrentProfile(profile);
    localStorage.setItem("currentProfile", JSON.stringify(profile));
    const saved = JSON.parse(localStorage.getItem(`healthHistory_${profile.id}`)) || [];
    setHealthHistory(saved);
    setAnalysisResult(null);
  };

  const handleDeleteProfile = (id) => {
    const updated = profiles.filter(p => p.id !== id);
    setProfiles(updated);
    localStorage.setItem("profiles", JSON.stringify(updated));
    if (currentProfile.id === id) handleSwitchProfile(updated[0]);
  };
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="app">

      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo"><Activity size={28} /></div>
            <div className="header-text">
              <h1>AI Liver Health Assistant</h1>
              <p>Early Detection • Zero Cost • Real-Time Monitoring</p>
            </div>
          </div>
          <div className="status-badge">
            <CheckCircle size={16} />
            <span>AI Active</span>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="nav">
        <div className="nav-content">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
            { id: 'symptoms', label: 'Symptom Checker', icon: Activity },
            { id: 'chat', label: 'AI Chat', icon: MessageSquare },
            { id: 'vision', label: 'Visual Analysis', icon: Camera }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="dashboard">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <h3>Current Risk Level</h3>
                  <Heart size={24} className="stat-icon green" />
                </div>
                <div className={`stat-value ${analysisResult?.level.toLowerCase().replace(' ', '-')}`}>
                  {analysisResult ? analysisResult.level : 'Not Assessed'}
                </div>
                <p className="stat-subtitle">Last check: {analysisResult ? analysisResult.timestamp : 'Never'}</p>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <h3>Risk Score</h3>
                  <Brain size={24} className="stat-icon blue" />
                </div>
                <div className="stat-value blue">
                  {analysisResult ? `${analysisResult.riskScore}/100` : '--'}
                </div>
                <p className="stat-subtitle">AI-powered analysis</p>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <h3>Active Symptoms</h3>
                  <AlertCircle size={24} className="stat-icon orange" />
                </div>
                <div className="stat-value orange">
                  {analysisResult ? analysisResult.activeSymptoms : 0}
                </div>
                <p className="stat-subtitle">Reported symptoms</p>
              </div>
            </div>

            <UserProfiles
              currentProfile={currentProfile}
              profiles={profiles}
              onSwitch={handleSwitchProfile}
              onAdd={handleAddProfile}
              onDelete={handleDeleteProfile}
            />
            <HealthCharts
              healthHistory={healthHistory}
              symptoms={symptoms}
              analysisResult={analysisResult}
            />
          </div>
        )}

        {/* Symptoms */}
        {activeTab === 'symptoms' && (
          <div className="symptoms-page">
            <div className="symptoms-input">
              <h2>Rate Your Symptoms</h2>
              <div className="symptom-sliders">
                {Object.entries(symptomLabels).map(([key, label]) => (
                  <div key={key} className="symptom-item">
                    <div className="symptom-header">
                      <label>{label}</label>
                      <span className="symptom-value">{symptoms[key]}/5</span>
                    </div>
                    <input
                      type="range" min="0" max="5"
                      value={symptoms[key]}
                      onChange={(e) => handleSymptomChange(key, e.target.value)}
                      className="symptom-slider"
                    />
                    <div className="symptom-labels">
                      <span>None</span>
                      <span>Severe</span>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={analyzeSymptoms} disabled={isAnalyzing} className="analyze-btn">
                {isAnalyzing ? 'Analyzing with AI...' : 'Analyze Symptoms with AI'}
              </button>
            </div>

            <div className="analysis-results">
              <h2>AI Analysis Results</h2>
              {analysisResult ? (
                <div className="results-content">
                  <div className={`risk-card ${analysisResult.level.toLowerCase().replace(' ', '-')}`}>
                    <h3><Eye size={20} /> Risk Assessment</h3>
                    <div className="risk-level">{analysisResult.level}</div>
                    <div className="risk-score">Score: {analysisResult.riskScore}/100</div>
                    <div className="risk-meter">
                      <div
                        className={`risk-bar ${analysisResult.level.toLowerCase().replace(' ', '-')}`}
                        style={{ width: `${analysisResult.riskScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="ai-analysis-card">
                    <h3><Brain size={20} /> AI Medical Analysis</h3>
                    <div className="analysis-text">{analysisResult.aiAnalysis}</div>
                    <button onClick={downloadReport} className="download-btn">
                      Download Report (PDF)
                    </button>
                  </div>

                  <div className="disclaimer">
                    ⚠️ This is an AI-powered assessment tool. Always consult healthcare professionals for medical decisions.
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <Brain size={48} />
                  <p>Complete the symptom assessment to receive AI-powered analysis</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat */}
        {activeTab === 'chat' && (
          <div className="chat-container">
            <div className="chat-header">
              <h2>24/7 AI Health Coach</h2>
              <p>Ask me anything about liver health, symptoms, diet, and lifestyle</p>
            </div>
            <div className="chat-messages">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`message ${msg.role}`}>
                  <div className="message-content">{msg.content}</div>
                </div>
              ))}
              {isChatLoading && (
                <div className="message assistant">
                  <div className="message-content loading">Thinking...</div>
                </div>
              )}
            </div>
            <div className="chat-input">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isChatLoading && sendChatMessage()}
                placeholder="Ask about symptoms, diet, lifestyle..."
                disabled={isChatLoading}
              />
              <button onClick={sendChatMessage} disabled={isChatLoading || !userInput.trim()} className="send-btn">
                <Send size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Visual Analysis */}
        {activeTab === 'vision' && <VisualAnalysis />}

      </main>
    </div>
  );
}

export default App;