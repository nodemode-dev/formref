"""Google Drive and Dropbox, opt-in: sign in, browse, open a file onto a board, save a board.

Ported from FormCut (backend/app/cloud.py, Apache-2.0, the same owner) with its flows unchanged. Nothing happens
until the person enters their own app's credentials in Preferences and connects; there is no FormRef account and no
FormRef server in between.

Google uses its desktop-app flow: PKCE (S256) with a redirect to this service on 127.0.0.1. The client ID and secret
come from the person's own Google Cloud project; Google's token endpoint wants the secret even from a desktop app and
treats it as not confidential. The default scope, drive.file, lets FormRef create files and see the ones it created;
browsing all of Drive needs drive.readonly, an opt-in. Dropbox uses PKCE with no secret and without a redirect:
Dropbox's page shows a code and the person pastes it back.

Tokens stay in the service, in a file only its owner can read, refresh themselves, and never reach the browser.
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import secrets
import threading
import time
from urllib.parse import urlencode

import httpx

from .config import settings
from .store import store

STORE = settings.data_dir / "cloud.json"
PROVIDERS = ("google", "dropbox")
FOLDER = "formref"
GOOGLE_FOLDER = "application/vnd.google-apps.folder"
PENDING_FOR = 600.0
MAX_BYTES = settings.max_upload_bytes
_pending: dict[str, dict] = {}
_lock = threading.Lock()


class CloudError(RuntimeError):
    """The storage service refused or failed; the message says which."""


def _base(name: str, default: str) -> str:
    return os.environ.get(name, "").rstrip("/") or default


def _google_auth() -> str:
    return _base("CLOUD_GOOGLE_AUTH", "https://accounts.google.com/o/oauth2/v2/auth")


def _google_token() -> str:
    return _base("CLOUD_GOOGLE_TOKEN", "https://oauth2.googleapis.com/token")


def _google_api() -> str:
    return _base("CLOUD_GOOGLE_API", "https://www.googleapis.com")


def _dropbox_auth() -> str:
    return _base("CLOUD_DROPBOX_AUTH", "https://www.dropbox.com/oauth2/authorize")


def _dropbox_api() -> str:
    return _base("CLOUD_DROPBOX_API", "https://api.dropboxapi.com")


def _dropbox_content() -> str:
    return _base("CLOUD_DROPBOX_CONTENT", "https://content.dropboxapi.com")


def _read() -> dict:
    try:
        return json.loads(STORE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def _write(data: dict) -> None:
    with store.lock:
        store.atomic_write(STORE, json.dumps(data, indent=2).encode())
        try:
            os.chmod(STORE, 0o600)
        except OSError:
            pass


def provider(name: str) -> str:
    if name not in PROVIDERS:
        raise ValueError(f"No cloud service called {name}.")
    return name


def challenge(verifier: str) -> str:
    """The standard PKCE S256 challenge: base64url of the SHA-256, unpadded."""
    return base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()


def _scope(app: dict) -> str:
    access = "drive.readonly" if app.get("fullDrive") else "drive.file"
    return " ".join(sorted({f"https://www.googleapis.com/auth/{access}", "https://www.googleapis.com/auth/drive.file"}))


def _checked(response: httpx.Response, what: str) -> httpx.Response:
    if response.status_code >= 400:
        try:
            body = response.json()
            detail = body.get("error_description") or body.get("error_summary") or body.get("error", {})
            if isinstance(detail, dict):
                detail = detail.get("message") or response.status_code
        except ValueError:
            detail = response.status_code
        raise CloudError(f"{what} failed: {detail}")
    return response


def _exchange(name: str, form: dict) -> dict:
    app = _read().get(name, {}).get("app", {})
    if name == "google":
        form = {**form, "client_id": app.get("clientId", ""), "client_secret": app.get("clientSecret", "")}
        url = _google_token()
    else:
        form = {**form, "client_id": app.get("clientId", "")}
        url = f"{_dropbox_api()}/oauth2/token"
    try:
        reply = _checked(httpx.post(url, data=form, timeout=30.0), "Signing in").json()
    except httpx.HTTPError as error:
        raise CloudError(f"Could not reach the sign-in service: {error.__class__.__name__}") from error
    tokens = {"accessToken": reply["access_token"], "expiresAt": time.time() + float(reply.get("expires_in", 3600))}
    if reply.get("refresh_token"):
        tokens["refreshToken"] = reply["refresh_token"]
    return tokens


def _token(name: str) -> str:
    data = _read()
    account = data.get(name, {}).get("account")
    if not account:
        raise CloudError(f"Connect {title(name)} first, in Preferences.")
    if account["expiresAt"] - time.time() < 60:
        if not account.get("refreshToken"):
            raise CloudError(f"The {title(name)} sign-in has expired; connect again.")
        account = {**account, **_exchange(name, {"grant_type": "refresh_token", "refresh_token": account["refreshToken"]})}
        data[name]["account"] = account
        _write(data)
    return account["accessToken"]


def _auth(name: str) -> dict:
    return {"Authorization": f"Bearer {_token(name)}"}


def title(name: str) -> str:
    return "Google Drive" if name == "google" else "Dropbox"


def public(name: str) -> dict:
    entry = _read().get(name, {})
    app, account = entry.get("app", {}), entry.get("account")
    configured = bool(app.get("clientId") and (name == "dropbox" or app.get("clientSecret")))
    return {"configured": configured, "connected": bool(account), "clientId": app.get("clientId", ""), "fullDrive": bool(app.get("fullDrive"))}


def states() -> dict:
    return {name: public(name) for name in PROVIDERS}


def set_app(name: str, client_id: str, client_secret: str | None, full_drive: bool) -> dict:
    """Store the app's client ID (and Google's desktop secret); an omitted secret keeps the stored one."""
    provider(name)
    if not isinstance(client_id, str) or len(client_id) > 300 or (client_secret is not None and (not isinstance(client_secret, str) or len(client_secret) > 300)):
        raise ValueError("The client ID and secret must be text of at most 300 characters.")
    data = _read()
    entry = data.setdefault(name, {})
    kept = entry.get("app", {}).get("clientSecret", "")
    secret = kept if client_secret is None else client_secret.strip()
    entry["app"] = {"clientId": client_id.strip(), "clientSecret": secret if name == "google" else "", "fullDrive": bool(full_drive)}
    _write(data)
    return public(name)


def start(name: str, port: int) -> dict:
    """The sign-in address for the person's browser."""
    provider(name)
    app = _read().get(name, {}).get("app", {})
    if not public(name)["configured"]:
        raise ValueError(f"Set up {title(name)} first: enter your app's credentials and press Save.")
    verifier, key = secrets.token_urlsafe(48), secrets.token_urlsafe(24)
    query = {"client_id": app["clientId"], "response_type": "code", "code_challenge": challenge(verifier), "code_challenge_method": "S256"}
    pending = {"verifier": verifier, "at": time.time(), "provider": name}
    if name == "google":
        redirect = f"http://127.0.0.1:{port}/api/cloud/google/callback"
        query.update(redirect_uri=redirect, scope=_scope(app), state=key, access_type="offline", prompt="consent")
        pending["redirect"] = redirect
        url = f"{_google_auth()}?{urlencode(query)}"
    else:
        query.update(token_access_type="offline")
        url = f"{_dropbox_auth()}?{urlencode(query)}"
        key = "dropbox"  # the pasted code carries no state, so one Dropbox sign-in is pending at a time
    with _lock:
        _pending[key] = pending
    return {"url": url, "paste": name == "dropbox"}


def google_callback(state: str, code: str, error: str) -> tuple[int, str]:
    with _lock:
        pending = _pending.pop(state, None)
    if pending is None or pending["provider"] != "google" or time.time() - pending["at"] > PENDING_FOR:
        return 400, "This Google sign-in is unknown or expired. Start again from FormRef."
    if error or not code:
        return 400, "Google sign-in did not finish."
    form = {"code": code, "grant_type": "authorization_code", "redirect_uri": pending["redirect"], "code_verifier": pending["verifier"]}
    try:
        account = _exchange("google", form)
    except CloudError as failure:
        return 502, str(failure)
    data = _read()
    data.setdefault("google", {})["account"] = account
    _write(data)
    return 200, "Connected to Google Drive. You can close this tab and return to FormRef."


def dropbox_code(code: str) -> dict:
    with _lock:
        pending = _pending.pop("dropbox", None)
    if pending is None or time.time() - pending["at"] > PENDING_FOR:
        raise ValueError("Start the Dropbox sign-in again.")
    account = _exchange("dropbox", {"code": str(code).strip(), "grant_type": "authorization_code", "code_verifier": pending["verifier"]})
    data = _read()
    data.setdefault("dropbox", {})["account"] = account
    _write(data)
    return public("dropbox")


def disconnect(name: str) -> dict:
    provider(name)
    data = _read()
    data.get(name, {}).pop("account", None)
    data.get(name, {}).pop("folder", None)
    _write(data)
    return public(name)


def _entry(item: str, name: str, folder: bool, size, modified) -> dict:
    return {"id": item, "name": name, "folder": folder, "size": int(size or 0), "modified": modified}


def listing(name: str, folder: str, cursor: str = "") -> dict:
    """One page of a folder, in one shape for both services."""
    provider(name)
    try:
        if name == "google":
            if folder and not all(ch.isalnum() or ch in "-_" for ch in folder):
                raise ValueError("That is not a Google Drive folder id.")
            query = {"q": f"'{folder or 'root'}' in parents and trashed = false", "pageSize": 100, "fields": "files(id,name,mimeType,size,modifiedTime),nextPageToken"}
            if cursor:
                query["pageToken"] = cursor
            reply = _checked(httpx.get(f"{_google_api()}/drive/v3/files", params=query, headers=_auth(name), timeout=30.0), "Listing").json()
            entries = [_entry(f["id"], f["name"], f.get("mimeType") == GOOGLE_FOLDER, f.get("size"), f.get("modifiedTime")) for f in reply.get("files", [])]
            return {"entries": entries, "cursor": reply.get("nextPageToken", "")}
        if cursor:
            sent = httpx.post(f"{_dropbox_api()}/2/files/list_folder/continue", json={"cursor": cursor}, headers=_auth(name), timeout=30.0)
        else:
            sent = httpx.post(f"{_dropbox_api()}/2/files/list_folder", json={"path": folder}, headers=_auth(name), timeout=30.0)
        body = _checked(sent, "Listing").json()
        entries = [_entry(e["path_display"], e["name"], e[".tag"] == "folder", e.get("size"), e.get("client_modified")) for e in body.get("entries", [])]
        return {"entries": entries, "cursor": body.get("cursor", "") if body.get("has_more") else ""}
    except httpx.HTTPError as error:
        raise CloudError(f"Could not reach {title(name)}: {error.__class__.__name__}") from error


def download(name: str, item: str) -> bytes:
    provider(name)
    if name == "google":
        method, url, options = "GET", f"{_google_api()}/drive/v3/files/{item}", {"params": {"alt": "media"}, "headers": _auth(name)}
    else:
        method, url, options = "POST", f"{_dropbox_content()}/2/files/download", {"headers": {**_auth(name), "Dropbox-API-Arg": json.dumps({"path": item})}}
    chunks, size = [], 0
    try:
        with httpx.stream(method, url, timeout=600.0, **options) as response:
            if response.status_code >= 400:
                response.read()
                _checked(response, "Downloading")
            for chunk in response.iter_bytes(1 << 20):
                size += len(chunk)
                if size > MAX_BYTES:
                    raise ValueError("Files from cloud storage are limited to 64 MiB.")
                chunks.append(chunk)
    except httpx.HTTPError as error:
        raise CloudError(f"Could not download from {title(name)}: {error.__class__.__name__}") from error
    return b"".join(chunks)


def _google_folder() -> str:
    known = _read().get("google", {}).get("folder")
    if known:
        return known
    # After a reconnect the remembered id is gone; reuse the formref folder FormRef made before rather than a second one.
    query = {"q": f"name = '{FOLDER}' and mimeType = '{GOOGLE_FOLDER}' and 'root' in parents and trashed = false", "fields": "files(id)", "pageSize": 1}
    found = _checked(httpx.get(f"{_google_api()}/drive/v3/files", params=query, headers=_auth("google"), timeout=30.0), "Finding the formref folder").json().get("files", [])
    if found:
        data = _read()
        data.setdefault("google", {})["folder"] = found[0]["id"]
        _write(data)
        return found[0]["id"]
    sent = httpx.post(f"{_google_api()}/drive/v3/files", json={"name": FOLDER, "mimeType": GOOGLE_FOLDER}, headers=_auth("google"), timeout=30.0)
    made = _checked(sent, "Making the formref folder").json()
    data = _read()
    data.setdefault("google", {})["folder"] = made["id"]
    _write(data)
    return made["id"]


def upload(name: str, content: bytes, filename: str) -> dict:
    """Put a file in the service's formref folder."""
    provider(name)
    try:
        if name == "google":
            headers = {**_auth(name), "X-Upload-Content-Type": "application/octet-stream", "X-Upload-Content-Length": str(len(content))}
            session = _checked(httpx.post(f"{_google_api()}/upload/drive/v3/files?uploadType=resumable", json={"name": filename, "parents": [_google_folder()]}, headers=headers, timeout=30.0), "Starting the upload").headers["Location"]
            made = _checked(httpx.put(session, content=content, headers={"Content-Length": str(len(content))}, timeout=1800.0), "Uploading").json()
            return {"service": name, "id": made["id"], "name": made.get("name", filename)}
        target = {"path": f"/{FOLDER}/{filename}", "mode": "add", "autorename": True}
        headers = {**_auth(name), "Content-Type": "application/octet-stream", "Dropbox-API-Arg": json.dumps(target)}
        made = _checked(httpx.post(f"{_dropbox_content()}/2/files/upload", content=content, headers=headers, timeout=1800.0), "Uploading").json()
        return {"service": name, "id": made["path_display"], "name": made["name"]}
    except httpx.HTTPError as error:
        raise CloudError(f"Could not upload to {title(name)}: {error.__class__.__name__}") from error
