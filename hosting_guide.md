# 🚀 Hosting Guide: Mall-Ops

To host your application as a live website, I recommend using **Vercel** for the frontend and **Render** for the backend. This setup is free, reliable, and scales well.

---

## 1. Prepare for Deployment
First, ensure your project is initialized with Git and pushed to **GitHub**.

### Project Structure Check:
*   `app/frontend/` (React code)
*   `app/backend/` (FastAPI code)
*   `requirements.txt` (Backend dependencies at root or in backend folder)

---

## 2. Deploy the Backend (Render.com)
Render is perfect for Python/FastAPI backends.

1.  **Create Account**: Log in to [Render.com](https://render.com) with GitHub.
2.  **New Web Service**: Select "New" > "Web Service" and connect your GitHub repo.
3.  **Config**:
    *   **Runtime**: Python
    *   **Build Command**: `pip install -r app/backend/requirements.txt`
    *   **Start Command**: `uvicorn app.backend.server:app --host 0.0.0.0 --port 10000`
4.  **Environment Variables**:
    *   `DATABASE_URL`: **IMPORTANT** Use the **Connection Pooler** URL from Supabase (Transaction mode).
        *   Standard URLs like `db.xxx.supabase.co` often fail on Render with "Network Unreachable".
        *   Instead, use the one that looks like `postgres://...:6543/postgres` or uses a `pooler` hostname.
    *   `FRONTEND_URL`: (Wait until step 3 is done, then put your Vercel URL here)
    *   `SENDGRID_API_KEY`: (Your SendGrid API Key)
    *   `SENDGRID_FROM_EMAIL`: (Your verified sender email in SendGrid)
    *   `SENDGRID_TEMPLATE_ID`: (Your Dynamic Template ID if using templates)

---

## 3. Deploy the Frontend (Vercel)
Vercel is the best home for React apps.

1.  **Create Account**: Log in to [Vercel.com](https://vercel.com) with GitHub.
2.  **Import Project**: Select your repo.
3.  **Config**:
    *   **Framework Preset**: Create React App (or Other)
    *   **Root Directory**: `app/frontend` (Crucial!)
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `build`
4.  **Environment Variables**:
    *   `REACT_APP_BACKEND_URL`: (Put your **Render URL** here, e.g., `https://mall-ops-api.onrender.com`)

---

## 4. Final Connection
1.  Once Vercel gives you a URL (e.g., `https://mall-ops.vercel.app`), copy it.
2.  Go back to **Render** and add/update the `FRONTEND_URL` environment variable with this URL.
3.  Redeploy the backend.

---

## ✅ Checklist for Success
- [ ] **CORS**: I have updated `server.py` to automatically handle the `FRONTEND_URL` for you.
- [ ] **HTTPS**: Both Vercel and Render provide SSL (https) automatically.
- [ ] **Database**: Your Supabase database stays exactly where it is; only the server changes.

**Note:** If you use the free tier on Render, the backend "sleeps" after 15 mins of inactivity. The first person to visit the site might wait 30 seconds for it to wake up.
