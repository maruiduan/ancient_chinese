# -*- coding: utf-8 -*-
"""把 data/dict.json 的 py 改成常用读音，说文读音存入 pySw。可重复执行。"""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from common_reading import common_py, norm

path = ROOT / "data" / "dict.json"
payload = json.loads(path.read_text(encoding="utf-8"))
n = 0
for ch, e in payload["chars"].items():
    sw = norm(e.get("pySw") or e.get("py") or "")
    py = common_py(ch, sw)
    if py != sw:
        e["pySw"] = sw
        n += 1
    else:
        e.pop("pySw", None)
    e["py"] = py
path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print("changed", n)
