"""T046 / US6 — backend negative & edge cases (FR-021…FR-024, spec §9)."""
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from app import app  # noqa: E402

client = app.test_client()


def test_empty_input_returns_200_success_false():
    r = client.post('/api/compile', json={'code': '   ', 'language': 'c'})
    assert r.status_code == 200
    assert r.get_json()['success'] is False


def test_non_c_content_handled_gracefully():
    # Never a 500: either a parse diagnostic (200+false) or a 400.
    r = client.post('/api/compile', json={'code': 'this is not C @@@', 'language': 'c'})
    assert r.status_code in (200, 400)


def test_bad_language_returns_400():
    assert client.post('/api/compile', json={'code': 'x', 'language': 'java'}).status_code == 400


def test_missing_code_returns_400():
    assert client.post('/api/compile', json={}).status_code == 400
    assert client.post('/api/compile', data='not json',
                       content_type='application/json').status_code == 400


def test_oversized_body_returns_413():
    big = 'x' * (2 * 1024 * 1024)
    assert client.post('/api/compile', json={'code': big}).status_code == 413


def test_unicode_source_round_trips():
    code = 'int main() { /* 中文 émoji 🚀 */ int x = 1; return 0; }'
    r = client.post('/api/compile', json={'code': code, 'language': 'c'})
    assert r.status_code == 200
    assert r.get_json()['success'] is True


def test_status_reports_per_language():
    r = client.get('/api/status')
    body = r.get_json()
    assert r.status_code == 200
    assert 'c' in body['languages'] and 'python' in body['languages']
