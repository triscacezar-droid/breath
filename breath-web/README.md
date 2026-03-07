# Breath (4–4–4)

A simple breathing exercise website:

- 4 seconds inhale → 4 seconds hold → 4 seconds exhale (repeat)
- Expanding / contracting circle + phase label

## Local development

From the project folder:

```bash
cd "/home/cezar/Desktop/Breath/breath-web"
npm install
npm run dev
```

## Production build

```bash
cd "/home/cezar/Desktop/Breath/breath-web"
npm run build
npm run preview
```

## Deploy to Vercel (public website)

1. Create a GitHub repo and push this project.
2. In Vercel, click **Add New → Project**, then import your repo.
3. In Vercel project settings set:
   - **Root Directory**: `breath-web`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Deploy. Every push to your default branch will update the public site.
