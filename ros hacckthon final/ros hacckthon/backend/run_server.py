import uvicorn
import sys
import os

def main():
    try:
        print("Starting CodeHUB backend server...")
        print("Make sure Docker is running on your system")
        
        # Add the current directory to Python path
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        
        # Run the server
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,  # Enable auto-reload
            log_level="info"
        )
    except Exception as e:
        print(f"Error starting server: {str(e)}")
        print("Please make sure:")
        print("1. Port 8000 is not in use")
        print("2. Docker is installed and running")
        print("3. All required packages are installed (run: pip install -r requirements.txt)")
        sys.exit(1)

if __name__ == "__main__":
    main() 