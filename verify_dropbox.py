"""
verify_dropbox.py  —  Dropbox connectivity checker
====================================================
Run this after running generate_refresh_token.py to confirm the connection works.

Usage:
    python verify_dropbox.py

Reads DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN from .env.

Exit codes:
    0  — Connected successfully
    1  — Error (missing credentials, bad token, network issue)
"""
import os
import sys

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    import dropbox
    from dropbox.exceptions import AuthError
except ImportError:
    print("ERROR: 'dropbox' package not installed.  Run: pip install 'dropbox>=12.0.0'")
    sys.exit(1)


def main() -> None:
    app_key = os.environ.get("DROPBOX_APP_KEY", "").strip()
    app_secret = os.environ.get("DROPBOX_APP_SECRET", "").strip()
    refresh_token = os.environ.get("DROPBOX_REFRESH_TOKEN", "").strip()

    if not app_key or not app_secret or not refresh_token:
        print("ERROR: Missing one or more Dropbox credentials in .env:")
        print("    DROPBOX_APP_KEY=...")
        print("    DROPBOX_APP_SECRET=...")
        print("    DROPBOX_REFRESH_TOKEN=...")
        print("\nRun  python generate_refresh_token.py  to get the refresh token.")
        sys.exit(1)

    print(f"Connecting to Dropbox (app_key={app_key[:6]}…)")

    try:
        dbx = dropbox.Dropbox(
            oauth2_refresh_token=refresh_token,
            app_key=app_key,
            app_secret=app_secret,
        )
        account = dbx.users_get_current_account()
        print(f"✅  Connected!  Account: {account.name.display_name} ({account.email})")
        print("    Token is valid. Server is ready to use Dropbox for asset hosting.")
    except AuthError:
        print("❌  Authentication failed — credentials are wrong or token was revoked.")
        print("    Re-run  python generate_refresh_token.py  to get a new refresh token.")
        sys.exit(1)
    except (ConnectionError, OSError) as exc:
        print(f"❌  Network error — cannot reach api.dropbox.com: {exc}")
        print("    Check your internet connection or firewall settings.")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n❌  Interrupted.")
        sys.exit(1)
    except Exception as exc:
        print(f"❌  Unexpected error: {type(exc).__name__}: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
