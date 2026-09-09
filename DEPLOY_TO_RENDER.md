# Deploying PrepDesk to Render

PrepDesk is fully prepared and optimized for 1-click deployment to **Render** as a high-performance Node.js Web Service.

---

## 1. Quick Settings for Render

When creating a new **Web Service** on [dashboard.render.com](https://dashboard.render.com/):

| Setting | Value |
| :--- | :--- |
| **Language / Runtime** | `Node` |
| **Branch** | `main` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/api/health` |
| **Instance Type** | Free (or Starter for persistent zero spin-down) |

### Environment Variables

Add these in the **Environment** tab on Render:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production bundle serving & optimizations |
| `GEMINI_API_KEY` | *(Your Google AI API Key)* | *Optional* — enables live Gemini AI study assistant & lexical generator |

> **Note on Port**: Render automatically injects the `PORT` environment variable (e.g. 10000). The PrepDesk server dynamically reads `process.env.PORT` and binds to `0.0.0.0:${PORT}` automatically.

---

## 2. Steps to Push to GitHub

If you haven't yet pushed this project to GitHub:

```bash
# 1. Initialize git
git init

# 2. Add all project files
git add .

# 3. Create initial commit
git commit -m "feat: production-ready CAT 2027 PrepDesk platform"

# 4. Rename branch to main
git branch -M main

# 5. Connect your GitHub repository (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/prepdesk-cat2027.git

# 6. Push code to GitHub
git push -u origin main
```

---

## 3. Deploying on Render (Two Options)

### Option A: Manual Web Service
1. Go to [Render Dashboard](https://dashboard.render.com/) -> **New +** -> **Web Service**.
2. Select your GitHub repository.
3. Configure the fields matching the table above (**Build Command**: `npm install && npm run build`, **Start Command**: `npm start`).
4. Click **Deploy Web Service**.

### Option B: Render Blueprint (render.yaml)
A pre-configured `render.yaml` file is included in this repository.
1. Go to [Render Dashboard](https://dashboard.render.com/) -> **New +** -> **Blueprint**.
2. Select your GitHub repository.
3. Render will automatically read `render.yaml` and configure everything in one click!

---

## 4. Master Administrator Access After Deployment

Once deployed, your live URL (e.g. `https://prepdesk-cat2027.onrender.com`) will be instantly accessible:

* **Sign-In URL**: `https://your-app-name.onrender.com`
* **Admin User ID**: `madhav` (or `madhav@prepdesk.edu`)
* **Admin Password**: `madhav07`
* **Status**: Clean baseline, 0 demo tasks, 0 sample posts, ready for student enrollment and assignment publication.
