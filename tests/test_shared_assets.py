from pathlib import Path
import unittest
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import oss_headers
from publish_shared import REQUIRED, shared_names


class SharedAssetsTests(unittest.TestCase):
    def test_required_shared_files_exist(self):
        names = shared_names(ROOT / 'www')
        for name in REQUIRED:
            self.assertIn(name, names)
            self.assertGreater((ROOT / 'www' / name).stat().st_size, 100)

    def test_pinyin_and_fluency_load_shared_modules(self):
        pinyin = (ROOT / 'www/pinyin/index.html').read_text(encoding='utf-8')
        fluency = (ROOT / 'www/pinyin-fluency/index.html').read_text(encoding='utf-8')
        self.assertIn('/shared/mc-sprites.js', pinyin)
        for src in ('/shared/mc-sprites.js', '/shared/pinyin-audio.js', '/shared/pinyin-rules.js',
                    '/shared/three/three.module.js', '/shared/three/addons/loaders/GLTFLoader.js'):
            self.assertIn(src, fluency)
        self.assertNotIn('cdn.jsdelivr.net/npm/three', fluency)
        self.assertIn('LuccaMC', (ROOT / 'www/shared/mc-sprites.js').read_text(encoding='utf-8'))
        self.assertIn('LuccaPinyinAudio', (ROOT / 'www/shared/pinyin-audio.js').read_text(encoding='utf-8'))
        self.assertIn('整体认读', (ROOT / 'www/shared/pinyin-rules.js').read_text(encoding='utf-8'))

    def test_homepage_copy_mentions_adventure(self):
        page = (ROOT / 'www/index.html').read_text(encoding='utf-8')
        self.assertIn('三章冒险', page)
        self.assertNotIn('气球闯关', page)
        self.assertIn('龙语群岛', page)
        self.assertIn('拼音快读', page)

    def test_shared_js_is_revalidated(self):
        self.assertEqual(oss_headers.object_metadata('shared/mc-sprites.js'),
                         ('application/javascript', 'no-cache, must-revalidate'))
        self.assertEqual(oss_headers.object_metadata('shared/audio/cmn-diao1.mp3')[0], 'audio/mpeg')


if __name__ == '__main__':
    unittest.main()
