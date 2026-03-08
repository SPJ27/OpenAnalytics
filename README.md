# OpenAnalytics

## What is OpenAnalytics?

**OpenAnalytics** is a lightweight **open-source analytics API** that developers can self-host to track website or application traffic.

Instead of relying on expensive third-party analytics platforms, OpenAnalytics allows you to **own your analytics infrastructure and data** while still getting powerful metrics and structured insights.

It is designed to be **simple to deploy, easy to integrate, and flexible for custom dashboards**.

---

# Features

OpenAnalytics provides a wide range of analytics metrics:

### Traffic Metrics

* **Visits** – Total number of page visits
* **Unique Visitors** – Number of distinct users
* **Total Sessions** – Total tracked browsing sessions
* **Bounce Rate** – Percentage of users leaving after one interaction

### Engagement Metrics

* **Average Visits per User**
* **Average Time Spent per Session**
* **Most Visited Pages**

### Visitor Information

OpenAnalytics collects useful contextual data such as:

* **Country**
* **City**
* **Device Type**
* **Browser**
* **Operating System**

### Traffic Sources

* **Referrer Tracking** – Identify where users are coming from (Direct, Search, Social, etc.)

### Visualization Ready Data

The `/api/stats` endpoint returns **pre-structured datasets** compatible with charting libraries like:

* **Recharts**
* **Chart.js**
* **ECharts**
* **D3.js**

Graph data is automatically formatted with **day / week / month buckets**.

---

# Architecture

OpenAnalytics works in four simple steps:

1. **tracker.js** records user activity in the browser
2. Data is sent to **`/api/track`**
3. Analytics data is stored in your **PostgreSQL database**
4. Insights are retrieved through **`/api/stats`**

This allows developers to build **custom analytics dashboards** easily.

---

# Installation

OpenAnalytics consists of **four main components**.

---

# 1. Database Setup

Run the provided SQL schema in your PostgreSQL database.

```
schema.sql
```

This file creates all required tables for:

* visits
* users
* sessions
* analytics aggregations

**Supabase** is the default recommended provider, but any **PostgreSQL database** will work.

---

# 2. Add API Routes

Copy the API files into your project:

```
/api/track/route.js
/api/stats/route.js
```

These routes handle:

* **/api/track** → receives tracking events
* **/api/stats** → returns analytics insights

---

# 3. Add the Tracker Script

Place the tracker file in your **public directory**.

```
/public/tracker.js
```

This script automatically:

* creates sessions
* tracks visits
* sends analytics data to the API

---

# 4. Add the Script to Your Website

Add the tracker script to your HTML or layout file.

```jsx
<Script
  src="/tracker.js"
  data-tracker-id="a0b13b39-797f-4009-96bf-82f2c09e2704"
  data-domain="example.com"
  strategy="afterInteractive"
  data-allow-localhost="true"
  data-debug="true"
/>
```

### Available Options

| Attribute              | Description                         |
| ---------------------- | ----------------------------------- |
| `data-tracker-id`      | Unique tracking ID                  |
| `data-domain`          | Domain being tracked                |
| `data-allow-localhost` | Enables tracking during development |
| `data-debug`           | Enables console debug logs          |

---

# Built-in Dashboard

A **basic analytics dashboard** is included in:

```
app/page.js
```

This dashboard demonstrates how to visualize data returned from `/api/stats`.

Developers can modify it or build their own analytics UI.

---

# API Response Example

Example response from `/api/stats`:

```json
{
  "success": true,
  "data": {
    "totalVisits": 5,
    "uniqueVisitors": 2,
    "totalSessions": 4,
    "bounceRate": "25.0%",
    "avgVisitsPerUser": "2.50",
    "avgTimeSpent": "3621.60",
    "visitedPages": {
      "/": 4,
      "/abc": 1
    },
    "countries": {
      "India": 5
    },
    "cities": {
      "Nagpur": 5
    },
    "devices": {
      "Desktop": 2
    },
    "browsers": {
      "Chrome": 2
    },
    "oses": {
      "Windows": 2
    },
    "referrers": {
      "Direct": 5
    },
    "graph": [
      {
        "label": "Mar 1",
        "visits": 0,
        "users": 0
      },
      {
        "label": "Mar 8",
        "visits": 5,
        "users": 2
      }
    ],
    "bucketMode": "day"
  }
}
```

---

# Use Cases

OpenAnalytics can be used for:

* **Self-hosted analytics dashboards**
* **SaaS analytics panels**
* **Privacy-focused website analytics**
* **Developer tools**
* **Internal product analytics**

---

# Advantages

Why use OpenAnalytics?

* **Self-hosted**
* **Open source**
* **No vendor lock-in**
* **Custom dashboards**
* **Full data ownership**
* **Lower cost than SaaS analytics**

