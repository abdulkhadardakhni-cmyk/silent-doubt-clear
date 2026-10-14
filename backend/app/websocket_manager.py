from fastapi import WebSocket
from typing import Dict, List, Any
import json

class ConnectionManager:
    """Manages active WebSocket connections grouped by lecture ID."""
    
    def __init__(self):
        # Map lecture_id -> List[WebSocket]
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, lecture_id: int):
        await websocket.accept()
        if lecture_id not in self.active_connections:
            self.active_connections[lecture_id] = []
        self.active_connections[lecture_id].append(websocket)
        print(f"[WS] Client connected to lecture {lecture_id}. Total connected: {len(self.active_connections[lecture_id])}")

    def disconnect(self, websocket: WebSocket, lecture_id: int):
        if lecture_id in self.active_connections:
            if websocket in self.active_connections[lecture_id]:
                self.active_connections[lecture_id].remove(websocket)
            if not self.active_connections[lecture_id]:
                del self.active_connections[lecture_id]
        print(f"[WS] Client disconnected from lecture {lecture_id}")

    async def broadcast_to_lecture(self, lecture_id: int, message: Dict[str, Any]):
        """Broadcast an event payload to all clients listening to a specific lecture."""
        if lecture_id not in self.active_connections:
            return

        dead_connections = []
        message_json = json.dumps(message)
        
        for connection in self.active_connections[lecture_id]:
            try:
                await connection.send_text(message_json)
            except Exception as e:
                print(f"[WS] Failed sending message to a client: {e}")
                dead_connections.append(connection)

        # Cleanup broken sockets
        for dead in dead_connections:
            self.disconnect(dead, lecture_id)

ws_manager = ConnectionManager()
