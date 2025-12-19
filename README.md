# Law Compare (法条比对)

Law Compare is a specialized tool for visualizing differences between legal text versions. It provides an intuitive interface to compare old and new versions of laws, highlighting changes in a way that is easy to understand for legal professionals.

## Key Features

- **Side-by-Side Comparison**: View old and new texts side-by-side with synchronized scrolling.
- **Git-style Diff**: View changes in a traditional Git diff format for quick scan.
- **Smart Alignment**: Automatically aligns articles and clauses, handling insertions and deletions gracefully.
- **Entity Recognition**: Highlights key legal entities like dates, amounts, and penalties.
- **Structure Analysis**: Parses legal texts into structured data (Chapters, Articles, Items) for better context.

## Project Structure

The project consists of two main parts:

- **Frontend (`frontend/`)**: A Next.js 14 application providing the user interface. It handles text input, visualization of diffs, and interaction logic.
- **Backend (`backend/`)**: A Rust (Axum) server that performs the heavy lifting. It handles text segmentation (NLP), efficient diff calculation, entity recognition (NER), and AST parsing.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/) (latest stable)

### 1. Start the Backend

```bash
cd backend
# Run in release mode for best performance
cargo run --release
```
The backend server will start at `http://127.0.0.1:8000`.

### 2. Start the Frontend

```bash
cd frontend
# Install dependencies
npm install
# Start development server
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

## Deployment

### Backend
The backend compiles to a single binary.
1. Build: `cargo build --release`
2. Run: `./target/release/law-compare-backend`

### Frontend
The frontend can be deployed to Vercel or any Node.js environment.
1. Build: `npm run build`
2. Start: `npm start`

## Documentation

- [Frontend Documentation](frontend/README.md): UI components, state logic, and visualization details.
- [Backend Documentation](backend/README.md): Algorithm details, API endpoints, and core comparison logic.
