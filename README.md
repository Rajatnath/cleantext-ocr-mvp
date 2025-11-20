# 📝 CleanText OCR

A modern, AI-powered OCR (Optical Character Recognition) web application built with Next.js and Google's Gemini AI. Extract text from images with exceptional accuracy, especially for mathematical formulas and complex documents.

![Next.js](https://img.shields.io/badge/Next.js-16.0.3-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.2.0-blue?style=flat-square&logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?style=flat-square&logo=tailwind-css)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

## ✨ Features

- 🚀 **AI-Powered Extraction** - Uses Google Gemini 2.5 Flash for fast, accurate text recognition
- 🔢 **Formula Support** - Extracts mathematical formulas with proper Unicode subscripts/superscripts (x₂, x³)
- 📱 **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- 🎨 **Modern UI** - Clean, Apple-inspired interface with Tailwind CSS
- ⚡ **Fast Processing** - Results in 2-3 seconds
- 🔒 **Secure** - Server-side API proxy keeps your API key safe
- ♿ **Accessible** - Full ARIA support and keyboard navigation
- 📋 **One-Click Copy** - Instantly copy extracted text to clipboard

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **AI Engine**: Google Gemini 2.5 Flash Preview
- **Deployment**: Vercel (recommended)
- **Package Manager**: npm

## 📋 Prerequisites

- Node.js 18+ and npm
- Google AI Studio API key ([Get one here](https://aistudio.google.com/app/apikey))
- Git

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/Rajatnath/cleantext-ocr-mvp.git
cd cleantext-ocr-mvp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Gemini API key:

```env
GEMINI_KEY=your-actual-gemini-api-key-here
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎯 Usage

1. **Upload an image** - Click the file input or drag and drop an image (JPG, PNG, max 8MB)
2. **Click "Extract Text (AI)"** - The AI will process your image
3. **View results** - Extracted text appears in the right panel
4. **Copy text** - Click the "Copy Text" button to copy to clipboard

### Tips for best results

- 📸 Use good lighting when capturing images
- 📐 Hold device steady and capture text straight-on
- 🔍 Get close enough to ensure text is clear
- 📄 Avoid blurry or low-resolution images

## 📁 Project Structure

```
cleantext-ocr-mvp/
├── pages/
│   ├── index.js              # Main UI component
│   ├── _document.js          # Custom document (Tesseract.js)
│   └── api/
│       └── gemini-vision.js  # Serverless API endpoint
├── styles/
│   └── globals.css           # Global styles and Tailwind config
├── public/
│   └── sample-images/        # Sample test images
├── utils/
│   └── ocrClient.js          # OCR utility functions
├── .env.example              # Environment variables template
└── README.md                 # This file
```

## 🔑 Environment Variables

| Variable       | Required | Description                                      |
|----------------|----------|--------------------------------------------------|
| `GEMINI_KEY`   | Yes      | Your Google AI Studio API key                    |
| `PADDLE_HOOK`  | No       | Optional fallback OCR webhook (Colab/HF Space)  |

## 🌐 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub (already done! ✅)
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project" and import your GitHub repository
4. Add environment variables:
   - `GEMINI_KEY`: Your Google AI Studio API key
5. Click "Deploy"

Your app will be live in ~1 minute! 🎉

### Deploy to Other Platforms

This is a standard Next.js app and works with:
- **Netlify**: Use the Next.js plugin
- **Railway**: Auto-detects Next.js
- **AWS Amplify**: Deploy with Amplify CLI

## 🧪 Testing

```bash
# Run the app locally
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📝 API Reference

### POST `/api/gemini-vision`

Extract text from an image using Gemini AI.

**Request Body:**
```json
{
  "imageBase64": "base64-encoded-image-data",
  "prompt": "Custom extraction prompt (optional)",
  "forceFallback": false
}
```

**Response:**
```json
{
  "text": "Extracted text content",
  "source": "gemini" // or "paddle_fallback"
}
```

**Rate Limits:**
- 10 requests per minute per IP
- 8MB max image size

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Known Issues

- ~~Standard OCR (Tesseract.js) is slow and disabled by default~~
- Large images (>5MB) may take longer to process
- Best results with clear, high-contrast text

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Google Gemini AI](https://ai.google.dev/) - AI-powered OCR engine
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Vercel](https://vercel.com/) - Deployment platform

## 📧 Contact

**Rajat Nath Mishra** - [@Rajatnath](https://github.com/Rajatnath)

Project Link: [https://github.com/Rajatnath/cleantext-ocr-mvp](https://github.com/Rajatnath/cleantext-ocr-mvp)

---

Made with ❤️ using Next.js and Gemini AI
