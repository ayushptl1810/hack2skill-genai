import requests
import json
from typing import Dict, List, Optional, Any
import google.generativeai as genai
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from config import config


class TextFactChecker:
    """Service for fact-checking textual claims using Google Custom Search API with fact-checking sites"""
    
    def __init__(self):
        self.api_key = config.GOOGLE_API_KEY
        self.search_engine_id = config.GOOGLE_FACT_CHECK_CX
        self.base_url = "https://www.googleapis.com/customsearch/v1"
        
        # Configure Gemini for analysis
        genai.configure(api_key=config.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(config.GEMINI_MODEL)
        
        if not self.api_key:
            raise ValueError("Google Custom Search API key is required")
        if not self.search_engine_id:
            raise ValueError("Google Custom Search Engine ID (cx) is required")
    
    async def verify(self, text_input: str, claim_context: str = "Unknown context", claim_date: str = "Unknown date") -> Dict[str, Any]:
        """
        Verify a textual claim using a hybrid two-step approach:
        Step 1: Search curated fact-checking sources
        Step 2: If uncertain/no_content, fallback to Gemini's general knowledge
        
        Args:
            text_input: The text claim to verify
            claim_context: Context about the claim
            claim_date: Date when the claim was made
            
        Returns:
            Dictionary containing verification results
        """
        try:
            print(f"🔍 DEBUG: TextFactChecker.verify called")
            print(f"🔍 DEBUG: text_input = {text_input}")
            print(f"🔍 DEBUG: claim_context = {claim_context}")
            print(f"🔍 DEBUG: claim_date = {claim_date}")
            print(f"Starting verification for: {text_input}")
            
            # STEP 1: Search for fact-checked claims in curated sources
            search_results = await self._search_claims(text_input)
            print(f"🔍 DEBUG: search_results = {search_results}")
            
            analysis = None
            if search_results:
                # Analyze the search results with Gemini
                analysis = self._analyze_results(search_results, text_input)
            
            # STEP 2: Check if we need to fallback to general knowledge
            # Trigger fallback if: no results, or uncertain/no_content verdict
            should_fallback = (
                not search_results or
                (analysis and analysis.get("verdict") in ["uncertain", "no_content"])
            )
            
            if should_fallback:
                print("🔄 STEP 2: Curated sources insufficient, falling back to Gemini general knowledge...")
                fallback_analysis = await self._verify_with_general_knowledge(text_input, claim_context, claim_date)
                
                # If fallback succeeded, use it; otherwise keep original analysis
                if fallback_analysis and fallback_analysis.get("verdict") not in ["uncertain", "no_content", "error"]:
                    print("✅ Fallback to general knowledge succeeded")
                    return {
                        "verified": fallback_analysis["verified"],
                        "verdict": fallback_analysis["verdict"],
                        "message": fallback_analysis["message"],
                        "details": {
                            "claim_text": text_input,
                            "claim_context": claim_context,
                            "claim_date": claim_date,
                            "fact_checks": search_results if search_results else [],
                            "analysis": fallback_analysis,
                            "verification_method": "general_knowledge_fallback"
                        }
                    }
                else:
                    print("⚠️ Fallback also uncertain, returning original analysis")
            
            # Return original curated source analysis
            if not analysis:
                analysis = {
                    "verified": False,
                    "verdict": "no_content",
                    "message": "No fact-checked information found for this claim"
                }
            
            return {
                "verified": analysis["verified"],
                "verdict": analysis["verdict"],
                "message": analysis["message"],
                "details": {
                    "claim_text": text_input,
                    "claim_context": claim_context,
                    "claim_date": claim_date,
                    "fact_checks": search_results if search_results else [],
                    "analysis": analysis,
                    "verification_method": "curated_sources"
                }
            }
            
        except Exception as e:
            print(f"❌ Error in verify: {e}")
            return {
                "verified": False,
                "verdict": "error",
                "message": f"Error during fact-checking: {str(e)}",
                "details": {
                    "claim_text": text_input,
                    "claim_context": claim_context,
                    "claim_date": claim_date,
                    "error": str(e)
                }
            }
    
    async def _search_claims(self, query: str) -> List[Dict[str, Any]]:
        """
        Search for fact-checked claims using Google Custom Search API with LLM-powered fallback strategies
        
        Args:
            query: The search query
            
        Returns:
            List of search results
        """
        # Try the original query first
        results = await self._perform_search(query)
        
        # If no results, use LLM to create alternative queries
        if not results:
            print("No results found, using LLM to create alternative queries...")
            
            alternative_queries = self._create_alternative_queries(query)
            print(f"Generated alternative queries: {alternative_queries}")

            results = await self._perform_search(alternative_queries)
            if results:
                print(f"Found {len(results)} results with alternative query")
            else:
                print("No results found with alternative query")
        return results
    
    async def _perform_search(self, query: str) -> List[Dict[str, Any]]:
        """
        Perform a single search request
        
        Args:
            query: The search query
            
        Returns:
            List of search results
        """
        params = {
            "q": query,
            "key": self.api_key,
            "cx": self.search_engine_id,
            "num": 10  # Limit results to 10 for better performance
        }
        
        try:
            print(f"Making request to: {self.base_url}")
            print(f"Params: {params}")
            
            response = requests.get(self.base_url, params=params, timeout=30)
            print(f"Response status: {response.status_code}")
            print(f"Response text: {response.text}")
            
            response.raise_for_status()
            
            data = response.json()
            items = data.get("items", [])
            
            return items
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"API request failed: {str(e)}")
        except json.JSONDecodeError as e:
            raise Exception(f"Failed to parse API response: {str(e)}")
        except Exception as e:
            raise Exception(f"Search error: {str(e)}")
    
    def _create_alternative_queries(self, query: str) -> List[str]:
        """
        Use LLM to create alternative search queries (broader and simpler)
        
        Args:
            query: Original query
            
        Returns:
            List of alternative queries to try
        """
        prompt = f"""
You are a search query optimizer. Given a fact-checking query that returned no results, create alternative queries that might find relevant information.

ORIGINAL QUERY: "{query}"

Create an alternative query:
1. A BROADER query that removes specific assumptions and focuses on key entities/events

Examples:
- "Is it true the CEO of Astronomer resigned because of toxic workplace allegations?" 
  → Broader: "Astronomer CEO resignation"

- "Did Apple release a new iPhone with 5G in 2023?"
  → Broader: "Apple iPhone 2023 release"

Respond in this exact JSON format:
{{
    "broader_query": "your broader query here",
}}
"""
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Try to parse JSON response
            if response_text.startswith('```json'):
                response_text = response_text.replace('```json', '').replace('```', '').strip()
            elif response_text.startswith('```'):
                response_text = response_text.replace('```', '').strip()
            
            alternatives = json.loads(response_text)
            
            # Return both alternatives
            queries = []
            if alternatives.get("broader_query") and alternatives["broader_query"] != query:
                queries.append(alternatives["broader_query"])
            if alternatives.get("simpler_query") and alternatives["simpler_query"] != query:
                queries.append(alternatives["simpler_query"])
            
            return queries
            
        except Exception as e:
            print(f"Failed to create alternative queries with LLM: {e}")
    
    def _analyze_results(self, results: List[Dict[str, Any]], original_text: str) -> Dict[str, Any]:
        """
        Analyze the search results using Gemini AI to determine overall verdict
        
        Args:
            results: List of search results from the API
            original_text: The original text being verified
            
        Returns:
            Analysis results including verdict and message
        """
        if not results:
            return {
                "verified": False,
                "verdict": "no_content",
                "message": "No fact-checked information found for this claim"
            }
        
        # Filter relevant results
        relevant_results = []
        for result in results:
            title = result.get("title", "").lower()
            snippet = result.get("snippet", "").lower()
            original_lower = original_text.lower()
            
            # Check if the result is relevant to our original text
            relevance_score = self._calculate_relevance(result, original_text)
            
            print(f"Relevance score for '{title[:50]}...': {relevance_score:.3f}")
            if relevance_score > 0.05:  # Very low threshold to catch all relevant results
                relevant_results.append(result)
        
        if not relevant_results:
            return {
                "verified": False,
                "verdict": "no_content",
                "message": "No relevant fact-checked information found for this specific claim"
            }
        
        # Use Gemini to analyze the results
        try:
            analysis = self._analyze_with_gemini(original_text, relevant_results)
            return analysis
        except Exception as e:
            print(f"Gemini analysis failed: {str(e)}")
            # Fallback to simple analysis
            return self._fallback_analysis(relevant_results)
    
    def _calculate_relevance(self, result: Dict[str, Any], original_text: str) -> float:
        """
        Calculate relevance score using TF-IDF similarity with multiple components
        
        Args:
            result: Search result dictionary
            original_text: Original text being verified
            
        Returns:
            Relevance score between 0 and 1
        """
        score = 0.0
        
        # 1. Title relevance (40% weight)
        title = result.get("title", "")
        if title:
            title_score = self._tfidf_similarity(title, original_text)
            score += title_score * 0.6
        
        # 2. Snippet relevance (30% weight)  
        snippet = result.get("snippet", "")
        if snippet:
            snippet_score = self._tfidf_similarity(snippet, original_text)
            score += snippet_score * 0.4
        
        # 3. Fact-check specific bonus (30% weight)
        factcheck_score = self._has_factcheck_data(result)
        score += factcheck_score * 0.1
        
        return min(1.0, score)
    
    def _tfidf_similarity(self, text1: str, text2: str) -> float:
        """
        Calculate TF-IDF cosine similarity between two texts
        
        Args:
            text1: First text
            text2: Second text
            
        Returns:
            Similarity score between 0 and 1
        """
        if not text1.strip() or not text2.strip():
            return 0.0
        
        try:
            # Preprocess texts
            texts = [self._preprocess_text(text1), self._preprocess_text(text2)]
            
            # Create TF-IDF vectors
            vectorizer = TfidfVectorizer(
                stop_words='english',
                ngram_range=(1, 2),  # Include bigrams
                max_features=500,
                lowercase=True
            )
            
            tfidf_matrix = vectorizer.fit_transform(texts)
            
            # Calculate cosine similarity
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            
            return float(similarity)
            
        except Exception as e:
            print(f"TF-IDF calculation failed: {e}")
            # Fallback to simple word overlap
            return self._simple_word_overlap(text1, text2)
    
    def _preprocess_text(self, text: str) -> str:
        """
        Preprocess text for TF-IDF analysis
        
        Args:
            text: Raw text
            
        Returns:
            Preprocessed text
        """
        import re
        
        # Convert to lowercase
        text = text.lower()
        
        # Remove special characters but keep spaces
        text = re.sub(r'[^\w\s]', ' ', text)
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        return text
    
    def _simple_word_overlap(self, text1: str, text2: str) -> float:
        """
        Fallback similarity calculation using word overlap
        
        Args:
            text1: First text
            text2: Second text
            
        Returns:
            Similarity score between 0 and 1
        """
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union) if union else 0.0
    
    def _has_factcheck_data(self, result: Dict[str, Any]) -> float:
        """
        Check if result has fact-check specific metadata
        
        Args:
            result: Search result dictionary
            
        Returns:
            1.0 if has fact-check data, 0.0 otherwise
        """
        # Check for ClaimReview metadata
        pagemap = result.get("pagemap", {})
        claim_review = pagemap.get("ClaimReview", [])
        
        if claim_review:
            return 1.0
        
        # Check for fact-check related keywords in URL or title
        url = result.get("link", "").lower()
        title = result.get("title", "").lower()
        
        factcheck_keywords = [
            "fact-check", "factcheck", "snopes", "politifact", 
            "factcrescendo", "boomlive", "newschecker", "afp"
        ]
        
        for keyword in factcheck_keywords:
            if keyword in url or keyword in title:
                return 1.0
        
        return 0.0
    
    def _analyze_with_gemini(self, original_text: str, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Use Gemini AI to analyze fact-check results and determine verdict
        
        Args:
            original_text: The original claim being verified
            results: List of relevant search results
            
        Returns:
            Analysis results with verdict and message
        """
        # Prepare the prompt
        results_text = ""
        for i, result in enumerate(results[:5], 1):  # Limit to top 5 results
            title = result.get("title", "")
            snippet = result.get("snippet", "")
            link = result.get("link", "")
            results_text += f"{i}. Title: {title}\n   Snippet: {snippet}\n   Link: {link}\n\n"
        
        prompt = f"""
You are a fact-checking expert. Analyze the following claim against the provided fact-checking sources.

CLAIM TO VERIFY: "{original_text}"

FACT-CHECKING SOURCES:
{results_text}

STEP-BY-STEP ANALYSIS:
1. What does each source say ACTUALLY HAPPENED?
2. What does each source say was FAKE or MISLEADING?
3. Based on the evidence, what is the most likely truth about the claim?

Think through this systematically and provide your analysis.

IMPORTANT INSTRUCTIONS FOR YOUR RESPONSE:
- When referring to sources in your message, DO NOT use specific numbers like "Source 1", "Source 3", or "Sources 2, 4, and 5"
- Instead, use generic references like "the sources", "multiple sources", "one source", "several sources"
- Example: Instead of "Sources 3, 4, and 5 confirm..." say "Multiple sources confirm..." or "The sources confirm..."

Respond in this exact JSON format:
{{
    "verdict": "true|false|mixed|uncertain",
    "verified": true|false,
    "message": "Your explanation here",
    "confidence": "high|medium|low",
    "reasoning": "Your step-by-step reasoning process"
}}
"""
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Try to parse JSON response
            if response_text.startswith('```json'):
                response_text = response_text.replace('```json', '').replace('```', '').strip()
            elif response_text.startswith('```'):
                response_text = response_text.replace('```', '').strip()
            
            analysis = json.loads(response_text)
            
            # Ensure required fields
            analysis.setdefault("verdict", "uncertain")
            analysis.setdefault("verified", False)
            analysis.setdefault("message", "Analysis completed")
            analysis.setdefault("confidence", "medium")
            analysis.setdefault("reasoning", "Analysis completed")
            
            # Add metadata
            analysis["relevant_results_count"] = len(results)
            analysis["analysis_method"] = "gemini"
            
            return analysis
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse Gemini response as JSON: {e}")
            print(f"Raw response: {response_text}")
            return self._fallback_analysis(results)
        except Exception as e:
            print(f"Gemini analysis error: {e}")
            return self._fallback_analysis(results)
    
    def _fallback_analysis(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Fallback analysis when Gemini fails
        
        Args:
            results: List of search results
            
        Returns:
            Basic analysis results
        """
        return {
            "verified": False,
            "verdict": "uncertain",
            "message": "Unable to determine claim accuracy from available sources. Found fact-checking articles but analysis failed.",
            "confidence": "low",
            "relevant_results_count": len(results),
            "analysis_method": "fallback"
        }
    
    async def _verify_with_general_knowledge(self, text_input: str, claim_context: str, claim_date: str) -> Dict[str, Any]:
        """
        Verify a claim using Gemini's general knowledge base directly (no curated sources)
        This is used as a fallback when curated sources don't have enough information
        
        Args:
            text_input: The text claim to verify
            claim_context: Context about the claim
            claim_date: Date when the claim was made
            
        Returns:
            Analysis results with verdict and message
        """
        from datetime import datetime
        current_date = datetime.now().strftime("%B %d, %Y")
        
        prompt = f"""
You are a fact-checking expert AI with access to current information as of {current_date}.

CLAIM TO VERIFY: "{text_input}"
CONTEXT: {claim_context if claim_context != "Unknown context" else "No additional context provided"}
CLAIM DATE: {claim_date if claim_date != "Unknown date" else "Unknown"}

Your task is to verify this claim using your knowledge base. Since this is a direct factual question that may not be covered by news articles:

1. **Use your most recent training data** to answer the question directly
2. If this is about current events, political positions, or time-sensitive facts, be especially careful to provide the MOST CURRENT information
3. If you're uncertain about recent changes, acknowledge that
4. Always answer based on the most recent information you have

Provide a clear, direct answer. Think step-by-step:
- What does the claim assert?
- Based on your knowledge (as of your training cutoff and any recent data you have), is this true or false?
- If it's a time-sensitive claim, what is the current status?

Respond in this exact JSON format:
{{
    "verdict": "true|false|mixed|uncertain",
    "verified": true|false,
    "message": "Your clear, direct answer explaining whether the claim is true or false and why",
    "confidence": "high|medium|low",
    "reasoning": "Your step-by-step reasoning process",
    "knowledge_cutoff_note": "Optional note if the answer might be outdated or if recent changes are possible"
}}

IMPORTANT: For current events or political positions, provide the MOST RECENT information you have access to.
"""
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Try to parse JSON response
            if response_text.startswith('```json'):
                response_text = response_text.replace('```json', '').replace('```', '').strip()
            elif response_text.startswith('```'):
                response_text = response_text.replace('```', '').strip()
            
            analysis = json.loads(response_text)
            
            # Ensure required fields
            analysis.setdefault("verdict", "uncertain")
            analysis.setdefault("verified", False)
            analysis.setdefault("message", "Analysis completed using general knowledge")
            analysis.setdefault("confidence", "medium")
            analysis.setdefault("reasoning", "Direct verification using AI knowledge base")
            
            # Add metadata
            analysis["analysis_method"] = "general_knowledge"
            analysis["verification_date"] = current_date
            
            print(f"✅ General knowledge verification result: {analysis['verdict']}")
            return analysis
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse Gemini general knowledge response as JSON: {e}")
            print(f"Raw response: {response_text[:500]}")
            # Try to extract plain text answer
            return {
                "verified": False,
                "verdict": "uncertain",
                "message": response_text if response_text else "Unable to verify using general knowledge",
                "confidence": "low",
                "analysis_method": "general_knowledge",
                "error": "JSON parsing failed, used plain text response"
            }
        except Exception as e:
            print(f"General knowledge verification error: {e}")
            return {
                "verified": False,
                "verdict": "error",
                "message": f"Error during general knowledge verification: {str(e)}",
                "confidence": "low",
                "analysis_method": "general_knowledge"
            }
    
    def _extract_verdict_from_content(self, content: str) -> str:
        """
        Extract verdict from search result content
        
        Args:
            content: Combined title and snippet text
            
        Returns:
            Verdict string
        """
        content_lower = content.lower()
        
        # Look for verdict indicators
        if any(word in content_lower for word in ["false", "misleading", "incorrect", "debunked", "not true"]):
            return "false"
        elif any(word in content_lower for word in ["true", "accurate", "correct", "verified", "confirmed", "is true", "is correct"]):
            return "true"
        elif any(word in content_lower for word in ["partially", "mixed", "somewhat", "half"]):
            return "mixed"
        elif any(word in content_lower for word in ["unverified", "unproven", "uncertain", "disputed"]):
            return "uncertain"
        else:
            return "unknown"
    
    def _analyze_verdicts(self, verdicts: List[str]) -> Dict[str, Any]:
        """
        Analyze verdicts to determine overall result
        
        Args:
            verdicts: List of verdict strings
            
        Returns:
            Analysis of verdicts
        """
        if not verdicts:
            return {
                "verified": False,
                "verdict": "uncertain",
                "message": "No verdicts found"
            }
        
        true_count = verdicts.count("true")
        false_count = verdicts.count("false")
        mixed_count = verdicts.count("mixed")
        uncertain_count = verdicts.count("uncertain")
        unknown_count = verdicts.count("unknown")
        
        total = len(verdicts)
        
        # Determine overall verdict
        if false_count > 0:
            overall_verdict = "false"
            verified = False
        elif true_count > 0 and false_count == 0:
            overall_verdict = "true"
            verified = True
        elif mixed_count > 0:
            overall_verdict = "mixed"
            verified = False
        elif uncertain_count > 0:
            overall_verdict = "uncertain"
            verified = False
        else:
            overall_verdict = "unknown"
            verified = False
        
        return {
            "verified": verified,
            "verdict": overall_verdict,
            "true_count": true_count,
            "false_count": false_count,
            "mixed_count": mixed_count,
            "uncertain_count": uncertain_count,
            "unknown_count": unknown_count,
            "total_verdicts": total
        }
    
    def _build_message(self, analysis: Dict[str, Any], results: List[Dict[str, Any]]) -> str:
        """
        Build a human-readable message based on the analysis
        
        Args:
            analysis: Analysis results
            results: Relevant search results
            
        Returns:
            Formatted message
        """
        verdict = analysis["verdict"]
        total_verdicts = analysis["total_verdicts"]
        relevant_results_count = len(results)
        
        base_messages = {
            "true": "This claim appears to be TRUE based on fact-checking sources.",
            "false": "This claim appears to be FALSE based on fact-checking sources.",
            "mixed": "This claim has MIXED evidence - some parts are true, others are false.",
            "uncertain": "This claim is UNCERTAIN - insufficient evidence to determine accuracy.",
            "unknown": "This claim needs further investigation - verdict unclear from available sources.",
            "no_content": "No fact-checked information found for this claim."
        }
        
        message = base_messages.get(verdict, "Unable to determine claim accuracy.")
        
        # Add details about sources
        if relevant_results_count > 0:
            message += f" Found {relevant_results_count} relevant fact-check(s) with {total_verdicts} total verdicts."
            
            # Add top sources
            top_sources = []
            for result in results[:3]:  # Show top 3 sources
                title = result.get("title", "Unknown")
                link = result.get("link", "")
                if title not in top_sources and link:
                    top_sources.append(f"{title}")
            
            if top_sources:
                message += f" Sources include: {', '.join(top_sources[:3])}."
        
        return message
