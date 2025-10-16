"""
MongoDB Service for Backend
Handles MongoDB operations for debunk posts
"""

import os
import logging
from typing import List, Dict, Any, Optional
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from dotenv import load_dotenv

load_dotenv()

# Setup logging
logger = logging.getLogger(__name__)

class MongoDBService:
    """MongoDB service for backend operations"""
    
    def __init__(self, connection_string: Optional[str] = None):
        """Initialize MongoDB connection
        
        Args:
            connection_string: MongoDB connection string. If None, uses MONGO_CONNECTION_STRING env var
        """
        self.connection_string = connection_string or os.getenv('MONGO_CONNECTION_STRING')
        
        if not self.connection_string:
            raise ValueError("MongoDB connection string is required. Set MONGO_CONNECTION_STRING environment variable.")
        
        self.client = None
        self.db = None
        self.collection = None
        
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
            
            logger.info("✅ Successfully connected to MongoDB")
            
        except ConnectionFailure as e:
            logger.error(f"❌ Failed to connect to MongoDB: {e}")
            raise
    
    def get_recent_posts(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Get recent debunk posts from MongoDB
        
        Args:
            limit: Maximum number of posts to return
            
        Returns:
            List of recent debunk posts
        """
        try:
            logger.info(f"🔍 DEBUG: Starting get_recent_posts with limit={limit}")
            logger.info(f"🔍 DEBUG: Collection name: {self.collection.name}")
            logger.info(f"🔍 DEBUG: Database name: {self.db.name}")
            
            # Check if collection exists and has documents
            total_count = self.collection.count_documents({})
            logger.info(f"🔍 DEBUG: Total documents in collection: {total_count}")
            
            if total_count == 0:
                logger.warning("⚠️ DEBUG: Collection is empty!")
                return []
            
            # Get sample document to check structure
            sample_doc = self.collection.find_one()
            if sample_doc:
                logger.info(f"🔍 DEBUG: Sample document keys: {list(sample_doc.keys())}")
                logger.info(f"🔍 DEBUG: Sample document _id: {sample_doc.get('_id')}")
                logger.info(f"🔍 DEBUG: Sample document stored_at: {sample_doc.get('stored_at')}")
            else:
                logger.warning("⚠️ DEBUG: No sample document found!")
            
            posts = list(self.collection
                        .find()
                        .sort("stored_at", -1)
                        .limit(limit))
            
            logger.info(f"🔍 DEBUG: Raw query returned {len(posts)} posts")
            
            # Convert ObjectId to string for JSON serialization
            for i, post in enumerate(posts):
                if '_id' in post:
                    post['_id'] = str(post['_id'])
                logger.info(f"🔍 DEBUG: Post {i+1} keys: {list(post.keys())}")
                logger.info(f"🔍 DEBUG: Post {i+1} stored_at: {post.get('stored_at')}")
            
            logger.info(f"📋 Retrieved {len(posts)} recent debunk posts")
            return posts
            
        except Exception as e:
            logger.error(f"❌ Failed to get recent posts: {e}")
            logger.error(f"🔍 DEBUG: Exception type: {type(e).__name__}")
            logger.error(f"🔍 DEBUG: Exception details: {str(e)}")
            return []

    def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("🔌 MongoDB connection closed")
