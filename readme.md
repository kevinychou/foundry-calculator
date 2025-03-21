# Foundry Healthcare Market Sizing Caclulator

<img width="914" alt="Screenshot 2025-03-21 at 3 42 47 PM" src="https://github.com/user-attachments/assets/a16437e5-415f-4478-bd7a-68d937588c29" />

This project was built as a proof of concept alongside [Foundry Health](https://www.foundry.health/).

## Features
* Generates three sections of market sizing (epidemiology, intervention, pricing) with markdown tables.
* Generates estimated market size value based on regex via markdown tables (population * annual price)
* CSV Export of Markdown tables

## Stack
* Frontend: React, Node, Typescript 
* Backend: Python Flask server + OpenAI GPT-4o model backend.
* Prompts: Three [prompts](https://kevinychou.notion.site/20250209-Team-Catchup-19532dab09f68099af1cc7e48c5ecb1d?pvs=4) for epidemiology, intervention, pricing.

## Use Notes
### Frontend
* npm install: Install dependencies
* npm run dev: Starts application

### Backend 
1. Setup Virtual Environment: 
* python -m venv venv
* source venv/bin/activate
* pip install -r requirements.txt
* include a .env with "OPENAI_AI_KEY="

2. Start server
* python app.py
