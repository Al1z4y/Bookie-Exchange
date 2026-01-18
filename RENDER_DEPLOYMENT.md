# Render Deployment Configuration

## Critical Settings

Your Render service must be configured with these settings:

### 1. Root Directory
Set **Root Directory** to: `backend`

This ensures Render runs commands from the `backend/` directory where your `app` module is located.

### 2. Build Command
```
pip install -r requirements.txt
```

### 3. Start Command
```
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### 4. Python Version
**IMPORTANT**: Set Python version to **3.11** (not 3.13)

In Render dashboard:
- Go to your service settings
- Find "Python Version" or "Runtime"
- Change from "3.13" to "3.11" or "python-3.11.9"
- Save changes

The `runtime.txt` file specifies Python 3.11.9, but if the dashboard has a hardcoded version, it will override the file.

## Why These Settings?

- **Root Directory = `backend`**: Your code uses `app.*` imports, which means Python needs to run from the `backend/` directory where the `app` folder is located.

- **Python 3.11**: Python 3.13 doesn't have pre-built wheels for `pydantic-core`, causing build failures. Python 3.11 has full wheel support.

## Verification

After deploying, check the logs:
- Should see Python 3.11.x (not 3.13)
- Should see "Database tables initialized!"
- Should see "Application startup complete"

If you still see Python 3.13, the dashboard setting is overriding `runtime.txt`.
