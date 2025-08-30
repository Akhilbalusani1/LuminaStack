"use client";
import { useMemo, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, MicOff, Play, Pause, Volume2 } from "lucide-react";

export default function Home() {
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000", []);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [currentOutput, setCurrentOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState("en-US-natalie");
  const [conversationHistory, setConversationHistory] = useState<Array<{type: 'user' | 'assistant', content: string}>>([]);
  const [isListening, setIsListening] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<string[]>([]);
  const [voiceInputMode, setVoiceInputMode] = useState(false);
  const [aiAskingQuestion, setAiAskingQuestion] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log("🎤 Voice transcript:", transcript);
        
        if (voiceInputMode) {
          handleVoiceInput(transcript);
        } else {
          setPrompt(transcript);
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        // Handle specific error types
        if (event.error === 'no-speech') {
          setError("No speech detected. Please try speaking again.");
        } else if (event.error === 'audio-capture') {
          setError("Microphone access denied. Please allow microphone access.");
        } else if (event.error === 'not-allowed') {
          setError("Microphone permission denied. Please enable microphone access.");
        } else {
          setError(`Speech recognition error: ${event.error}. Please try again.`);
        }
        
        // Clear error after 5 seconds
        setTimeout(() => setError(null), 5000);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setError(null); // Clear any previous errors
      };
    } else {
      setError("Speech recognition not supported in this browser. Please use Chrome or Edge.");
    }
  }, []);

  // Test backend connection on component mount
  useEffect(() => {
    const testBackendConnection = async () => {
      try {
        console.log("🔍 Testing backend connection...");
        const response = await fetch(`${apiBase}/health`);
        if (response.ok) {
          const data = await response.json();
          console.log("✅ Backend connected:", data);
          if (!data.murf_configured) {
            setError("⚠️ MURF_API_KEY not configured. TTS will not work until you set the API key.");
          }
        } else {
          console.error("❌ Backend health check failed:", response.status);
          setError("❌ Backend server not responding. Make sure Flask is running on port 5000.");
        }
      } catch (err) {
        console.error("❌ Backend connection failed:", err);
        setError("❌ Cannot connect to backend. Make sure Flask server is running on port 5000.");
      }
    };
    
    testBackendConnection();
  }, [apiBase]);

  // Auto-narrate when output is generated
  useEffect(() => {
    if (currentOutput && !audioUrl) {
      handleNarrate(currentOutput);
    }
  }, [currentOutput, audioUrl]);


  // Ask for doubts after narration completes
  useEffect(() => {
    if (audioUrl && !aiAskingQuestion) {
      const timer = setTimeout(() => {
        askForDoubts();
      }, 2000); // Wait 2 seconds after audio loads
      return () => clearTimeout(timer);
    }
  }, [audioUrl, aiAskingQuestion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setError(null);
    setLoading(true);
    setCurrentOutput("");
    setAudioUrl(null);
    setConversationHistory([]);
    
    try {
      const response = await fetch(`${apiBase}/api/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: prompt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to generate response");
      
      const output = data.workflow || "No workflow generated";
      setCurrentOutput(output);
      setConversationHistory(prev => [...prev, { type: 'user', content: prompt }, { type: 'assistant', content: output }]);
      setPrompt(""); // Clear input after processing
      setSessionActive(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleNarrate = async (text: string) => {
    if (!text || typeof text !== 'string' || !text.trim()) return;
    setError(null);
    setTtsLoading(true);
    
    try {
      // Use Web Speech API for immediate TTS
      if ('speechSynthesis' in window) {
        console.log("🎤 Using Web Speech API for TTS with text:", text.substring(0, 100) + "...");
        
        // Cancel any ongoing speech
        speechSynthesis.cancel();
        
        // Wait for voices to load
        const getVoices = () => {
          return new Promise<SpeechSynthesisVoice[]>((resolve) => {
            let voices = speechSynthesis.getVoices();
            if (voices.length > 0) {
              resolve(voices);
            } else {
              speechSynthesis.onvoiceschanged = () => {
                voices = speechSynthesis.getVoices();
                resolve(voices);
              };
            }
          });
        };
        
        const voices = await getVoices();
        console.log("Available voices:", voices.length);
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        // Set voice based on voiceId
        if (voiceId === 'en-US-matthew') {
          const maleVoice = voices.find(voice => 
            voice.name.toLowerCase().includes('male') || 
            voice.name.toLowerCase().includes('david') ||
            voice.name.toLowerCase().includes('mark')
          );
          if (maleVoice) {
            utterance.voice = maleVoice;
            console.log("Using male voice:", maleVoice.name);
          }
        } else {
          const femaleVoice = voices.find(voice => 
            voice.name.toLowerCase().includes('female') || 
            voice.name.toLowerCase().includes('zira') ||
            voice.name.toLowerCase().includes('susan')
          );
          if (femaleVoice) {
            utterance.voice = femaleVoice;
            console.log("Using female voice:", femaleVoice.name);
          }
        }
        
        utterance.onstart = () => {
          console.log("🎤 Speech started successfully");
          setTtsLoading(false);
        };
        
        utterance.onend = () => {
          console.log("🎤 Speech ended");
        };
        
        utterance.onerror = (event) => {
          console.error("🎤 Speech error:", event.error);
          setError(`Speech Error: ${event.error}`);
          setTtsLoading(false);
        };
        
        console.log("🎤 Starting speech synthesis...");
        speechSynthesis.speak(utterance);
        
      } else {
        throw new Error("Speech synthesis not supported in this browser");
      }
    } catch (err: any) {
      console.error("🎤 TTS error:", err);
      setError(`TTS Error: ${err.message || "Something went wrong"}`);
      setTtsLoading(false);
    }
  };

  const askForDoubts = async () => {
    const question = "Do you have any doubts or questions? Please speak your response.";
    setAiAskingQuestion(true);
    setConversationHistory(prev => [...prev, { type: 'assistant', content: question }]);
    
    // Narrate the question
    await handleNarrate(question);
    
    // Start listening for response after a short delay
    setTimeout(() => {
      startListening();
    }, 1000);
  };

  const handleVoiceInput = async (transcript: string) => {
    console.log("🎤 Voice input:", transcript);
    
    const exitCommands = ['quit', 'exit', 'stop', 'end', 'goodbye', 'bye'];
    if (exitCommands.some(cmd => transcript.toLowerCase().includes(cmd))) {
      handleExit();
      return;
    }

    setConversationHistory(prev => [...prev, { type: 'user', content: transcript }]);
    
    try {
      const response = await fetch(`${apiBase}/api/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: transcript }),
      });

      if (!response.ok) throw new Error(`Failed: ${response.status}`);

      const data = await response.json();
      const aiResponse = data.workflow || "I couldn't generate a response.";
      
      setConversationHistory(prev => [...prev, { type: 'assistant', content: aiResponse }]);
      setCurrentOutput(aiResponse);
      
      await handleNarrate(aiResponse);
      
    } catch (err) {
      const errorResponse = "I'm experiencing technical difficulties.";
      setConversationHistory(prev => [...prev, { type: 'assistant', content: errorResponse }]);
    }
  };

  const startListening = () => {
    if (!recognitionRef.current) return;
    setIsListening(true);
    setError(null);
    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    
    setIsListening(false);
    recognitionRef.current.stop();
  };

  const startVoiceInput = () => {
    setVoiceInputMode(true);
    setSessionActive(true);
    startListening();
  };

  const resetConversation = () => {
    setPrompt("");
    setCurrentOutput("");
    setAudioUrl(null);
    setConversationHistory([]);
    setError(null);
    setSessionActive(false);
    setIsExiting(false);
    setAiAskingQuestion(false);
    setWorkflowSteps([]);
    setVoiceInputMode(false);
  };

  const handleExit = async () => {
    setIsExiting(true);
    const exitMessage = "Thank you for using the AI Workflow Assistant! Have a great day! 👋";
    setConversationHistory(prev => [...prev, { type: 'assistant', content: exitMessage }]);
    setCurrentOutput(exitMessage);
    setAudioUrl(null);
    
    // Narrate goodbye message
    await handleNarrate(exitMessage);
    
    // End session after a delay
    setTimeout(() => {
      setSessionActive(false);
      setIsExiting(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI Workflow Assistant
            </h1>
          </div>
          <p className="text-xl text-gray-600 mb-2">Transform your goals into actionable workflows with AI-powered voice guidance</p>
          <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">📝 Smart Planning</span>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full">🎙️ Voice Narration</span>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">💬 Interactive Q&A</span>
          </div>
        </header>

        {/* Main Input Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your goal (e.g., How to learn Python in 30 days, Start a podcast, Plan a marketing campaign)"
                className="w-full rounded-xl border border-gray-200 px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                disabled={loading}
              />
              {prompt && (
                <button
                  type="button"
                  onClick={() => setPrompt("")}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="submit"
                disabled={loading || prompt.trim().length === 0}
                className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Workflow
                  </div>
                )}
              </button>
              
              <select
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                disabled={loading}
              >
                <option value="en-US-natalie">🎤 Natalie (Female)</option>
                <option value="en-US-matthew">🎤 Matthew (Male)</option>
              </select>
              
              <button
                type="button"
                onClick={resetConversation}
                className="px-4 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors duration-200 flex items-center gap-2"
                disabled={loading}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-800">Something went wrong</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Current Output Display */}
        {currentOutput && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Your Workflow</h2>
              {ttsLoading && (
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Generating audio...</span>
                </div>
              )}
            </div>
            <div className="prose prose-gray max-w-none">
              <div className="text-gray-700 whitespace-pre-wrap leading-relaxed text-base">
                {currentOutput}
              </div>
            </div>
          </div>
        )}

        {/* Voice Input Section */}
        {conversationHistory.length > 0 && !isExiting && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Voice Interaction</h2>
            </div>
            
            <div className="text-center space-y-4">
              <p className="text-gray-600">
                {aiAskingQuestion 
                  ? "🤖 AI is preparing to ask for your questions..." 
                  : "Ready to answer your questions! Click the microphone to speak."
                }
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={startListening}
                  disabled={isListening || aiAskingQuestion}
                  className={`px-8 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-3 ${
                    isListening 
                      ? 'bg-red-500 text-white shadow-lg' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isListening ? (
                    <>
                      <div className="w-5 h-5 bg-white rounded-full animate-pulse"></div>
                      Listening...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      Start Voice Input
                    </>
                  )}
                </button>
                
                {isListening && (
                  <button
                    onClick={stopListening}
                    className="px-6 py-4 rounded-xl font-semibold bg-gray-600 text-white hover:bg-gray-700 transition-colors duration-200 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l6 6m0-6l-6 6" />
                    </svg>
                    Stop
                  </button>
                )}
              </div>
              
              {isListening && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="text-yellow-800 font-medium">Listening for your voice...</span>
                  </div>
                  <p className="text-yellow-700 text-sm">
                    Speak clearly and say "exit" or "quit" when you're done with the conversation.
                  </p>
                </div>
              )}
              
              {!isListening && conversationHistory.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-green-800 text-sm">
                    💡 <strong>Tip:</strong> You can ask follow-up questions, request clarifications, or say "exit" to end the session.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Conversation History</h2>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {conversationHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl transition-all duration-200 ${
                    msg.type === 'user' 
                      ? 'bg-blue-50 border border-blue-100 ml-4 sm:ml-8' 
                      : 'bg-gray-50 border border-gray-100 mr-4 sm:mr-8'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-full ${
                      msg.type === 'user' ? 'bg-blue-200' : 'bg-gray-200'
                    }`}>
                      {msg.type === 'user' ? (
                        <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <span className="font-medium text-sm text-gray-600">
                      {msg.type === 'user' ? 'You' : 'AI Assistant'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <div className="text-gray-700 leading-relaxed">{msg.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audio Player */}
        {audioUrl && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a3 3 0 106 0v-3a3 3 0 00-6 0v3z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Audio Narration</h2>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <audio 
                ref={audioRef}
                controls 
                src={audioUrl} 
                className="w-full h-12"
                onEnded={() => {
                  setTimeout(() => setAudioUrl(null), 1000);
                }}
              />
              <p className="text-sm text-gray-600 mt-2 text-center">
                🎧 Listen to your workflow narrated by AI
              </p>
            </div>
          </div>
        )}

        {/* Exit Message */}
        {isExiting && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-2xl p-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Session Complete</h3>
            </div>
            <p className="text-gray-600">Thank you for using the AI Workflow Assistant! 🎉</p>
          </div>
        )}
      </div>
    </div>
  );
}
