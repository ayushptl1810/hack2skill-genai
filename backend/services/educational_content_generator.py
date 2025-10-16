import json
import os
from typing import Dict, List, Optional, Any
import google.generativeai as genai
from upstash_redis import Redis
from config import config

class EducationalContentGenerator:
    """Service for generating educational content about misinformation detection"""
    
    def __init__(self):
        # Configure Gemini
        genai.configure(api_key=config.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(config.GEMINI_MODEL)
        
        # Initialize Upstash Redis connection
        try:
            if config.UPSTASH_REDIS_URL and config.UPSTASH_REDIS_TOKEN:
                self.redis_client = Redis(
                    url=config.UPSTASH_REDIS_URL,
                    token=config.UPSTASH_REDIS_TOKEN
                )
                # Test connection
                self.redis_client.set("test", "connection")
                self.redis_client.delete("test")
                print("✅ Upstash Redis connection established")
            else:
                print("⚠️ Upstash Redis credentials not found, running without cache")
                self.redis_client = None
        except Exception as e:
            print(f"❌ Upstash Redis connection failed: {e}")
            self.redis_client = None
        
        # Cache TTL (Time To Live) in seconds
        self.cache_ttl = config.REDIS_TTL
        
        # Pre-defined content templates
        self.content_templates = {
            "red_flags": {
                "title": "How to Spot Red Flags in Misinformation",
                "categories": [
                    "Emotional Language",
                    "Suspicious URLs", 
                    "Poor Grammar",
                    "Missing Sources",
                    "Outdated Information",
                    "Confirmation Bias Triggers"
                ]
            },
            "source_credibility": {
                "title": "Evaluating Source Credibility",
                "categories": [
                    "Authority Assessment",
                    "Bias Detection",
                    "Fact-checking Methodology",
                    "Peer Review Process",
                    "Transparency Standards"
                ]
            },
            "manipulation_techniques": {
                "title": "Common Manipulation Techniques",
                "categories": [
                    "Deepfakes and AI-generated Content",
                    "Outdated Images",
                    "Misleading Headlines",
                    "False Context",
                    "Social Media Manipulation",
                    "Bot Networks"
                ]
            }
        }
    
    def _get_cache_key(self, key: str) -> str:
        """Get the Redis cache key"""
        return f"educational:{key}"
    
    def _load_from_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Load content from Redis cache if it exists"""
        if not self.redis_client:
            return None
            
        try:
            cached_data = self.redis_client.get(self._get_cache_key(cache_key))
            if cached_data:
                return json.loads(cached_data)
        except Exception as e:
            print(f"Failed to load from Redis cache {cache_key}: {e}")
        return None
    
    def _save_to_cache(self, cache_key: str, content: Dict[str, Any]) -> None:
        """Save content to Redis cache"""
        if not self.redis_client:
            return
            
        try:
            self.redis_client.setex(
                self._get_cache_key(cache_key),
                self.cache_ttl,
                json.dumps(content, ensure_ascii=False)
            )
            print(f"✅ Cached {cache_key} in Redis")
        except Exception as e:
            print(f"Failed to save to Redis cache {cache_key}: {e}")
    
    async def get_modules_list(self) -> Dict[str, Any]:
        """Get the list of available modules (cached in Redis)"""
        cache_key = "modules_list"
        cached = self._load_from_cache(cache_key)
        
        if cached:
            print(f"📦 Loading modules list from Redis cache")
            return cached
        
        print(f"🔄 Generating new modules list")
        # Generate modules list
        modules_data = {
            "modules": [
                {
                    "id": "red_flags",
                    "title": "How to Spot Red Flags",
                    "description": "Learn to identify warning signs in misinformation",
                    "difficulty_levels": ["beginner", "intermediate", "advanced"],
                    "estimated_time": "10-15 minutes"
                },
                {
                    "id": "source_credibility", 
                    "title": "Evaluating Source Credibility",
                    "description": "Understand how to assess source reliability",
                    "difficulty_levels": ["beginner", "intermediate", "advanced"],
                    "estimated_time": "15-20 minutes"
                },
                {
                    "id": "manipulation_techniques",
                    "title": "Common Manipulation Techniques", 
                    "description": "Learn about various misinformation techniques",
                    "difficulty_levels": ["intermediate", "advanced"],
                    "estimated_time": "20-25 minutes"
                }
            ]
        }
        
        # Save to Redis cache
        self._save_to_cache(cache_key, modules_data)
        return modules_data
    
    async def generate_module_content(self, module_type: str, difficulty_level: str = "beginner") -> Dict[str, Any]:
        """
        Generate educational content for a specific module (with Redis caching)
        
        Args:
            module_type: Type of module (red_flags, source_credibility, etc.)
            difficulty_level: beginner, intermediate, advanced
            
        Returns:
            Dictionary containing educational content
        """
        # Check Redis cache first
        cache_key = f"{module_type}_{difficulty_level}"
        cached_content = self._load_from_cache(cache_key)
        
        if cached_content:
            print(f"📦 Loading {module_type} ({difficulty_level}) from Redis cache")
            return cached_content
        
        print(f"🔄 Generating new content for {module_type} ({difficulty_level})")
        
        try:
            template = self.content_templates.get(module_type, {})
            if not template:
                return {"error": f"Unknown module type: {module_type}"}
            
            # Generate content using AI
            content = await self._generate_ai_content(module_type, difficulty_level, template)
            
            # Add interactive elements
            content["interactive_elements"] = await self._generate_interactive_elements(module_type, difficulty_level)
            
            # Add real-world examples
            content["examples"] = await self._generate_examples(module_type, difficulty_level)
            
            # Save to Redis cache
            self._save_to_cache(cache_key, content)
            
            return content
            
        except Exception as e:
            print(f"Failed to generate content: {str(e)}")
            # Return fallback content
            fallback = self._get_fallback_content(module_type, difficulty_level)
            self._save_to_cache(cache_key, fallback)
            return fallback
    
    async def _generate_ai_content(self, module_type: str, difficulty_level: str, template: Dict) -> Dict[str, Any]:
        """Generate AI-powered educational content"""
        
        prompt = f"""
        You are an expert digital literacy educator specializing in misinformation detection. 
        Create comprehensive educational content for the following module:

        MODULE TYPE: {module_type}
        DIFFICULTY LEVEL: {difficulty_level}
        TEMPLATE: {json.dumps(template, indent=2)}

        Create educational content that includes:
        1. Clear explanations of concepts
        2. Step-by-step instructions
        3. Visual indicators to look for
        4. Common mistakes to avoid
        5. Practical exercises

        Respond in this JSON format:
        {{
            "title": "Module title",
            "overview": "Brief overview of what users will learn",
            "learning_objectives": ["Objective 1", "Objective 2", "Objective 3"],
            "content_sections": [
                {{
                    "title": "Section title",
                    "content": "Detailed explanation",
                    "key_points": ["Point 1", "Point 2"],
                    "visual_indicators": ["Indicator 1", "Indicator 2"],
                    "examples": ["Example 1", "Example 2"]
                }}
            ],
            "practical_tips": ["Tip 1", "Tip 2", "Tip 3"],
            "common_mistakes": ["Mistake 1", "Mistake 2"],
            "difficulty_level": "{difficulty_level}"
        }}
        """
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Clean up JSON response
            if response_text.startswith('```json'):
                response_text = response_text.replace('```json', '').replace('```', '').strip()
            elif response_text.startswith('```'):
                response_text = response_text.replace('```', '').strip()
            
            return json.loads(response_text)
            
        except Exception as e:
            print(f"AI content generation failed: {e}")
            return self._get_fallback_content(module_type, difficulty_level)
    
    async def _generate_interactive_elements(self, module_type: str, difficulty_level: str) -> Dict[str, Any]:
        """Generate interactive learning elements"""
        
        prompt = f"""
        Create interactive learning elements for a {difficulty_level} level module about {module_type}.
        
        Generate:
        1. Quiz questions with multiple choice answers
        2. True/false statements
        3. Scenario-based questions
        
        Respond in JSON format:
        {{
            "quiz_questions": [
                {{
                    "question": "Question text",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct_answer": 0,
                    "explanation": "Why this answer is correct"
                }}
            ],
            "true_false": [
                {{
                    "statement": "Statement to evaluate",
                    "answer": true,
                    "explanation": "Explanation"
                }}
            ],
            "scenarios": [
                {{
                    "scenario": "Real-world scenario description",
                    "question": "What should you do?",
                    "correct_action": "Correct action",
                    "explanation": "Why this is the right approach"
                }}
            ]
        }}
        """
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            if response_text.startswith('```json'):
                response_text = response_text.replace('```json', '').replace('```', '').strip()
            elif response_text.startswith('```'):
                response_text = response_text.replace('```', '').strip()
            
            return json.loads(response_text)
            
        except Exception as e:
            print(f"Interactive elements generation failed: {e}")
            return {"quiz_questions": [], "true_false": [], "scenarios": []}
    
    async def _generate_examples(self, module_type: str, difficulty_level: str) -> List[Dict[str, Any]]:
        """Generate real-world examples"""
        
        prompt = f"""
        Create realistic examples of {module_type} for {difficulty_level} learners.
        
        For each example, provide:
        1. A realistic scenario
        2. What to look for
        3. How to verify
        4. Why it's misleading
        
        Respond in JSON format:
        {{
            "examples": [
                {{
                    "title": "Example title",
                    "scenario": "Realistic scenario description",
                    "red_flags": ["Flag 1", "Flag 2"],
                    "verification_steps": ["Step 1", "Step 2"],
                    "explanation": "Why this is misleading",
                    "difficulty": "{difficulty_level}"
                }}
            ]
        }}
        """
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            if response_text.startswith('```json'):
                response_text = response_text.replace('```json', '').replace('```', '').strip()
            elif response_text.startswith('```'):
                response_text = response_text.replace('```', '').strip()
            
            result = json.loads(response_text)
            return result.get("examples", [])
            
        except Exception as e:
            print(f"Examples generation failed: {e}")
            return []
    
    def _get_fallback_content(self, module_type: str, difficulty_level: str) -> Dict[str, Any]:
        """Fallback content when AI generation fails"""
        
        fallback_content = {
            "red_flags": {
                "title": "How to Spot Red Flags in Misinformation",
                "overview": "Learn to identify warning signs that content might be misleading",
                "learning_objectives": [
                    "Identify emotional manipulation techniques",
                    "Recognize suspicious URLs and sources",
                    "Spot grammatical and formatting errors",
                    "Understand confirmation bias triggers"
                ],
                "content_sections": [
                    {
                        "title": "Emotional Language",
                        "content": "Misinformation often uses strong emotional language to bypass critical thinking.",
                        "key_points": [
                            "Look for excessive use of emotional words",
                            "Be wary of content that makes you feel angry or scared",
                            "Check if emotions are being used to distract from facts"
                        ],
                        "visual_indicators": ["ALL CAPS", "Multiple exclamation marks", "Emotional imagery"],
                        "examples": ["URGENT!!!", "You won't believe this!", "This will shock you!"]
                    },
                    {
                        "title": "Suspicious URLs",
                        "content": "Fake news often uses URLs that mimic legitimate news sources.",
                        "key_points": [
                            "Check for slight misspellings in domain names",
                            "Look for unusual domain extensions",
                            "Verify the actual website matches the URL"
                        ],
                        "visual_indicators": ["typos in URLs", "unusual extensions", "redirects"],
                        "examples": ["cnn-news.com", "bbc-news.net", "reuters.info"]
                    }
                ],
                "practical_tips": [
                    "Take a deep breath before sharing emotional content",
                    "Ask yourself: 'Why do I feel this way?'",
                    "Look for factual evidence, not just emotional appeals"
                ],
                "common_mistakes": [
                    "Sharing content because it makes you angry",
                    "Ignoring red flags when content confirms your beliefs",
                    "Not checking sources when content feels 'right'"
                ],
                "difficulty_level": difficulty_level
            },
            "source_credibility": {
                "title": "Evaluating Source Credibility",
                "overview": "Learn how to assess whether a source is trustworthy and reliable",
                "learning_objectives": [
                    "Understand what makes a source credible",
                    "Identify bias in news sources",
                    "Evaluate author expertise",
                    "Check source transparency"
                ],
                "content_sections": [
                    {
                        "title": "Authority Assessment",
                        "content": "Credible sources have recognized expertise in their field.",
                        "key_points": [
                            "Check the author's credentials and background",
                            "Look for institutional affiliations",
                            "Verify expertise matches the topic"
                        ],
                        "visual_indicators": ["Author bio", "Credentials listed", "Institutional affiliation"],
                        "examples": ["PhD in relevant field", "Journalist with experience", "Academic institution"]
                    }
                ],
                "practical_tips": [
                    "Always check the 'About' page",
                    "Look for contact information",
                    "Verify claims with multiple sources"
                ],
                "common_mistakes": [
                    "Trusting sources without checking credentials",
                    "Ignoring bias in sources",
                    "Not verifying institutional affiliations"
                ],
                "difficulty_level": difficulty_level
            },
            "manipulation_techniques": {
                "title": "Common Manipulation Techniques",
                "overview": "Understand the various methods used to create and spread misinformation",
                "learning_objectives": [
                    "Recognize different manipulation techniques",
                    "Understand how AI-generated content works",
                    "Identify social media manipulation",
                    "Learn verification strategies"
                ],
                "content_sections": [
                    {
                        "title": "Deepfakes and AI-generated Content",
                        "content": "Advanced technology can create convincing fake videos and images.",
                        "key_points": [
                            "Look for unnatural facial movements",
                            "Check for inconsistencies in lighting",
                            "Verify with original sources"
                        ],
                        "visual_indicators": ["Unnatural blinking", "Lighting inconsistencies", "Audio sync issues"],
                        "examples": ["AI-generated celebrity videos", "Deepfake political speeches"]
                    }
                ],
                "practical_tips": [
                    "Use reverse image search",
                    "Check multiple angles of the same event",
                    "Verify with official sources"
                ],
                "common_mistakes": [
                    "Trusting videos without verification",
                    "Not checking for AI generation",
                    "Sharing before verification"
                ],
                "difficulty_level": difficulty_level
            }
        }
        
        return fallback_content.get(module_type, {
            "title": f"Educational Module: {module_type}",
            "overview": "Learn about misinformation detection",
            "learning_objectives": ["Understand basic concepts"],
            "content_sections": [],
            "practical_tips": [],
            "common_mistakes": [],
            "difficulty_level": difficulty_level
        })
    
    async def generate_contextual_learning(self, verification_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate educational content based on a specific verification result
        
        Args:
            verification_result: Result from fact-checking
            
        Returns:
            Educational content tailored to the verification result
        """
        try:
            # Extract relevant information from verification result
            verdict = verification_result.get("verdict", "uncertain")
            message = verification_result.get("message", "")
            details = verification_result.get("details", {})
            
            # Generate contextual learning content
            prompt = f"""
            Based on this fact-checking result, create educational content to help users learn:
            
            VERDICT: {verdict}
            MESSAGE: {message}
            DETAILS: {json.dumps(details, indent=2)}
            
            Create learning content that explains:
            1. What this result means
            2. What red flags were found (if any)
            3. How to verify similar claims in the future
            4. Key lessons learned
            
            Respond in JSON format:
            {{
                "learning_summary": "What users learned from this verification",
                "red_flags_found": ["List of red flags detected"],
                "verification_techniques": ["Techniques used to verify"],
                "future_tips": ["Tips for similar situations"],
                "key_lessons": ["Main takeaways"],
                "related_topics": ["Related educational topics to explore"]
            }}
            """
            
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            if response_text.startswith('```json'):
                response_text = response_text.replace('```json', '').replace('```', '').strip()
            elif response_text.startswith('```'):
                response_text = response_text.replace('```', '').strip()
            
            return json.loads(response_text)
            
        except Exception as e:
            print(f"Contextual learning generation failed: {e}")
            return {
                "learning_summary": "Learn to verify information systematically",
                "red_flags_found": [],
                "verification_techniques": ["Source checking", "Cross-referencing"],
                "future_tips": ["Always verify before sharing"],
                "key_lessons": ["Critical thinking is essential"],
                "related_topics": ["Source credibility", "Fact-checking basics"]
            }