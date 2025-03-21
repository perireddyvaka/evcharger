import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests
import json

# Initialize logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

HEADERS = {
    'X-M2M-Origin': 'dev_guest:dev_guest',
    'Accept': 'application/json'
}

DESCRIPTOR_URL = "http://dev-onem2m.iiit.ac.in:443/~/in-cse/in-name/AE-EV/USER/USER-02/Descriptor/?rcn=4"
TRANSACTIONS_URL = "http://dev-onem2m.iiit.ac.in:443/~/in-cse/in-name/AE-EV/USER/USER-02/Transactions/?rcn=4"

user_app = FastAPI()

# Enable CORS
user_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def fetch_data(url, headers):
    try:
        logger.info(f"Fetching data from URL: {url}")
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        logger.info("Data fetched successfully")
        return response.json()
    except requests.RequestException as e:
        logger.error(f"Error fetching data from {url}: {e}")
        return None

def map_descriptor_data(descriptor):
    try:
        logger.info("Mapping descriptor data...")
        if 'm2m:cnt' in descriptor:
            descriptor_content = descriptor['m2m:cnt']
            cin_content = descriptor_content.get('m2m:cin', [])
            # print(cin_content)
            if cin_content:
                con = cin_content[0].get('con', '')
                if '<str name="Data String Parameters"' in con:
                    start = con.find("[", con.find("Data String Parameters"))
                    end = con.find("]", start) + 1
                    data_string_parameters = json.loads(con[start:end].replace("'", '"'))
                    logger.info(f"Descriptor keys mapped: {data_string_parameters}")
                    return data_string_parameters
        logger.warning("No descriptor data found")
        return []
    except Exception as e:
        logger.error(f"Error mapping descriptor data: {e}")
        return []

def map_transaction_data(transactions, data_keys):
    try:
        logger.info("Mapping transaction data...")
        mapped_transactions = []
        
        if 'm2m:cnt' in transactions:
            transaction_content = transactions['m2m:cnt']
            # print(transaction_content)
            cin_list = transaction_content.get('m2m:cin', [])
            # print(cin_list)
            for cin in cin_list:
                con_values = cin.get('con', '')
                print(con_values)
                try:
                    values = eval(con_values)
                    print("values", values)
                    print(len(values))
                    print(len(data_keys))
                    if len(values) == len(data_keys):
                        print("ok this is good")
                        transaction_mapping = dict(zip(data_keys, values))
                        mapped_transactions.append(transaction_mapping)
                except (json.JSONDecodeError, ValueError) as e:
                    logger.error(f"Error parsing transaction content: {e}")
                    print("data", data_keys)
                   
        logger.info(f"Mapped transactions: {json.dumps(mapped_transactions, indent=4)}")
        return mapped_transactions
    
    except Exception as e:
        logger.error(f"Error mapping transaction data: {e}")
        return []

@user_app.get("/get-transactions")
def get_transactions():
    logger.info("GET /get-transactions called")
    descriptor_data = fetch_data(DESCRIPTOR_URL, HEADERS)
    transactions_data = fetch_data(TRANSACTIONS_URL, HEADERS)

    if not descriptor_data or not transactions_data:
        logger.error("Failed to fetch descriptor or transactions data")
        return {"error": "Failed to fetch data"}

    data_keys = map_descriptor_data(descriptor_data)
    if not data_keys:
        logger.error("Descriptor data keys not found")
        return {"error": "Descriptor data keys not found"}

    mapped_transactions = map_transaction_data(transactions_data, data_keys)
    return {"transactions": mapped_transactions}
