# Pocket Balance

A modern mobile-first personal finance application built with HTML, CSS, JavaScript and Capacitor.

Pocket Balance helps users manage:

* Salary & extra income
* Expenses
* Debt tracking
* Monthly financial reports
* Calendar reminders
* PDF report export
* Mobile notifications

---

# Features

## Financial Management

* Add salary / initial balance
* Add extra income
* Add expenses
* Automatic balance calculation
* Debt management system
* Separate debt handling:

  * Cover with next Income
  * Cover with next Salary

## Reports & Statistics

* Monthly financial statistics
* Total salary tracking
* Extra income tracking
* Expense tracking
* Current debt overview
* Previous balance calculation
* Final balance calculation
* Export report as PDF

## Calendar & Reminders

* Calendar transaction tracking
* Reminder notes
* Reminder costs
* Local notification reminders
* Notification scheduling

## Mobile Support

Built using Capacitor for Android support.

Features:

* Native Android app
* Local notifications
* File system access
* PDF saving to device

---

# Technologies Used

* HTML5
* CSS3
* JavaScript (Vanilla JS)
* Capacitor
* jsPDF

---

# Installation

Clone the repository:

```bash
git clone https://github.com/DoumanisKostas/pocket-balance-app.git
```

Enter the project folder:

```bash
cd pocket-balance-app
```

Install dependencies:

```bash
npm install
```

Run Capacitor sync:

```bash
npx cap sync
```

Open Android Studio:

```bash
npx cap open android
```

---

# Build APK

Inside Android Studio:

```text
Build → Build APK(s)
```

APK location:

```text
android/app/build/outputs/apk/debug/
```

---

# Project Structure

```text
pocket-balance-app/
│
├── android/
├── www/
│   ├── app.js
│   ├── style.css
│   ├── index.html
│   ├── manifest.json
│   └── service-worker.js
│
├── package.json
├── capacitor.config.json
└── README.md
```

---

# Future Improvements

* Charts & analytics
* Cloud sync
* User authentication
* Multi-device support
* iOS version
* Dark mode improvements
* Categories statistics

---

# Author

Konstantinos Doumanis

GitHub:
https://github.com/DoumanisKostas

---

# License

This project is licensed under the MIT License.
