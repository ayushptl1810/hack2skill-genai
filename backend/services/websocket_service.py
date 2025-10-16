"""
WebSocket Service for Real-time Updates
Handles WebSocket connections and MongoDB Change Streams for real-time data updates
"""

import asyncio
import json
import logging
from typing import Set, Dict, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import os
from dotenv import load_dotenv

load_dotenv()

# Setup logging
logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections"""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.connection_data: Dict[WebSocket, Dict[str, Any]] = {}
    
    async def connect(self, websocket: WebSocket, client_info: Optional[Dict[str, Any]] = None):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        self.active_connections.add(websocket)
        self.connection_data[websocket] = client_info or {}
        logger.info(f"✅ WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            if websocket in self.connection_data:
                del self.connection_data[websocket]
            logger.info(f"🔌 WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send a message to a specific WebSocket connection"""
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"❌ Failed to send personal message: {e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: str):
        """Broadcast a message to all connected WebSocket clients"""
        if not self.active_connections:
            logger.warning("⚠️ No active connections to broadcast to")
            return
        
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"❌ Failed to broadcast to connection: {e}")
                disconnected.add(connection)
        
        # Clean up disconnected connections
        for connection in disconnected:
            self.disconnect(connection)
        
        logger.info(f"📡 Broadcasted message to {len(self.active_connections)} connections")

class MongoDBChangeStreamService:
    """Service to monitor MongoDB changes and notify WebSocket clients"""
    
    def __init__(self, connection_string: Optional[str] = None):
        """Initialize MongoDB connection for change streams"""
        self.connection_string = connection_string or os.getenv('MONGO_CONNECTION_STRING')
        
        if not self.connection_string:
            raise ValueError("MongoDB connection string is required. Set MONGO_CONNECTION_STRING environment variable.")
        
        self.client = None
        self.db = None
        self.collection = None
        self.change_stream = None
        self.is_running = False
        
        self._connect()
    
    def _connect(self):
        """Establish MongoDB connection"""
        try:
            self.client = MongoClient(self.connection_string)
            # Test connection
            self.client.admin.command('ping')
            
            # Use 'aegis' database
            self.db = self.client['aegis']
            self.collection = self.db['debunk_posts']
            
            logger.info("✅ MongoDB Change Stream service connected successfully")
            
        except ConnectionFailure as e:
            logger.error(f"❌ Failed to connect to MongoDB for change streams: {e}")
            raise
    
    async def start_change_stream(self, connection_manager: ConnectionManager):
        """Start monitoring MongoDB changes and broadcast to WebSocket clients"""
        if self.is_running:
            logger.warning("⚠️ Change stream is already running")
            return
        
        try:
            # Check if MongoDB supports change streams (replica set)
            try:
                # Try to create change stream to watch for insertions
                self.change_stream = self.collection.watch([
                    {
                        '$match': {
                            'operationType': 'insert'
                        }
                    }
                ])
                
                self.is_running = True
                logger.info("🔄 Started MongoDB change stream monitoring")
                
                # Process change stream events
                async def process_changes():
                    try:
                        while self.is_running:
                            if self.change_stream:
                                # Check for new changes (non-blocking)
                                try:
                                    change = self.change_stream.try_next()
                                    if change:
                                        await self._handle_change(change, connection_manager)
                                    else:
                                        # No changes, sleep briefly
                                        await asyncio.sleep(0.5)
                                except Exception as e:
                                    logger.error(f"❌ Error processing change: {e}")
                                    await asyncio.sleep(1)  # Brief pause on error
                                    continue
                            else:
                                await asyncio.sleep(1)
                            
                    except Exception as e:
                        logger.error(f"❌ Error in change stream processing: {e}")
                    finally:
                        self.is_running = False
                
                # Start the change stream processing in the background
                asyncio.create_task(process_changes())
                
            except Exception as change_stream_error:
                logger.warning(f"⚠️ MongoDB change streams not available: {change_stream_error}")
                logger.info("🔄 Change streams require MongoDB replica set. WebSocket will work for manual updates.")
                # Don't fail completely, just disable change streams
                self.is_running = False
                self.change_stream = None
            
        except Exception as e:
            logger.error(f"❌ Failed to start change stream: {e}")
            self.is_running = False
            # Don't raise the exception, allow WebSocket to work without change streams
    
    async def _handle_change(self, change: Dict[str, Any], connection_manager: ConnectionManager):
        """Handle a MongoDB change event"""
        try:
            logger.info(f"🔄 MongoDB change detected: {change.get('operationType')}")
            
            # Extract the new document
            new_document = change.get('fullDocument')
            if not new_document:
                logger.warning("⚠️ No full document in change event")
                return
            
            # Convert ObjectId to string for JSON serialization
            if '_id' in new_document:
                new_document['_id'] = str(new_document['_id'])
            
            # Create the broadcast message
            message = {
                "type": "new_post",
                "data": {
                    "post": new_document,
                    "timestamp": change.get('clusterTime'),
                    "operation": change.get('operationType')
                }
            }
            
            # Broadcast to all connected clients
            await connection_manager.broadcast(json.dumps(message))
            logger.info(f"📡 Broadcasted new post to {len(connection_manager.active_connections)} clients")
            
        except Exception as e:
            logger.error(f"❌ Error handling MongoDB change: {e}")
    
    def stop_change_stream(self):
        """Stop the MongoDB change stream"""
        self.is_running = False
        if self.change_stream:
            self.change_stream.close()
            self.change_stream = None
        logger.info("🛑 Stopped MongoDB change stream")
    

    def close(self):
        """Close MongoDB connection"""
        self.stop_change_stream()
        if self.client:
            self.client.close()
            logger.info("🔌 MongoDB Change Stream service connection closed")

# Global instances
connection_manager = ConnectionManager()
mongodb_change_service = None

async def initialize_mongodb_change_stream():
    """Initialize the MongoDB change stream service"""
    global mongodb_change_service
    
    try:
        mongodb_change_service = MongoDBChangeStreamService()
        await mongodb_change_service.start_change_stream(connection_manager)
        logger.info("✅ MongoDB Change Stream service initialized successfully")
        return mongodb_change_service
    except Exception as e:
        logger.error(f"❌ Failed to initialize MongoDB Change Stream service: {e}")
        return None

async def cleanup_mongodb_change_stream():
    """Cleanup the MongoDB change stream service"""
    global mongodb_change_service
    
    if mongodb_change_service:
        mongodb_change_service.close()
        mongodb_change_service = None
        logger.info("🧹 MongoDB Change Stream service cleaned up")
