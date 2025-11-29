# CodeScribe - AI Code Documentation Generator

CodeScribe is a beautiful web application that uses Google Gemini AI to automatically generate comprehensive documentation for your code.

![CodeScribe](https://img.shields.io/badge/CodeScribe-AI%20Documentation-6366f1)
![Python](https://img.shields.io/badge/Python-3.9+-blue)
![Flask](https://img.shields.io/badge/Flask-3.0-green)

##  Features

- **AI-Powered Documentation** - Uses Google Gemini to analyze and document code
- **Markdown Output** - Clean, structured documentation in Markdown format
-  **Beautiful UI** - Modern, responsive design with elegant animations
- **Fast & Simple** - Just paste your code and click generate

##  Quick Start

### Prerequisites

- Python 3.9 or higher
- A Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/tvbibayan/CodeScribe2.git
   cd CodeScribe2
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

5. **Run the application**
   ```bash
   flask run
   ```

6. **Open your browser**
   Navigate to `http://localhost:5000`

## 📁 Project Structure

```
codeScribe/
├── app.py              # Flask application & API routes
├── requirements.txt    # Python dependencies
├── .env.example        # Example environment variables
├── static/
│   ├── style.css       # Main styles
│   ├── cosmic.css      # Animation styles
│   └── script.js       # Frontend JavaScript
└── templates/
    ├── index.html      # Main page
    └── about.html      # About page
```

## 🔧 Configuration

The application uses the following environment variables:

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini API key (required) |

## 🌐 Deployment

### Deploy to Render

1. Push your code to GitHub
2. Connect your GitHub repo to [Render](https://render.com)
3. Create a new Web Service
4. Set the following:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
5. Add your `GEMINI_API_KEY` as an environment variable

### Deploy to Railway

1. Push your code to GitHub
2. Connect your GitHub repo to [Railway](https://railway.app)
3. Add your `GEMINI_API_KEY` as an environment variable
4. Deploy!





---

Made with ❤️ using Flask and Google Gemini AI
