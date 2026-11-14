# DetanZa™ — Beauty & Skincare Website

Storefront for the DetanZa™ cosmetics brand, with a built-in **Admin Panel** to manage
products, how-to-use videos and site content. Hosted on **Vercel**. Products, videos and
settings are stored in **MongoDB Atlas**; images and videos are stored on **Cloudinary**.

## Pages

| URL | What it is |
|---|---|
| `/` | Home: banner, shop (search + categories), latest videos, about, contact |
| `/product?id=…` | Product page: images, price/MRP/discount, benefits, how-to steps, ingredients, videos |
| `/how-to-use` | All how-to-use videos, filterable by product |
| `/admin` | Admin panel (password protected) |

Customers order through **WhatsApp** (pre-filled message with the product name), or through a
custom **Buy link** per product (Amazon, Nykaa, Meesho, your own store…).

## One-time setup

### 1. MongoDB Atlas
- **Network Access** → **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`).
  Vercel has no fixed IP address, so this is required.
- **Database Access**: note the database user's username and password.
- Your connection string looks like `mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/`

### 2. Vercel environment variables
Project → **Settings** → **Environment Variables** → add these for **Production** (and Preview if used):

| Key | Value |
|---|---|
| `MONGODB_URI` | your full MongoDB connection string (with username and password) |
| `CLOUDINARY_URL` | `cloudinary://API_KEY:API_SECRET@CLOUD_NAME` (Cloudinary dashboard → API Keys) |
| `ADMIN_PASSWORD` | a long, private password for `/admin` |
| `MONGODB_DB` | *(optional)* database name, default `detanza` |

Then **Redeploy** (Deployments → ⋯ → Redeploy).

### 3. Add your content
Open `https://www.detanza.com/admin`, log in, then:
- **Site Settings**: WhatsApp number with country code (e.g. `919876543210`), contacts, socials, banner.
- **Products** → **+ Add product**.
- **How-to Videos** → **+ Add video** (upload a file or paste a YouTube link).

Changes appear on the public site within about 30 seconds (edge caching).
To change the admin password, update `ADMIN_PASSWORD` and redeploy. Every existing session is logged out.

## Storage limits to know (Cloudinary free plan)

- Images up to 10 MB, videos up to 100 MB each. Use YouTube links for longer videos.
- Large videos are uploaded in 20 MB chunks automatically.
- The site requests resized, compressed images (`f_auto,q_auto`) from Cloudinary, so pages stay fast.
- Files you remove or replace in the admin are deleted from Cloudinary automatically.

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
│   ├── _lib.js       # auth, validation, MongoDB + Cloudinary helpers (not a route)
│   ├── content.js    # GET site content / PUT save (admin)
│   ├── login.js      # admin login/logout (signed HttpOnly cookie)
│   ├── upload.js     # signs direct browser→Cloudinary uploads (admin)
│   └── media.js      # deletes unused files from Cloudinary (admin)
├── vercel.json       # clean URLs + security headers
└── robots.txt
```

## Local development

```bash
npm install
npx vercel link        # once, to connect this folder to the Vercel project
npx vercel env pull    # downloads MONGODB_URI, CLOUDINARY_URL, ADMIN_PASSWORD into .env.local
npm run dev            # runs `vercel dev` with the API at http://localhost:3000
```

`npm run preview` serves only the static pages (no API), so they show default content.
