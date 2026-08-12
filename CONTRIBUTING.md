# Contributing to Bigi Awasaana

Welcome to the Bigi Awasaana project! This guide will help you get set up for local development and explain our deployment process.

## Prerequisites

- Node.js 20.x
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase account with access to the `bigi-awasaana-7b3ce` project

## Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Bigi-Awasaana
   ```

2. **Install dependencies:**
   ```bash
   npm ci
   cd functions && npm ci && cd ..
   ```

3. **Set up environment variables:**
   Copy the example environment file and fill in the necessary values:
   ```bash
   cp .env.example .env
   ```
   *Note: Never commit your `.env` file to version control.*

4. **Login to Firebase:**
   ```bash
   firebase login
   ```

5. **Start the local development server:**
   ```bash
   npm run dev
   ```

## CI/CD Pipeline

We use GitHub Actions for Continuous Integration and Continuous Deployment. The workflow is defined in `.github/workflows/ci.yml`.

- **On Pull Request to `main`:** The pipeline will install dependencies, lint, build the project, and create a Firebase Hosting preview channel. A comment with the preview URL will be added to the PR.
- **On Push to `main`:** The pipeline will build the project and deploy it to the live production environment.

## Branching Strategy

We recommend following GitHub Flow:
1. Create a feature branch from `main` (e.g., `feature/add-login`).
2. Make your changes and commit them with clear messages.
3. Push your branch and open a Pull Request against `main`.
4. Wait for the CI pipeline to pass and the preview environment to be generated.
5. Once approved, merge your PR into `main`, which will trigger a production deployment.
