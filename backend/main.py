from fastapi import FastAPI, File, UploadFile, HTTPException, Form, WebSocket, WebSocketDisconnect
from typing import Optional, List, Dict, Any
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
import tempfile
from pathlib import Path
import asyncio
import logging
import json

from services.image_verifier import ImageVerifier
from services.video_verifier import VideoVerifier
from services.input_processor import InputProcessor
from services.text_fact_checker import TextFactChecker
from services.educational_content_generator import EducationalContentGenerator
from services.mongodb_service import MongoDBService
from services.websocket_service import connection_manager, initialize_mongodb_change_stream, cleanup_mongodb_change_stream
from utils.file_utils import save_upload_file, cleanup_temp_files

app = FastAPI(
    title="Visual Verification Service",
    description="A service to verify images/videos and generate visual counter-measures",
    version="1.0.0"
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
text_fact_checker = TextFactChecker()
educational_generator = EducationalContentGenerator()

# Initialize MongoDB service
mongodb_service = None
try:
    mongodb_service = MongoDBService()
except Exception as e:
    print(f"Warning: MongoDB service initialization failed: {e}")

# Initialize MongoDB change service (will be set in startup event)
mongodb_change_service = None

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global mongodb_change_service
    try:
        mongodb_change_service = await initialize_mongodb_change_stream()
        logger.info("✅ All services initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize services: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup services on shutdown"""
    try:
        await cleanup_mongodb_change_stream()
        logger.info("🧹 All services cleaned up successfully")
    except Exception as e:
        logger.error(f"❌ Error during cleanup: {e}")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await connection_manager.connect(websocket, {"connected_at": asyncio.get_event_loop().time()})
    logger.info(f"✅ WebSocket client connected. Total connections: {len(connection_manager.active_connections)}")
    
    try:
        while True:
            try:
                # Wait for incoming messages with a timeout
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                
                # Echo back a response (optional)
                await connection_manager.send_personal_message(
                    json.dumps({"type": "pong", "message": "Connection active"}), 
                    websocket
                )
            except asyncio.TimeoutError:
                # Send a ping to keep connection alive
                await connection_manager.send_personal_message(
                    json.dumps({"type": "ping", "message": "Keep alive"}), 
                    websocket
                )
            except Exception as e:
                logger.error(f"❌ Error in WebSocket message handling: {e}")
                break
                
    except WebSocketDisconnect:
        logger.info("🔌 WebSocket client disconnected normally")
        connection_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"❌ WebSocket error: {e}")
        connection_manager.disconnect(websocket)

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

@app.post("/verify/text")
async def verify_text(
    text_input: str = Form(...),
    claim_context: str = Form("Unknown context"),
    claim_date: str = Form("Unknown date")
):
    """
    Verify a textual claim using Google's Fact Check Tools API
    """
    try:
        # Verify text claim
        result = await text_fact_checker.verify(
            text_input=text_input,
            claim_context=claim_context,
            claim_date=claim_date
        )
        
        return result
            
    except Exception as e:
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
        
        # Handle text-only verification
        if verification_type == "text" and content.get("text"):
            result = await text_fact_checker.verify(
                text_input=content["text"],
                claim_context=claim_context,
                claim_date=claim_date
            )
            result["source"] = "text_input"
            results.append(result)
        
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
        return {
            "message": final_message,
            "verdict": overall,
            "details": {
                "results": results,
                "verification_type": verification_type,
                "claim_context": claim_context,
                "claim_date": claim_date
            }
        }
            
    except Exception as e:
        # Clean up any temp files on error
        if 'temp_files_to_cleanup' in locals():
            input_processor.cleanup_temp_files(temp_files_to_cleanup)
        raise HTTPException(status_code=500, detail=str(e))

def _aggregate_verdicts(results: List[Dict]) -> str:
    """Aggregate individual verification results into overall verdict.

    Supports image results (with 'verdict'), video results (with details.overall_verdict), 
    and text results (with 'verdict').
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

@app.get("/mongodb/recent-posts")
async def get_recent_debunk_posts(limit: int = 5):
    """
    Get recent debunk posts from MongoDB
    
    Args:
        limit: Maximum number of posts to return (default: 5)
        
    Returns:
        List of recent debunk posts
    """
    try:
        print(f"🔍 DEBUG: Endpoint called with limit={limit}")
        print(f"🔍 DEBUG: MongoDB service available: {mongodb_service is not None}")
        
        if not mongodb_service:
            print("❌ DEBUG: MongoDB service is None!")
            raise HTTPException(
                status_code=503, 
                detail="MongoDB service is not available. Check MONGO_CONNECTION_STRING environment variable."
            )
        
        print("🔍 DEBUG: Calling mongodb_service.get_recent_posts()")
        posts = mongodb_service.get_recent_posts(limit)
        print(f"🔍 DEBUG: Service returned {len(posts)} posts")
        
        if posts:
            print(f"🔍 DEBUG: First post keys: {list(posts[0].keys())}")
            print(f"🔍 DEBUG: First post _id: {posts[0].get('_id')}")
        else:
            print("⚠️ DEBUG: No posts returned from service")
        
        result = {
            "success": True,
            "count": len(posts),
            "posts": posts
        }
        
        print(f"🔍 DEBUG: Returning result with {len(posts)} posts")
        return result
        
    except Exception as e:
        print(f"❌ DEBUG: Exception in endpoint: {e}")
        print(f"🔍 DEBUG: Exception type: {type(e).__name__}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "visual-verification"}


# Educational Content API Endpoints
@app.get("/educational/modules")
async def get_educational_modules():
    """Get list of available educational modules"""
    try:
        modules_data = await educational_generator.get_modules_list()
        return modules_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/educational/modules/{module_id}")
async def get_module_content(
    module_id: str,
    difficulty_level: str = "beginner"
):
    """Get educational content for a specific module"""
    try:
        content = await educational_generator.generate_module_content(
            module_id, difficulty_level
        )
        return content
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/educational/contextual-learning")
async def get_contextual_learning(verification_result: Dict[str, Any]):
    """Generate educational content based on verification result"""
    try:
        content = await educational_generator.generate_contextual_learning(
            verification_result
        )
        return content
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/educational/clear-cache")
async def clear_educational_cache():
    """Clear all educational content from Redis cache"""
    try:
        if educational_generator.redis_client:
            # Get all educational cache keys
            keys = educational_generator.redis_client.keys("educational:*")
            if keys:
                educational_generator.redis_client.delete(*keys)
                return {"message": f"Cleared {len(keys)} cache entries", "keys": keys}
            else:
                return {"message": "No cache entries found"}
        else:
            return {"message": "Redis not available"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/educational/cache-status")
async def get_cache_status():
    """Get status of educational content cache"""
    try:
        if educational_generator.redis_client:
            keys = educational_generator.redis_client.keys("educational:*")
            cache_info = {}
            for key in keys:
                ttl = educational_generator.redis_client.ttl(key)
                cache_info[key] = {
                    "ttl": ttl,
                    "exists": ttl > 0
                }
            return {
                "redis_connected": True,
                "total_keys": len(keys),
                "cache_info": cache_info
            }
        else:
            return {"redis_connected": False, "message": "Redis not available"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
