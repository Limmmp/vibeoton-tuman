"""Отправка Python-кода в запущенный Blender через сервер дополнения MCP (localhost:9876).
Использование: python bl.py script.py   или   python bl.py -c "print(1)"
"""
import json, socket, sys

def send(code: str, timeout: float = 600) -> dict:
    with socket.create_connection(("127.0.0.1", 9876), timeout=timeout) as s:
        s.sendall(json.dumps({"type": "execute_code", "params": {"code": code}}).encode())
        buf = b""
        while True:
            chunk = s.recv(65536)
            if not chunk:
                break
            buf += chunk
            try:
                return json.loads(buf)
            except json.JSONDecodeError:
                continue
    return json.loads(buf)

if __name__ == "__main__":
    code = sys.argv[2] if sys.argv[1] == "-c" else open(sys.argv[1], encoding="utf-8").read()
    r = send(code)
    res = r.get("result", r)
    print(res.get("result", res) if isinstance(res, dict) else res)
