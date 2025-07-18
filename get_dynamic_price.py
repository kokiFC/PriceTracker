import csv
import datetime
import time
from pathlib import Path

# --- Static Scraping Libraries ---
import requests
from bs4 import BeautifulSoup
from selenium.webdriver.common.by import By

# --- Dynamic Scraping Libraries ---
from selenium import webdriver
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# --- Configuration ---
# Get the directory where the script is located
BASE_DIR = Path(__file__).resolve().parent
PRODUCTS_CSV_PATH = BASE_DIR / "products.csv"
PRICE_LOG_PATH = BASE_DIR / "price_log.csv"
def scrape_static_price(url, selector):
    """Scrapes a price from a static website using Requests and BeautifulSoup."""
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        page = requests.get(url, headers=headers, timeout=15)
        page.raise_for_status()
        soup = BeautifulSoup(page.content, "html.parser")
        price_element = soup.select_one(selector)
        if price_element:
            return price_element.text.strip()
        else:
            return "Element not found"

    except Exception as e:
        return f"Error (static): {e}"

def scrape_dynamic_price(url, selector):
    """Scrapes a price from a dynamic website using Selenium."""
    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--log-level=3")  # Suppress console logs
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        driver.get(url)
        time.sleep(5) # Increased initial wait to allow all elements to load (without JS)

        # Wait up to 30 seconds for the price element to become visible
        wait = WebDriverWait(driver, 30)
        price_element = wait.until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, selector))
        )
        
        # After the element is visible, wait for its text content to not be empty
        # This is a more robust way to handle dynamically loaded text
        price_text = ""
        # Wait for up to 15 seconds for text content to appear, checking every 0.5 seconds
        for _ in range(int(15 / 0.5)): # 30 retries over 15 seconds
            price_text = driver.execute_script("return arguments[0].textContent;", price_element).strip()
            if price_text:
                break
            time.sleep(0.5) # Small delay before retrying
            
        if price_text:
            return price_text
        else:
            # If price text is still empty, try a few common alternative selectors for ardes.bg
            if "ardes.bg" in url:
                print(f"Price text not found with '{selector}', trying alternative selectors for ardes.bg...")
                alternative_selectors = [
                    '.product-price-value', # Common price class
                    '.price-value',
                    'span.price',
                    'div.price',
                    'strong.price'
                ]
                for alt_selector in alternative_selectors:
                    try:
                        alt_price_element = wait.until(
                            EC.visibility_of_element_located((By.CSS_SELECTOR, alt_selector))
                        )
                        alt_price_text = ""
                        for _ in range(int(5 / 0.5)): # 10 retries over 5 seconds for alternative
                            alt_price_text = driver.execute_script("return arguments[0].textContent;", alt_price_element).strip()
                            if alt_price_text:
                                print(f"Price found with alternative selector: '{alt_selector}'")
                                return alt_price_text
                            time.sleep(0.5)
                    except:
                        continue # Continue to next alternative if current one fails
            return "Price text not found after element visible or with alternatives"
    except Exception as e:
        return f"Error (dynamic): {e}"
    finally:
        driver.quit()

OUTPUT_CSV_PATH = BASE_DIR / "price_data.csv"

def clean_price(price_str):
    """Cleans the price string by removing currency symbols and standardizing decimal separators."""
    if not price_str:
        return price_str
    # Remove currency symbols and non-numeric characters except comma and dot
    cleaned = price_str.replace('лв.', '').replace('BGN', '').strip()
    # Replace comma with dot for decimal separation
    cleaned = cleaned.replace(',', '.')
    # Remove any remaining non-numeric characters except the dot
    cleaned = ''.join(c for c in cleaned if c.isdigit() or c == '.')
    return cleaned

def log_price(timestamp, product_name, price):
    """Appends a new price entry to the log file."""
    # Ensure log file exists with headers
    if not OUTPUT_CSV_PATH.exists():
        with open(OUTPUT_CSV_PATH, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(["date", "product", "price"])
            
    # Append the new price data
    with open(OUTPUT_CSV_PATH, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([timestamp, product_name, price])

def main():
    """Main function to read products and scrape prices."""
    print("Starting price tracker...")
    if not PRODUCTS_CSV_PATH.exists():
        print(f"Error: {PRODUCTS_CSV_PATH} not found!")
        return

    with open(PRODUCTS_CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter=',')
        for row in reader:
            print(row)
            product_name = row['product_name']
            url = row['url']
            selector = row['selector']
            scrape_type = row['type']
            
            print(f"  -> Tracking '{product_name}' ({scrape_type})...")
            
            price = ""
            if scrape_type == 'static':
                price = scrape_static_price(url, selector)
            elif scrape_type == 'dynamic':
                price = scrape_dynamic_price(url, selector)
            else:
                price = f"Unknown type '{scrape_type}'"
            
            cleaned_price = clean_price(price)
            date = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_price(date, product_name, cleaned_price)
            print(f"     Price found: {cleaned_price}")
            # Add a small delay to be polite to the websites
            time.sleep(2)
            
    print("Price tracking complete.")

if __name__ == "__main__":
    main()
