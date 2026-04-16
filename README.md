# Codebase Cartographer

> **AI-Driven Spatial Repository Visualization & Logic Summarization.**

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![LLM Integration](https://img.shields.io/badge/AI_Powered-Automated_Summaries-purple?style=for-the-badge)
![Security](https://img.shields.io/badge/Execution-100%25_Local-brightgreen?style=for-the-badge)

## The Problem: Developer Onboarding Latency
Navigating undocumented, complex monolithic repositories or sprawling microservices is the number one bottleneck for new engineering hires. Traditional text search lacks spatial context, and manual architectural mapping is instantly outdated.

## The Solution: Codebase Cartographer
Codebase Cartographer is a localized, AI-integrated developer tool that dynamically parses, maps, and visualizes complex directory structures. By integrating LLM-driven algorithms, it automatically generates high-level summaries of code logic across JavaScript and Python, providing instant spatial and contextual awareness of any codebase.

---

### Core Architecture & Features

* **Interactive Spatial Mapping:** A highly optimized, node-based graphical interface built with React and Tailwind CSS that renders complex file relationships dynamically.
* **Automated Logic Summarization:** Ingests raw source code (JS/Python) and leverages advanced LLM algorithms to output concise, human-readable architectural summaries.
* **Zero-Cloud Security (Local Execution):** Engineered for enterprise security constraints. All repository parsing and mapping happens entirely within your local execution environment. **Zero proprietary code is uploaded to external cloud servers.**

---

### System Workflow

1. **Ingestion:** Select the target local repository directory.
2. **Parsing:** The engine maps the AST (Abstract Syntax Tree) and directory nodes.
3. **Inference:** The LLM layer processes file contents to generate contextual summaries.
4. **Rendering:** The UI paints an interactive, interconnected map of the codebase.

---

### Quickstart

#### Prerequisites
* Node.js (v18+)
* API Key for LLM Inference (Add to `.env`)

#### Installation
```bash
# Clone the repository
git clone [https://github.com/Meet00028/codebase-cartographer.git](https://github.com/Meet00028/codebase-cartographer.git)

# Navigate into the directory
cd codebase-cartographer

# Install dependencies
npm install

# Boot the local server
npm run dev
