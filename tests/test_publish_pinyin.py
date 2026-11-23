import hashlib
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import publish_pinyin as pinyin
import oss_headers


class PinyinPublishTests(unittest.TestCase):
    def test_real_page_validates_and_entry_goes_last(self):
        paths = pinyin.validate(ROOT / 'www' / 'pinyin')
        self.assertEqual(paths[-1].name, 'index.html')
        self.assertTrue(any(p.suffix == '.mp3' for p in paths))

    def test_hashed_audio_is_immutable_and_typed(self):
        self.assertEqual(oss_headers.object_metadata('pinyin/audio/ma1.0123456789ab.mp3'),
                         ('audio/mpeg', 'public, max-age=31536000, immutable'))
        self.assertEqual(oss_headers.object_metadata('pinyin/fonts/x.woff2')[0], 'font/woff2')

    def test_only_changed_files_upload_and_entry_after_assets(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'a.js').write_text('a')
            (root / 'b.js').write_text('b')
            (root / 'index.html').write_text('<script src="a.js"></script><script src="b.js"></script><a href="https://www.lucca.top/">x</a>')
            live = {'pinyin/a.js': hashlib.md5(b'a').hexdigest()}
            puts = []
            def upload(path, dest):
                puts.append(dest)
                live[dest.split('lucca-www/')[1]] = hashlib.md5(path.read_bytes()).hexdigest()
            changed = pinyin.publish(root, uploader=upload, etag=lambda key: live.get(key))
            self.assertEqual(changed, 2)
            self.assertEqual(puts, ['oss://lucca-www/pinyin/b.js', 'oss://lucca-www/pinyin/index.html'])

    def test_missing_reference_blocks_every_upload(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'index.html').write_text('<script src="gone.js"></script><a href="https://www.lucca.top/">x</a>')
            with self.assertRaisesRegex(ValueError, 'missing file'):
                pinyin.publish(root, uploader=lambda *_: self.fail('unexpected PUT'), etag=lambda key: None)

    def test_mismatch_after_publish_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'index.html').write_text('<a href="https://www.lucca.top/">x</a>')
            with self.assertRaisesRegex(RuntimeError, 'Public bytes differ'):
                pinyin.publish(root, uploader=lambda *_: None, etag=lambda key: 'stale')


if __name__ == '__main__':
    unittest.main()
