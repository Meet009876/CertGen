"""
generate_refresh_token.py  —  Run ONCE to get your Dropbox refresh token
=========================================================================
Dropbox SDK v12+ uses short-lived access tokens that expire after ~4 hours.
For a server application you need a REFRESH TOKEN which never expires — the
SDK uses it to silently obtain new access tokens automatically.

Usage (run once locally, then store the token in .env):
    python generate_refresh_token.py

What it does:
    1. Opens a Dropbox authorization URL in your browser
    2. You approve access and get a 4-digit code
    3. Script exchanges the code for a refresh token
    4. Prints the refresh token — copy it into your .env

After this, add to .env:
    DROPBOX_APP_KEY=your_app_key
    DROPBOX_APP_SECRET=your_app_secret
    DROPBOX_REFRESH_TOKEN=<printed by this script>
"""
import os
import webbrowser

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    import dropbox
    from dropbox import DropboxOAuth2FlowNoRedirect
except ImportError:
    print("ERROR: The 'dropbox' package is not installed.")
    print("Run:   pip install 'dropbox>=12.0.0'")
    raise SystemExit(1)


def main() -> None:
    app_key = os.environ.get("DROPBOX_APP_KEY", "").strip()
    app_secret = os.environ.get("DROPBOX_APP_SECRET", "").strip()

    if not app_key or not app_secret:
        print("ERROR: DROPBOX_APP_KEY and DROPBOX_APP_SECRET must be set.")
        print("Find them in the Dropbox App Console → Settings tab.")
        print("Add them to your .env file:")
        print("    DROPBOX_APP_KEY=your_app_key")
        print("    DROPBOX_APP_SECRET=your_app_secret")
        raise SystemExit(1)

    # Start the OAuth2 offline flow (no redirect URL — prints a code instead)
    auth_flow = DropboxOAuth2FlowNoRedirect(
        app_key,
        app_secret,
        token_access_type="offline",   # <-- this gives us a refresh token
    )

    authorize_url = auth_flow.start()

    print("\n" + "=" * 60)
    print("STEP 1 — Open this URL in your browser:")
    print(f"\n  {authorize_url}\n")
    print("=" * 60)
    print("STEP 2 — Click 'Allow' to grant access")
    print("STEP 3 — Copy the authorization code shown")
    print("=" * 60 + "\n")

    # Try to open automatically
    try:
        webbrowser.open(authorize_url)
    except Exception:
        pass  # If it can't open, user opens manually

    auth_code = input("Paste the authorization code here: ").strip()

    try:
        oauth_result = auth_flow.finish(auth_code)
    except Exception as exc:
        print(f"\n❌  Failed to exchange code: {exc}")
        raise SystemExit(1)

    refresh_token = oauth_result.refresh_token

    print("\n" + "=" * 60)
    print("✅  Success!  Add these to your .env file:\n")
    print(f"    DROPBOX_APP_KEY={app_key}")
    print(f"    DROPBOX_APP_SECRET={app_secret}")
    print(f"    DROPBOX_REFRESH_TOKEN={refresh_token}")
    print("\n" + "=" * 60)
    print("You can now delete DROPBOX_ACCESS_TOKEN from .env — it's not needed.")
    print("Run  python verify_dropbox.py  to confirm the connection works.\n")


if __name__ == "__main__":
    main()
