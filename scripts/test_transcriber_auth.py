"""Test auth helpers without starting Whisper, YouTube or a real Firebase connection."""
import ast
from pathlib import Path
import unittest
from unittest.mock import Mock


class TranscriberAuthTests(unittest.TestCase):
    def setUp(self):
        source = Path(__file__).resolve().parents[1] / "yt_transcriber.py"
        module = ast.parse(source.read_text(encoding="utf-8"))
        helpers = ast.Module(body=[node for node in module.body if isinstance(node, ast.FunctionDef)
                                   and node.name in {"refresh_auth_token", "get_auth_token", "push_transcript_to_firebase"}], type_ignores=[])
        self.request = Mock()
        self.clock = Mock()
        self.clock.time.return_value = 1000
        self.scope = {
            "requests": self.request, "time": self.clock, "id_token": None, "token_expiry_time": 0,
            "FIREBASE_API_KEY": "test-key", "FIREBASE_DB_URL": "https://example.invalid",
            "FIREBASE_TRANSCRIBER_EMAIL": "transcriber@example.invalid",
            "FIREBASE_TRANSCRIBER_PASSWORD": "test-only-password",
            **{name: Mock() for name in ["log_info", "log_success", "log_error", "log_warning", "log_transcript"]},
        }
        exec(compile(helpers, str(source), "exec"), self.scope)

    def test_uses_email_password_and_caches_the_token(self):
        self.request.post.return_value = Mock(status_code=200)
        self.request.post.return_value.json.return_value = {"idToken": "test-token", "expiresIn": "3600"}
        self.assertEqual(self.scope["get_auth_token"](), "test-token")
        args, kwargs = self.request.post.call_args
        self.assertIn("accounts:signInWithPassword", args[0])
        self.assertEqual(kwargs["json"]["email"], "transcriber@example.invalid")
        self.assertEqual(kwargs["json"]["password"], "test-only-password")
        self.assertEqual(self.scope["get_auth_token"](), "test-token")
        self.request.post.assert_called_once()

    def test_failed_refresh_never_reuses_an_expired_token(self):
        self.scope.update(id_token="expired-token", token_expiry_time=999)
        self.request.post.return_value = Mock(status_code=400)
        self.assertIsNone(self.scope["get_auth_token"]())
        self.assertIsNone(self.scope["id_token"])

    def test_does_not_send_a_transcript_without_authentication(self):
        self.request.post.return_value = Mock(status_code=400)
        self.scope["push_transcript_to_firebase"]("test-live", "hello")
        self.request.post.assert_called_once()
        self.assertIn("accounts:signInWithPassword", self.request.post.call_args.args[0])


if __name__ == "__main__":
    unittest.main()
