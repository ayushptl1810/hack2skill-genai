import os
import re
import json
from typing import Dict, List, Optional, Union, Tuple
import google.generativeai as genai
import tempfile
from config import config

class InputProcessor:
    """
    Intelligent input processor that converts chatbot input into structured verification requests
    """
    
    def __init__(self):
        # Configure Gemini
        genai.configure(api_key=config.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(
            config.GEMINI_MODEL,
            generation_config=genai.types.GenerationConfig(
                temperature=config.GEMINI_TEMPERATURE,
                top_p=config.GEMINI_TOP_P,
                max_output_tokens=config.GEMINI_MAX_TOKENS
            )
        )
        
        self.system_prompt = """You are an intelligent input processor for a visual verification service. 
        
Your task is to analyze user input and extract:
1. Image/video content (files, URLs, or descriptions)
2. Claim context (what the user is claiming)
3. Claim date (when the claim was made)
4. Type of verification needed (image, video, or text)

Return a JSON response with this structure:
{
    "verification_type": "image" or "video" or "text",
    "content": {
        "files": ["list of file paths if files provided"],
        "urls": ["list of image/video URLs"],
        "descriptions": ["list of text descriptions"],
        "text": "the text claim to verify (if verification_type is text)"
    },
    "claim_context": "extracted or inferred claim context",
    "claim_date": "extracted or inferred date"
}

Rules:
- If multiple images/videos are mentioned, separate them clearly
- Extract URLs from text using regex patterns
- Infer context from surrounding text if not explicitly stated
- If no date is mentioned leave it blank
- Handle mixed content types appropriately"""

    async def process_input(
        self, 
        text_input: Optional[str] = None, 
        files: Optional[List] = None
    ) -> Dict:
        """
        Process chatbot input and return structured verification request
        """
        try:
            # Prepare input for LLM analysis
            input_text = self._prepare_input_text(text_input, files)
            
            # Get LLM analysis
            llm_response = await self._analyze_with_llm(input_text)
            
            # Parse and validate LLM response
            parsed_response = self._parse_llm_response(llm_response)
            
            # Post-process and enhance the response
            final_response = await self._post_process_response(parsed_response, files)
            
            return final_response
            
        except Exception as e:
            return {
                "error": f"Failed to process input: {str(e)}",
                "verification_type": "unknown",
                "content": {"files": [], "urls": [], "descriptions": []},
                "claim_context": "Unknown context",
                "claim_date": "Unknown date",
            }

    def _prepare_input_text(self, text_input: Optional[str], files: Optional[List]) -> str:
        """Prepare input text for LLM analysis"""
        input_parts = []
        
        if text_input:
            input_parts.append(f"Text input: {text_input}")
        
        if files:
            file_info = []
            for i, file in enumerate(files):
                file_info.append(f"File {i+1}: {file.filename} ({file.content_type})")
            input_parts.append(f"Files provided: {'; '.join(file_info)}")
        
        if not input_parts:
            input_parts.append("No text or files provided")
        
        return "\n".join(input_parts)

    async def _analyze_with_llm(self, input_text: str) -> str:
        """Use Gemini to analyze the input"""
        try:
            prompt = f"{self.system_prompt}\n\nUser input: {input_text}"
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            # Fallback to rule-based parsing if LLM fails
            return self._fallback_parsing(input_text)

    def _fallback_parsing(self, input_text: str) -> str:
        """Fallback parsing when LLM is unavailable"""
        # Extract URLs using regex
        url_pattern = r'https?://[^\s<>"]+|www\.[^\s<>"]+'
        urls = re.findall(url_pattern, input_text)
        
        # Simple content type detection
        verification_type = "image"  # default
        if any(ext in input_text.lower() for ext in ['.mp4', '.avi', '.mov', 'video']):
            verification_type = "video"
        
        # Extract date patterns
        date_pattern = r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}'
        dates = re.findall(date_pattern, input_text)
        claim_date = dates[0] if dates else "Unknown date"
        
        return json.dumps({
            "verification_type": verification_type,
            "content": {
                "files": [],
                "urls": urls,
                "descriptions": [input_text]
            },
            "claim_context": "Extracted from input",
            "claim_date": claim_date,
        })

    def _parse_llm_response(self, llm_response: str) -> Dict:
        """Parse and validate LLM response"""
        try:
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', llm_response, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
            else:
                raise ValueError("No JSON found in response")
            
            # Validate required fields
            required_fields = ["verification_type", "content", "claim_context", "claim_date"]
            for field in required_fields:
                if field not in parsed:
                    raise ValueError(f"Missing required field: {field}")
            
            return parsed
            
        except Exception as e:
            # Return safe defaults if parsing fails
            return {
                "verification_type": "image",
                "content": {"files": [], "urls": [], "descriptions": []},
                "claim_context": "Unknown context",
                "claim_date": "Unknown date",
            }

    async def _post_process_response(self, parsed_response: Dict, files: Optional[List]) -> Dict:
        """Post-process the parsed response and add file information"""
        # Add actual file information if files were provided
        if files:
            file_paths = []
            for file in files:
                # Save file temporarily and get path
                temp_path = await self._save_temp_file(file)
                if temp_path:
                    file_paths.append(temp_path)
            
            parsed_response["content"]["files"] = file_paths
        
        return parsed_response

    async def _save_temp_file(self, file) -> Optional[str]:
        """Save uploaded file temporarily and return path"""
        try:
            # Create temp file
            import os
            suffix = os.path.splitext(file.filename)[1] if file.filename else ""
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                content = await file.read()
                temp_file.write(content)
                return temp_file.name
        except Exception as e:
            print(f"Failed to save temp file: {e}")
            return None

    def cleanup_temp_files(self, file_paths: List[str]):
        """Clean up temporary files"""
        for path in file_paths:
            try:
                if os.path.exists(path):
                    os.unlink(path)
            except Exception as e:
                print(f"Failed to cleanup temp file {path}: {e}")
