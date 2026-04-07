# 🚀 Quick Start Guide - SyncCode

Get SyncCode running in 5 minutes!

## Step 1: Install Node.js ⚠️

**You need to install Node.js first!**

1. Go to https://nodejs.org/
2. Download Node.js 20 LTS (Windows Installer)
3. Run the installer
4. Click "Next" through the setup wizard
5. Restart your terminal/command prompt

**Verify installation:**
```bash
node --version
npm --version
```

## Step 2: Install Dependencies

```bash
# Open PowerShell or Command Prompt

cd "c:\Users\N. AKSHITH\OneDrive\Desktop\Projects\SyncCode"

# Client
cd client
npm install

# Server  
cd ..\server
npm install

# Tests (optional)
cd ..\tests
npm install
```

## Step 3: Start the Application

**Terminal 1 - Server:**
```bash
cd "c:\Users\N. AKSHITH\OneDrive\Desktop\Projects\SyncCode\server"
npm start
```

**Terminal 2 - Client:**
```bash
cd "c:\Users\N. AKSHITH\OneDrive\Desktop\Projects\SyncCode\client"
npm run dev
```

## Step 4: Test It!

1. Open http://localhost:5173 in your browser
2. Open the same link in 2-3 more tabs
3. Start typing - see real-time collaboration! 🎉

## Optional: Install Docker

For real code execution (not required for testing):

1. Download Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Install and start Docker Desktop
3. Pull images:
   ```bash
   docker pull python:3.11-slim
   docker pull gcc:13
   ```

Without Docker, the app uses **mock execution** which still works for testing!

## Need Help?

- See [README.md](README.md) for detailed instructions
- See [walkthrough.md](.gemini/antigravity/brain/10ce4f8b-9f2b-4a2e-ba99-8c1afaaa634d/walkthrough.md) for complete documentation
- See [INTERVIEW_GUIDE.md](INTERVIEW_GUIDE.md) for interview preparation

## Run Tests (After Server is Running)

```bash
cd "c:\Users\N. AKSHITH\OneDrive\Desktop\Projects\SyncCode\tests"
npm run test:all
```

---

**That's it! You're ready to build and demo SyncCode! 🚀**
