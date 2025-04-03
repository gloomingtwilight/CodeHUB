from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import docker
import asyncio
import json
import os
from typing import Dict

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

docker_client = docker.from_env()

class CodeExecutionRequest(BaseModel):
    language: str
    code: str
    input_data: str = ""

# Language configurations
LANGUAGE_CONFIGS = {
    "python": {
        "image": "python:3.9-slim",
        "file_extension": ".py",
        "command": "python"
    },
    "javascript": {
        "image": "node:16-slim",
        "file_extension": ".js",
        "command": "node"
    },
    "java": {
        "image": "openjdk:11-slim",
        "file_extension": ".java",
        "command": "java"
    },
    "cpp": {
        "image": "gcc:latest",
        "file_extension": ".cpp",
        "compile_command": "g++ -o program",
        "run_command": "./program"
    }
}

@app.websocket("/ws/code-execution")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_text()
            request_data = json.loads(data)
            
            if "language" not in request_data or "code" not in request_data:
                await websocket.send_json({"error": "Invalid request format"})
                continue
                
            language = request_data["language"].lower()
            code = request_data["code"]
            input_data = request_data.get("input_data", "")
            
            if language not in LANGUAGE_CONFIGS:
                await websocket.send_json({"error": f"Unsupported language: {language}"})
                continue
            
            # Execute code in Docker container
            try:
                config = LANGUAGE_CONFIGS[language]
                container = None
                
                try:
                    # Create temporary file with code
                    file_name = f"program{config['file_extension']}"
                    with open(file_name, "w") as f:
                        f.write(code)
                    
                    # Create and start container
                    container = docker_client.containers.run(
                        config["image"],
                        command=f"{config['command']} {file_name}",
                        detach=True,
                        remove=True,
                        mem_limit="100m",  # Limit memory to 100MB
                        cpu_period=100000,  # Limit CPU usage
                        cpu_quota=50000,    # Use up to 50% CPU
                        network_mode="none",  # Disable network access
                        volumes={
                            os.path.abspath(file_name): {
                                "bind": f"/app/{file_name}",
                                "mode": "ro"
                            }
                        },
                        working_dir="/app"
                    )
                    
                    # Stream output in real-time
                    for line in container.logs(stream=True, follow=True):
                        await websocket.send_json({
                            "type": "output",
                            "data": line.decode().strip()
                        })
                    
                    # Get exit code
                    result = container.wait()
                    exit_code = result["StatusCode"]
                    
                    await websocket.send_json({
                        "type": "completion",
                        "exit_code": exit_code
                    })
                    
                finally:
                    # Cleanup
                    if container:
                        try:
                            container.remove(force=True)
                        except:
                            pass
                    if os.path.exists(file_name):
                        os.remove(file_name)
                        
            except Exception as e:
                await websocket.send_json({
                    "type": "error",
                    "message": str(e)
                })
                
    except Exception as e:
        await websocket.close()

@app.get("/languages")
async def get_supported_languages():
    return {"languages": list(LANGUAGE_CONFIGS.keys())}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 