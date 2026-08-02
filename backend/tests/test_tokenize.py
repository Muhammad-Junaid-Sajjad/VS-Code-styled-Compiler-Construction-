"""FR-017 / T012a — POST /api/tokenize returns tokens even when the full
pipeline fails, and never crashes on malformed input (regression for the
duplicate-STRING re.error bug fixed in T010b).
"""
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from app import app  # noqa: E402

client = app.test_client()


def test_tokenize_valid_code():
    r = client.post('/api/tokenize', json={'code': 'int main() { return 0; }'})
    assert r.status_code == 200
    body = r.get_json()
    assert body['success'] is True
    assert len(body['tokens']) > 0


def test_tokenize_char_literal_no_crash():
    # Regression for T010b: the fallback tokeniser crashed with
    # "redefinition of group name 'STRING'".
    r = client.post('/api/tokenize', json={'code': "char c = 'a';"})
    assert r.status_code == 200
    assert r.get_json()['success'] is True


def test_tokenize_missing_code():
    r = client.post('/api/tokenize', json={})
    assert r.status_code == 400
