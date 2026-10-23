#!/usr/bin/env python3
"""把 prose_spot_review.SPOT_REVIEW 的定点读音写入已发布的古文观止、资治通鉴、人间词话篇目。

已发布篇目是权威数据（含后续校订），build_site.py 默认不重建它们，所以复核结果
需要按篇定点写入。每条规则只作用于自己标明的篇目；重复运行结果不变。
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from prose_spot_review import SPOT_REVIEW  # noqa: E402


def apply(write: bool) -> int:
    by_id: dict[str, list] = {}
    for sid, ctx, at, py in SPOT_REVIEW:
        by_id.setdefault(sid, []).append((ctx, at, py))
    changed = 0
    for sid, rules in sorted(by_id.items()):
        path = ROOT / "data" / "articles" / f"{sid}.json"
        art = json.loads(path.read_text(encoding="utf-8"))
        hit = [0] * len(rules)
        n = 0
        for para in art["paragraphs"]:
            for sent in para["sentences"]:
                toks = sent["tokens"]
                seq = "".join(t["s"] for t in toks)
                starts = []
                p = 0
                for t in toks:
                    starts.append(p)
                    p += len(t["s"])
                index = {s: k for k, s in enumerate(starts)}
                for r, (ctx, at, py) in enumerate(rules):
                    i = seq.find(ctx)
                    while i >= 0:
                        k = index.get(i + at)
                        if k is not None and len(toks[k]["s"]) == 1 and not toks[k].get("punct"):
                            hit[r] += 1
                            if toks[k].get("py") != py:
                                toks[k]["py"] = py
                                n += 1
                        i = seq.find(ctx, i + 1)
        missing = [rules[r] for r, h in enumerate(hit) if not h]
        if missing:
            raise SystemExit(f"{sid} 规则未命中：{missing}")
        if n and write:
            path.write_text(json.dumps(art, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        changed += n
    return changed


if __name__ == "__main__":
    print("changed", apply("--write" in sys.argv))
