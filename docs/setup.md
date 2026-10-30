# FixMyRoad — Local Setup Guide (Python)

## 1. Prerequisites
* **Python 3.10 or higher** — check with `python --version`
* **Git**
* **VS Code** (optional)

## 2. Install
```bash
git clone https://github.com/riddhipareek/python_pothole_tracker_project.git
cd python_pothole_tracker_project
pip install -r requirements.txt
```

## 3. Run
```bash
python app.py
```
You're done when the terminal prints "FixMyRoad Python Server is actively running!".

## 4. Open in browser
* Landing page: http://localhost:5000
* Public map: http://localhost:5000/citizen.html
* Report form: http://localhost:5000/report.html
* Officer login: http://localhost:5000/admin-login.html

## 5. Demo admin login
* User ID: `admin@fixmyroad.gov.in` (or `admin`)
* Password: `Admin@12345`

## 6. Run the tests
```bash
python tests/test_backend.py
```
You're done when it prints "12/12 tests passed successfully."
