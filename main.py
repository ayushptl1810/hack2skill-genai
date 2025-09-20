from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from typing import Optional, List, Dict
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
import tempfile
from pathlib import Path

from services.image_verifier import ImageVerifier
from services.video_verifier import VideoVerifier
from services.input_processor import InputProcessor
from utils.file_utils import save_upload_file, cleanup_temp_files

app = FastAPI(
    title="Visual Verification Service",
    description="A service to verify images/videos and generate visual counter-measures",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static directory for local assets (e.g., extracted frames)
import os
os.makedirs("public/frames", exist_ok=True)
app.mount("/static", StaticFiles(directory="public"), name="static")

# Initialize verifiers and input processor
image_verifier = ImageVerifier()
video_verifier = VideoVerifier()
input_processor = InputProcessor()

@app.get("/")
async def root():
    return {"message": "Visual Verification Service is running"}

@app.post("/verify/image")
async def verify_image(
    file: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    claim_context: str = Form("Unknown context"),
    claim_date: str = Form("Unknown date")
):
    """
    Verify a single image and generate a visual counter-measure
    """
    try:
        # Save uploaded file temporarily
        temp_file_path = None
        if file is not None:
            temp_file_path = await save_upload_file(file)
        
        # Verify image
        result = await image_verifier.verify(
            image_path=temp_file_path,
            claim_context=claim_context,
            claim_date=claim_date,
            image_url=image_url
        )
        
        # Clean up temp file
        if temp_file_path:
            cleanup_temp_files([temp_file_path])
        
        return result
            
    except Exception as e:
        # Clean up on error
        if 'temp_file_path' in locals() and temp_file_path:
            cleanup_temp_files([temp_file_path])
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/verify/video")
async def verify_video(
    file: Optional[UploadFile] = File(None),
    video_url: Optional[str] = Form(None),
    claim_context: str = Form("Unknown context"),
    claim_date: str = Form("Unknown date")
):
    """
    Verify a video and generate a visual counter-measure video
    """
    try:
        # Save uploaded file temporarily
        temp_file_path = None
        if file is not None:
            temp_file_path = await save_upload_file(file)
        
        # Verify video
        result = await video_verifier.verify(
            video_path=temp_file_path,
            claim_context=claim_context,
            claim_date=claim_date,
            video_url=video_url
        )
        
        # Clean up temp file
        if temp_file_path:
            cleanup_temp_files([temp_file_path])
        
        return result
            
    except Exception as e:
        # Clean up on error
        if 'temp_file_path' in locals() and temp_file_path:
            cleanup_temp_files([temp_file_path])
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chatbot/verify")
async def chatbot_verify(
    text_input: Optional[str] = Form(None),
    files: Optional[List[UploadFile]] = File(None)
):
    """
    Chatbot-friendly endpoint that intelligently processes input and routes to appropriate verification
    """
    try:
        # Process input with LLM
        processed_input = await input_processor.process_input(
            text_input=text_input,
            files=files
        )
        
        if "error" in processed_input:
            return {"error": processed_input["error"]}
        
        verification_type = processed_input["verification_type"]
        content = processed_input["content"]
        claim_context = processed_input["claim_context"]
        claim_date = processed_input["claim_date"]
        
        results = []
        temp_files_to_cleanup = []
        
        # Process files if any
        for file_path in content["files"]:
            temp_files_to_cleanup.append(file_path)
            
            if verification_type == "image":
                result = await image_verifier.verify(
                    image_path=file_path,
                    claim_context=claim_context,
                    claim_date=claim_date
                )
            else:  # video
                result = await video_verifier.verify(
                    video_path=file_path,
                    claim_context=claim_context,
                    claim_date=claim_date
                )
            
            result["source"] = "uploaded_file"
            results.append(result)
        
        # Process URLs if any
        for url in content["urls"]:
            if verification_type == "image":
                result = await image_verifier.verify(
                    image_url=url,
                    claim_context=claim_context,
                    claim_date=claim_date
                )
            else:  # video
                result = await video_verifier.verify(
                    video_url=url,
                    claim_context=claim_context,
                    claim_date=claim_date
                )
            
            result["source"] = "url"
            results.append(result)
        
        # Clean up temp files
        if temp_files_to_cleanup:
            input_processor.cleanup_temp_files(temp_files_to_cleanup)
        
        # Build a single concise chatbot message
        overall = _aggregate_verdicts(results)
        # Prefer consolidated video summary when present, else per-item message
        candidates: List[str] = []
        for r in results:
            if isinstance(r, dict):
                details = r.get("details") or {}
                if isinstance(details, dict) and details.get("overall_summary"):
                    candidates.append(str(details.get("overall_summary")))
                elif r.get("message"):
                    candidates.append(str(r.get("message")))
        best_msg = max(candidates, key=len) if candidates else ""
        # Avoid duplication by detecting if clarification already begins with a verdict phrase
        verdict_prefixes = [
            "this claim is true:",
            "this claim is false:",
            "this claim is uncertain:",
            "this claim has mixed evidence:",
            "the claim is true:",
            "the claim is false:",
            "the claim is uncertain:",
            "result:",
        ]
        prefix_map = {
            "true": "This claim is true:",
            "false": "This claim is false:",
            "uncertain": "This claim is uncertain:",
            "mixed": "This claim has mixed evidence:",
            "no_content": "No verifiable content found:",
        }
        prefix = prefix_map.get(overall, "Result:")
        lower_msg = (best_msg or "").strip().lower()
        if best_msg and any(lower_msg.startswith(p) for p in verdict_prefixes):
            final_message = best_msg.strip()
        else:
            final_message = f"{prefix} {best_msg}" if best_msg else prefix
        return {"message": final_message}
            
    except Exception as e:
        # Clean up any temp files on error
        if 'temp_files_to_cleanup' in locals():
            input_processor.cleanup_temp_files(temp_files_to_cleanup)
        raise HTTPException(status_code=500, detail=str(e))

def _aggregate_verdicts(results: List[Dict]) -> str:
    """Aggregate individual verification results into overall verdict.

    Supports both image results (with 'verdict') and video results (with details.overall_verdict).
    """
    if not results:
        return "no_content"
    
    normalized: List[str] = []
    for r in results:
        # Prefer explicit boolean 'verified' if present
        if "verified" in r and isinstance(r.get("verified"), bool):
            v = "true" if r.get("verified") else "false"
        else:
            v = r.get("verdict")
        if not v:
            details = r.get("details") or {}
            v = details.get("overall_verdict")
        normalized.append((v or "unknown").lower())
    
    # If any false, overall is false
    if "false" in normalized:
        return "false"
    
    # If any uncertain, overall is uncertain
    if "uncertain" in normalized:
        return "uncertain"
    
    # If all true, overall is true
    if all(v == "true" for v in normalized):
        return "true"
    
    return "mixed"

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "visual-verification"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
