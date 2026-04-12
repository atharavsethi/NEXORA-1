import React, { useState, useEffect, useRef } from 'react';
import './MediGuide.css';

// ─── Gemini API Call ────────────────────────────────────────────────────────
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are MediGuide, a friendly and conversational AI assistant embedded on the homepage of a comprehensive medical website called "Swasth Samaj" — a platform that includes a hospital/clinic, pharmacy, health & wellness services, doctors lounge, blood SOS service, community health forum, and a medical information blog.

Your primary roles are:
1. Help users navigate the website
2. Answer general medical questions
3. Escalate to a human agent when needed

PERSONALITY & TONE:
- Be warm, friendly, and conversational — like a helpful receptionist who also knows medicine
- Use simple, easy-to-understand language. Avoid heavy medical jargon unless the user initiates it
- Always be empathetic, especially when users describe symptoms or health concerns
- Keep responses concise but helpful. Avoid long walls of text
- Use relevant emojis naturally to keep the tone warm and approachable

WEBSITE NAVIGATION — Swasth Samaj has these pages:
- / (Home/Landing)
- /doctors — Browse verified doctors and specialists
- /hospitals — Find nearby hospitals
- /blood-sos — Emergency blood request service
- /forum — Community health Q&A forum
- /lounge — Doctor's Lounge (verified doctors' professional community)
- /login and /register — User accounts
- /profile — User profile
- /my-consultations — Your booked consultations
- /private-chats — Secure private messaging with doctors
- /faqs — Frequently asked questions
- /help — Help & support center
- /apply-verification — Apply for doctor/student verification

When navigating, always mention the relevant section by name and say the user can find it in the menu or by clicking the link.

GENERAL MEDICAL QUESTIONS:
- Answer general health and medical FAQs such as symptoms, medications, wellness tips, and when to see a doctor
- Always include a disclaimer when answering medical questions: "⚠️ Please note: This is general health information only — not a substitute for professional medical advice. Always consult a qualified doctor for diagnosis or treatment."
- Never diagnose a condition or prescribe medication
- For emergencies (e.g., chest pain, difficulty breathing, stroke symptoms, severe injury), immediately respond with: "🚨 This sounds like it could be a medical emergency. Please call emergency services (112 in India) or go to the nearest emergency room immediately!"

ESCALATION TO HUMAN AGENT:
- If a user asks to speak to a doctor, receptionist, or human, trigger escalation by including the exact phrase [HUMAN_HANDOFF] at the END of your response (the UI will handle this). Also say: "Of course! Let me connect you with our team. A team member will be with you shortly. 🙏"
- Escalate automatically if the user expresses distress or urgency, or asks questions too specific/clinical for a general answer.

BOUNDARIES:
- Do not discuss topics unrelated to health, wellness, or website navigation
- Do not share personal medical records or sensitive data
- Do not make promises about wait times, pricing, or doctor availability

FALLBACK:
- If you don't know an answer, say: "That's a great question! I don't have that information right now, but our team can help. Would you like me to connect you with someone? 😊"

LANGUAGE:
- Default to English
- If the user writes in Hindi or another Indian language, respond in that same language warmly`;

async function callGemini(chatHistory) {
  if (!GEMINI_API_KEY) {
    return getFallbackResponse(chatHistory[chatHistory.length - 1]?.parts?.[0]?.text || '');
  }

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: chatHistory,
    generationConfig: {
      temperature: 0.75,
      maxOutputTokens: 512,
      topP: 0.9,
    },
  };

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error('API error');
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process that. Please try again.";
}

// ─── Fallback responses (when no API key) ────────────────────────────────────
function getFallbackResponse(userText) {
  const text = userText.toLowerCase();

  const emergencyKeywords = ['chest pain', 'can\'t breathe', 'stroke', 'heart attack', 'unconscious', 'bleeding heavily', 'seizure'];
  if (emergencyKeywords.some(k => text.includes(k))) {
    return '🚨 This sounds like it could be a medical emergency. Please call emergency services (112 in India) or go to the nearest emergency room immediately!';
  }

  const humanKeywords = ['speak to', 'talk to', 'human', 'doctor', 'receptionist', 'real person', 'connect me'];
  if (humanKeywords.some(k => text.includes(k))) {
    return "Of course! Let me connect you with our team. A team member will be with you shortly. 🙏 [HUMAN_HANDOFF]";
  }

  if (text.includes('blood') || text.includes('donate')) {
    return "We have a Blood SOS service! 🩸 You can find it at **/blood-sos** in the navigation menu. It lets you request blood urgently or register as a donor. Would you like to know more?";
  }

  if (text.includes('doctor') || text.includes('specialist')) {
    return "You can browse our verified doctors and specialists at **/doctors** 👨‍⚕️. Each profile shows their specialization, experience, and available slots for consultations. Would you like help booking an appointment?";
  }

  if (text.includes('appointment') || text.includes('book') || text.includes('consult')) {
    return "To book a consultation, head to the **Doctors** section, pick a doctor, and click 'Book Consultation'. You'll need to be logged in. Would you like me to guide you there? 😊";
  }

  if (text.includes('hospital')) {
    return "You can find nearby hospitals at **/hospitals** 🏥. The page shows hospitals in your area with contact details and services offered.";
  }

  if (text.includes('forum') || text.includes('question')) {
    return "Our community Health Forum is at **/forum** 💬. You can browse health questions answered by verified doctors and medical students, or post your own question!";
  }

  if (text.includes('fever') || text.includes('cold') || text.includes('flu')) {
    return "For fever, cold, or flu, here are some general tips: Stay hydrated, get plenty of rest, and use over-the-counter fever reducers if needed. \n\n⚠️ Please note: This is general health information — always consult a doctor if symptoms persist or worsen.";
  }

  return "That's a great question! I don't have that information right now, but our team can help. Would you like me to connect you with someone? 😊";
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MediGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [handoffTriggered, setHandoffTriggered] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [pulse, setPulse] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Stop pulsing after 10 seconds
  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 10000);
    return () => clearTimeout(t);
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setPulse(false);
    if (!hasOpened) {
      setHasOpened(true);
      // Show greeting only on first open
      setTimeout(() => {
        setMessages([{
          role: 'assistant',
          text: "Hi there! 👋 Welcome! I'm MediGuide. I can help you find your way around, answer health questions, or connect you with our team. What can I help you with today?",
          time: new Date(),
        }]);
      }, 400);
    }
  };

  const handleClose = () => setIsOpen(false);

  const sendMessageText = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMsg = { role: 'user', text: trimmed, time: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    try {
      const history = newMessages
        .filter(m => m.role === 'user' || (m.role === 'assistant' && newMessages.indexOf(m) > 0))
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.text }],
        }));

      const rawResponse = await callGemini(history);

      let cleanResponse = rawResponse;
      let triggeredHandoff = false;

      if (rawResponse.includes('[HUMAN_HANDOFF]')) {
        cleanResponse = rawResponse.replace('[HUMAN_HANDOFF]', '').trim();
        triggeredHandoff = true;
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        text: cleanResponse,
        time: new Date(),
        handoff: triggeredHandoff,
      }]);

      if (triggeredHandoff) setHandoffTriggered(true);
    } catch (err) {
      const fallback = getFallbackResponse(trimmed);
      const isHandoff = fallback.includes('[HUMAN_HANDOFF]');
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: fallback.replace('[HUMAN_HANDOFF]', '').trim(),
        time: new Date(),
        handoff: isHandoff,
      }]);
      if (isHandoff) setHandoffTriggered(true);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = () => sendMessageText(input);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date) => {
    return date?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const quickReplies = [
    { label: '🩸 Blood SOS', text: 'How do I use the Blood SOS service?' },
    { label: '👨‍⚕️ Find Doctors', text: 'How can I find a doctor?' },
    { label: '📅 Book Appointment', text: 'How do I book a consultation?' },
    { label: '🏥 Hospitals', text: 'How do I find nearby hospitals?' },
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      <div className={`mg-fab-wrapper ${pulse ? 'mg-pulse' : ''}`}>
        {!isOpen && (
          <div className="mg-fab-tooltip">Chat with MediGuide 💬</div>
        )}
        <button
          className={`mg-fab ${isOpen ? 'mg-fab--open' : ''}`}
          onClick={isOpen ? handleClose : handleOpen}
          aria-label="Open MediGuide chat"
          id="mediguide-fab-btn"
        >
          {isOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <circle cx="9" cy="10" r="1" fill="currentColor" />
              <circle cx="12" cy="10" r="1" fill="currentColor" />
              <circle cx="15" cy="10" r="1" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>

      {/* Chat Window */}
      <div className={`mg-window ${isOpen ? 'mg-window--open' : ''}`} id="mediguide-chat-window">

        {/* Header */}
        <div className="mg-header">
          <div className="mg-header-avatar">
            <span>🩺</span>
            <div className="mg-online-dot" />
          </div>
          <div className="mg-header-info">
            <h4>MediGuide</h4>
            <span>{handoffTriggered ? 'Connecting to team...' : 'AI Health Assistant'}</span>
          </div>
          <button className="mg-header-close" onClick={handleClose} aria-label="Close chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="mg-messages" id="mediguide-messages">
          {messages.length === 0 && (
            <div className="mg-empty">
              <span>🩺</span>
              <p>Opening chat...</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`mg-bubble-row ${msg.role === 'user' ? 'mg-bubble-row--user' : 'mg-bubble-row--bot'}`}>
              {msg.role === 'assistant' && (
                <div className="mg-bot-avatar">🩺</div>
              )}
              <div className="mg-bubble-col">
                <div className={`mg-bubble ${msg.role === 'user' ? 'mg-bubble--user' : 'mg-bubble--bot'}`}>
                  <MsgText text={msg.text} />
                  {msg.handoff && (
                    <div className="mg-handoff-notice">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.23a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.48h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17z" /></svg>
                      Connecting to a human agent...
                    </div>
                  )}
                </div>
                <span className="mg-time">{formatTime(msg.time)}</span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="mg-bubble-row mg-bubble-row--bot">
              <div className="mg-bot-avatar">🩺</div>
              <div className="mg-bubble mg-bubble--bot mg-typing">
                <span /><span /><span />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies (only when no messages from user yet) */}
        {messages.length > 0 && messages.filter(m => m.role === 'user').length === 0 && (
          <div className="mg-quick-replies">
            {quickReplies.map((q, i) => (
              <button key={i} className="mg-quick-btn" onClick={() => sendMessageText(q.text)}>
                {q.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="mg-input-area">
          <textarea
            ref={inputRef}
            className="mg-input"
            placeholder="Type your message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            id="mediguide-input"
            disabled={handoffTriggered}
          />
          <button
            className="mg-send-btn"
            onClick={sendMessage}
            disabled={!input.trim() || isTyping || handoffTriggered}
            id="mediguide-send-btn"
            aria-label="Send message"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>

        <div className="mg-footer">
          <span>⚡ Powered by Swasth Samaj AI</span>
        </div>
      </div>

      {/* Dark overlay on mobile */}
      {isOpen && <div className="mg-overlay" onClick={handleClose} />}
    </>
  );
}

// ─── Render formatted text with bold/line-breaks ──────────────────────────────
function MsgText({ text }) {
  const lines = text.split('\n');
  return (
    <p>
      {lines.map((line, i) => {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <React.Fragment key={i}>
            {parts.map((part, j) =>
              j % 2 === 1 ? <strong key={j}>{part}</strong> : part
            )}
            {i < lines.length - 1 && <br />}
          </React.Fragment>
        );
      })}
    </p>
  );
}
