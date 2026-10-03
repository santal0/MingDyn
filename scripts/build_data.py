"""Convert the editorial workbook into a traceable static catalogue (stdlib only).

Merged values are resolved through their actual rectangles, never forward-filled.
Section anchors, not row numbers, determine the eight office collections. Raw
cells are retained separately so the source remains inspectable without Excel.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from hashlib import sha256
import json
from pathlib import Path
import posixpath
import re
import shutil
import sys
import xml.etree.ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
NS = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
RNS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
RANKS = [f"{kind}{number}品" for number in "一二三四五六七八九" for kind in "正从"]
CATEGORIES = ["皇帝辅臣", "中央机构", "地方行政", "军事机构", "厂卫", "羁縻机构", "派驻官员"]


def clean(text: str) -> str:
    return re.sub(r"\s+", "", text)


def uid(prefix: str, *parts: str) -> str:
    return prefix + "-" + sha256("|".join(parts).encode()).hexdigest()[:12]


def colnum(col: str) -> int:
    result = 0
    for c in col:
        result = result * 26 + ord(c) - 64
    return result


def colname(number: int) -> str:
    result = ""
    while number:
        number, remainder = divmod(number - 1, 26)
        result = chr(65 + remainder) + result
    return result


def position(ref: str) -> tuple[int, int]:
    match = re.fullmatch(r"([A-Z]+)([0-9]+)", ref)
    if not match:
        raise ValueError(f"Invalid cell address: {ref}")
    return colnum(match[1]), int(match[2])


class Workbook:
    def __init__(self, path: Path):
        self.cells: dict[str, str] = {}
        self.origins: dict[str, str] = {}
        self.merges: list[str] = []
        with ZipFile(path) as archive:
            shared = []
            if "xl/sharedStrings.xml" in archive.namelist():
                shared = ["".join(t.text or "" for t in si.findall(".//x:t", NS))
                          for si in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("x:si", NS)]
            sheets = ET.fromstring(archive.read("xl/workbook.xml")).findall("x:sheets/x:sheet", NS)
            if len(sheets) != 1:
                raise ValueError("预期一个工作表；工作表结构改变，请更新解析规则。")
            self.sheet = sheets[0].attrib["name"]
            rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
            target = next(r.attrib["Target"] for r in rels
                          if r.attrib["Id"] == sheets[0].attrib[f"{{{RNS}}}id"])
            target = target.lstrip("/") if target.startswith("/") else posixpath.normpath("xl/" + target)
            xml = ET.fromstring(archive.read(target))
            for cell in xml.findall("x:sheetData/x:row/x:c", NS):
                if cell.find("x:f", NS) is not None:
                    raise ValueError(f"{cell.attrib['r']} 含公式；当前资料解析器不计算公式。")
                value = cell.find("x:v", NS)
                if cell.attrib.get("t") == "s":
                    text = shared[int(value.text)] if value is not None else ""
                elif cell.attrib.get("t") == "inlineStr":
                    text = "".join(t.text or "" for t in cell.findall(".//x:t", NS))
                else:
                    text = value.text or "" if value is not None else ""
                if text.strip():
                    self.cells[cell.attrib["r"]] = text
            for merge in xml.findall("x:mergeCells/x:mergeCell", NS):
                ref = merge.attrib["ref"]
                self.merges.append(ref)
                start, end = ref.split(":")
                x1, y1 = position(start)
                x2, y2 = position(end)
                for y in range(y1, y2 + 1):
                    for x in range(x1, x2 + 1):
                        address = f"{colname(x)}{y}"
                        if address in self.origins:
                            raise ValueError(f"重叠合并区域：{address}")
                        self.origins[address] = start
            self.max_row = max(position(ref)[1] for ref in self.cells)
            self.max_col = max(position(ref)[0] for ref in self.cells)

    def get(self, col: str, row: int, merged: bool = True) -> str:
        address = f"{col}{row}"
        return self.cells.get(self.origins.get(address, address) if merged else address, "")

    def source(self, col: str, row: int) -> str:
        address = f"{col}{row}"
        return self.origins.get(address, address)

    def anchor(self, text: str, col: str) -> int:
        matches = [r for r in range(1, self.max_row + 1) if self.get(col, r, False) == text]
        if len(matches) != 1:
            raise ValueError(f"栏目锚点 {col} / {text} 应出现一次，实际 {len(matches)} 次。")
        return matches[0]


def build_catalogue(path: Path, curation: dict | None = None) -> dict:
    book = Workbook(path)
    curation = curation if curation is not None else json.loads((ROOT / "data/curation.json").read_text())
    issues: list[dict] = []

    def issue(kind: str, message: str, sources: list[str], record_ids: list[str] | None = None):
        issues.append({"id": uid("issue", kind, message, *sources), "kind": kind,
                       "message": message, "sources": sources, "recordIds": record_ids or []})

    offices = []
    occurrences: Counter = Counter()
    sections = [
        ("A", "皇帝辅臣", "皇帝辅臣"), ("A", "中央政府", "中央机构"),
        ("G", "地方行政", "地方行政"), ("G", "羁縻州", "羁縻机构"),
        ("G", "卫所", "军事机构"), ("M", "军事机构", "军事机构"),
        ("M", "厂卫", "厂卫"), ("M", "派驻地方官", "派驻官员"),
    ]
    for base, heading, category in sections:
        start = book.anchor(heading, base)
        next_starts = [book.anchor(h, b) for b, h, _ in sections if b == base and book.anchor(h, b) > start]
        end = min(next_starts, default=book.max_row + 1)
        cols = [colname(colnum(base) + i) for i in range(6)]
        for row in range(start + 1, end):
            title = book.get(cols[1], row, False)
            rank = book.get(cols[2], row, False)
            if not title or title == "官职" or not rank:
                continue
            if rank not in RANKS + ["超品", "未入流", "无品级"]:
                raise ValueError(f"{cols[2]}{row} 品级无法识别：{rank}")
            group = book.get(cols[0], row)
            if not group:
                raise ValueError(f"{base}{row} 缺少官属分组；请保持分组合并区域或填写官属。")
            special = heading == "派驻地方官"
            number = "" if special else book.get(cols[3], row)
            affiliation = "" if special else book.get(cols[4], row)
            duties = book.get(cols[3] if special else cols[5], row)
            name, actual_category = group, category
            editorial = ""
            for rule in curation["institutionRules"]:
                if affiliation.startswith(rule["affiliationPrefix"]):
                    name, actual_category = rule["name"], rule["category"]
                    editorial = rule["note"]
                    break
            identity = (heading, group, title, affiliation)
            occurrences[identity] += 1
            record_id = uid("office", *identity, str(occurrences[identity]))
            sources = {label: book.source(col, row) for label, col in zip(
                ["group", "title", "rank", "headcount", "affiliation", "duties"], cols)}
            if special:
                sources = {"group": book.source(cols[0], row), "title": f"{cols[1]}{row}",
                           "rank": f"{cols[2]}{row}", "duties": book.source(cols[3], row)}
            sources = {k: v for k, v in sources.items() if v in book.cells}
            offices.append({"id": record_id, "title": title, "rank": rank,
                            "rankOrder": RANKS.index(rank) if rank in RANKS else {"超品": -1, "未入流": 18, "无品级": 19}[rank],
                            "category": actual_category, "sourceCategory": heading, "sourceGroup": group,
                            "institution": name, "institutionId": uid("inst", actual_category, name),
                            "headcount": number, "affiliation": affiliation, "duties": duties,
                            "editorialNote": editorial, "sources": sources, "row": row})

    institutions = {}
    for office in offices:
        inst = institutions.setdefault(office["institutionId"], {
            "id": office["institutionId"], "name": office["institution"], "category": office["category"],
            "officeIds": [], "descriptions": [], "affiliations": [], "notes": []})
        inst["officeIds"].append(office["id"])
        # Reclassified entries must not inherit the other institution's description.
        if office["duties"] and office["sourceGroup"] == office["institution"]:
            descriptor = {"text": office["duties"], "source": office["sources"]["duties"]}
            if descriptor not in inst["descriptions"]:
                inst["descriptions"].append(descriptor)
        if office["affiliation"] and office["affiliation"] not in inst["affiliations"]:
            inst["affiliations"].append(office["affiliation"])
        if office["editorialNote"] and office["editorialNote"] not in inst["notes"]:
            inst["notes"].append(office["editorialNote"])
    for office in offices:
        if office["sourceGroup"] != office["institution"]:
            office["dutiesScope"] = "原表分组说明；不直接视为本机构职责"
        else:
            office["dutiesScope"] = "原表职事"

    duplicates = defaultdict(list)
    for office in offices:
        duplicates[(office["institutionId"], office["title"], office["rank"], clean(office["affiliation"]))].append(office)
    for records in duplicates.values():
        if len(records) > 1:
            issue("重复条目", f"{records[0]['institution']}的“{records[0]['title']}”在原表重复出现，保留全部来源。",
                  [r["sources"]["title"] for r in records], [r["id"] for r in records])

    alias_map = {alias: rule["canonical"] for rule in curation["personAliases"] for alias in rule["variants"]}

    def person_name(value: str) -> str:
        value = clean(value)
        return alias_map.get(value, value)

    people = {}

    def add_person(name: str, raw_name: str, source: str, identity: str = "") -> dict:
        pid = uid("person", identity or name)
        person = people.setdefault(pid, {"id": pid, "name": name, "aliases": [], "sources": [], "reignIds": [], "familyIds": []})
        if raw_name and raw_name != name and raw_name not in person["aliases"]:
            person["aliases"].append(raw_name)
        if source not in person["sources"]:
            person["sources"].append(source)
        return person

    reigns = []
    dynasty = "明"
    for row in range(book.anchor("大明正朔", "T") + 1, book.anchor("皇室字辈", "T")):
        if book.get("T", row, False) == "南明五帝":
            dynasty = "南明（原表）"
        raw_name = book.get("U", row, False)
        if not raw_name or raw_name == "名讳":
            continue
        name = person_name(raw_name)
        person = add_person(name, raw_name, f"U{row}")
        era = book.get("V", row)
        time = book.get("W", row)
        years = [int(n) for n in re.findall(r"\d{4}", time)]
        if not years:
            raise ValueError(f"W{row} 未识别到年份：{time}")
        reign = {"id": uid("reign", name, era), "personId": person["id"], "name": name,
                 "rawName": raw_name, "title": book.get("T", row), "era": era, "period": time,
                 "start": years[0], "end": years[-1], "posthumous": book.get("X", row),
                 "dynasty": dynasty, "sources": {k: book.source(c, row) for k, c in
                 [("title", "T"), ("name", "U"), ("era", "V"), ("period", "W"), ("posthumous", "X")]}}
        person["reignIds"].append(reign["id"])
        reigns.append(reign)

    families = []
    family = None
    child_occurrences: Counter = Counter()
    for row in range(1, book.max_row + 1):
        heading = book.get("AC", row, False)
        if "子嗣--" in heading or "无子--" in heading:
            text = clean(heading)
            match = re.match(r"(.+?)(朱.+?)(?:子嗣|无子)--(.+)", text)
            if not match:
                raise ValueError(f"AC{row} 家庭标题无法识别：{heading}")
            name = person_name(match[2])
            parent = add_person(name, match[2], f"AC{row}")
            family = {"id": uid("family", name), "parentId": parent["id"], "parentName": name,
                      "heading": heading, "era": match[3], "source": f"AC{row}", "children": [], "noChildren": "无子--" in heading}
            parent["familyIds"].append(family["id"])
            families.append(family)
            continue
        for col in ["AC", "AD", "AE", "AF"]:
            raw = book.get(col, row, False)
            if not raw:
                continue
            if family is None:
                raise ValueError(f"{col}{row} 子嗣没有家庭标题。")
            parts = raw.split()
            order = parts[0]
            candidate = parts[1] if len(parts) > 1 and parts[1].startswith("朱") else ""
            name = person_name(candidate) if candidate else "姓名未载"
            # Incomplete and split-glyph names are local records, not global identities.
            complete = bool(candidate) and len(name) >= 2 and not any(char in name for char in "<>") and candidate not in {"朱", "朱祐", "朱慈", "朱木彝"}
            child_occurrences[(family["id"], raw)] += 1
            child_key = uid("child", family["id"], raw, str(child_occurrences[(family["id"], raw)]))
            person = add_person(name, candidate, f"{col}{row}", "" if complete else child_key)
            family["children"].append({"id": child_key, "personId": person["id"], "name": name,
                                       "order": order, "description": " ".join(parts[2:] if candidate else parts[1:]),
                                       "raw": raw, "source": f"{col}{row}"})

    generations = []
    for row in range(book.anchor("皇室字辈", "T") + 1, book.max_row + 1):
        text = book.get("T", row, False)
        if not text:
            continue
        if "：" not in text:
            raise ValueError(f"T{row} 字辈格式变化：{text}")
        house, poem = text.split("：", 1)
        generations.append({"id": uid("generation", house), "house": house, "poem": poem,
                            "characters": list(re.sub(r"[\s，。；、]", "", poem)), "source": f"T{row}"})

    systems = []
    for col, label in [("G", "文散阶"), ("J", "武散阶")]:
        for row in range(book.anchor("文散阶", "G") + 1, book.anchor("勋级", "G")):
            text = book.get(col, row, False)
            if text:
                systems.append({"id": uid("system", label, text), "kind": "散阶", "type": label,
                                "rank": text.split()[0], "text": text, "source": f"{col}{row}"})
    for col, label in [("G", "文勋"), ("J", "武勋")]:
        for row in range(book.anchor("文勋十级", "G") + 1, book.anchor("地方行政", "G")):
            text = book.get(col, row, False)
            if text:
                systems.append({"id": uid("system", label, text), "kind": "勋级", "type": label,
                                "rank": text.split()[0], "text": text, "source": f"{col}{row}"})
    titles = []
    for row in range(book.anchor("宗室封爵", "G") + 1, book.anchor("散官", "G")):
        if book.get("H", row, False):
            titles.append({"label": book.get("G", row), "sequence": book.get("H", row).split("→"),
                           "source": f"H{row}"})

    exams = []
    for row in range(book.anchor("科举取士", "L") + 1, book.anchor("军事机构", "M")):
        result = book.get("Q", row, False)
        if not result or result == "录取结果":
            continue
        stage = book.get("L", row)
        if not stage:
            raise ValueError(f"Q{row} 缺少考试阶段。")
        exams.append({"id": uid("exam", stage, result), "stage": stage, "place": book.get("M", row),
                      "time": book.get("N", row), "level": book.get("O", row), "result": result,
                      "sources": {key: book.source(col, row) for key, col in
                                  [("stage", "L"), ("place", "M"), ("time", "N"), ("level", "O"), ("result", "Q")]}})

    for rule in curation["personAliases"]:
        pid = uid("person", rule["canonical"])
        if pid in people and people[pid]["aliases"]:
            issue("人名异写", rule["note"], people[pid]["sources"], [pid])
    for note in curation["reviewNotes"]:
        # Coordinate plus expected text prevents a moved row from inheriting an
        # unrelated editorial note. A unique text match can relocate the note.
        candidates = [address for address, text in book.cells.items() if note["contains"] in text]
        original_matches = note["contains"] in book.cells.get(note["cell"], "")
        if original_matches or len(candidates) == 1:
            issue("待核实", note["message"], [note["cell"] if original_matches else candidates[0]])
        else:
            issue("整理规则待更新", f"原 {note['cell']} 的校核标记无法唯一定位，请复核 data/curation.json 中的文字锚点。", [])
    for office in offices:
        if office["editorialNote"]:
            issue("分类整理", office["editorialNote"], [office["sources"]["title"], office["sources"]["affiliation"]], [office["id"]])

    notes = [{"text": text, "source": address} for address, text in book.cells.items()
             if text.startswith("下属有")]
    stats = {"offices": len(offices), "institutions": len(institutions), "reigns": len(reigns),
             "emperors": len({r["personId"] for r in reigns}), "families": len(families),
             "children": sum(len(f["children"]) for f in families), "generations": len(generations),
             "systems": len(systems), "examOutcomes": len(exams), "issues": len(issues),
             "sourceCells": len(book.cells), "mergedRanges": len(book.merges)}
    if not all(stats[key] for key in ["offices", "reigns", "families", "generations", "systems", "examOutcomes"]):
        raise ValueError("存在空主题，停止发布。")
    catalogue = {"meta": {"schemaVersion": 1, "sourceFile": path.name, "sheet": book.sheet,
                           "sourceHash": sha256(path.read_bytes()).hexdigest(),
                           "rows": book.max_row, "columns": book.max_col, "stats": stats},
                 "categories": CATEGORIES, "ranks": ["超品", *RANKS, "未入流", "无品级"],
                 "offices": offices, "institutions": list(institutions.values()), "reigns": reigns,
                 "people": list(people.values()), "families": families, "generations": generations,
                 "systems": systems, "titles": titles, "exams": exams, "notes": notes, "issues": issues,
                 "source": {"cells": book.cells, "merges": book.merges}}
    validate(catalogue)
    return catalogue


def validate(data: dict):
    """Fail builds for structural loss, duplicate IDs, broken references or cycles."""
    for collection in ["offices", "institutions", "people", "families", "reigns", "exams", "systems", "generations", "issues"]:
        ids = [r["id"] for r in data[collection]]
        if len(ids) != len(set(ids)):
            raise ValueError(f"{collection} 存在重复 ID。")
    people = {p["id"] for p in data["people"]}
    offices = {o["id"] for o in data["offices"]}
    institutions = {i["id"] for i in data["institutions"]}
    for office in data["offices"]:
        if office["institutionId"] not in institutions:
            raise ValueError("官职关联的机构不存在。")
    for inst in data["institutions"]:
        if not set(inst["officeIds"]).issubset(offices):
            raise ValueError("机构关联的官职不存在。")
    graph = defaultdict(list)
    for family in data["families"]:
        if family["parentId"] not in people:
            raise ValueError("家庭关联的父亲不存在。")
        for child in family["children"]:
            if child["personId"] not in people:
                raise ValueError("家庭关联的子嗣不存在。")
            graph[family["parentId"]].append(child["personId"])
    visited = set()

    def visit(node, path):
        if node in path:
            raise ValueError("亲子关系出现循环。")
        if node not in visited:
            for child in graph[node]:
                visit(child, path | {node})
            visited.add(node)
    for node in list(graph):
        visit(node, set())
    for reign in data["reigns"]:
        if reign["personId"] not in people or reign["end"] < reign["start"]:
            raise ValueError("帝系记录的关联或时间无效。")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=ROOT / "Data.xlsx")
    parser.add_argument("--output", type=Path, default=ROOT / "public/data")
    args = parser.parse_args()
    try:
        data = build_catalogue(args.source)
    except (ValueError, KeyError, ET.ParseError) as error:
        print(f"数据校验失败：{error}", file=sys.stderr)
        sys.exit(1)
    args.output.mkdir(parents=True, exist_ok=True)
    # Keep the heavier raw worksheet out of the main catalogue; load it on demand.
    source = data.pop("source")
    for name, payload in [("catalogue", data), ("source", source), ("report", {"stats": data["meta"]["stats"], "issues": data["issues"]})]:
        (args.output / f"{name}.json").write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    shutil.copyfile(args.source, args.output.parent / "Data.xlsx")
    print(json.dumps(data["meta"]["stats"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
