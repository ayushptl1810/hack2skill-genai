#!/usr/bin/env python3
"""
Script to add sample rumour data to MongoDB for testing real-time updates
"""

import os
import sys
import asyncio
from datetime import datetime, timedelta
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_mongo_client():
    """Get MongoDB client connection"""
    connection_string = os.getenv('MONGO_CONNECTION_STRING')
    if not connection_string:
        raise ValueError("MONGO_CONNECTION_STRING environment variable not set")
    
    client = MongoClient(connection_string)
    # Test connection
    client.admin.command('ping')
    return client

def add_sample_rumours():
    """Add sample rumour data to MongoDB"""
    
    client = get_mongo_client()
    db = client['aegis']
    collection = db['debunk_posts']
    
    # Sample rumour data with unique post_ids
    sample_rumours = [
        {
            "post_id": "sample_rumour_001",
            "claim": "Scientists have discovered a new planet that could support human life",
            "summary": "Recent astronomical observations suggest the possibility of a habitable exoplanet",
            "platform": "Twitter",
            "Post_link": "https://twitter.com/example/status/123456789",
            "verification": {
                "verdict": "true",
                "message": "This claim is accurate based on NASA's recent findings",
                "reasoning": "The discovery was confirmed by multiple telescopes and peer-reviewed research",
                "verification_date": datetime.now() - timedelta(hours=2),
                "sources": {
                    "count": 3,
                    "links": [
                        "https://www.nasa.gov/feature/nasa-discovers-new-exoplanet",
                        "https://www.nature.com/articles/space-discovery-2024",
                        "https://www.scientificamerican.com/article/new-habitable-planet"
                    ],
                    "titles": [
                        "NASA Discovers New Exoplanet",
                        "Nature: Space Discovery 2024",
                        "Scientific American: New Habitable Planet Found"
                    ]
                }
            },
            "stored_at": datetime.now() - timedelta(hours=2)
        },
        {
            "post_id": "sample_rumour_002", 
            "claim": "Breaking: Major tech company announces they're shutting down all services",
            "summary": "A viral post claims a major technology company is discontinuing all its services",
            "platform": "Facebook",
            "Post_link": "https://facebook.com/example/posts/987654321",
            "verification": {
                "verdict": "false",
                "message": "This is completely false and has been debunked by the company",
                "reasoning": "The company's official channels have confirmed this is a hoax. No such announcement was made.",
                "verification_date": datetime.now() - timedelta(hours=1, minutes=30),
                "sources": {
                    "count": 2,
                    "links": [
                        "https://company.com/official-statement",
                        "https://techcrunch.com/company-denies-shutdown-rumors"
                    ],
                    "titles": [
                        "Official Company Statement",
                        "TechCrunch: Company Denies Shutdown Rumors"
                    ]
                }
            },
            "stored_at": datetime.now() - timedelta(hours=1, minutes=30)
        },
        {
            "post_id": "sample_rumour_003",
            "claim": "New study shows that coffee increases life expectancy by 5 years",
            "summary": "A recent research paper claims significant health benefits from coffee consumption",
            "platform": "Instagram",
            "Post_link": "https://instagram.com/p/coffee-study-2024",
            "verification": {
                "verdict": "mostly true",
                "message": "While coffee does have health benefits, the 5-year claim is exaggerated",
                "reasoning": "Studies show moderate coffee consumption has health benefits, but the specific 5-year claim is not supported by the research cited.",
                "verification_date": datetime.now() - timedelta(minutes=45),
                "sources": {
                    "count": 4,
                    "links": [
                        "https://www.nejm.org/journal/coffee-health-study",
                        "https://www.mayoclinic.org/coffee-health-benefits",
                        "https://www.hsph.harvard.edu/coffee-research",
                        "https://www.healthline.com/coffee-life-expectancy-study"
                    ],
                    "titles": [
                        "NEJM: Coffee Health Study",
                        "Mayo Clinic: Coffee Health Benefits",
                        "Harvard: Coffee Research",
                        "Healthline: Coffee Life Expectancy Study"
                    ]
                }
            },
            "stored_at": datetime.now() - timedelta(minutes=45)
        },
        {
            "post_id": "sample_rumour_004",
            "claim": "Local restaurant caught serving expired food to customers",
            "summary": "Social media posts allege a popular local restaurant is serving expired ingredients",
            "platform": "Reddit",
            "Post_link": "https://reddit.com/r/localnews/expired-food-restaurant",
            "verification": {
                "verdict": "disputed",
                "message": "The claims are under investigation by health authorities",
                "reasoning": "Health department inspection is ongoing. Some allegations have been confirmed, others are disputed by the restaurant management.",
                "verification_date": datetime.now() - timedelta(minutes=20),
                "sources": {
                    "count": 3,
                    "links": [
                        "https://healthdept.gov/inspection-reports",
                        "https://localnews.com/restaurant-investigation",
                        "https://restaurant.com/official-response"
                    ],
                    "titles": [
                        "Health Department Inspection Reports",
                        "Local News: Restaurant Investigation",
                        "Restaurant Official Response"
                    ]
                }
            },
            "stored_at": datetime.now() - timedelta(minutes=20)
        },
        {
            "post_id": "sample_rumour_005",
            "claim": "Mysterious lights spotted in the sky over the city last night",
            "summary": "Multiple reports of unusual lights in the night sky",
            "platform": "TikTok",
            "Post_link": "https://tiktok.com/@user/video/mysterious-lights-city",
            "verification": {
                "verdict": "unverified",
                "message": "Unable to verify the source or authenticity of these reports",
                "reasoning": "No official explanation has been provided. Could be various phenomena including aircraft, drones, or natural occurrences.",
                "verification_date": datetime.now() - timedelta(minutes=10),
                "sources": {
                    "count": 2,
                    "links": [
                        "https://weather.gov/sky-conditions-report",
                        "https://faa.gov/flight-tracker-archive"
                    ],
                    "titles": [
                        "Weather Service: Sky Conditions Report",
                        "FAA: Flight Tracker Archive"
                    ]
                }
            },
            "stored_at": datetime.now() - timedelta(minutes=10)
        },
        {
            "post_id": "sample_rumour_006",
            "claim": "Viral deepfake shows the president announcing an unexpected policy change",
            "summary": "A widely shared video appears to show a surprise announcement from the president",
            "platform": "YouTube",
            "Post_link": "https://youtube.com/watch?v=deepfake-announcement",
            "verification": {
                "verdict": "false",
                "message": "The clip is a deepfake; official channels have no record of this announcement",
                "reasoning": "Audio-visual artifacts and mismatch with verified schedule indicate synthetic media",
                "verification_date": datetime.now() - timedelta(minutes=5),
                "sources": {
                    "count": 2,
                    "links": [
                        "https://whitehouse.gov/schedule",
                        "https://journal.example.com/deepfake-analysis"
                    ],
                    "titles": [
                        "Official Schedule",
                        "Deepfake Analysis"
                    ]
                }
            },
            "stored_at": datetime.now() - timedelta(minutes=5)
        },
        {
            "post_id": "sample_rumour_007",
            "claim": "Wildfire evacuation map shows entire county under immediate threat",
            "summary": "A map circulating online claims an entire county is being evacuated",
            "platform": "Telegram",
            "Post_link": "https://t.me/channel/wildfire-map",
            "verification": {
                "verdict": "disputed",
                "message": "Only specific zones are under watch; no county-wide evacuation order",
                "reasoning": "Emergency management alerts list partial warnings, not blanket evacuations",
                "verification_date": datetime.now() - timedelta(minutes=8),
                "sources": {
                    "count": 2,
                    "links": [
                        "https://alerts.example.gov/region-updates",
                        "https://county.gov/emergency"
                    ],
                    "titles": [
                        "Regional Alerts",
                        "County Emergency Updates"
                    ]
                }
            },
            "stored_at": datetime.now() - timedelta(minutes=8)
        },
        {
            "post_id": "sample_rumour_008",
            "claim": "Celebrity X claimed in 2015 that vaccines are a government tracking program",
            "summary": "A screenshot attributes an anti-vaccine quote to a well-known actor",
            "platform": "Threads",
            "Post_link": "https://www.threads.net/@user/post/abc123",
            "verification": {
                "verdict": "false",
                "message": "No credible source supports this quote; likely fabricated image",
                "reasoning": "Archive search and press records show no such statement from the celebrity",
                "verification_date": datetime.now() - timedelta(minutes=12),
                "sources": {
                    "count": 3,
                    "links": [
                        "https://archive.org/celebrity-press",
                        "https://newsdb.example.com/search",
                        "https://snopes.com/fact-check/celebrity-misattributed-quote"
                    ],
                    "titles": [
                        "Press Archive",
                        "News Database",
                        "Fact Check"
                    ]
                }
            },
            "stored_at": datetime.now() - timedelta(minutes=12)
        },
        {
            "post_id": "sample_rumour_009",
            "claim": "Nationwide vaccine recall announced due to severe side effects",
            "summary": "Posts claim an emergency recall affecting all batches",
            "platform": "WhatsApp",
            "Post_link": "https://example.com/forwarded-message",
            "verification": {
                "verdict": "false",
                "message": "No regulatory recall issued; official notices contradict the claim",
                "reasoning": "Regulatory databases list no recall matching the description",
                "verification_date": datetime.now() - timedelta(minutes=25),
                "sources": {
                    "count": 2,
                    "links": [
                        "https://fda.gov/recalls",
                        "https://who.int/medical-product-alerts"
                    ],
                    "titles": [
                        "FDA Recalls",
                        "WHO Alerts"
                    ]
                }
            },
            "stored_at": datetime.now() - timedelta(minutes=25)
        },
        {
            "post_id": "sample_rumour_010",
            "claim": "Earthquake predicted to hit the capital city at 7 PM tonight",
            "summary": "A viral message predicts an exact time for a major quake",
            "platform": "TikTok",
            "Post_link": "https://tiktok.com/@user/video/quake-prediction",
            "verification": {
                "verdict": "false",
                "message": "Earthquakes cannot be predicted with exact timing using current science",
                "reasoning": "Seismology consensus rejects precise short-term predictions",
                "verification_date": datetime.now() - timedelta(minutes=18),
                "sources": {
                    "count": 2,
                    "links": [
                        "https://usgs.gov/faqs/can-you-predict-earthquakes",
                        "https://seismo.org/position-on-prediction"
                    ],
                    "titles": [
                        "USGS FAQs",
                        "Seismology Position"
                    ]
                }
            },
            "stored_at": datetime.now() - timedelta(minutes=18)
        },
        {
            "post_id": "sample_rumour_011",
            "claim": "Poll shows 98% support for Candidate Y after overnight update",
            "summary": "Graphic claims near-unanimous polling shift in one night",
            "platform": "X",
            "Post_link": "https://x.com/example/status/shifted-poll",
            "verification": {
                "verdict": "uncertain",
                "message": "No reputable pollster has published this figure; methodology unclear",
                "reasoning": "Source lacks sampling details; awaiting official releases",
                "verification_date": datetime.now() - timedelta(minutes=30),
                "sources": {
                    "count": 2,
                    "links": [
                        "https://fivethirtyeight.com/polls/",
                        "https://aapor.org/methods-standards"
                    ],
                    "titles": [
                        "Polling Aggregator",
                        "Survey Standards"
                    ]
                }
            },
            "stored_at": datetime.now() - timedelta(minutes=30)
        }
    ]
    
    print("🔄 Adding sample rumour data to MongoDB...")
    
    added_count = 0
    skipped_count = 0
    
    for rumour in sample_rumours:
        try:
            # Try to insert the document
            result = collection.insert_one(rumour)
            print(f"✅ Added rumour: {rumour['post_id']} - {rumour['claim'][:50]}...")
            added_count += 1
            
        except DuplicateKeyError:
            print(f"⚠️  Skipped rumour (already exists): {rumour['post_id']}")
            skipped_count += 1
            
        except Exception as e:
            print(f"❌ Error adding rumour {rumour['post_id']}: {e}")
    
    print(f"\n📊 Summary:")
    print(f"   ✅ Added: {added_count} rumours")
    print(f"   ⚠️  Skipped: {skipped_count} rumours")
    print(f"   📝 Total in database: {collection.count_documents({})} rumours")
    
    # Close connection
    client.close()
    print("\n🔌 MongoDB connection closed")

def test_realtime_update():
    """Add a new rumour to test real-time updates"""
    
    client = get_mongo_client()
    db = client['aegis']
    collection = db['debunk_posts']
    
    # Create a new rumour with current timestamp
    new_rumour = {
        "post_id": f"test_realtime_{int(datetime.now().timestamp())}",
        "claim": "Test real-time update: This is a new rumour added for testing WebSocket functionality",
        "summary": "This rumour was added to test the real-time WebSocket update system",
        "platform": "Test Platform",
        "Post_link": "https://example.com/test-realtime-update",
        "verification": {
            "verdict": "true",
            "message": "This is a test rumour for real-time updates",
            "reasoning": "Added programmatically to verify WebSocket functionality",
            "verification_date": datetime.now(),
            "sources": {
                "count": 1,
                "links": ["https://example.com/test-source"],
                "titles": ["Test Source"]
            }
        },
        "stored_at": datetime.now()
    }
    
    print("🔄 Adding test rumour for real-time update...")
    
    try:
        result = collection.insert_one(new_rumour)
        print(f"✅ Test rumour added successfully!")
        print(f"   📝 Post ID: {new_rumour['post_id']}")
        print(f"   📅 Added at: {new_rumour['stored_at']}")
        print(f"   🔍 MongoDB ID: {result.inserted_id}")
        print("\n💡 Check your frontend - you should see this new rumour appear automatically!")
        
    except Exception as e:
        print(f"❌ Error adding test rumour: {e}")
    
    # Close connection
    client.close()
    print("\n🔌 MongoDB connection closed")

if __name__ == "__main__":
    print("🚀 MongoDB Sample Data Script")
    print("=" * 50)
    
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        test_realtime_update()
    else:
        add_sample_rumours()
    
    print("\n✨ Script completed!")
    print("\n💡 Usage:")
    print("   python add_sample_data.py          # Add sample rumours")
    print("   python add_sample_data.py test     # Add test rumour for real-time updates")
