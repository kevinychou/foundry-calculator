from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
from cachetools import TTLCache
from ratelimit import limits, sleep_and_retry
import os
import re
import pandas as pd
from io import StringIO

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
    try:
        print(f"Calling OpenAI API with prompt length: {len(prompt)}")  # Debug log
        response = client.chat.completions.create(
            model="gpt-4o", 
            messages=[{"role": "user", "content": prompt}]
        )
        content = response.choices[0].message.content
        print(f"Received response of length: {len(content)}")  # Debug log
        return content
    except Exception as e:
        print(f"OpenAI API error: {str(e)}")
        raise


def generate_cache_key(data):
    return (
        f"{data['country']}_{data['intervention']}_{data['disease']}_{data['subgroup']}"
    )


def extract_number_from_string(text):
    """Extract number from string, handling commas and dollar signs"""
    # Remove $ and commas, then convert to float
    cleaned = text.replace('$', '').replace(',', '')
    # Find the first number in the string
    match = re.search(r'[\d.]+', cleaned)
    if match:
        return float(match.group())
    return None


def parse_markdown_tables(results):
    """Extract prevalence and price from markdown tables"""
    try:
        prevalence = None
        price = None

        # Look for prevalence in epidemiology result
        if 'epidemiology' in results:
            # Updated patterns to be more flexible
            prevalence_patterns = [
                r'\|\s*(?:\*\*)?Final Prevalence(?:\*\*)?\s*\|\s*([\d,]+)\s*\|',  # Matches with or without **
                r'\|\s*(?:\*\*)?Prevalence in [^|]+\|\s*([\d,]+)\s*\|',  # Matches any prevalence with number
                r'\|\s*Final Prevalence\s*\|\s*([\d,]+)\s*\|',  # Original pattern as fallback
            ]
            
            for pattern in prevalence_patterns:
                prevalence_match = re.search(pattern, results['epidemiology'])
                if prevalence_match:
                    prevalence = extract_number_from_string(prevalence_match.group(1))
                    print(f"Extracted prevalence using pattern: {pattern}")
                    print(f"Extracted value: {prevalence}")
                    break

        # Look for price in pricing result
        if 'pricing' in results:
            # Updated regex patterns to handle various Final Cost formats
            price_patterns = [
                r'\|\s*Final Cost\s*\|\s*\$?([\d,.]+)\s*billion\s*\|',  # With billions (moved to first)
                r'\|\s*Final Cost\s*\|\s*\$?([\d,.]+)\s*\|',  # Basic format
                r'\|\s*Final Cost\s*\|\s*\$?([\d,.]+)\s*USD\s*\|',  # With USD
                r'\|\s*Final Cost\s*\|\s*\$?([\d,.]+)\s*\|\s*Calculated',  # With Calculated
                r'\|\s*Final Cost\s*\(.*?\)\s*\|\s*\$?([\d,.]+)\s*billion\s*\|',  # With brackets and billions
                r'\|\s*Final Cost\s*\(.*?\)\s*\|\s*\$?([\d,.]+)\s*\|',  # With brackets
                r'\|\s*Estimated Annual Cost of Drug per Person\s*\|\s*\$?([\d,.]+)\s*USD?\s*\|',  # Fallback
            ]
            
            for pattern in price_patterns:
                price_match = re.search(pattern, results['pricing'])
                if price_match:
                    price = extract_number_from_string(price_match.group(1))
                    # If the value is in billions, multiply by 1 billion
                    if 'billion' in results['pricing'][price_match.start():price_match.end()]:
                        price = price * 1_000_000_000
                    print(f"Extracted price using pattern: {pattern}")
                    print(f"Extracted value: {price}")
                    break

        # If either value is missing, raise an exception
        if prevalence is None:
            raise ValueError("Could not extract prevalence from epidemiology results")
        if price is None:
            raise ValueError("Could not extract price from pricing results")

        return prevalence, price

    except Exception as e:
        print(f"Error parsing markdown tables: {str(e)}")
        # Print the actual content for debugging
        if 'epidemiology' in results:
            print("Epidemiology content:")
            print(results['epidemiology'])
        if 'pricing' in results:
            print("Pricing content:")
            print(results['pricing'])
        raise


@app.route("/api/market-size", methods=["POST"])
def calculate_market_size():
    try:
        data = request.json
        print("Received request data:", data)  # Debug log

        # Input validation
        required_fields = ["country", "intervention", "disease", "subgroup", "prompts"]
        if not all(field in data for field in required_fields):
            missing = [f for f in required_fields if f not in data]
            print(f"Missing fields: {missing}")  # Debug log
            return jsonify({"error": f"Missing required fields: {missing}"}), 400

        # Generate cache key
        cache_key = generate_cache_key(data)
        print(f"Cache key: {cache_key}")  # Debug log

        # Check cache
        if cache_key in cache:
            print("Returning cached result")  # Debug log
            return jsonify(cache[cache_key])

        # Use prompts from frontend
        results = {}
        for category, prompt in data['prompts'].items():
            print(f"Calling OpenAI for {category}")  # Debug log
            results[category] = call_openai_api(prompt)
            print(f"Response for {category}:", results[category])  # Debug log

        try:
            # Extract prevalence and price from the results
            print("Attempting to parse markdown tables")  # Debug log
            prevalence, price = parse_markdown_tables(results)
            print(f"Successfully extracted values: prevalence={prevalence}, price={price}")  # Debug log
            
            # Add the extracted values to the results
            results['initial_prevalence'] = prevalence
            results['initial_price'] = price
            
            # Calculate initial total market size
            results['total_market_size'] = prevalence * price

        except Exception as e:
            print(f"Error processing market size data: {str(e)}")
            print("Results content:")
            for category, content in results.items():
                print(f"\n{category}:")
                print(content)
            return jsonify({
                "error": f"Could not extract market size data: {str(e)}",
                **results  # Still return the markdown results even if extraction failed
            }), 422

        # Cache results
        cache[cache_key] = results
        print("Successfully processed request")  # Debug log

        return jsonify(results)

    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()  # Print full stack trace
        return jsonify({"error": str(e)}), 500


def markdown_table_to_csv(markdown_text):
    """Convert a markdown table to CSV format"""
    try:
        # Split the text into lines and find the table
        lines = markdown_text.split('\n')
        table_lines = []
        in_table = False
        
        for line in lines:
            if line.startswith('|'):
                in_table = True
                # Clean up the table line
                cleaned_line = line.strip('|').strip()
                if cleaned_line and not cleaned_line.startswith('-'):  # Skip separator lines
                    table_lines.append(cleaned_line)
                    
        if not table_lines:
            return None
            
        # Convert to DataFrame
        df = pd.DataFrame([
            [cell.strip() for cell in row.split('|')]
            for row in table_lines
        ])
        
        # Use first row as headers
        df.columns = df.iloc[0]
        df = df.iloc[1:]
        
        # Convert to CSV
        csv_string = df.to_csv(index=False)
        return csv_string
        
    except Exception as e:
        print(f"Error converting markdown to CSV: {e}")
        return None


@app.route("/api/export-csv", methods=["POST"])
def export_csv():
    try:
        data = request.json
        
        # Initialize CSV content
        csv_content = []
        
        # Process each section's markdown table
        for section, content in data.items():
            if section in ['epidemiology', 'intervention', 'pricing']:
                csv = markdown_table_to_csv(content)
                if csv:
                    # Add section header
                    section_csv = f"\n{section.upper()}\n{csv}"
                    csv_content.append(section_csv)
        
        # Combine all CSVs
        final_csv = "\n".join(csv_content)
        
        return jsonify({"csv": final_csv})
        
    except Exception as e:
        print(f"Error exporting CSV: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
