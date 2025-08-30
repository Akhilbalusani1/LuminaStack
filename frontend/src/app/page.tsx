"use client";
import { useMemo, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mic, MicOff, Volume2 } from "lucide-react";

export default function Home() {
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE || "https://luminastack.onrender.com", []);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [currentOutput, setCurrentOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState("en-US-natalie");
  const [conversationHistory, setConversationHistory] = useState<Array<{type: 'user' | 'assistant', content: string}>>([]);
  const [isListening, setIsListening] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<string[]>([]);
  const [voiceInputMode, setVoiceInputMode] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  const buildContextualPrompt = (userInput: string) => {
    if (workflowSteps.length === 0) {
      return userInput;
    } else {
      const workflowContext = workflowSteps.join('\n');
      return `Based on this workflow:\n${workflowContext}\n\nUser asks: ${userInput}\n\nPlease answer the question about the workflow above.`;
    }
  };

  const extractWorkflowSteps = (text: string): string[] => {
    const lines = text.split('\n');
    const steps: string[] = [];
    lines.forEach(line => {
      if (line.trim().match(/^(Step \d+|[0-9]+\.)/)) {
        steps.push(line.trim());
      }
    });
    return steps;
  };

  const cleanTextForTTS = (text: string): string => {
    return text
      .replace(/\*\*/g, '') // Remove bold markdown
      .replace(/\*/g, '') // Remove asterisks
      .replace(/#{1,6}\s/g, '') // Remove markdown headers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to just text
      .replace(/`([^`]+)`/g, '$1') // Remove code backticks
      .replace(/[_~]/g, '') // Remove underscores and tildes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  };

  const handleNarrate = async (text: string) => {
    console.log("🎤 handleNarrate called with text length:", text?.length);
    if (!text || typeof text !== 'string' || !text.trim()) {
      console.log("🎤 No valid text provided to TTS");
      return;
    }
    
    // Clean text for better TTS
    const cleanedText = cleanTextForTTS(text);
    console.log("🎤 Cleaned text for TTS:", cleanedText.substring(0, 100) + "...");
    
    setError(null);
    setTtsLoading(true);
    
    try {
      if ('speechSynthesis' in window) {
        console.log("🎤 Using Web Speech API for TTS");
        speechSynthesis.cancel();
        
        // Add delay to ensure browser is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
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
              // Fallback timeout
              setTimeout(() => {
                voices = speechSynthesis.getVoices();
                resolve(voices);
              }, 1000);
            }
          });
        };
        
        const voices = await getVoices();
        console.log("🎤 Available voices:", voices.length);
        
        // Split long text into chunks for better TTS handling
        const maxLength = 200;
        const chunks: string[] = [];
        for (let i = 0; i < cleanedText.length; i += maxLength) {
          chunks.push(cleanedText.substring(i, i + maxLength));
        }
        
        console.log("🎤 Text split into", chunks.length, "chunks");
        
        // Speak first chunk
        const utterance = new SpeechSynthesisUtterance(chunks[0]);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        if (voiceId === 'en-US-matthew') {
          const maleVoice = voices.find(voice => 
            voice.name.toLowerCase().includes('male') || 
            voice.name.toLowerCase().includes('david') ||
            voice.name.toLowerCase().includes('mark')
          );
          if (maleVoice) {
            utterance.voice = maleVoice;
            console.log("🎤 Using male voice:", maleVoice.name);
          }
        } else {
          const femaleVoice = voices.find(voice => 
            voice.name.toLowerCase().includes('female') || 
            voice.name.toLowerCase().includes('zira') ||
            voice.name.toLowerCase().includes('susan')
          );
          if (femaleVoice) {
            utterance.voice = femaleVoice;
            console.log("🎤 Using female voice:", femaleVoice.name);
          }
        }
        
        let chunkIndex = 0;
        
        utterance.onstart = () => {
          console.log("🎤 Speech started successfully - chunk", chunkIndex + 1);
          setTtsLoading(false);
        };
        
        utterance.onend = () => {
          console.log("🎤 Speech chunk ended");
          chunkIndex++;
          if (chunkIndex < chunks.length) {
            // Speak next chunk
            const nextUtterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
            nextUtterance.rate = utterance.rate;
            nextUtterance.pitch = utterance.pitch;
            nextUtterance.volume = utterance.volume;
            nextUtterance.voice = utterance.voice;
            nextUtterance.onend = utterance.onend;
            nextUtterance.onerror = utterance.onerror;
            speechSynthesis.speak(nextUtterance);
          } else {
            console.log("🎤 All chunks completed - TTS finished");
            // No need to restart voice input - workflow is complete
          }
        };
        
        utterance.onerror = (event) => {
          console.error("🎤 Speech error:", event.error);
          setError(`Speech Error: ${event.error}`);
          setTtsLoading(false);
        };
        
        console.log("🎤 Starting speech synthesis...");
        console.log("🎤 Document focused:", document.hasFocus());
        console.log("🎤 Speech synthesis speaking:", speechSynthesis.speaking);
        console.log("🎤 Speech synthesis pending:", speechSynthesis.pending);
        
        speechSynthesis.speak(utterance);
        
        // Set a timeout to check if speech started
        setTimeout(() => {
          if (!speechSynthesis.speaking && !speechSynthesis.pending) {
            console.error("🎤 Speech failed to start - trying fallback");
            setTtsLoading(false);
            setError("Speech synthesis failed. Try clicking the page and generating again.");
          }
        }, 2000);
        
      } else {
        throw new Error("Speech synthesis not supported in this browser");
      }
    } catch (err: any) {
      console.error("🎤 TTS error:", err);
      setError(`TTS Error: ${err.message || "Something went wrong"}`);
      setTtsLoading(false);
    }
  };

  const handleVoiceInput = async (transcript: string) => {
    console.log("🎤 Voice input received:", transcript);
    console.log("🎤 Transcript length:", transcript.length);
    
    // Validate transcript
    if (!transcript || transcript.trim().length < 3) {
      console.log("🎤 Transcript too short, ignoring");
      return;
    }
    
    const exitCommands = ['quit', 'exit', 'stop', 'end', 'goodbye', 'bye'];
    if (exitCommands.some(cmd => transcript.toLowerCase().includes(cmd))) {
      setSessionActive(false);
      setVoiceInputMode(false);
      const goodbye = "Goodbye! Thanks for using the AI Workflow Assistant!";
      setConversationHistory(prev => [...prev, 
        { type: 'user', content: transcript },
        { type: 'assistant', content: goodbye }
      ]);
      handleNarrate(goodbye);
      return;
    }

    setConversationHistory(prev => [...prev, { type: 'user', content: transcript }]);
    
    try {
      console.log("🎤 Processing workflow request for:", transcript);
      
      const response = await fetch(`${apiBase}/api/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: transcript }),
      });

      console.log("🎤 Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("🎤 API Error:", errorText);
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log("🎤 Raw API response:", data);
      
      const aiResponse = data.workflow || data.error || "I couldn't generate a response.";
      
      console.log("🎤 Final AI Response:", String(aiResponse).substring(0, 200) + "...");
      
      // Extract workflow steps
      if (String(aiResponse).includes('Step')) {
        const steps = extractWorkflowSteps(String(aiResponse));
        setWorkflowSteps(steps);
        console.log("🎤 Extracted workflow steps:", steps.length);
      }
      
      setConversationHistory(prev => [...prev, { type: 'assistant', content: aiResponse }]);
      setCurrentOutput(aiResponse);
      
      await handleNarrate(aiResponse);
      
      // End voice session after workflow is spoken
      setSessionActive(false);
      setVoiceInputMode(false);
      
    } catch (err: any) {
      console.error("🎤 Voice input error:", err);
      console.error("🎤 Full error object:", err);
      
      // End session on error
      setSessionActive(false);
      setVoiceInputMode(false);
      
      const errorResponse = `Sorry, there was an error processing your request: ${err.message}`;
      setConversationHistory(prev => [...prev, { type: 'assistant', content: errorResponse }]);
      setError(errorResponse);
    }
  };

  const startListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      console.log("🎙️ Speech recognition already running, skipping start");
      return;
    }
    console.log("🎙️ Starting speech recognition...");
    console.log("🎙️ Voice input mode:", voiceInputMode);
    console.log("🎙️ Session active:", sessionActive);
    setIsListening(true);
    setError(null);
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error("🎙️ Error starting recognition:", err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    setIsListening(false);
    recognitionRef.current.stop();
  };

  const startVoiceInput = () => {
    console.log("🎙️ Starting voice input mode");
    setVoiceInputMode(true);
    setSessionActive(true);
    setTimeout(() => {
      startListening();
    }, 500);
  };

  const resetConversation = () => {
    setPrompt("");
    setCurrentOutput("");
    setConversationHistory([]);
    setError(null);
    setSessionActive(false);
    setWorkflowSteps([]);
    setVoiceInputMode(false);
  };

  // Initialize speech recognition (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log("🎙️ Speech recognized:", transcript);
        console.log("🎙️ Voice input mode:", voiceInputMode);
        console.log("🎙️ Session active:", sessionActive);
        
        if (voiceInputMode && sessionActive) {
          console.log("🎙️ Processing voice input through handleVoiceInput");
          handleVoiceInput(transcript);
        } else {
          console.log("🎙️ Setting transcript as prompt");
          setPrompt(transcript);
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error("🎙️ Speech recognition error:", event.error);
        setIsListening(false);
        
        // Don't trigger error handling for common issues
        if (event.error === 'no-speech') {
          console.log("🎙️ No speech detected, waiting for user to speak");
          // Don't show error, just wait
        } else if (event.error === 'not-allowed') {
          setError("Microphone access denied. Please allow microphone access.");
          setSessionActive(false);
          setVoiceInputMode(false);
        } else if (event.error === 'aborted') {
          console.log("🎙️ Speech recognition was stopped");
          // Normal stop, don't show error
        } else {
          setError(`Speech error: ${event.error}`);
          setSessionActive(false);
          setVoiceInputMode(false);
        }
      };
      
      recognitionRef.current.onend = () => {
        console.log("🎙️ Speech recognition ended");
        setIsListening(false);
        // Don't auto-restart - let TTS onend handle it
      };
      
      recognitionRef.current.onstart = () => {
        console.log("🎙️ Speech recognition started");
        setIsListening(true);
        setError(null);
      };
    }
  }, [voiceInputMode, sessionActive]);

  // Test backend connection
  useEffect(() => {
    const testBackend = async () => {
      try {
        const response = await fetch(`${apiBase}/health`);
        if (!response.ok) {
          setError("Backend server not responding. Make sure Flask is running.");
        }
      } catch (err) {
        setError("Cannot connect to backend. Make sure Flask server is running.");
      }
    };
    testBackend();
  }, [apiBase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);
    setCurrentOutput("");

    try {
      console.log("📝 Text input - sending request:", prompt);
      const response = await fetch(`${apiBase}/api/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: prompt }),
      });

      console.log("📝 Text input response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("📝 Text input API error:", errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("📝 Text input API response:", data);
      const workflow = data.workflow || "No workflow generated";
      setCurrentOutput(workflow);
      
      if (String(workflow).includes('Step')) {
        setWorkflowSteps(extractWorkflowSteps(String(workflow)));
      }
      
      // Add user interaction trigger before TTS
      const workflowText = String(workflow);
      console.log("🎤 About to call handleNarrate with workflow:", workflowText.substring(0, 100) + "...");
      console.log("🎤 Workflow length:", workflowText.length);
      console.log("🎤 Workflow type:", typeof workflow);
      
      // Call TTS immediately after workflow is set
      handleNarrate(workflowText);
      
      // End session after workflow generation - no Q&A needed
      console.log("🎤 Workflow generation complete - ending session");
      setSessionActive(false);
      setVoiceInputMode(false);
      
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🤖 LuminaStack
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              Transform your goals into actionable workflows with AI-powered guidance and voice interaction
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {/* Voice Input Controls */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Voice Interaction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-center">
              <Button
                onClick={() => handleNarrate("This is a test of the speech synthesis system.")}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
              >
                🔊 Test TTS
              </Button>
              <Button
                onClick={startVoiceInput}
                disabled={sessionActive}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                <Mic className="h-4 w-4 mr-2" />
                Start Voice Session
              </Button>
              
              {sessionActive && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {isListening ? "🎤 Listening..." : "Voice Session Active"}
                </Badge>
              )}
              
              <Button
                onClick={resetConversation}
                variant="outline"
                className="ml-auto"
              >
                Reset
              </Button>
            </div>
            
            <div className="flex gap-4 items-center">
              <select
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                suppressHydrationWarning={true}
              >
                <option value="en-US-natalie">Natalie (Female)</option>
                <option value="en-US-matthew">Matthew (Male)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Text Input Form */}
        {!voiceInputMode && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Enter Your Goal</CardTitle>
              <CardDescription>
                Describe what you want to achieve, and I'll create a step-by-step workflow for you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., How to learn Python programming in 30 days"
                    disabled={loading}
                    suppressHydrationWarning={true}
                  />
                  <Button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    variant="outline"
                    disabled={isListening}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  type="submit"
                  disabled={loading || !prompt.trim()}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  {loading ? "Generating Workflow..." : "Generate Workflow"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Conversation History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-96 overflow-y-auto">
              {conversationHistory.map((message, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-50 border-l-4 border-blue-500 ml-8'
                      : 'bg-gray-50 border-l-4 border-gray-500 mr-8'
                  }`}
                >
                  <div className="font-semibold text-sm mb-2">
                    {message.type === 'user' ? '👤 You' : '🤖 AI Assistant'}
                  </div>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Output Display */}
        {currentOutput && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Generated Workflow
                {ttsLoading && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    🔊 Speaking...
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-gray max-w-none">
                <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border">
                  {currentOutput}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
