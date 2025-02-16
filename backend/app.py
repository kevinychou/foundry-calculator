from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
from cachetools import TTLCache
from ratelimit import limits, sleep_and_retry
import os

app = Flask(__name__)
CORS(app)

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI()

# Cache setup - store results for 1 hour
cache = TTLCache(maxsize=100, ttl=3600)

# Rate limiting - 10 requests per minute
CALLS_PER_MINUTE = 10
RATE_LIMIT = 60 / CALLS_PER_MINUTE


@sleep_and_retry
@limits(calls=CALLS_PER_MINUTE, period=60)
def call_openai_api(prompt):
    # Placeholder for actual OpenAI API call
    # Replace with your specific prompts and model settings
    response = client.chat.completions.create(
        model="gpt-4o", messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content


def generate_cache_key(data):
    return (
        f"{data['country']}_{data['intervention']}_{data['disease']}_{data['subgroup']}"
    )


@app.route("/api/market-size", methods=["POST"])
def calculate_market_size():
    try:
        data = request.json

        # Input validation
        required_fields = ["country", "intervention", "disease", "subgroup", "prompts"]
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400

        # Generate cache key
        cache_key = generate_cache_key(data)

        # Check cache
        if cache_key in cache:
            return jsonify(cache[cache_key])

        # Use prompts from frontend
        results = {}
        for category, prompt in data['prompts'].items():
            results[category] = call_openai_api(prompt)

        # Cache results
        cache[cache_key] = results

        return jsonify(results)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
