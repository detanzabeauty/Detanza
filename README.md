# DetanZa™ — Beauty & Skincare Website

Storefront for the DetanZa™ cosmetics brand, with a built-in **Admin Panel** to manage
products, how-to-use videos and site content. Hosted on **Vercel**; images, videos and
data are stored in **Vercel Blob**.

## Pages

| URL | What it is |
|---|---|
| `/` | Home: banner, shop (search + categories), latest videos, about, contact |
| `/product?id=…` | Product page: images, price/MRP/discount, benefits, how-to steps, ingredients, videos |
| `/how-to-use` | All how-to-use videos, filterable by product |
| `/admin` | Admin panel (password protected) |

Customers order through **WhatsApp** (pre-filled message with the product name), or through a
custom **Buy link** per product (Amazon, Nykaa, Meesho, your own store…).

## One-time setup on Vercel

1. **Create a Blob store:** Vercel dashboard → your project → **Storage** → **Create** → **Blob**
   → connect it to this project. This adds the `BLOB_READ_WRITE_TOKEN` variable automatically.
2. **Set the admin password:** Project → **Settings** → **Environment Variables** → add
   `ADMIN_PASSWORD` = a long, private password (12+ characters). Apply it to Production (and Preview if you use it).
3. **Redeploy** (Deployments → ⋯ → Redeploy) so the new variables take effect.
4. Open `https://<your-domain>/admin`, log in, and:
   - **Site Settings** → enter your WhatsApp number (with country code, e.g. `919876543210`),
     contact details, social links, banner text and image → **Save settings**.
   - **Products** → **+ Add product**.
   - **How-to Videos** → **+ Add video** (upload a file or paste a YouTube link).

Changes appear on the public site within about 30–60 seconds (edge caching).

To change the password later, update `ADMIN_PASSWORD` and redeploy. This also logs out every existing session.

## Storage limits to know

- Images: up to 10 MB each. Videos: up to 500 MB each (MP4 recommended).
- Vercel Blob's free tier has limited storage and monthly data transfer. Video views use the most
  data, so for long or popular videos, **YouTube links** are the cheapest option.
- Files you remove or replace in the admin are deleted from storage automatically.

## Project structure

```
├── index.html, product.html, how-to-use.html   # public pages
├── admin.html, admin.css                        # admin panel
├── style.css                                    # storefront styles
├── js/
│   ├── site.js       # shared: loads content, header/footer, cards, video player
│   ├── home.js       # home page
│   ├── product.js    # product page
│   ├── videos.js     # how-to-use page
│   └── admin.js      # admin panel
├── api/              # Vercel serverless functions
│   ├── _lib.js       # auth, validation, Blob read/write (not a route)
│   ├── content.js    # GET site content / PUT save (admin)
│   ├── login.js      # admin login/logout (signed HttpOnly cookie)
│   ├── upload.js     # issues upload tokens for direct-to-Blob uploads (admin)
│   └── media.js      # deletes unused uploaded files (admin)
├── vercel.json       # clean URLs + security headers
└── robots.txt
```

## Local development

```bash
npm install
npx vercel link        # once, to connect this folder to the Vercel project
npx vercel env pull    # downloads BLOB_READ_WRITE_TOKEN and ADMIN_PASSWORD into .env.local
npm run dev            # runs `vercel dev` with the API at http://localhost:3000
```

`npm run preview` serves only the static pages (no API), so they show default content.
