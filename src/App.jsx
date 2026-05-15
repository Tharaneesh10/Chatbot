import { useEffect, useRef, useState } from "react";
import { ConvaiClient } from "convai-web-sdk";
import "./App.css";

function App() {
  const convaiClient = useRef(null);
  const recognitionRef = useRef(null);
  const chatBodyRef = useRef(null);
  const transcriptRef = useRef("");
  const voiceModeRef = useRef(false);
  const speakTimerRef = useRef(null);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);

  useEffect(() => {
    convaiClient.current = new ConvaiClient({
      apiKey: "b54c82e382c04b82ffe54af484dfdcd1",
      characterId: "880da112-30b6-11f1-b187-42010a7be02c",

      // ✅ Stop Convai auto voice
      enableAudio: false,
      textOnlyResponse: true,
      micUsage: false,
    });

    convaiClient.current.setResponseCallback((response) => {
      let botText = "";

      if (response.hasTextResponse && response.hasTextResponse()) {
        const textResponse = response.getTextResponse();
        botText =
          textResponse?.getTextData?.() ||
          textResponse?.getText?.() ||
          textResponse?.text ||
          "";
      }

      if (response.hasAudioResponse && response.hasAudioResponse()) {
        botText = response.getAudioResponse().getTextData();
      }

      if (!botText) return;

      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];

        if (lastMsg && lastMsg.sender === "bot") {
          return [
            ...prev.slice(0, -1),
            { ...lastMsg, text: lastMsg.text + " " + botText },
          ];
        }

        return [...prev, { sender: "bot", text: botText }];
      });

      // ✅ Auto voice ONLY if user spoke
      if (voiceModeRef.current) {
        clearTimeout(speakTimerRef.current);

        speakTimerRef.current = setTimeout(() => {
          setMessages((latest) => {
            const lastBotIndex = latest
              .map((m) => m.sender)
              .lastIndexOf("bot");

            if (lastBotIndex !== -1) {
              speakText(latest[lastBotIndex].text, lastBotIndex);
            }

            voiceModeRef.current = false;
            return latest;
          });
        }, 900);
      }
    });
  }, []);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    voiceModeRef.current = false; // ✅ typed message = no auto voice

    const userText = input.trim();
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);

    convaiClient.current.sendTextChunk(userText + "\n");
    setInput("");
  };

  const startVoice = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported. Use Google Chrome.");
      return;
    }

    transcriptRef.current = "";
    voiceModeRef.current = true;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognitionRef.current = recognition;
    setIsListening(true);

    recognition.onresult = (event) => {
      let transcript = "";

      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      transcriptRef.current = transcript.trim();
      setInput(transcript.trim());
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const stopVoice = () => {
    setIsListening(false);

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setTimeout(() => {
      const userText = transcriptRef.current.trim();

      if (!userText) return;

      setMessages((prev) => [...prev, { sender: "user", text: userText }]);

      convaiClient.current.sendTextChunk(userText + "\n");

      setInput("");
      transcriptRef.current = "";
    }, 500);
  };

  const speakText = (text, index) => {
  if (speakingIndex === index) {
    window.speechSynthesis.cancel();
    setSpeakingIndex(null);
    return;
  }

  window.speechSynthesis.cancel();

  const speech = new SpeechSynthesisUtterance(text);

  // Tamil voice support
  speech.lang = /[\u0B80-\u0BFF]/.test(text) ? "ta-IN" : "en-US";

  speech.rate = 1;

  speech.onend = () => {
    setSpeakingIndex(null);
  };

  setSpeakingIndex(index);
  window.speechSynthesis.speak(speech);
};

  return (
    <div className="chat-page">
      <div className="chat-header">
        <h2>Alexa Chatbot</h2>
        <p>{isListening ? "Listening..." : "Convai AI Assistant"}</p>
      </div>

      <div className="chat-body" ref={chatBodyRef}>
        {messages.length === 0 && (
          <div className="welcome">
            <h1>How can I help you today?</h1>
            <p>Type or hold mic and speak.</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            <div className="bubble">
              {msg.text}

              {msg.sender === "bot" && (
                <button
                  className="voice-btn"
                  onClick={() => speakText(msg.text, index)}
                >
                  {speakingIndex === index ? "⏹️" : "🔊"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="chat-input-area">
        <input
          value={input}
          placeholder="Message Alexa..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <button
          className={isListening ? "mic-btn listening" : "mic-btn"}
          onMouseDown={startVoice}
          onMouseUp={stopVoice}
          onTouchStart={startVoice}
          onTouchEnd={stopVoice}
        >
          {isListening ? "🎙️ Listening" : "🎤 Hold"}
        </button>

        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default App;