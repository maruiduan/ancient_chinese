import io
from pathlib import Path
import sys
import tempfile
import unittest
import urllib.parse
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import publish_homepage as home


class HomepageTests(unittest.TestCase):
    def test_all_modules_are_real_links_without_javascript(self):
        self.assertEqual(set(home.validate(ROOT / 'www')), set(home.FILES))

    def test_validate_every_file_before_upload(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(FileNotFoundError):
                home.publish(Path(tmp), uploader=lambda *_: self.fail('unexpected PUT'))

    def test_put_failure_propagates_and_never_reads_or_publishes_entry(self):
        calls = []
        def denied(path, destination):
            calls.append(destination)
            raise RuntimeError('AccessDenied')
        with self.assertRaisesRegex(RuntimeError, 'AccessDenied'):
            home.publish(ROOT / 'www', uploader=denied, opener=lambda *_: self.fail('unexpected GET'))
        self.assertEqual(calls, ['oss://lucca-www/robots.txt'])

    def test_entry_last_and_all_public_bytes_verified(self):
        calls = []
        def read(request, **kwargs):
            path = urllib.parse.urlparse(request.full_url).path.lstrip('/')
            calls.append('GET ' + path)
            return io.BytesIO((ROOT / 'www' / path).read_bytes())
        def put(path, dest):
            self.assertTrue(dest.startswith('oss://lucca-www/'))
            calls.append('PUT ' + dest[len('oss://lucca-www/'):])
            self.assertEqual(Path(dest[len('oss://lucca-www/'):]), Path(path).relative_to(ROOT / 'www'))
        home.publish(ROOT / 'www', uploader=put, opener=read)
        self.assertEqual(calls, ['PUT ' + n for n in home.FILES] + ['GET ' + n for n in home.FILES])

    def test_pinyin_game_is_published_before_the_homepage_entry(self):
        self.assertLess(home.FILES.index('pinyin/game.js'), home.FILES.index('pinyin/index.html'))
        self.assertLess(home.FILES.index('pinyin/index.html'), home.FILES.index('index.html'))
        workflow = (ROOT / '.github/workflows' / 'publish-www.yml').read_text()
        self.assertIn('www/pinyin/**', workflow)
        page = (ROOT / 'www' / 'index.html').read_text()
        self.assertIn('href="/pinyin/"', page)
        self.assertIn('拼音矿工', page)
        self.assertNotIn('已上线', page)

    def test_stale_public_bytes_fail(self):
        with self.assertRaisesRegex(RuntimeError, 'public bytes differ'):
            home.publish(ROOT / 'www', uploader=lambda *_: None, opener=lambda *a, **k: io.BytesIO(b'stale'))

    def test_cli_failure_returns_nonzero(self):
        with patch.object(home, 'publish', side_effect=RuntimeError('AccessDenied')):
            self.assertEqual(home.main(), 1)

    def test_both_workflows_use_fail_visible_publisher(self):
        for name in ['publish-www.yml', 'deploy-oss.yml']:
            workflow = (ROOT / '.github/workflows' / name).read_text()
            self.assertIn('run: python3 scripts/publish_homepage.py www', workflow)
            self.assertNotIn('exit 0', workflow)
            self.assertNotIn("grep -q '即将上线'", workflow)


if __name__ == '__main__':
    unittest.main()
