import os
import requests
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import google.generativeai as genai
import requests
import os
from dotenv import load_dotenv
import dotenv

# -------------------------
# Configuration
# -------------------------
# Load API keys from environment
load_dotenv()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyA9GS1AE9FUBS2VQErC3dpX_TUGHqSWihc")
MURF_API_KEY = os.environ.get("MURF_API_KEY", "ap2_bebcd0d5-2c6a-4cfe-a30f-c8d8b216d9f3")

genai.configure(api_key=GEMINI_API_KEY)

if MURF_API_KEY:
    print("[INFO] MURF_API_KEY is configured.")
else:
    print("[WARN] MURF_API_KEY is not set. /api/tts will fail until configured.")

# -------------------------
# Murf TTS helper (with URLs + local mp3)
# -------------------------
def murf_tts(text, voice_id="en-US-natalie", filename="output"):
    # For now, let's use a mock TTS that returns a sample audio URL
    # This will allow the frontend to work while we debug Murf API issues
    
    print(f"🎙 Mock TTS called with text length: {len(text)}")
    print(f"🎙 Voice ID: {voice_id}")
    
    # Return a sample audio URL for testing
    # You can replace this with any working audio URL for testing
    sample_audio_url = "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
    
    print(f"✅ Mock TTS Success! Returning sample audio URL")
    return sample_audio_url, [sample_audio_url]

# -------------------------
# Gemini Workflow generator
# -------------------------
def generate_workflow(user_goal):
    if not GEMINI_API_KEY:
        raise Exception("GEMINI_API_KEY not configured")
    
    try:
        # Configure Gemini
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Create prompt for workflow generation
        prompt = f"""
        Create a detailed step-by-step workflow for: {user_goal}
        
        Please provide a clear, actionable workflow with numbered steps.
        Make it practical and easy to follow.
        """
        
        print(f"Generating workflow for: {user_goal}")
        response = model.generate_content(prompt)
        workflow_text = response.text
        
        print(f"Generated workflow: {workflow_text[:100]}...")
        return workflow_text
        
    except Exception as e:
        error_str = str(e)
        print(f"Error generating workflow: {error_str}")
        
        # Check if it's a quota exceeded error
        if "429" in error_str or "quota" in error_str.lower() or "exceeded" in error_str.lower():
            print("Quota exceeded - using fallback workflow generation")
            return generate_fallback_workflow(user_goal)
        
        raise e

def generate_fallback_workflow(user_goal):
    """Generate a basic workflow when API quota is exceeded"""
    
    # Basic workflow templates based on common goals
    fallback_workflows = {
        "learn": f"""
# Learning Workflow: {user_goal}

## Step 1: Define Your Learning Goals
- Clearly outline what you want to achieve
- Set specific, measurable objectives
- Determine your timeline

## Step 2: Research and Gather Resources
- Find reputable learning materials (books, courses, tutorials)
- Identify online platforms and communities
- Create a resource library

## Step 3: Create a Study Schedule
- Break down the topic into manageable chunks
- Allocate daily/weekly study time
- Set milestones and deadlines

## Step 4: Start with Fundamentals
- Begin with basic concepts
- Build a strong foundation
- Practice regularly

## Step 5: Apply Your Knowledge
- Work on practical projects
- Join communities or study groups
- Seek feedback and mentorship

## Step 6: Review and Iterate
- Regularly assess your progress
- Adjust your approach as needed
- Celebrate achievements and learn from setbacks
        """,
        
        "create": f"""
# Creation Workflow: {user_goal}

## Step 1: Planning and Research
- Define your project scope and objectives
- Research similar projects and best practices
- Gather inspiration and references

## Step 2: Design and Conceptualize
- Create initial sketches or wireframes
- Plan the structure and flow
- Consider user experience and functionality

## Step 3: Prepare Resources and Tools
- Identify required tools and software
- Gather necessary materials or assets
- Set up your workspace

## Step 4: Development/Creation Phase
- Start with a minimum viable version
- Work in iterative cycles
- Test and refine regularly

## Step 5: Review and Polish
- Get feedback from others
- Make improvements and refinements
- Ensure quality and completeness

## Step 6: Launch and Share
- Prepare for release or presentation
- Share with your target audience
- Gather feedback for future improvements
        """,
        
        "improve": f"""
# Improvement Workflow: {user_goal}

## Step 1: Current State Assessment
- Analyze the current situation
- Identify specific areas needing improvement
- Gather baseline metrics

## Step 2: Set Clear Improvement Goals
- Define what success looks like
- Set measurable targets
- Establish timeline for improvements

## Step 3: Research Best Practices
- Study successful examples
- Learn from experts in the field
- Identify proven strategies

## Step 4: Create Action Plan
- Break down improvements into steps
- Prioritize high-impact changes
- Allocate resources and time

## Step 5: Implement Changes
- Start with small, manageable changes
- Monitor progress regularly
- Adjust approach based on results

## Step 6: Measure and Optimize
- Track key metrics
- Celebrate improvements
- Continue iterating for better results
        """
    }
    
    # Determine which template to use based on keywords in the goal
    goal_lower = user_goal.lower()
    
    if any(word in goal_lower for word in ["learn", "study", "understand", "master"]):
        return fallback_workflows["learn"]
    elif any(word in goal_lower for word in ["create", "build", "make", "develop", "design"]):
        return fallback_workflows["create"]
    elif any(word in goal_lower for word in ["improve", "better", "enhance", "optimize", "upgrade"]):
        return fallback_workflows["improve"]
    else:
        # Generic workflow
        return f"""
# Workflow: {user_goal}

## Step 1: Define and Plan
- Clearly define what you want to achieve
- Break down the goal into smaller tasks
- Create a timeline and action plan

## Step 2: Gather Resources
- Identify what you need to succeed
- Collect necessary tools, information, or materials
- Prepare your workspace or environment

## Step 3: Take Action
- Start with the first concrete step
- Maintain consistent progress
- Track your advancement

## Step 4: Monitor and Adjust
- Regularly review your progress
- Make adjustments as needed
- Stay flexible and adapt to challenges

## Step 5: Complete and Evaluate
- Finish the planned tasks
- Evaluate the results
- Learn from the experience for future goals

*Note: This is a general workflow. For more specific guidance, please try again later when our AI service is available.*
        """

# -------------------------
# Gemini Question Answerer
# -------------------------
def answer_question(question, workflow_steps, conversation_history):
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured on the server")

    # Build context from workflow and conversation
    workflow_context = "\n".join(workflow_steps) if workflow_steps else "No workflow context available."
    
    # Get recent conversation context (last 3 exchanges)
    recent_context = ""
    if conversation_history:
        recent_exchanges = conversation_history[-6:]  # Last 3 Q&A pairs
        recent_context = "\n".join([f"{'User' if msg['type'] == 'user' else 'Assistant'}: {msg['content']}" 
                                  for msg in recent_exchanges])
    
    prompt = f"""
    You are a helpful AI assistant helping with a workflow. Answer the user's question based on the workflow context and conversation history.
    
    Workflow Steps:
    {workflow_context}
    
    Recent Conversation:
    {recent_context}
    
    User Question: {question}
    
    Provide a helpful, specific answer that relates to the workflow. Be conversational and encouraging.
    Keep your response concise but informative (2-4 sentences).
    """
    
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)
    return (response.text or "I understand your question. Let me help you with that.").strip()

# -------------------------
# Flask app and API routes
# -------------------------
app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"], 
     methods=["GET", "POST", "OPTIONS"], 
     allow_headers=["Content-Type", "Authorization"])  # Enable CORS for all routes

@app.route('/')
def index():
    return " Flask API is running! Available routes: /api/generate_workflow, /api/tts, /audio/<filename>"

@app.route('/health')
def health_check():
    return jsonify({
        "status": "healthy",
        "gemini_configured": bool(GEMINI_API_KEY),
        "murf_configured": bool(MURF_API_KEY)
    })

@app.route('/api/workflow', methods=['POST', 'OPTIONS'])
def api_workflow():
    if request.method == 'OPTIONS':
        # Handle preflight request
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response
        
    try:
        data = request.get_json()
        if not data:
            print("Error: No JSON data received")
            return jsonify({"error": "No JSON data provided"}), 400
            
        user_goal = data.get('goal')
        print(f"Received goal: {user_goal}")
        
        if not user_goal:
            print("Error: No user goal in request")
            return jsonify({"error": "No user goal provided"}), 400

        print(f"Generating workflow for: {user_goal}")
        workflow = generate_workflow(user_goal)
        print(f"Generated workflow: {workflow[:100]}...")
        return jsonify({"workflow": workflow})
    except Exception as e:
        print(f"Error in api_workflow: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/generate_workflow', methods=['POST'])
def api_generate_workflow():
    data = request.get_json()
    user_goal = data.get('goal')
    if not user_goal:
        return jsonify({"error": "No user goal provided"}), 400

    try:
        steps = generate_workflow(user_goal)
        return jsonify({"steps": steps})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tts', methods=['POST', 'OPTIONS'])
def api_tts():
    if request.method == 'OPTIONS':
        # Handle preflight request
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response
    data = request.get_json()
    text = data.get('text')
    voice_id = data.get('voice_id', 'en-US-natalie')
    filename = data.get('filename', 'output')

    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        audio_url, audio_urls = murf_tts(text, voice_id=voice_id, filename=filename)
        if audio_url:
            return jsonify({"audio_url": audio_url, "audio_urls": audio_urls})
        else:
            return jsonify({"error": "TTS generation failed"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/audio/<path:filename>', methods=['GET'])
def serve_audio(filename):
    directory = os.getcwd()
    return send_from_directory(directory, filename)

if __name__ == '__main__':
    app.run(debug=True, use_reloader=False)