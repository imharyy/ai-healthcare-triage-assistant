import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSend, FiTrash2, FiAlertTriangle, FiAlertCircle, FiClipboard, FiHeart, FiStar, FiClock, FiDollarSign, FiUser, FiChevronDown, FiChevronUp, FiActivity, FiThermometer } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './AIAssistant.css';

const urgencyIcons = {
  emergency: <FiAlertTriangle />,
  urgent: <FiAlertCircle />,
  'non-urgent': <FiClipboard />,
  'self-care': <FiHeart />
};

const quickSymptoms = [
  'I have a headache and fever',
  'I feel chest pain',
  'I have a cough and cold',
  'I feel dizzy and nauseous',
  'I have back pain',
  'I feel anxious and stressed',
  'I have stomach pain',
  'I have a skin rash'
];

const AIAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [expandedDoctors, setExpandedDoctors] = useState({});
  const [showSymptomPicker, setShowSymptomPicker] = useState(false);
  const [symptomCategories, setSymptomCategories] = useState({});
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      type: 'welcome',
      content: "Hello! I'm your HealHub AI Health Assistant. 👋\n\nI can help you:\n• Assess the urgency of your symptoms\n• Suggest possible conditions\n• Recommend medications and self-care tips\n• Find specialist doctors for your needs\n\nPlease describe your symptoms and I'll provide a preliminary assessment.\n\n⚠️ **Disclaimer:** This is not a substitute for professional medical advice. Always consult a healthcare professional for proper diagnosis.",
      timestamp: new Date()
    }]);

    // Fetch symptom categories
    fetchSymptomList();
  }, []);

  const fetchSymptomList = async () => {
    try {
      const { data } = await api.get('/api/ai-assistant/symptom-list');
      if (data.success) {
        setSymptomCategories(data.data.categories || {});
      }
    } catch (err) {
      // silently fail
    }
  };

  const handleSend = useCallback(async (messageText) => {
    const text = messageText || input.trim();
    if (!text || loading) return;

    const userMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/api/ai-assistant/analyze', {
        message: text,
        conversationId
      });

      if (data.success) {
        setConversationId(data.data.conversationId);

        const assistantMessage = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          type: data.data.response.type,
          content: data.data.response.message,
          assessment: data.data.response.assessment || null,
          followUpQuestions: data.data.response.followUpQuestions || [],
          urgencyInfo: data.data.urgencyInfo || null,
          recommendedDoctors: data.data.recommendedDoctors || [],
          timestamp: data.data.timestamp
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      const errorMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        type: 'error',
        content: 'Sorry, I encountered an error analyzing your symptoms. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to analyze symptoms');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, conversationId]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearConversation = async () => {
    if (conversationId) {
      try {
        await api.delete(`/api/ai-assistant/conversation/${conversationId}`);
      } catch (e) { /* ignore */ }
    }
    setConversationId(null);
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      type: 'welcome',
      content: "Conversation cleared. How can I help you? Please describe your symptoms.",
      timestamp: new Date()
    }]);
  };

  const toggleDoctorExpand = (msgId) => {
    setExpandedDoctors(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const bookAppointment = (doctorId) => {
    navigate('/patient/book-appointment', { state: { doctorId } });
  };

  const renderUrgencyBadge = (assessment, urgencyInfo) => {
    if (!assessment || !urgencyInfo) return null;
    return (
      <div className={`urgency-banner urgency-${assessment.urgencyLevel}`}>
        <div className="urgency-header">
          <span className="urgency-icon">{urgencyIcons[assessment.urgencyLevel]}</span>
          <span className="urgency-level">{urgencyInfo.level}</span>
        </div>
        <p className="urgency-description">{urgencyInfo.description}</p>
        <p className="urgency-action"><strong>Action:</strong> {urgencyInfo.actionRequired}</p>
      </div>
    );
  };

  const renderAssessment = (msg) => {
    const { assessment } = msg;
    if (!assessment) return null;

    return (
      <div className="assessment-container">
        {renderUrgencyBadge(assessment, msg.urgencyInfo)}

        {/* Identified Symptoms */}
        {assessment.identifiedSymptoms?.length > 0 && (
          <div className="assessment-section">
            <h4><FiThermometer /> Identified Symptoms</h4>
            <div className="symptom-tags">
              {assessment.identifiedSymptoms.map((s, i) => (
                <span key={i} className="symptom-tag">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Possible Conditions */}
        {assessment.possibleConditions?.length > 0 && (
          <div className="assessment-section">
            <h4><FiActivity /> Possible Conditions</h4>
            <ul className="conditions-list">
              {assessment.possibleConditions.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Medications */}
        {assessment.medications?.length > 0 && (
          <div className="assessment-section">
            <h4>💊 Suggested Medications</h4>
            <div className="medications-list">
              {assessment.medications.map((med, i) => (
                <div key={i} className="medication-card">
                  <div className="med-name">{med.name}</div>
                  <div className="med-purpose">{med.purpose}</div>
                  {med.dosage && med.dosage !== 'N/A' && (
                    <div className="med-dosage"><strong>Dosage:</strong> {med.dosage}</div>
                  )}
                  {med.note && (
                    <div className="med-note">⚠️ {med.note}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Self-care Tips */}
        {assessment.selfCareTips?.length > 0 && (
          <div className="assessment-section">
            <h4>🏠 Self-Care Tips</h4>
            <ul className="tips-list">
              {assessment.selfCareTips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Warning Signs */}
        {assessment.warningSignsToWatch?.length > 0 && (
          <div className="assessment-section warning-section">
            <h4><FiAlertTriangle /> Warning Signs to Watch</h4>
            <ul className="warning-list">
              {assessment.warningSignsToWatch.map((sign, i) => (
                <li key={i}>{sign}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimer */}
        {assessment.disclaimer && (
          <div className="assessment-disclaimer">
            <p>⚕️ {assessment.disclaimer}</p>
          </div>
        )}
      </div>
    );
  };

  const renderDoctors = (msg) => {
    if (!msg.recommendedDoctors || msg.recommendedDoctors.length === 0) return null;
    const isExpanded = expandedDoctors[msg.id];
    const displayDoctors = isExpanded ? msg.recommendedDoctors : msg.recommendedDoctors.slice(0, 3);

    return (
      <div className="doctors-section">
        <h4><FiUser /> Recommended Specialist Doctors</h4>
        <div className="doctors-grid">
          {displayDoctors.map((doc, i) => (
            <div key={i} className="doctor-card">
              <div className="doctor-header">
                <div className="doctor-avatar">
                  {doc.profilePhoto ? (
                    <img src={doc.profilePhoto} alt={doc.name} />
                  ) : (
                    <span>{doc.name.charAt(4)}</span>
                  )}
                </div>
                <div className="doctor-info">
                  <h5>{doc.name}</h5>
                  <p className="doctor-spec">{doc.specialization}</p>
                </div>
              </div>
              <div className="doctor-details">
                {doc.experience > 0 && (
                  <span className="doctor-detail"><FiClock /> {doc.experience} yrs exp</span>
                )}
                {doc.rating > 0 && (
                  <span className="doctor-detail"><FiStar /> {doc.rating.toFixed(1)} ({doc.totalRatings})</span>
                )}
                {doc.fee > 0 && (
                  <span className="doctor-detail"><FiDollarSign /> ₹{doc.fee}</span>
                )}
              </div>
              {doc.hospital?.name && (
                <p className="doctor-hospital">{doc.hospital.name}</p>
              )}
              {doc.qualifications?.length > 0 && (
                <p className="doctor-quals">{doc.qualifications.join(', ')}</p>
              )}
              <button className="book-btn" onClick={() => bookAppointment(doc.id)}>
                Book Appointment
              </button>
            </div>
          ))}
        </div>
        {msg.recommendedDoctors.length > 3 && (
          <button className="toggle-doctors-btn" onClick={() => toggleDoctorExpand(msg.id)}>
            {isExpanded ? <><FiChevronUp /> Show Less</> : <><FiChevronDown /> Show {msg.recommendedDoctors.length - 3} More Doctors</>}
          </button>
        )}
      </div>
    );
  };

  const renderMessage = (msg) => {
    if (msg.role === 'user') {
      return (
        <div key={msg.id} className="message-row user-row">
          <div className="message user-message">
            <p>{msg.content}</p>
            <span className="message-time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      );
    }

    return (
      <div key={msg.id} className="message-row assistant-row">
        <div className="assistant-avatar">
          <FiActivity />
        </div>
        <div className="message assistant-message">
          <div className="message-content">
            {msg.content.split('\n').map((line, i) => (
              <p key={i}>{line.replace(/\*\*(.*?)\*\*/g, '').replace(/•/g, '•')}</p>
            ))}
          </div>

          {/* Follow-up questions */}
          {msg.followUpQuestions?.length > 0 && (
            <div className="followup-questions">
              {msg.followUpQuestions.map((q, i) => (
                <button key={i} className="followup-btn" onClick={() => handleSend(q)}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Assessment details */}
          {msg.type === 'assessment' && renderAssessment(msg)}

          {/* Recommended doctors */}
          {msg.type === 'assessment' && renderDoctors(msg)}

          <span className="message-time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="ai-assistant-page">
      <div className="ai-assistant-container">
        {/* Header */}
        <div className="ai-header">
          <div className="ai-header-left">
            <div className="ai-logo">
              <FiActivity />
            </div>
            <div>
              <h2>AI Health Assistant</h2>
              <p>Powered by HealHub AI • Describe your symptoms for assessment</p>
            </div>
          </div>
          <button className="clear-btn" onClick={clearConversation} title="New conversation">
            <FiTrash2 /> New Chat
          </button>
        </div>

        {/* Messages */}
        <div className="messages-container">
          {messages.map(msg => renderMessage(msg))}

          {loading && (
            <div className="message-row assistant-row">
              <div className="assistant-avatar">
                <FiActivity />
              </div>
              <div className="message assistant-message">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                  Analyzing your symptoms...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick symptoms */}
        {messages.length <= 1 && (
          <div className="quick-symptoms">
            <p className="quick-label">Quick Start — Click a symptom:</p>
            <div className="quick-chips">
              {quickSymptoms.map((s, i) => (
                <button key={i} className="quick-chip" onClick={() => handleSend(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="input-area">
          <div className="input-wrapper">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe your symptoms... (e.g., I have a headache and fever for 2 days)"
              rows={1}
              disabled={loading}
            />
            <button
              className="send-btn"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
            >
              <FiSend />
            </button>
          </div>
          <p className="input-disclaimer">
            AI assessment is for informational purposes only. Not a substitute for medical advice.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
