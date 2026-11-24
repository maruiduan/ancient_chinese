import io
from pathlib import Path
import sys
from urllib.parse import urlsplit
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import publish_homepage as home
from publish_shared import shared_names


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
        first = shared_names(ROOT / 'www')[0]
        self.assertEqual(calls, ['oss://lucca-www/' + first])

    def test_entry_last_and_all_public_bytes_verified(self):
        calls = []
        def read(request, **kwargs):
            name = urlsplit(request.full_url).path.lstrip('/')
            calls.append('GET ' + name)
            return io.BytesIO((ROOT / 'www' / name).read_bytes())
        home.publish(ROOT / 'www', uploader=lambda path, dest: calls.append('PUT ' + dest.removeprefix('oss://lucca-www/')), opener=read)
        shared = shared_names(ROOT / 'www')
        shared_calls = [item for name in shared for item in ('PUT ' + name, 'GET ' + name)]
        order = list(home.FILES)
        self.assertEqual(calls, shared_calls + ['PUT ' + n for n in order[:-1]] + ['GET ' + home.FLUENCY_PAGE, 'PUT index.html'] +
                         ['GET ' + n for n in order if n != home.FLUENCY_PAGE])

    def test_unverified_fluency_is_not_linked_from_live_homepage(self):
        uploaded = []
        def opener(request, **kwargs):
            name = urlsplit(request.full_url).path.lstrip('/')
            if name.startswith('shared/'):
                return io.BytesIO((ROOT / 'www' / name).read_bytes())
            return io.BytesIO(b'stale')
        with self.assertRaisesRegex(RuntimeError, home.FLUENCY_PAGE):
            home.publish(ROOT / 'www', uploader=lambda _, dest: uploaded.append(dest),
                         opener=opener)
        self.assertEqual(uploaded[-1], 'oss://lucca-www/' + home.FLUENCY_PAGE)
        self.assertNotIn('oss://lucca-www/index.html', uploaded)

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
