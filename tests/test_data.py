"""Regression tests for source semantics and failure cases, without third-party deps."""
import copy
import importlib.util
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("build_data", ROOT / "scripts/build_data.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class CatalogueTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = builder.build_catalogue(ROOT / "Data.xlsx")
        cls.book = builder.Workbook(ROOT / "Data.xlsx")

    def test_every_nonempty_cell_is_retained(self):
        self.assertEqual(self.data["source"]["cells"], self.book.cells)
        self.assertEqual(self.data["meta"]["stats"]["sourceCells"], len(self.book.cells))
        for item in self.data["offices"] + self.data["reigns"] + self.data["exams"]:
            for cell in item["sources"].values():
                self.assertIn(cell, self.data["source"]["cells"])

    def test_merged_values_do_not_leak_into_next_group(self):
        offices = self.data["offices"]
        shi_lang = next(o for o in offices if o["title"] == "户部左、右侍郎")
        self.assertEqual(shi_lang["sourceGroup"], "户部")
        self.assertIn("田地", shi_lang["duties"])
        self.assertEqual(shi_lang["headcount"], "二人")
        li_bu = next(o for o in offices if o["title"] == "礼部尚书")
        self.assertNotEqual(shi_lang["sources"]["duties"], li_bu["sources"]["duties"])
        self.assertEqual(shi_lang["dutiesScope"], "原表职事")

    def test_shangbao_is_not_a_honglu_subordinate(self):
        records = [o for o in self.data["offices"] if o["affiliation"] == "尚宝司"]
        self.assertGreaterEqual(len(records), 6)
        self.assertEqual({o["institution"] for o in records}, {"尚宝司"})
        self.assertEqual({o["category"] for o in records}, {"中央机构"})
        self.assertGreaterEqual(len({o["id"] for o in records}), 6)
        self.assertTrue(any(i["kind"] == "重复条目" and "尚宝司" in i["message"] for i in self.data["issues"]))

    def test_compound_titles_and_headcount_text_are_not_split(self):
        records = self.data["offices"]
        self.assertTrue(any(o["title"] == "太师、太傅、太保" and o["headcount"] == "无定员" for o in records))
        self.assertTrue(any(o["headcount"] == "各一人" for o in records))
        delegated = [o for o in records if o["sourceCategory"] == "派驻地方官"]
        self.assertTrue(all(o["headcount"] == "" and o["affiliation"] == "" for o in delegated))
        self.assertTrue(all(o["rank"] == "无品级" and o["duties"] for o in delegated))

    def test_one_emperor_has_two_reigns(self):
        reigns = [r for r in self.data["reigns"] if r["name"] == "朱祁镇"]
        self.assertEqual({r["era"] for r in reigns}, {"正统", "天顺"})
        self.assertEqual(len({r["personId"] for r in reigns}), 1)
        self.assertEqual(next(r for r in reigns if r["era"] == "天顺")["title"], "复帝")
        short = next(r for r in self.data["reigns"] if r["era"] == "泰昌")
        self.assertIn("1月", short["period"])
        self.assertEqual(short["start"], short["end"])

    def test_aliases_keep_original_sources(self):
        person = next(p for p in self.data["people"] if p["name"] == "朱厚熜")
        self.assertIn("朱厚熄", person["aliases"])
        family = next(f for f in self.data["families"] if f["parentId"] == person["id"])
        self.assertIn("朱厚熄", family["heading"])

    def test_missing_names_are_independent_people(self):
        children = [c for f in self.data["families"] for c in f["children"] if c["name"] == "姓名未载"]
        self.assertGreater(len(children), 1)
        self.assertEqual(len(children), len({c["personId"] for c in children}))
        empty = next(f for f in self.data["families"] if f["parentName"] == "朱厚照")
        self.assertTrue(empty["noChildren"])
        self.assertEqual(empty["children"], [])

    def test_actual_parent_relationship_and_no_invented_link(self):
        family = next(f for f in self.data["families"] if f["parentName"] == "朱元璋")
        child = next(c for c in family["children"] if c["name"] == "朱棣")
        self.assertTrue(any(f["parentId"] == child["personId"] for f in self.data["families"]))
        self.assertFalse(any(c["name"] == "朱允炆" for c in family["children"]))

    def test_both_military_regions_are_present(self):
        military = [o for o in self.data["offices"] if o["category"] == "军事机构"]
        self.assertIn("卫所", {o["sourceCategory"] for o in military})
        self.assertIn("军事机构", {o["sourceCategory"] for o in military})

    def test_invalid_graph_blocks_publication(self):
        data = copy.deepcopy(self.data)
        family = data["families"][0]
        family["children"][0]["personId"] = family["parentId"]
        with self.assertRaisesRegex(ValueError, "循环"):
            builder.validate(data)

    def test_unknown_rank_and_missing_section_fail_loudly(self):
        with ZipFile(ROOT / "Data.xlsx") as archive:
            files = {name: archive.read(name) for name in archive.namelist()}
        # Mutate a real workbook so these checks exercise the complete reader.
        for before, after, error in [("正一品", "未知品", "品级无法识别"), ("皇帝辅臣", "移动后的栏目", "栏目锚点")]:
            with self.subTest(error=error), tempfile.TemporaryDirectory() as tmp:
                path = Path(tmp) / "broken.xlsx"
                with ZipFile(path, "w", ZIP_DEFLATED) as output:
                    for name, content in files.items():
                        output.writestr(name, content.replace(before.encode(), after.encode()) if name == "xl/sharedStrings.xml" else content)
                with self.assertRaisesRegex(ValueError, error):
                    builder.build_catalogue(path)


if __name__ == "__main__":
    unittest.main()
