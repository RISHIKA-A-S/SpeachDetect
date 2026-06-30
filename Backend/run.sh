#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if [ ! -d "venv" ] || [ ! -x "venv/bin/python" ]; then
  echo "ERROR: Backend virtual environment not found."
  echo "Create it from the Backend directory with:"
  echo "  python3 -m venv venv"
  echo "  source venv/bin/activate"
  echo "  pip install -r requirements.txt"
  exit 1
fi

source venv/bin/activate
python app.py
