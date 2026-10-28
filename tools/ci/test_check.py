import unittest
from check import classify, overall, revision_changes, validate, covered_push
from pathlib import Path
import subprocess
import tempfile


class Checks(unittest.TestCase):
    def test_paths(self):
        for path, mode in [('docs/testing/strategy.md', 'docs'), ('harness/state/progress.json', 'docs'), ('backend/Keemese.Api/Program.cs', 'backend'), ('frontend/src/App.tsx', 'frontend'), ('frontend/package-lock.json', 'full'), ('global.json', 'full'), ('.github/workflows/ci.yml', 'full'), ('tools/ci/check.py', 'full'), ('unknown', 'full'), ('harness/unexpected.py', 'full'), ('backend/Keemese.Api.Tests/A.cs', 'full')]:
            with self.subTest(path=path):
                self.assertEqual(classify([('M', path)]), mode)
        for changes in [[], [('D', 'docs/README.md')], [('R100', 'docs/a.md')], [('M', 'backend/a.cs'), ('M', 'frontend/src/a.ts')]]:
            self.assertEqual(classify(changes), 'full')
        self.assertEqual(revision_changes('0' * 40, 'HEAD'), [])

    def test_push_deduplication(self):
        self.assertTrue(covered_push([{'base': {'ref': 'develop'}, 'head': {'sha': 'a'}}], 'a'))
        self.assertFalse(covered_push([{'base': {'ref': 'other'}, 'head': {'sha': 'a'}}], 'a'))
        self.assertFalse(covered_push([{'base': {'ref': 'develop'}, 'head': {'sha': 'old'}}], 'a'))
        self.assertFalse(covered_push([], 'a'))

    def test_result(self):
        self.assertTrue(overall('success', 'skipped', 'docs'))
        self.assertTrue(overall('success', 'skipped', 'covered'))
        self.assertTrue(overall('success', 'success', 'full'))
        for light, verify, mode in [('failure', 'skipped', 'docs'), ('cancelled', 'success', 'full'), ('success', 'skipped', 'full'), ('success', 'failure', 'full'), ('success', 'cancelled', 'full')]:
            self.assertFalse(overall(light, verify, mode))

    def test_validator_rejects_bad_json_and_links_and_coverage(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            subprocess.run(['git', 'init', '-q', directory], check=True)
            (root / 'docs/product').mkdir(parents=True)
            req = root / 'docs/product/requirements.md'
            req.write_text('\n'.join(f'| P{i:02} | synthetic |' for i in range(1, 62)))
            validate(root)
            bad = root / 'bad.json'
            bad.write_text('{')
            with self.assertRaises(ValueError): validate(root)
            bad.unlink()
            bad = root / 'bad.md'
            bad.write_text('[missing](missing.md)')
            with self.assertRaises(AssertionError): validate(root)
            bad.unlink()
            req.write_text('| P01 | only |')
            with self.assertRaises(AssertionError): validate(root)


if __name__ == '__main__': unittest.main()
