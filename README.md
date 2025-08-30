# AI Workflow Assistant

Transform your goals into actionable workflows with AI-powered voice guidance.

## 🚀 Features

- **Smart Workflow Generation**: Uses Google Gemini AI to break down goals into step-by-step actionable plans
- **Voice Narration**: Natural-sounding voice narration powered by Murf.ai TTS
- **Interactive Q&A**: Voice-enabled follow-up questions and clarifications
- **Modern UI**: Clean, responsive design with accessibility features
- **Exit Commands**: Natural conversation ending with voice commands like "exit" or "quit"

## 🎯 Target Users

- **Students**: Structured learning plans with audio guidance
- **Content Creators**: Task breakdowns for projects like starting a YouTube channel
- **Professionals**: Productivity aid for planning complex projects
- **Accessibility Users**: Full voice-guided experience for visually impaired users

## 🛠️ Tech Stack

### Backend
- **Flask** - Python web framework
- **Google Gemini AI** - Workflow generation
- **Murf.ai TTS** - Text-to-speech conversion
- **pydub** - Audio processing

### Frontend
- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Web Speech API** - Voice recognition

## 📋 Prerequisites

- Python 3.8+
- Node.js 18+
- Google Gemini API Key
- Murf.ai API Key

## 🚀 Quick Start

### Backend Setup

1. **Navigate to the project root**:
   ```bash
   cd Murf
   ```

2. **Install Python dependencies**:
   ```bash
   pip install flask flask-cors google-generativeai requests pydub
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   MURF_API_KEY=your_murf_api_key_here
   ```

4. **Run the Flask server**:
   ```bash
   python server.py
   ```
   Server will start on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Frontend will be available at `http://localhost:3000`

## 🎮 How to Use

1. **Enter Your Goal**: Type your goal in the input field (e.g., "How to learn Python in 30 days")

2. **Generate Workflow**: Click "Generate Workflow" to get AI-powered step-by-step instructions

3. **Listen to Narration**: The workflow will be automatically narrated using AI voice

4. **Interactive Q&A**: Click the microphone button to ask follow-up questions

5. **Voice Commands**: Say "exit", "quit", or "goodbye" to end the session gracefully

## 🌐 API Endpoints

### Backend Endpoints

- `GET /` - Health check
- `GET /health` - Detailed health status
- `POST /api/generate_workflow` - Generate workflow from goal
- `POST /api/tts` - Convert text to speech
- `POST /api/ask_question` - Interactive Q&A
- `GET /audio/<filename>` - Serve audio files

### Example API Usage

```javascript
// Generate workflow
const response = await fetch('http://localhost:5000/api/generate_workflow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ goal: 'Learn Python in 30 days' })
});

// Text-to-speech
const ttsResponse = await fetch('http://localhost:5000/api/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    text: 'Your workflow text here',
    voice_id: 'en-US-natalie',
    filename: 'output_123'
  })
});
```

## 🚀 Deployment

### Backend Deployment (Railway/Render)

1. **Create a `requirements.txt`**:
   ```txt
   flask==2.3.3
   flask-cors==4.0.0
   google-generativeai==0.3.2
   requests==2.31.0
   pydub==0.25.1
   ```

2. **Set environment variables** on your hosting platform:
   - `GEMINI_API_KEY`
   - `MURF_API_KEY`

3. **Deploy** using your preferred platform (Railway, Render, Heroku, etc.)

### Frontend Deployment (Vercel/Netlify)

1. **Update API base URL** for production in your environment variables

2. **Build and deploy**:
   ```bash
   npm run build
   ```

3. **Set environment variables** on your hosting platform:
   - `NEXT_PUBLIC_API_BASE=https://your-backend-url.com`

## 🎨 Features Overview

### Core Functionality
- ✅ Goal input via text
- ✅ AI-powered workflow generation
- ✅ Automatic voice narration
- ✅ Interactive voice Q&A
- ✅ Graceful exit commands
- ✅ Conversation history
- ✅ Error handling

### UI/UX Features
- ✅ Modern gradient design
- ✅ Responsive mobile layout
- ✅ Loading states and animations
- ✅ Accessibility features
- ✅ Voice feedback indicators
- ✅ Clean conversation bubbles

## 🔧 Configuration

### Voice Options
- **Natalie (Female)**: `en-US-natalie`
- **Matthew (Male)**: `en-US-matthew`

### Supported Exit Commands
- "exit"
- "quit" 
- "stop"
- "goodbye"
- "bye"
- "end session"

## 📱 Browser Compatibility

- **Chrome**: Full support (recommended)
- **Edge**: Full support
- **Firefox**: Limited speech recognition support
- **Safari**: Limited speech recognition support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

1. **Speech Recognition Not Working**:
   - Use Chrome or Edge browser
   - Allow microphone permissions
   - Ensure HTTPS in production

2. **TTS Not Working**:
   - Check Murf.ai API key
   - Verify API key permissions
   - Check network connectivity

3. **Backend Connection Failed**:
   - Ensure Flask server is running on port 5000
   - Check CORS configuration
   - Verify environment variables

### Support

For issues and questions, please check the troubleshooting section or create an issue in the repository.

---

**Built with ❤️ using AI-powered technologies**
