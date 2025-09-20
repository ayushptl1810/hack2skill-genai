import os
import tempfile
from typing import Dict, Any, Optional, Tuple, List
import requests
from PIL import Image, ImageDraw, ImageFont
import io
import base64
import google.generativeai as genai
# Support multiple known import paths for SerpApi client
GoogleSearch = None  # type: ignore
try:
    from serpapi import GoogleSearch as _GS  # preferred per docs
    GoogleSearch = _GS
except Exception:
    try:
        from serpapi.google_search_results import GoogleSearch as _GS  # alt path
        GoogleSearch = _GS
    except Exception:
        try:
            from google_search_results import GoogleSearch as _GS  # legacy/dist name
            GoogleSearch = _GS
        except Exception:
            GoogleSearch = None  # client unavailable; will fall back to HTTP
from config import config


class ImageVerifier:
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the ImageVerifier with SerpApi credentials
        
        Args:
            api_key: SerpApi API key. If None, will try to get from environment
        """
        self.api_key = api_key or config.SERP_API_KEY
        if not self.api_key:
            raise ValueError("SERP_API_KEY environment variable or api_key parameter is required")
        
        # Configure Gemini
        if config.GEMINI_API_KEY:
            genai.configure(api_key=config.GEMINI_API_KEY)
            self.gemini_model = genai.GenerativeModel(
                config.GEMINI_MODEL,
                generation_config=genai.types.GenerationConfig(
                    temperature=config.GEMINI_TEMPERATURE,
                    top_p=config.GEMINI_TOP_P,
                    max_output_tokens=config.GEMINI_MAX_TOKENS
                )
            )
        else:
            self.gemini_model = None
        
        # SerpApi endpoints
        self.base_url_json = "https://serpapi.com/search.json"  # for GET with image_url
        self.base_url_form = "https://serpapi.com/search"       # for POST form with image_content
        
    async def verify(self, image_path: Optional[str] = None, claim_context: str = "", claim_date: str = "", image_url: Optional[str] = None) -> Dict[str, Any]:
        """
        Verify an image and generate a visual counter-measure if false context is detected
        
        Args:
            image_path: Path to the image file
            claim_context: The claimed context of the image
            claim_date: The claimed date of the image
            
        Returns:
            Dictionary with verification results and output file path
        """
        try:
            # Perform reverse image search
            print("[verify] start", {"claim_context": claim_context, "claim_date": claim_date, "has_image_path": bool(image_path), "has_image_url": bool(image_url)})
            search_results = await self._reverse_image_search(image_path=image_path, image_url=image_url)
            
            if not search_results or (not search_results.get("inline_images") and not search_results.get("image_results")):
                return {
                    "verified": False,
                    "message": "No search results found",
                    "details": {"search_results": search_results}
                }
            
            # Build evidence from SerpApi (no local heuristics for verdict)
            evidence = self._collect_evidence(search_results)
            print("[verify] serpapi_counts", {
                "image_results": len(search_results.get("image_results", [])) if isinstance(search_results, dict) else None,
                "inline_images": len(search_results.get("inline_images", [])) if isinstance(search_results, dict) else None,
                "status": (search_results.get("search_metadata", {}) or {}).get("status") if isinstance(search_results, dict) else None,
            })
            print("[verify] evidence_collected", {"count": len(evidence), "sample_titles": [e.get("title") for e in evidence[:3]]})

            # Ask Gemini to produce structured verdict + structured claim parse with citations
            filtered_evidence = self._rank_and_filter_evidence(evidence, claim_context, top_k=12)
            print("[verify] preparing_llm_request", {"evidence_count": len(filtered_evidence)})
            llm = self._summarize_with_gemini_structured(
                claim_context=claim_context,
                claim_date=claim_date,
                evidence=filtered_evidence,
            )
            validator = {"passed": False, "reasons": [], "checks": {}}
            debug_details = {}
            if llm:
                print("[verify] llm_keys", list(llm.keys()))
                base_verdict = (llm.get("verdict") or "uncertain").lower()
                relation_verdict = (llm.get("relation_verdict") or base_verdict).lower()
                # Enforce policy: default to false when the claimed relation isn't supported by evidence.
                cp = (llm.get("claim_parse") or {})
                citations = (cp.get("citations") or {})
                relation_citations = citations.get("relation") or []
                has_any_evidence = bool(filtered_evidence)
                relation_supported = bool(relation_citations)

                if relation_verdict == "false":
                    verdict = "false"
                elif has_any_evidence and not relation_supported:
                    # We have evidence but none supports the claimed relation → false
                    verdict = "false"
                else:
                    verdict = base_verdict
                summary = llm.get("summary") or ""
                # Enforce reputable domain gating + cross-source agreement
                sources = llm.get("top_sources") or self._top_sources(filtered_evidence, 3)
                from urllib.parse import urlparse
                def is_reputable(url: Optional[str]) -> bool:
                    try:
                        net = urlparse(url or "").netloc
                    except Exception:
                        net = ""
                    # Reputable = not low-priority social/UGC domain
                    return bool(net and (net not in config.LOW_PRIORITY_DOMAINS))
                reputable_sources = [s for s in (sources or []) if is_reputable(s.get("link"))]
                # Relation support must come from reputable domains and have >=2 independent domains
                cp = (llm.get("claim_parse") or {})
                rel_cits = (cp.get("citations") or {}).get("relation") or []
                cited_domains = set()
                for j in rel_cits:
                    try:
                        ev = filtered_evidence[int(j)]
                        net = urlparse(ev.get("link") or "").netloc
                        if net and (net not in config.LOW_PRIORITY_DOMAINS):
                            cited_domains.add(net)
                    except Exception:
                        pass
                cross_source_ok = len(cited_domains) >= 2
                # Stronger relation test: require co-mention already validated (checks[relation_comention])
                relation_comention_ok = False
                try:
                    relation_comention_ok = bool(validator["checks"].get("relation_comention"))
                except Exception:
                    relation_comention_ok = False
                if verdict == "true":
                    if not (cross_source_ok and relation_comention_ok):
                        verdict = "uncertain"
                # If verdict is still not false, ensure at least two reputable sources overall
                if verdict == "true" and len({urlparse((s.get("link") or "")).netloc for s in reputable_sources}) < 2:
                    verdict = "uncertain"
                # Run validator: require citations for all extracted parts and relation co-mention
                validator, debug_details = self._validate_llm_parse(
                    claim_text=claim_context,
                    evidence=filtered_evidence,
                    llm=llm,
                )
                # Only downgrade true to uncertain if validator fails; never upgrade false
                if verdict == "true" and not validator.get("passed", False):
                    verdict = "uncertain"
                if verdict == "true":
                    from urllib.parse import urlparse
                    cited_idx = set()
                    cp = (llm.get("claim_parse") or {}).get("citations") or {}
                    for key, val in cp.items():
                        if isinstance(val, list):
                            if key in ["entities","roles"]:
                                for arr in val:
                                    for j in (arr or []):
                                        try:
                                            cited_idx.add(int(j))
                                        except Exception:
                                            pass
                            else:
                                for j in val:
                                    try:
                                        cited_idx.add(int(j))
                                    except Exception:
                                        pass
                    domains = set()
                    for ix in cited_idx:
                        if 0 <= ix < len(filtered_evidence):
                            lk = filtered_evidence[ix].get("link") or ""
                            try:
                                net = urlparse(lk).netloc
                            except Exception:
                                net = ""
                            if net:
                                domains.add(net)
                    print("[verify] domain_independence", {"cited_count": len(cited_idx), "domains": list(domains)})
                    if len(domains) < 2:
                        verdict = "uncertain"
                        validator.setdefault("reasons", []).append("Insufficient domain independence for true verdict")
                print("[verify] gemini_structured", {"verdict": verdict, "summary_preview": summary[:120]})
                print("[verify] validator", validator)
                print("[verify] debug_details_keys", list(debug_details.keys()))
            else:
                # Fallback minimal output
                verdict = "uncertain"
                summary = self._fallback_summary("uncertain", claim_context, claim_date, None, None, None)
                sources = self._top_sources(filtered_evidence, 3)
                print("[verify] gemini_structured_none_fallback", {"verdict": verdict, "summary_preview": summary[:120]})

            if verdict != "false":
                resp = {
                    "verdict": verdict,
                    "summary": summary,
                    "message": summary,
                    "sources": sources,
                    "claim_context": claim_context,
                    "claim_date": claim_date,
                    "validator": validator,
                }
                if config.DEBUG:
                    resp["debug"] = debug_details
                return resp
            
            # Generate visual counter-measure (pick first usable evidence image)
            evidence_img_url = None
            for ev in filtered_evidence:
                if ev.get("thumbnail"):
                    evidence_img_url = ev.get("thumbnail")
                    break
            if not evidence_img_url:
                for ev in filtered_evidence:
                    if ev.get("link") and isinstance(ev.get("link"), str) and ev.get("link").startswith("http"):
                        evidence_img_url = ev.get("link")
                        break
            evidence_img_url = evidence_img_url or (image_url or "")
            output_path = await self._generate_counter_measure(
                original_image_path=image_path,
                evidence_image_url=evidence_img_url,
                claim_context=claim_context,
                claim_date=claim_date,
                original_image_url=image_url,
            )
            print("[verify] counter_measure_generated", {"output_path": output_path})
            
            # For false verdict, ensure summary exists
            if not llm or llm.get("verdict", "").lower() != "false":
                # Force LLM to produce a false-context explanation
                llm = self._summarize_with_gemini_structured(
                    claim_context=claim_context,
                    claim_date=claim_date,
                    evidence=filtered_evidence,
                    forced_verdict="false",
                ) or {}
            summary = llm.get("summary") or self._fallback_summary("false", claim_context, claim_date, None, None, None)
            sources = llm.get("top_sources") or self._top_sources(filtered_evidence, 3)
            resp = {
                "verdict": "false",
                "summary": summary,
                "message": summary,
                "sources": sources,
                "output_path": output_path,
                "claim_context": claim_context,
                "claim_date": claim_date,
                "validator": validator,
            }
            if config.DEBUG:
                resp["debug"] = debug_details
            return resp
            
        except Exception as e:
            return {
                "verdict": "error",
                "summary": f"Error during verification: {str(e)}",
            }

    async def gather_evidence(self, image_path: Optional[str] = None, image_url: Optional[str] = None, claim_context: str = "") -> List[Dict[str, Any]]:
        """
        Evidence-only helper: performs reverse image search and returns ranked/filterred evidence
        without invoking the LLM or producing a verdict.
        """
        try:
            print("[verify] start", {"gather_only": True, "has_image_path": bool(image_path), "has_image_url": bool(image_url)})
            search_results = await self._reverse_image_search(image_path=image_path, image_url=image_url)
            if not search_results or (not search_results.get("inline_images") and not search_results.get("image_results")):
                return []
            evidence = self._collect_evidence(search_results)
            filtered = self._rank_and_filter_evidence(evidence, claim_context, top_k=12)
            return filtered
        except Exception as e:
            print(f"[gather_evidence] error: {e}")
            return []

    def _summarize_with_gemini(self, claim_context: str, claim_date: str, analysis: Dict[str, Any], forced_verdict: Optional[str] = None) -> Optional[Dict[str, Any]]:
        try:
            if not self.gemini_model:
                return None
            
            verdict = forced_verdict or analysis.get("verdict", "uncertain")
            prompt = f"""You are a fact-checking assistant. Generate a single, concise sentence (no code blocks, no JSON) 
that explains the verdict. Mirror the provided verdict exactly (do not change it). 
If false, mention the most likely real context/time from evidence; if true, confirm briefly; 
if uncertain, state uncertainty.

Claim context: {claim_context}
Claim date: {claim_date}
Verdict: {verdict}
Evidence (condensed): {self._top_sources(analysis.get('evidence', []), 3)}"""

            response = self.gemini_model.generate_content(prompt)
            text = response.text if response.text else None
            
            return {"model": config.GEMINI_MODEL, "verdict": verdict, "text": text}
        except Exception:
            return None

    def _collect_evidence(self, search_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        evidence: List[Dict[str, Any]] = []
        for res in search_results.get("image_results", []):
            evidence.append({
                "title": res.get("title"),
                "link": res.get("link"),
                "source": res.get("source"),
                "date": res.get("date"),
                "thumbnail": res.get("thumbnail"),
                "snippet": res.get("snippet"),
            })
        for img in search_results.get("inline_images", []):
            evidence.append({
                "title": img.get("title"),
                "link": img.get("link"),
                "source": img.get("source"),
                "thumbnail": img.get("thumbnail"),
                "snippet": img.get("snippet"),
            })
        return evidence

    def _normalize_tokens(self, text: Optional[str]) -> List[str]:
        if not text:
            return []
        import re
        t = (text or "").lower()
        stop = set(["the","a","an","and","or","for","to","of","in","on","at","with","by","from","this","that","is","are","was","were","as","it","its","their","his","her","him","she","he","they","them","we","you"])
        toks = re.findall(r"[a-z0-9]{3,}", t)
        return [x for x in toks if x not in stop]

    def _evidence_score(self, claim_text: str, ev: Dict[str, Any]) -> float:
        claim_tokens = set(self._normalize_tokens(claim_text))
        ev_text = " ".join([s for s in [ev.get("title"), ev.get("snippet"), ev.get("source")] if s])
        ev_tokens = set(self._normalize_tokens(ev_text))
        if not claim_tokens or not ev_tokens:
            return 0.0
        overlap = len(claim_tokens & ev_tokens)
        return overlap / float(len(claim_tokens))

    def _rank_and_filter_evidence(self, evidence: List[Dict[str, Any]], claim_text: str, top_k: int = 12) -> List[Dict[str, Any]]:
        scored: List[Tuple[float, int, Dict[str, Any]]] = []
        for i, ev in enumerate(evidence):
            s = self._evidence_score(claim_text, ev)
            # Downrank social/UGC and YouTube to prefer article pages when checking relations
            try:
                from urllib.parse import urlparse
                net = urlparse((ev.get("link") or "").strip()).netloc
            except Exception:
                net = ""
            if net in config.LOW_PRIORITY_DOMAINS or net in ("youtube.com", "www.youtube.com", "youtu.be"):
                s *= 0.6
            scored.append((s, i, ev))
        scored.sort(key=lambda x: x[0], reverse=True)
        seen_urls = set()
        seen_titles = set()
        filtered: List[Dict[str, Any]] = []
        for s, i, ev in scored:
            url = (ev.get("link") or "").strip()
            title = (ev.get("title") or "").strip().lower()
            title_key = title[:80] if title else ""
            if url and url in seen_urls:
                continue
            if title_key and title_key in seen_titles:
                continue
            filtered.append(ev)
            if url:
                seen_urls.add(url)
            if title_key:
                seen_titles.add(title_key)
            if len(filtered) >= top_k:
                break
        print("[verify] evidence_rank_filter", {"input": len(evidence), "kept": len(filtered)})
        return filtered

    def _extract_json(self, text: str) -> Dict[str, Any]:
        # Strip common fences and attempt to locate JSON object
        t = text.strip()
        if t.startswith("```"):
            t = t.split("```", 1)[1]
            t = t.lstrip("json").lstrip("\n").strip()
            if "```" in t:
                t = t.split("```", 1)[0].strip()
        # Find first '{' and last '}'
        start = t.find('{')
        end = t.rfind('}')
        if start != -1 and end != -1 and end > start:
            t = t[start:end+1]
        import json
        return json.loads(t)

    def _summarize_with_gemini_structured(self, claim_context: str, claim_date: str,
                                          evidence: List[Dict[str, Any]],
                                          forced_verdict: Optional[str] = None) -> Optional[Dict[str, Any]]:
        try:
            if not self.gemini_model:
                return None
            
            prompt = f"""You are a fact-checking assistant. Use the provided evidence items (title, link, date, source, snippet) to evaluate the FULL claim text.
The claim can include: event/context, place, timeframe, actors/entities, quantities, and relations/attribution. You may use only the provided evidence items.
Respond STRICTLY as compact JSON with keys:
  - verdict: one of 'true' | 'false' | 'uncertain'
  - relation_verdict: one of 'true' | 'false' | 'uncertain' (whether the stated relation holds)
  - summary: <= 2 sentences, plain text
  - top_sources: array of up to 3 objects {{title, link}}
  - claim_parse: {{
      entities: array of strings,
      roles: array of strings,
      relation: {{ predicate: string, subject: string, object: string }},
      timeframe: {{ year: number|null, month: number|null }},
      location: string|null,
      citations: {{
        entities: array of arrays of evidence indices (per entity),
        roles: array of arrays of evidence indices (per role),
        relation: array of evidence indices supporting subject+predicate+object together,
        timeframe: array of evidence indices supporting the timeframe,
        location: array of evidence indices supporting the location
      }}
    }}
Rules:
  - verdict 'true' ONLY if evidence supports ALL key parts: event/context, place, timeframe, AND any stated relation.
  - relation_verdict 'false' if the evidence supports a different relation and none supports the claimed relation.
  - verdict 'false' if relation_verdict is 'false' or if place/time contradicts the claim without supporting evidence.
  - 'uncertain' if ANY extracted part in claim_parse has no supporting citations.
  - relation consistency: at least one cited evidence item MUST co-mention subject and object tokens with the predicate.
Do not include code fences or extra text; return only the JSON object.

Claim text: {claim_context}
Claim date: {claim_date}
Forced verdict: {forced_verdict}
Evidence: {evidence}"""

            print("[gemini] request_meta", {"model": config.GEMINI_MODEL, "temp": config.GEMINI_TEMPERATURE, "topP": config.GEMINI_TOP_P})
            response = self.gemini_model.generate_content(prompt)
            
            if not response.text:
                return None
                
            text = response.text.strip()
            print("[gemini] structured_text_preview", text[:200])
            parsed = self._extract_json(text)
            print("[gemini] parsed_json_keys", list(parsed.keys()) if isinstance(parsed, dict) else type(parsed).__name__)
            return parsed if isinstance(parsed, dict) else None
            
        except Exception as e:
            print(f"[gemini] error: {e}")
            return None

    def _summarize_with_gemini_majority(self, claim_context: str, claim_date: str,
                                         evidence: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Simpler majority-based prompt: ask Gemini to decide true/false by which side has more supporting
        evidence; only return uncertain if support is roughly equal/ambiguous.
        Returns compact JSON: { verdict, clarification, corrected_relation, top_sources }
        """
        try:
            if not self.gemini_model:
                return None
            prompt = f"""You are a citation-driven fact-checking assistant.
Given a CLAIM and a list of EVIDENCE items (title, link, date, source, snippet), decide if the CLAIM itself is true or false.

STRICT adjudication rules (apply literally to the CLAIM):
1) Extract the relation from the CLAIM as:
   relation: {{ predicate: string, subject: string, object: string }}
2) Evaluate ONLY the CLAIM's relation. Mentions of a different object (alternative person/role/event/location) are NOT support for the CLAIM.
3) SUPPORT only when an evidence item explicitly co-mentions the CLAIM's subject AND the CLAIM's object with the predicate in title/snippet (token-level match; paraphrases of those tokens are fine). General marital status or vague wording does NOT count as support if the CLAIM's object is not explicitly present.
4) CONTRADICTION when evidence explicitly supports a mutually exclusive alternative relation (e.g., same subject + predicate with a different object), or explicitly negates the CLAIM.
5) Social/UGC links may appear; still judge by content but prefer clearer, explicit co-mentions from any source.
6) Decision for the CLAIM:
   - If SUPPORT > CONTRADICTION by a meaningful margin, verdict = "true".
   - If CONTRADICTION > SUPPORT by a meaningful margin, verdict = "false".
   - If neither side is clearly stronger or no explicit co-mentions exist, verdict = "uncertain".
7) Use only the provided EVIDENCE texts; no outside knowledge.

Output strictly as compact JSON with keys (and nothing else):
  verdict: one of 'true' | 'false' | 'uncertain'
  clarification: one concise sentence that answers the CLAIM directly. If verdict is 'false' or 'uncertain', state the most supported alternative relation (e.g., "<subject> was not <predicate> <object>. Instead, <subject> <predicate> <alt_object> at <context>."). Avoid hedging like "does not confirm".
  corrected_relation: {{ predicate: string, subject: string, object: string }} | null
  top_sources: up to 3 objects {{title, link}}

CLAIM: {claim_context}
CLAIM_DATE: {claim_date}
EVIDENCE: {evidence}
"""
            print("[gemini] request_meta", {"model": config.GEMINI_MODEL, "temp": config.GEMINI_TEMPERATURE, "topP": config.GEMINI_TOP_P})
            response = self.gemini_model.generate_content(prompt)
            if not response.text:
                return None
            text = response.text.strip()
            print("[gemini] structured_text_preview", text[:200])
            parsed = self._extract_json(text)
            print("[gemini] parsed_json_keys", list(parsed.keys()) if isinstance(parsed, dict) else type(parsed).__name__)
            return parsed if isinstance(parsed, dict) else None
        except Exception as e:
            print(f"[gemini] error: {e}")
            return None

    def _top_sources(self, evidence: List[Dict[str, Any]], k: int) -> List[Dict[str, Any]]:
        items = []
        for e in evidence:
            title = e.get("title")
            link = e.get("link")
            if title or link:
                items.append({"title": title, "link": link})
            if len(items) >= k:
                break
        return items

    def _validate_llm_parse(self, claim_text: str, evidence: List[Dict[str, Any]], llm: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        checks: Dict[str, Any] = {}
        reasons: List[str] = []
        passed = True
        parse = (llm or {}).get("claim_parse") or {}
        citations = parse.get("citations") or {}
        # Helper to get combined text for an evidence index
        def ev_text(i: int) -> str:
            if i < 0 or i >= len(evidence):
                return ""
            ev = evidence[i]
            return " ".join([t for t in [ev.get("title"), ev.get("snippet")] if t])
        # 1) Ensure each entities[] and roles[] item has at least one citation
        for key in ["entities", "roles"]:
            items = parse.get(key) or []
            cits = citations.get(key) or []
            ok = bool(items) and len(cits) == len(items) and all(len(lst) > 0 for lst in cits if isinstance(lst, list))
            checks[f"{key}_citations"] = ok
            if not ok:
                passed = False
                reasons.append(f"Missing citations for {key}")
        # 2) timeframe and location citations exist if present
        for key in ["timeframe", "location"]:
            has_item = bool(parse.get(key))
            if has_item:
                ok = bool(citations.get(key)) and len(citations.get(key)) > 0
                checks[f"{key}_citations"] = ok
                if not ok:
                    passed = False
                    reasons.append(f"Missing citations for {key}")
        # 2b) If location cited, require token presence in at least one cited item
        def _tok(text: str) -> set:
            import re
            return set(re.findall(r"[a-z0-9]{3,}", (text or "").lower()))
        if parse.get("location") and citations.get("location"):
            loc_toks = _tok(str(parse.get("location") or ""))
            loc_token_ok = False
            for i in citations.get("location"):
                try:
                    it = _tok(ev_text(int(i)))
                except Exception:
                    it = set()
                if loc_toks and (loc_toks & it):
                    loc_token_ok = True
                    break
            checks["location_token_match"] = loc_token_ok
            if not loc_token_ok:
                passed = False
                reasons.append("Location tokens not found in cited items")
        # 3) relation citations and co-mention (subject/object in same item)
        relation = parse.get("relation") or {}
        subj = (relation.get("subject") or "").strip()
        obj = (relation.get("object") or "").strip()
        # Token-based co-mention: require at least one informative token from subject and object in same item
        def tokens(text: str) -> List[str]:
            import re
            return re.findall(r"[a-z0-9]{3,}", (text or "").lower())
        subj_toks = set(tokens(subj))
        obj_toks = set(tokens(obj))
        rel_indices: List[int] = citations.get("relation") or []
        rel_ok = False
        for idx in rel_indices:
            txt = ev_text(int(idx))
            tl_toks = set(tokens(txt))
            if subj_toks and obj_toks and (subj_toks & tl_toks) and (obj_toks & tl_toks):
                rel_ok = True
                break
        checks["relation_comention"] = rel_ok
        # Allow pooled-evidence relation support via shared anchors if co-mention failed
        pooled_ok = False
        pooled_detail: Dict[str, Any] = {}
        if not rel_ok:
            try:
                entity_list: List[str] = (parse.get("entities") or [])
                entity_cits: List[List[int]] = (citations.get("entities") or [])
                def _tokens(text: str) -> set:
                    import re
                    return set(re.findall(r"[a-z0-9]{3,}", (text or "").lower()))
                # Map subject/object to entity indices by token overlap
                def best_entity_indices(name_toks: set) -> List[int]:
                    scored: List[Tuple[int,int]] = []
                    for idx, ent in enumerate(entity_list):
                        et = _tokens(ent)
                        scored.append((len(name_toks & et), idx))
                    scored.sort(reverse=True)
                    return [i for s,i in scored if s > 0]
                subj_toks_set = _tokens(subj)
                obj_toks_set = _tokens(obj)
                subj_idxs = best_entity_indices(subj_toks_set) if subj_toks_set else []
                obj_idxs = best_entity_indices(obj_toks_set) if obj_toks_set else []
                subj_pool: List[int] = []
                obj_pool: List[int] = []
                for si in subj_idxs:
                    if si < len(entity_cits) and isinstance(entity_cits[si], list):
                        for v in entity_cits[si]:
                            try:
                                subj_pool.append(int(v))
                            except Exception:
                                pass
                for oi in obj_idxs:
                    if oi < len(entity_cits) and isinstance(entity_cits[oi], list):
                        for v in entity_cits[oi]:
                            try:
                                obj_pool.append(int(v))
                            except Exception:
                                pass
                subj_pool = list({int(x) for x in subj_pool})
                obj_pool = list({int(x) for x in obj_pool})
                # Anchors from claim parse
                anchor_year = None
                tf = parse.get("timeframe") or {}
                try:
                    anchor_year = int(tf.get("year")) if tf.get("year") is not None else None
                except Exception:
                    anchor_year = None
                anchor_month_name = None
                try:
                    mn = int(tf.get("month")) if tf.get("month") is not None else None
                    months = ["january","february","march","april","may","june","july","august","september","october","november","december"]
                    anchor_month_name = months[mn-1] if mn and 1 <= mn <= 12 else None
                except Exception:
                    anchor_month_name = None
                loc_tokens = _tok(str(parse.get("location") or ""))
                claim_event_tokens = _tok(claim_text)
                import re
                def item_text(idx: int) -> str:
                    return ev_text(idx)
                def has_year(idx: int) -> bool:
                    return bool(anchor_year is not None and re.search(rf"\b{anchor_year}\b", item_text(idx) or ""))
                def has_month(idx: int) -> bool:
                    return bool(anchor_month_name and (anchor_month_name in (item_text(idx) or "").lower()))
                def has_loc(idx: int) -> bool:
                    return bool(loc_tokens and (loc_tokens & _tok(item_text(idx))))
                def event_overlap(idx1: int, idx2: int) -> bool:
                    t1 = _tok(item_text(idx1))
                    t2 = _tok(item_text(idx2))
                    return bool((claim_event_tokens & t1) and (claim_event_tokens & t2))
                def anchors_align(i: int, j: int) -> Tuple[bool, List[str]]:
                    reasons: List[str] = []
                    if has_year(i) and has_year(j):
                        reasons.append("year")
                    if has_month(i) and has_month(j):
                        reasons.append("month")
                    if has_loc(i) and has_loc(j):
                        reasons.append("location")
                    if event_overlap(i, j):
                        reasons.append("event")
                    return (len(reasons) > 0, reasons)
                for si in subj_pool:
                    for oj in obj_pool:
                        ok, rs = anchors_align(int(si), int(oj))
                        if ok:
                            pooled_ok = True
                            pooled_detail = {"subj_idx": int(si), "obj_idx": int(oj), "anchors": rs}
                            break
                    if pooled_ok:
                        break
            except Exception:
                pooled_ok = False
        checks["relation_pooled_anchor"] = pooled_ok
        if pooled_ok:
            checks["relation_pooled_detail"] = pooled_detail
        if not rel_ok and not pooled_ok:
            passed = False
            reasons.append("Relation not supported by co-mention or pooled anchors")
        # 4) Simple entity overlap score between claim tokens and cited items
        import re
        claim_tokens = set([t.lower() for t in re.findall(r"[A-Za-z]{3,}", claim_text or "")])
        cited_indices = set()
        for arr in (citations.get("entities") or []):
            for i in arr:
                try:
                    cited_indices.add(int(i))
                except Exception:
                    pass
        overlap_hits = 0
        for i in cited_indices:
            tl = ev_text(i).lower()
            if any(tok in tl for tok in claim_tokens):
                overlap_hits += 1
        entity_overlap_score = overlap_hits / (len(cited_indices) or 1)
        checks["entity_overlap_score"] = entity_overlap_score
        # 5) Date check: allow year and optional month names from claim timeframe in cited items
        year = None
        month_num = None
        tf = parse.get("timeframe") or {}
        try:
            year = int(tf.get("year")) if tf.get("year") is not None else None
        except Exception:
            year = None
        try:
            month_num = int(tf.get("month")) if tf.get("month") is not None else None
        except Exception:
            month_num = None
        date_ok = True
        if year is not None:
            date_ok = False
            for i in (citations.get("timeframe") or []):
                try:
                    ev = evidence[int(i)]
                except Exception:
                    continue
                text = " ".join([t for t in [ev.get("title"), ev.get("snippet"), ev.get("date"), ev.get("source"), ev.get("link")] if t])
                if re.search(rf"\b{year}\b", text or ""):
                    date_ok = True
                    break
                # Month name matching if provided
                if month_num is not None:
                    month_names = [
                        "january","february","march","april","may","june",
                        "july","august","september","october","november","december"
                    ]
                    mname = month_names[month_num-1] if 1 <= month_num <= 12 else None
                    if mname and (mname in (text or "").lower()):
                        date_ok = True
                        break
        checks["timeframe_match"] = date_ok
        if not date_ok:
            passed = False
            reasons.append("Timeframe year not supported in cited items")
        # Domains used (for logging only)
        from urllib.parse import urlparse
        domains = []
        for ev in evidence:
            try:
                net = urlparse(ev.get("link") or "").netloc
            except Exception:
                net = ""
            if net:
                domains.append(net)
        debug = {
            "claim_parse": parse,
            "citations": citations,
            "domains_used": domains,
        }
        return {"passed": passed, "reasons": reasons, "checks": checks}, debug

    def _fallback_summary(self, verdict: str, claim_context: str, claim_date: str,
                           best_title: Optional[str], best_link: Optional[str], best_year: Optional[int]) -> str:
        if verdict == "false":
            where = best_title or "another place/time"
            when = str(best_year) if best_year else "an earlier date"
            src = best_link or "a corroborating source"
            return f"Claim is false. The image corresponds to {where} from {when}, not {claim_context}, {claim_date}. Source: {src}."
        if verdict == "true":
            return f"Claim is true. The available evidence supports {claim_context}, {claim_date}."
        return f"Claim is uncertain. Evidence is inconclusive for {claim_context}, {claim_date}."

    def _clean_summary_text(self, text: Optional[str]) -> str:
        if not text:
            return ""
        t = text.strip()
        # Remove common code-fence wrappers
        if t.startswith("```"):
            # drop first fence
            t = t.split("```", 1)[1]
            # drop language tag if present
            t = t.lstrip("\n").split("\n", 1)[-1] if "\n" in t else t
            # drop trailing fence
            if "```" in t:
                t = t.rsplit("```", 1)[0]
        return t.strip()
    
    async def _reverse_image_search(self, image_path: Optional[str] = None, image_url: Optional[str] = None) -> Dict[str, Any]:
        """
        Perform reverse image search using SerpApi
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Search results from SerpApi
        """
        try:
            # Build params per SerpApi docs
            params: Dict[str, Any] = {
                "engine": "google_reverse_image",
                "api_key": self.api_key,
            }
            if image_url:
                params["image_url"] = image_url
            elif image_path:
                with open(image_path, "rb") as img_file:
                    img_data = img_file.read()
                img_base64 = base64.b64encode(img_data).decode("utf-8")
                params["image_content"] = img_base64

            # Debug prints
            print("[serpapi] params", {
                "engine": params.get("engine"),
                "has_image_url": bool(params.get("image_url")),
                "has_image_content": bool(params.get("image_content")),
                "image_content_len": len(params.get("image_content", "")) if params.get("image_content") else 0,
            })

            # Prefer official client for image_url; for image_content use HTTP POST (form) to avoid URL-size issues
            try:
                if params.get("image_content"):
                    # Use POST with form data
                    resp = requests.post(self.base_url_form, data=params, timeout=40)
                    print("[serpapi] http_post status", resp.status_code)
                    resp.raise_for_status()
                    js = resp.json()
                    return js
                else:
                    if GoogleSearch is None:
                        raise RuntimeError("google-search-results package not available. Install with: pip install google-search-results")
                    search = GoogleSearch(params)  # type: ignore
                    results = search.get_dict()
                    return results
            except Exception as e:
                # Fallback: try HTTP GET/POST and print diagnostics
                print("[serpapi] client_error", str(e))
                try:
                    if params.get("image_content"):
                        resp = requests.post(self.base_url_form, data=params, timeout=40)
                    else:
                        resp = requests.get(self.base_url_json, params=params, timeout=40)
                    print("[serpapi] http_fallback status", resp.status_code)
                    head = resp.text[:200] if hasattr(resp, 'text') else ''
                    print("[serpapi] http_fallback head", head)
                    resp.raise_for_status()
                    return resp.json()
                except Exception as e2:
                    print("[serpapi] http_fallback_error", str(e2))
                    return {}
            
        except Exception as e:
            print(f"Error in reverse image search: {e}")
            return {}
    
    # Removed: legacy heuristic analyzer (replaced by consolidated LLM pass)
    
    # Removed: legacy heuristic helpers (replaced by consolidated LLM pass)

    # Removed: legacy token mining helper

    # Removed: legacy date aliases helper

    # Removed: legacy year-from-claim helper

    def _extract_year_from_text(self, text: str) -> Optional[int]:
        if not text:
            return None
        import re
        years = re.findall(r"(19\d{2}|20\d{2})", text)
        if not years:
            return None
        try:
            return int(years[0])
        except Exception:
            return None

    def _context_mismatch(self, claim_context_lc: str, text: str) -> bool:
        t = (text or "").lower()
        if not claim_context_lc:
            return False
        # Simple heuristic: if text contains a strong, different location keyword
        known = {
            "mumbai": ["delhi", "bangalore", "chennai", "kolkata", "new york", "london"],
            "new york": ["mumbai", "delhi", "london", "paris", "dubai"],
        }
        for k, others in known.items():
            if claim_context_lc == k:
                if any(o in t for o in others):
                    return True
        return False
    
    async def _generate_counter_measure(self, original_image_path: Optional[str], evidence_image_url: str, 
                                      claim_context: str, claim_date: str, original_image_url: Optional[str] = None) -> str:
        """
        Generate a visual counter-measure image
        
        Args:
            original_image_path: Path to the original misleading image
            evidence_image_url: URL of the evidence image
            claim_context: The claimed context
            claim_date: The claimed date
            
        Returns:
            Path to the generated counter-measure image
        """
        try:
            # Load original image: from path if available, else download from original_image_url
            if original_image_path:
                original_img = Image.open(original_image_path)
            elif original_image_url:
                original_img = await self._download_image(original_image_url)
            else:
                # Fallback to evidence image as placeholder
                original_img = await self._download_image(evidence_image_url)
            
            # Download evidence image
            evidence_img = await self._download_image(evidence_image_url)
            
            # Create counter-measure
            counter_measure = self._create_counter_measure_image(
                original_img, evidence_img, claim_context, claim_date
            )
            
            # Save to temporary file
            output_path = tempfile.mktemp(suffix=".png")
            counter_measure.save(output_path, "PNG")
            
            return output_path
            
        except Exception as e:
            print(f"Error generating counter-measure: {e}")
            raise
    
    async def _download_image(self, image_url: str) -> Image.Image:
        """
        Download an image from URL
        
        Args:
            image_url: URL of the image to download
            
        Returns:
            PIL Image object
        """
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36",
                "Referer": "https://www.google.com/",
            }
            response = requests.get(image_url, timeout=15, headers=headers, stream=True)
            response.raise_for_status()
            content_type = response.headers.get("Content-Type", "").lower()
            if "image" not in content_type:
                # Not an image (likely a webpage); return placeholder
                return Image.new('RGB', (300, 200), color='gray')
            data = response.content
            img = Image.open(io.BytesIO(data))
            return img
        except Exception:
            # Return a placeholder image if download fails
            return Image.new('RGB', (300, 200), color='gray')
    
    def _create_counter_measure_image(self, original_img: Image.Image, evidence_img: Image.Image,
                                    claim_context: str, claim_date: str) -> Image.Image:
        """
        Create the counter-measure image with side-by-side comparison
        
        Args:
            original_img: The original misleading image
            evidence_img: The evidence image
            claim_context: The claimed context
            claim_date: The claimed date
            
        Returns:
            Generated counter-measure image
        """
        # Resize images to consistent dimensions
        target_width, target_height = 400, 300
        
        original_img = original_img.resize((target_width, target_height), Image.Resampling.LANCZOS)
        evidence_img = evidence_img.resize((target_width, target_height), Image.Resampling.LANCZOS)
        
        # Create canvas for side-by-side layout
        canvas_width = target_width * 2 + 50  # Extra space for padding
        canvas_height = target_height + 200   # Extra space for labels and watermark
        
        canvas = Image.new('RGB', (canvas_width, canvas_height), 'white')
        draw = ImageDraw.Draw(canvas)
        
        # Try to load a font, fall back to default if not available
        try:
            font_large = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 24)
            font_medium = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 18)
            font_small = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 14)
        except:
            font_large = ImageFont.load_default()
            font_medium = ImageFont.load_default()
            font_small = ImageFont.load_default()
        
        # Add title
        title = "FALSE CONTEXT DETECTED"
        title_bbox = draw.textbbox((0, 0), title, font=font_large)
        title_width = title_bbox[2] - title_bbox[0]
        title_x = (canvas_width - title_width) // 2
        draw.text((title_x, 20), title, fill='red', font=font_large)
        
        # Add original image (left side)
        original_x = 25
        original_y = 80
        canvas.paste(original_img, (original_x, original_y))
        
        # Add evidence image (right side)
        evidence_x = original_x + target_width + 25
        evidence_y = original_y
        canvas.paste(evidence_img, (evidence_x, evidence_y))
        
        # Add labels
        claim_label = f"CLAIM: {claim_context}, {claim_date}"
        reality_label = "REALITY: Different context/earlier date"
        
        draw.text((original_x, original_y - 30), claim_label, fill='red', font=font_medium)
        draw.text((evidence_x, evidence_y - 30), reality_label, fill='green', font=font_medium)
        
        # Add watermark
        watermark = "FALSE CONTEXT"
        watermark_img = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
        watermark_draw = ImageDraw.Draw(watermark_img)
        
        # Create semi-transparent watermark
        watermark_bbox = watermark_draw.textbbox((0, 0), watermark, font=font_large)
        watermark_width = watermark_bbox[2] - watermark_bbox[0]
        watermark_height = watermark_bbox[3] - watermark_bbox[1]
        
        watermark_x = (canvas_width - watermark_width) // 2
        watermark_y = (canvas_height - watermark_height) // 2
        
        watermark_draw.text((watermark_x, watermark_y), watermark, fill=(255, 0, 0, 128), font=font_large)
        
        # Composite watermark onto canvas
        canvas = Image.alpha_composite(canvas.convert('RGBA'), watermark_img).convert('RGB')
        
        return canvas
